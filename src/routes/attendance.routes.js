const express = require('express');
const router = express.Router();
const attendanceService = require('../service/attendance.service');
const { verifyToken, isProfessor, isOwnerOrAuthorized } = require('../middleware/authJwt');

/**
 * @swagger
 * tags:
 *   name: Attendance
 *   description: 학생 출석 관리 API
 */

/**
 * @swagger
 * /api/attendance/students/{studentId}:
 *   get:
 *     summary: 학생별 출석 목록 조회
 *     description: 특정 학생의 모든 출석 정보를 조회합니다. 본인이나 권한이 있는 사용자만 접근 가능합니다.
 *     tags: [Attendance]
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
 *       403:
 *         description: 권한 없음
 *       404:
 *         description: 학생을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.get('/students/:studentId', [verifyToken, isOwnerOrAuthorized], attendanceService.getAttendanceByStudent);

/**
 * @swagger
 * /api/attendance/check:
 *   post:
 *     summary: 출석 정보 생성/수정
 *     description: 새로운 출석 정보를 생성하거나 기존 출석 정보를 수정합니다. 교수자만 접근 가능합니다.
 *     tags: [Attendance]
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
 *                 enum: [출석, 지각, 결석, 병결, 공결]
 *                 description: 출석 상태
 *               date:
 *                 type: string
 *                 format: date
 *                 description: 출석 날짜
 *               notes:
 *                 type: string
 *                 description: 비고
 *               startTime:
 *                 type: string
 *                 format: time
 *                 description: 강의 시작 시간
 *               endTime:
 *                 type: string
 *                 format: time
 *                 description: 강의 종료 시간
 *     responses:
 *       200:
 *         description: 출석 정보 생성/수정 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음
 *       500:
 *         description: 서버 오류
 */
router.post('/check', [verifyToken, isProfessor], attendanceService.checkAttendance);

/**
 * @swagger
 * /api/attendance/{id}:
 *   put:
 *     summary: 출석 정보 수정
 *     description: 기존 출석 정보를 수정합니다. 교수자만 접근 가능합니다.
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 출석 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [출석, 지각, 결석, 병결, 공결]
 *                 description: 출석 상태
 *               notes:
 *                 type: string
 *                 description: 비고
 *     responses:
 *       200:
 *         description: 출석 정보 수정 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음
 *       404:
 *         description: 출석 정보를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.put('/:id', [verifyToken, isProfessor], attendanceService.updateAttendance);

/**
 * @swagger
 * /api/attendance/qr/{lectureId}:
 *   get:
 *     summary: QR 코드 생성
 *     description: 출석 체크를 위한 QR 코드를 생성합니다. 교수자만 접근 가능합니다.
 *     tags: [Attendance]
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
router.get('/qr/:lectureId', [verifyToken, isProfessor], attendanceService.generateQRCode);

/**
 * @swagger
 * /api/attendance/password/{lectureId}:
 *   get:
 *     summary: 출석 비밀번호 생성
 *     description: 출석 체크를 위한 비밀번호를 생성합니다. 교수자만 접근 가능합니다.
 *     tags: [Attendance]
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
 *         description: 비밀번호 생성 성공
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음
 *       404:
 *         description: 강의를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.get('/password/:lectureId', [verifyToken, isProfessor], attendanceService.generatePassword);

/**
 * @swagger
 * /api/attendance/check-qr:
 *   post:
 *     summary: QR 코드로 출석 체크
 *     description: QR 코드를 사용하여 출석합니다.
 *     tags: [Attendance]
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
router.post('/check-qr', verifyToken, attendanceService.checkAttendanceByQR);

/**
 * @swagger
 * /api/attendance/check-password:
 *   post:
 *     summary: 비밀번호로 출석 체크
 *     description: 비밀번호를 사용하여 출석합니다.
 *     tags: [Attendance]
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
 *               - password
 *             properties:
 *               lectureId:
 *                 type: string
 *                 description: 강의 ID
 *               password:
 *                 type: string
 *                 description: 출석 비밀번호
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
router.post('/check-password', verifyToken, attendanceService.checkAttendanceByPassword);

/**
 * @swagger
 * /api/attendance/lectures/{lectureId}:
 *   get:
 *     summary: 강의별 출석 현황 조회 (날짜 및 시간대별)
 *     description: 특정 강의의 학생들 출석 현황을 날짜와 시간대별로 조회합니다. 교수자만 접근 가능합니다.
 *     tags: [Attendance]
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
 *         description: 출석 날짜 (YYYY-MM-DD)
 *       - in: query
 *         name: startTime
 *         schema:
 *           type: string
 *         description: 시작 시간 (HH:MM 형식)
 *       - in: query
 *         name: endTime
 *         schema:
 *           type: string
 *         description: 종료 시간 (HH:MM 형식)
 *     responses:
 *       200:
 *         description: 강의별 출석 현황 조회 성공
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음
 *       404:
 *         description: 강의를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.get('/lectures/:lectureId', [verifyToken, isProfessor], attendanceService.getAttendanceByLecture);

module.exports = router; 