const express = require('express');
const router = express.Router();
const lectureService = require('../service/lecture.service');
const { verifyToken, isProfessor } = require('../middleware/authJwt');

/**
 * @swagger
 * tags:
 *   name: Lectures
 *   description: 강의 관리 API (교수만 강의 생성/수정/삭제 가능)
 */

/**
 * @swagger
 * /api/lectures:
 *   get:
 *     summary: 강의 목록 조회
 *     description: 모든 강의 목록을 조회합니다. 학생은 수강 신청한 강의만 볼 수 있습니다.
 *     tags: [Lectures]
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
 *         description: 페이지당 강의 수
 *       - in: query
 *         name: semester
 *         schema:
 *           type: string
 *         description: 학기 필터링 예시 2023-1
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *         description: 학과 필터링
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 검색어
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: 정렬 기준
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           default: DESC
 *         description: 정렬 방향
 *     responses:
 *       200:
 *         description: 강의 목록 조회 성공
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: 서버 오류
 */
router.get('/', verifyToken, lectureService.getAllLectures);

/**
 * @swagger
 * /api/lectures/{id}:
 *   get:
 *     summary: 특정 강의 조회
 *     description: 강의 ID로 특정 강의의 상세 정보를 조회합니다.
 *     tags: [Lectures]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 강의 ID
 *     responses:
 *       200:
 *         description: 강의 조회 성공
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 강의를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.get('/:id', verifyToken, lectureService.getLectureById);

/**
 * @swagger
 * /api/lectures:
 *   post:
 *     summary: 강의 생성 교수만 가능
 *     description: 새로운 강의를 생성합니다.
 *     tags: [Lectures]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - code
 *               - semester
 *               - department
 *             properties:
 *               name:
 *                 type: string
 *                 description: 강의명
 *               code:
 *                 type: string
 *                 description: 강의 코드
 *               semester:
 *                 type: string
 *                 description: 학기 예시 2023-1
 *               department:
 *                 type: string
 *                 description: 학과
 *               dayOfWeek:
 *                 type: string
 *                 description: 강의 요일
 *               startTime:
 *                 type: string
 *                 description: 강의 시작 시간
 *               endTime:
 *                 type: string
 *                 description: 강의 종료 시간
 *               room:
 *                 type: string
 *                 description: 강의실
 *               description:
 *                 type: string
 *                 description: 강의 설명
 *     responses:
 *       201:
 *         description: 강의 생성 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음
 *       500:
 *         description: 서버 오류
 */
router.post('/', [verifyToken, isProfessor], lectureService.createLecture);

/**
 * @swagger
 * /api/lectures/{id}:
 *   put:
 *     summary: 강의 수정 교수만 가능
 *     description: 기존 강의를 수정합니다.
 *     tags: [Lectures]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 강의 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: 강의명
 *               code:
 *                 type: string
 *                 description: 강의 코드
 *               semester:
 *                 type: string
 *                 description: 학기 예시 2023-1
 *               department:
 *                 type: string
 *                 description: 학과
 *               dayOfWeek:
 *                 type: string
 *                 description: 강의 요일
 *               startTime:
 *                 type: string
 *                 description: 강의 시작 시간
 *               endTime:
 *                 type: string
 *                 description: 강의 종료 시간
 *               room:
 *                 type: string
 *                 description: 강의실
 *               description:
 *                 type: string
 *                 description: 강의 설명
 *               isActive:
 *                 type: boolean
 *                 description: 활성화 여부
 *     responses:
 *       200:
 *         description: 강의 수정 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음
 *       404:
 *         description: 강의를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.put('/:id', [verifyToken, isProfessor], lectureService.updateLecture);

/**
 * @swagger
 * /api/lectures/{id}:
 *   delete:
 *     summary: 강의 삭제 교수만 가능
 *     description: 특정 강의를 삭제합니다.
 *     tags: [Lectures]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 강의 ID
 *     responses:
 *       200:
 *         description: 강의 삭제 성공
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음
 *       404:
 *         description: 강의를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.delete('/:id', [verifyToken, isProfessor], lectureService.deleteLecture);

/**
 * @swagger
 * /api/lectures/{id}/students:
 *   get:
 *     summary: 강의 수강생 목록 조회
 *     description: 특정 강의를 수강 중인 학생 목록을 조회합니다.
 *     tags: [Lectures]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 강의 ID
 *     responses:
 *       200:
 *         description: 수강생 목록 조회 성공
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음
 *       404:
 *         description: 강의를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.get('/:id/students', [verifyToken, isProfessor], lectureService.getLectureStudents);

module.exports = router; 