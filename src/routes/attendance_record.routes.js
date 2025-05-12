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


module.exports = router; 