const express = require('express');
const router = express.Router();
const absenceService = require('../service/absence.service');
const { verifyToken, isProfessor, isOwnerOrAuthorized } = require('../middleware/authJwt');
const uploadMiddleware = require('../middleware/upload');

/**
 * @swagger
 * tags:
 *   name: Absences
 *   description: 조퇴 신청 관리
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Absence:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         date:
 *           type: string
 *           format: date
 *         leaveTime:
 *           type: string
 *           format: time
 *         reason:
 *           type: string
 *         status:
 *           type: string
 *           enum: [대기, 승인, 반려, 검토중]
 *         documents:
 *           type: array
 *           items:
 *             type: object
 *         feedback:
 *           type: string
 *         studentId:
 *           type: integer
 *         lectureId:
 *           type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */


/**
 * @swagger
 * /api/absences/my:
 *   get:
 *     summary: 내 조퇴 신청 조회 (강의실와 날짜기준)
 *     tags: [Absences]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [대기, 승인, 반려, 검토중]
 *       - in: query
 *         name: lectureId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: 내 조퇴 신청 목록 조회 성공
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: 서버 오류
 */
router.get('/my', verifyToken, absenceService.getMyAbsences);

/**
 * @swagger
 * /api/absences/lectures/{lectureId}:
 *   get:
 *     summary: 날짜 및 강의실 기반 강의별 조퇴 신청 조회 (교수자용)
 *     tags: [Absences]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lectureId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [대기, 승인, 반려, 검토중]
 *     responses:
 *       200:
 *         description: 강의별 조퇴 신청 목록 조회 성공
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음
 *       500:
 *         description: 서버 오류
 */
router.get('/lectures/:lectureId', [verifyToken, isProfessor], absenceService.getAbsencesByLectureAndDate);

/**
 * @swagger
 * /api/absences/students/{studentId}/lectures/{lectureId}:
 *   get:
 *     summary: 특정 학생의 날짜와 강의 기준 조퇴 목록 조회
 *     tags: [Absences]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: lectureId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [대기, 승인, 반려, 검토중]
 *     responses:
 *       200:
 *         description: 학생/강의별 조퇴 신청 목록 조회 성공
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음
 *       500:
 *         description: 서버 오류
 */
router.get('/students/:studentId/lectures/:lectureId', [verifyToken, isOwnerOrAuthorized], absenceService.getAbsencesByStudentLectureDate);

/**
 * @swagger
 * /api/absences/students/{studentId}/date/{date}:
 *   get:
 *     summary: 특정 학생의 특정 날짜 조퇴 신청 조회
 *     tags: [Absences]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [대기, 승인, 반려, 검토중]
 *     responses:
 *       200:
 *         description: 학생의 특정 날짜 조퇴 신청 목록 조회 성공
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음
 *       500:
 *         description: 서버 오류
 */
router.get('/students/:studentId/date/:date', [verifyToken, isOwnerOrAuthorized], absenceService.getAbsencesByStudentAndDate);

/**
 * @swagger
 * /api/absences/{id}:
 *   get:
 *     summary: 특정 조퇴 신청 조회
 *     tags: [Absences]
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
 *         description: 조퇴 신청 조회 성공
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음
 *       404:
 *         description: 조퇴 신청을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.get('/:id', [verifyToken, isOwnerOrAuthorized], absenceService.getAbsenceById);

/**
 * @swagger
 * /api/absences:
 *   post:
 *     summary: 조퇴 신청 생성
 *     tags: [Absences]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - date
 *               - leaveTime
 *               - reason
 *               - lectureId
 *               - attendanceId
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *               leaveTime:
 *                 type: string
 *                 format: time
 *               reason:
 *                 type: string
 *               lectureId:
 *                 type: integer
 *               attendanceId:
 *                 type: integer
 *                 description: 출석 기록 ID (결석/지각/병결인 경우에만 가능)
 *               documents:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: 조퇴 신청 생성 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: 서버 오류
 */
router.post('/', [verifyToken, uploadMiddleware.array('documents', 5)], absenceService.createAbsence);

/**
 * @swagger
 * /api/absences/{id}:
 *   put:
 *     summary: 조퇴 신청 수정 (상태가 '대기' 일 때만 가능)
 *     tags: [Absences]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *               leaveTime:
 *                 type: string
 *                 format: time
 *               removeDocuments:
 *                 type: array
 *                 items:
 *                   type: string
 *               documents:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: 조퇴 신청 수정 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음
 *       404:
 *         description: 조퇴 신청을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.put('/:id', [verifyToken, isOwnerOrAuthorized, uploadMiddleware.array('documents', 5)], absenceService.updateAbsence);

/**
 * @swagger
 * /api/absences/{id}/status:
 *   put:
 *     summary: 조퇴 신청 상태 변경 (교수/관리자 전용)
 *     tags: [Absences]
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
 *                 enum: [승인, 반려, 검토중]
 *               feedback:
 *                 type: string
 *     responses:
 *       200:
 *         description: 조퇴 신청 상태 변경 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음
 *       404:
 *         description: 조퇴 신청을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.put('/:id/status', [verifyToken, isProfessor], absenceService.updateAbsenceStatus);

/**
 * @swagger
 * /api/absences/{id}:
 *   delete:
 *     summary: 조퇴 신청 삭제 (상태가 '대기' 일 때만 가능)
 *     tags: [Absences]
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
 *         description: 조퇴 신청 삭제 성공
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음
 *       404:
 *         description: 조퇴 신청을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.delete('/:id', [verifyToken, isOwnerOrAuthorized], absenceService.deleteAbsence);

/**
 * @swagger
 * /api/absences/{id}/documents/{filename}:
 *   get:
 *     summary: 첨부 문서 다운로드
 *     tags: [Absences]
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
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음
 *       404:
 *         description: 파일을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.get('/:id/documents/:filename', verifyToken, absenceService.downloadDocument);

/**
 * @swagger
 * /api/absences/lectures/{lectureId}/monthly:
 *   get:
 *     summary: 강의별 월단위 모든 학생 조퇴 신청 조회 (교수자용)
 *     tags: [Absences]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lectureId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: year
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: month
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [대기, 승인, 반려, 검토중]
 *     responses:
 *       200:
 *         description: 월단위 강의별 조퇴 신청 목록 조회 성공
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음
 *       500:
 *         description: 서버 오류
 */
router.get('/lectures/:lectureId/monthly', [verifyToken, isProfessor], absenceService.getMonthlyAbsencesByLecture);

/**
 * @swagger
 * /api/absences/my/lectures/{lectureId}/monthly:
 *   get:
 *     summary: 학생이 자신의 특정 강의에 대한 월단위 조퇴 신청 조회
 *     tags: [Absences]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lectureId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: year
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: month
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [대기, 승인, 반려, 검토중]
 *     responses:
 *       200:
 *         description: 학생 본인의 월단위 조퇴 신청 목록 조회 성공
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: 서버 오류
 */
router.get('/my/lectures/:lectureId/monthly', verifyToken, absenceService.getMyMonthlyAbsencesByLecture);

module.exports = router;