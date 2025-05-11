const express = require('express');
const router = express.Router();
const studentService = require('../service/student.service');
const { verifyToken, isProfessor, isAdmin, isOwnerOrAuthorized } = require('../middleware/authJwt');

/**
 * @swagger
 * tags:
 *   name: Students
 *   description: 학생 정보 관리
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Student:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         studentId:
 *           type: string
 *         email:
 *           type: string
 *         department:
 *           type: string
 *         grade:
 *           type: integer
 *         status:
 *           type: string
 *           enum: [재학, 휴학, 졸업, 제적]
 *         enrollmentDate:
 *           type: string
 *           format: date
 *         phone:
 *           type: string
 *         address:
 *           type: string
 *         emergencyContact:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/students:
 *   get:
 *     summary: 모든 학생 목록 가져오기 (교수/관리자 전용)
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: 학생 목록 조회 성공
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음
 *       500:
 *         description: 서버 오류
 */
router.get('/', [verifyToken, isProfessor], studentService.getAllStudents);

/**
 * @swagger
 * /api/students/search:
 *   get:
 *     summary: 학생 검색
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *       - in: query
 *         name: field
 *         schema:
 *           type: string
 *           enum: [name, studentId, department, all]
 *           default: all
 *     responses:
 *       200:
 *         description: 학생 검색 성공
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음
 *       500:
 *         description: 서버 오류
 */
router.get('/search', [verifyToken, isProfessor], studentService.searchStudents);

/**
 * @swagger
 * /api/students/{id}:
 *   get:
 *     summary: 특정 학생 정보 가져오기 (교수/관리자 전용)
 *     tags: [Students]
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
 *         description: 학생 정보 조회 성공
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음
 *       404:
 *         description: 학생을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.get('/:id', [verifyToken, isProfessor], studentService.getStudentById);


module.exports = router; 