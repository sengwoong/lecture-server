const express = require('express');
const router = express.Router();
const absenceService = require('../service/absence.service');
const { verifyToken, isProfessor, isOwnerOrAuthorized } = require('../middleware/authJwt');
const uploadMiddleware = require('../middleware/upload');

/**
 * @swagger
 * tags:
 *   name: Absences
 *   description: 병결 신청 관리
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
 *         startDate:
 *           type: string
 *           format: date
 *         endDate:
 *           type: string
 *           format: date
 *         reason:
 *           type: string
 *         status:
 *           type: string
 *           enum: [대기, 승인, 거절]
 *         documents:
 *           type: array
 *           items:
 *             type: object
 *         comment:
 *           type: string
 *         studentId:
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
 * /api/absences:
 *   get:
 *     summary: 모든 병결 신청 조회 (교수/관리자 전용)
 *     tags: [Absences]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [대기, 승인, 거절]
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
 *         description: 병결 신청 목록 조회 성공
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음
 *       500:
 *         description: 서버 오류
 */
router.get('/', [verifyToken, isProfessor], absenceService.getAllAbsences);

/**
 * @swagger
 * /api/absences/students/{studentId}:
 *   get:
 *     summary: 학생별 병결 신청 조회
 *     tags: [Absences]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [대기, 승인, 거절]
 *     responses:
 *       200:
 *         description: 병결 신청 목록 조회 성공
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음
 *       500:
 *         description: 서버 오류
 */
router.get('/students/:studentId', [verifyToken, isOwnerOrAuthorized], absenceService.getAbsencesByStudent);

/**
 * @swagger
 * /api/absences/{id}:
 *   get:
 *     summary: 특정 병결 신청 조회
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
 *         description: 병결 신청 조회 성공
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음
 *       404:
 *         description: 병결 신청을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.get('/:id', [verifyToken, isOwnerOrAuthorized], absenceService.getAbsenceById);

/**
 * @swagger
 * /api/absences:
 *   post:
 *     summary: 병결 신청 생성
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
 *               - startDate
 *               - endDate
 *               - reason
 *             properties:
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               reason:
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
router.post('/', [verifyToken, uploadMiddleware.array('documents', 5)], absenceService.createAbsence);

/**
 * @swagger
 * /api/absences/{id}:
 *   put:
 *     summary: 병결 신청 수정 (상태가 '대기' 일 때만 가능)
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
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               reason:
 *                 type: string
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
 *         description: 병결 신청 수정 성공
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
router.put('/:id', [verifyToken, isOwnerOrAuthorized, uploadMiddleware.array('documents', 5)], absenceService.updateAbsence);

/**
 * @swagger
 * /api/absences/{id}/status:
 *   put:
 *     summary: 병결 신청 상태 변경 (교수/관리자 전용)
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
 *                 enum: [승인, 거절]
 *               comment:
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
router.put('/:id/status', [verifyToken, isProfessor], absenceService.updateAbsenceStatus);

/**
 * @swagger
 * /api/absences/{id}:
 *   delete:
 *     summary: 병결 신청 삭제 (상태가 '대기' 일 때만 가능)
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

module.exports = router;