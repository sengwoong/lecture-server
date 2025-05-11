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
 * /api/attendance/lectures/{lectureId}:
 *   get:
 *     summary: 강의별 출석 목록 조회
 *     description: 특정 강의의 모든 출석 정보를 조회합니다.
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
 *         description: 강의별 출석 목록 조회 성공
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 강의를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.get('/lectures/:lectureId', verifyToken, attendanceService.getAttendanceByLecture);

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
 * /api/attendance:
 *   post:
 *     summary: 출석 정보 생성
 *     description: 새로운 출석 정보를 생성합니다. 교수자만 접근 가능합니다.
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
 *                 enum: [present, late, absent]
 *                 description: 출석 상태
 *               date:
 *                 type: string
 *                 format: date
 *                 description: 출석 날짜
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
router.post('/', [verifyToken, isProfessor], attendanceService.createAttendance);

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
 *                 enum: [present, late, absent]
 *                 description: 출석 상태
 *               date:
 *                 type: string
 *                 format: date
 *                 description: 출석 날짜
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

module.exports = router; 