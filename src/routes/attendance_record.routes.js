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
 * /api/attendance-records:
 *   post:
 *     summary: 통합 출석 기록 생성 (출석, 결석, 병결 등)
 *     description: 출석 기록을 생성하고 상태에 따라 attendance와 absence 모델을 연결합니다. 교수자만 사용 가능합니다.
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
 *               - date
 *               - status
 *             properties:
 *               lectureId:
 *                 type: integer
 *                 description: 강의 ID
 *               studentId:
 *                 type: integer
 *                 description: 학생 ID
 *               date:
 *                 type: string
 *                 format: date
 *                 description: 출석 날짜
 *               status:
 *                 type: string
 *                 enum: [출석, 지각, 결석, 병결, 공결]
 *                 description: 출석 상태
 *               notes:
 *                 type: string
 *                 description: 비고
 *               checkMethod:
 *                 type: string
 *                 enum: [QR, 수기, 자동, 비밀번호]
 *                 description: 출석 확인 방법
 *               leaveTime:
 *                 type: string
 *                 format: time
 *                 description: 조퇴/병결 시 필요한 시간 정보
 *               absenceReason:
 *                 type: string
 *                 description: 조퇴/병결 사유
 *               startTime:
 *                 type: string
 *                 format: time
 *                 description: 강의 시작 시간
 *               endTime:
 *                 type: string
 *                 format: time
 *                 description: 강의 종료 시간
 *     responses:
 *       201:
 *         description: 출석 기록 생성 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음
 *       404:
 *         description: 학생 또는 강의를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.post('/', [verifyToken, isProfessor], attendanceRecordService.createAttendanceRecord);

module.exports = router; 