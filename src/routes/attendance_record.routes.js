const express = require('express');
const router = express.Router();
const attendanceRecordService = require('../service/attendance_record.service');
const { verifyToken, isProfessor, isOwnerOrAuthorized } = require('../middleware/authJwt');
const uploadMiddleware = require('../middleware/upload');

/**
 * @swagger
 * tags:
 *   name: AttendanceRecords
 *   description: 출석 기록 통합 관리 API
 */

/**
 * @swagger
 * /api/attendance-records/lectures/{lectureId}:
 *   get:
 *     summary: 강의별 출석 기록 목록 조회 (일반 출석 + 병결)
 *     description: 특정 강의의 모든 출석 정보를 조회합니다.
 *     tags: [AttendanceRecords]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lectureId
 *         required: true
 *         schema:
 *           type: string
 *         description: 강의 ID
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: 특정 날짜로 필터링
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [출석, 지각, 결석, 병결, 공결]
 *         description: 특정 상태로 필터링
 *       - in: query
 *         name: studentId
 *         schema:
 *           type: string
 *         description: 특정 학생으로 필터링
 *     responses:
 *       200:
 *         description: 강의별 출석 목록 조회 성공
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 강의를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.get('/lectures/:lectureId', verifyToken, attendanceRecordService.getAttendanceRecordsByLecture);

/**
 * @swagger
 * /api/attendance-records/students/{studentId}:
 *   get:
 *     summary: 학생별 출석 기록 목록 조회
 *     description: 특정 학생의 모든 출석 정보를 조회합니다.
 *     tags: [AttendanceRecords]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *         description: 학생 ID
 *       - in: query
 *         name: lectureId
 *         schema:
 *           type: string
 *         description: 특정 강의로 필터링
 *     responses:
 *       200:
 *         description: 학생별 출석 목록 조회 성공
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 학생을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.get('/students/:studentId', [verifyToken, isOwnerOrAuthorized], attendanceRecordService.getStudentAttendanceRecords);

/**
 * @swagger
 * /api/attendance-records/attendance:
 *   post:
 *     summary: 일반 출석 정보 생성
 *     description: 새로운 출석 정보를 생성합니다. 교수자만 접근 가능합니다.
 *     tags: [AttendanceRecords]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - lectureId
 *               - studentId
 *               - status
 *               - date
 *             properties:
 *               lectureId:
 *                 type: string
 *                 description: 강의 ID
 *               studentId:
 *                 type: string
 *                 description: 학생 ID
 *               status:
 *                 type: string
 *                 enum: [출석, 지각, 결석]
 *                 description: 출석 상태
 *               date:
 *                 type: string
 *                 format: date
 *                 description: 출석 날짜
 *               time:
 *                 type: string
 *                 format: time
 *                 description: 출석 시간 (HH:MM 형식)
 *               checkMethod:
 *                 type: string
 *                 enum: [QR, 수기, 자동]
 *                 description: 출석 체크 방법
 *               notes:
 *                 type: string
 *                 description: 비고
 *     responses:
 *       201:
 *         description: 출석 정보 생성 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음
 *       500:
 *         description: 서버 오류
 */
router.post('/attendance', [verifyToken, isProfessor], attendanceRecordService.createAttendance);

/**
 * @swagger
 * /api/attendance-records/absence:
 *   post:
 *     summary: 병결 신청 생성
 *     description: 새로운 병결 신청을 생성합니다.
 *     tags: [AttendanceRecords]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - startDate
 *               - endDate
 *               - reason
 *               - lectureId
 *             properties:
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               reason:
 *                 type: string
 *               lectureId:
 *                 type: string
 *               documents:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: 병결 신청 생성 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: 서버 오류
 */
router.post('/absence', [verifyToken, uploadMiddleware.array('documents', 5)], attendanceRecordService.createAbsence);

/**
 * @swagger
 * /api/attendance-records/absence/{id}/status:
 *   put:
 *     summary: 병결 신청 상태 변경 (교수/관리자 전용)
 *     tags: [AttendanceRecords]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [승인, 반려]
 *               feedback:
 *                 type: string
 *     responses:
 *       200:
 *         description: 병결 신청 상태 변경 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음
 *       404:
 *         description: 병결 신청을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.put('/absence/:id/status', [verifyToken, isProfessor], attendanceRecordService.updateAbsenceStatus);

/**
 * @swagger
 * /api/attendance-records/absence/{id}:
 *   delete:
 *     summary: 병결 신청 삭제
 *     tags: [AttendanceRecords]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 병결 신청 삭제 성공
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음
 *       404:
 *         description: 병결 신청을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.delete('/absence/:id', [verifyToken, isOwnerOrAuthorized], attendanceRecordService.deleteAbsence);

/**
 * @swagger
 * /api/attendance-records/qr/{lectureId}:
 *   get:
 *     summary: QR 코드 생성 (교수 전용)
 *     description: 출석 체크를 위한the QR 코드를 생성합니다.
 *     tags: [AttendanceRecords]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lectureId
 *         required: true
 *         schema:
 *           type: string
 *         description: 강의 ID
 *     responses:
 *       200:
 *         description: QR 코드 생성 성공
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음
 *       404:
 *         description: 강의를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.get('/qr/:lectureId', [verifyToken, isProfessor], attendanceRecordService.generateQRCode);

/**
 * @swagger
 * /api/attendance-records/check-qr:
 *   post:
 *     summary: QR 코드로 출석 체크
 *     description: QR 코드를 사용하여 출석합니다.
 *     tags: [AttendanceRecords]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - qrData
 *             properties:
 *               qrData:
 *                 type: string
 *                 description: QR 코드에서 읽은 데이터
 *     responses:
 *       200:
 *         description: 출석 체크 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: 서버 오류
 */
router.post('/check-qr', verifyToken, attendanceRecordService.checkAttendanceByQR);

/**
 * @swagger
 * /api/attendance-records/absence/{id}/documents/{filename}:
 *   get:
 *     summary: 첨부 문서 다운로드
 *     tags: [AttendanceRecords]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 파일 다운로드
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음
 *       404:
 *         description: 파일을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.get('/absence/:id/documents/:filename', verifyToken, attendanceRecordService.downloadDocument);

module.exports = router; 