const express = require('express');
const router = express.Router();
const lectureScheduleService = require('../service/lecture_schedule.service');
const { verifyToken, isProfessor } = require('../middleware/authJwt');

/**
 * @swagger
 * tags:
 *   name: LectureSchedules
 *   description: 강의 일정 관리 API
 */

/**
 * @swagger
 * /api/lecture-schedules:
 *   post:
 *     summary: 강의 일정 생성
 *     description: 새로운 강의 일정을 생성합니다.
 *     tags: [LectureSchedules]
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
 *               - week
 *               - date
 *               - startTime
 *               - endTime
 *             properties:
 *               lectureId:
 *                 type: integer
 *                 description: 강의 ID
 *               week:
 *                 type: integer
 *                 description: 주차 (1주차, 2주차 등)
 *               date:
 *                 type: string
 *                 format: date
 *                 description: 강의 날짜
 *               startTime:
 *                 type: string
 *                 format: time
 *                 description: 강의 시작 시간 (HH:MM:SS)
 *               endTime:
 *                 type: string
 *                 format: time
 *                 description: 강의 종료 시간 (HH:MM:SS)
 *               topic:
 *                 type: string
 *                 description: 강의 주제
 *               notes:
 *                 type: string
 *                 description: 강의 노트
 *               scheduleType:
 *                 type: string
 *                 enum: [ 휴강, 보충]
 *                 description: 강의 일정 유형
 *               makeupReason:
 *                 type: string
 *                 description: 휴강/보충 사유
 *     responses:
 *       201:
 *         description: 강의 일정 생성 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음
 *       500:
 *         description: 서버 오류
 */
router.post('/', [verifyToken, isProfessor], lectureScheduleService.createLectureSchedule);

/**
 * @swagger
 * /api/lecture-schedules/lectures/{lectureId}:
 *   get:
 *     summary: 강의별 일정 목록 조회
 *     description: 강의의 일정을 조회합니다. 연도별, 월별, 일별로 조회 가능합니다.
 *     tags: [LectureSchedules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lectureId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 강의 ID
 *       - in: query
 *         name: year
 *         schema:
 *           type: string
 *         description: "연도 파라미터 (예시: 2025)"
 *       - in: query
 *         name: month
 *         schema:
 *           type: string
 *         description: "월 파라미터 (예시: 05, 5)"
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *         description: "일 파라미터 (예시: 11)"
 *       - in: query
 *         name: scheduleType
 *         schema:
 *           type: string
 *           enum: [휴강, 보충]
 *         description: 일정 유형
 *     responses:
 *       200:
 *         description: 강의 일정 조회 성공
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 강의를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.get('/lectures/:lectureId', verifyToken, lectureScheduleService.getLectureSchedules);

/**
 * @swagger
 * /api/lecture-schedules/{id}:
 *   get:
 *     summary: 강의 일정 조회
 *     description: 특정 강의 일정의 상세 정보를 조회합니다.
 *     tags: [LectureSchedules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 강의 일정 ID
 *     responses:
 *       200:
 *         description: 강의 일정 조회 성공
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 강의 일정을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.get('/:id', verifyToken, lectureScheduleService.getLectureSchedule);

/**
 * @swagger
 * /api/lecture-schedules/{id}:
 *   put:
 *     summary: 강의 일정 수정
 *     description: 강의 일정 정보를 수정합니다.
 *     tags: [LectureSchedules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 강의 일정 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               week:
 *                 type: integer
 *               date:
 *                 type: string
 *                 format: date
 *               startTime:
 *                 type: string
 *                 format: time
 *               endTime:
 *                 type: string
 *                 format: time
 *               topic:
 *                 type: string
 *               notes:
 *                 type: string
 *               scheduleType:
 *                 type: string
 *                 enum: [ 휴강, 보충]
 *               makeupReason:
 *                 type: string
 *     responses:
 *       200:
 *         description: 강의 일정 수정 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음
 *       404:
 *         description: 강의 일정을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.put('/:id', [verifyToken, isProfessor], lectureScheduleService.updateLectureSchedule);


/**
 * @swagger
 * /api/lecture-schedules/{id}:
 *   delete:
 *     summary: 강의 일정 삭제
 *     description: 강의 일정을 삭제합니다.
 *     tags: [LectureSchedules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 강의 일정 ID
 *     responses:
 *       200:
 *         description: 강의 일정 삭제 성공
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음
 *       404:
 *         description: 강의 일정을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.delete('/:id', [verifyToken, isProfessor], lectureScheduleService.deleteLectureSchedule);

module.exports = router; 