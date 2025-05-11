const express = require('express');
const router = express.Router();
const enrollmentService = require('../service/enrollment.service');
const { verifyToken, isProfessor, isStudent } = require('../middleware/authJwt');

/**
 * @swagger
 * tags:
 *   name: Enrollments
 *   description: 수강신청 관리 API
 */

/**
 * @swagger
 * /api/enrollments:
 *   get:
 *     summary: 내 수강신청 목록 조회
 *     description: 학생 자신의 수강신청 목록을 조회합니다.
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 페이지 번호
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 페이지당 항목 수
 *     responses:
 *       200:
 *         description: 수강신청 목록 조회 성공
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: 서버 오류
 */
router.get('/', verifyToken, enrollmentService.getStudentEnrollments);

/**
 * @swagger
 * /api/enrollments/student/{studentId}:
 *   get:
 *     summary: 특정 학생의 수강신청 목록 조회 (교수/관리자 전용)
 *     description: 특정 학생의 수강신청 목록을 조회합니다.
 *     tags: [Enrollments]
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
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 페이지 번호
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 페이지당 항목 수
 *     responses:
 *       200:
 *         description: 수강신청 목록 조회 성공
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음
 *       500:
 *         description: 서버 오류
 */
router.get('/student/:studentId', [verifyToken, isProfessor], enrollmentService.getStudentEnrollments);

/**
 * @swagger
 * /api/enrollments/lecture/{lectureId}:
 *   get:
 *     summary: 특정 강의의 수강생 목록 조회 (교수 전용)
 *     description: 특정 강의를 수강 중인 학생 목록을 조회합니다.
 *     tags: [Enrollments]
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
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 페이지 번호
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 페이지당 항목 수
 *     responses:
 *       200:
 *         description: 수강생 목록 조회 성공
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음
 *       500:
 *         description: 서버 오류
 */
router.get('/lecture/:lectureId', [verifyToken, isProfessor], enrollmentService.getLectureEnrollments);

/**
 * @swagger
 * /api/enrollments/{id}:
 *   get:
 *     summary: 특정 수강신청 조회
 *     description: 특정 수강신청의 상세 정보를 조회합니다.
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 수강신청 ID
 *     responses:
 *       200:
 *         description: 수강신청 조회 성공
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음
 *       404:
 *         description: 수강신청을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.get('/:id', verifyToken, enrollmentService.getEnrollmentById);

/**
 * @swagger
 * /api/enrollments:
 *   post:
 *     summary: 수강신청 등록
 *     description: 새로운 수강신청을 등록합니다.
 *     tags: [Enrollments]
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
 *             properties:
 *               lectureId:
 *                 type: integer
 *                 description: 강의 ID
 *     responses:
 *       201:
 *         description: 수강신청 등록 성공
 *       400:
 *         description: 이미 수강 중인 강의
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 학생만 수강신청 가능
 *       404:
 *         description: 강의를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.post('/', [verifyToken, isStudent], enrollmentService.createEnrollment);

/**
 * @swagger
 * /api/enrollments/{id}:
 *   delete:
 *     summary: 수강신청 취소
 *     description: 수강신청을 취소합니다.
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 수강신청 ID
 *     responses:
 *       200:
 *         description: 수강신청 취소 성공
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 본인의 수강신청만 취소 가능
 *       404:
 *         description: 수강신청을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.delete('/:id', verifyToken, enrollmentService.deleteEnrollment);

module.exports = router; 