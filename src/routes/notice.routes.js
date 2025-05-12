const express = require('express');
const router = express.Router();
const noticeService = require('../service/notice.service');
const { verifyToken, isProfessor } = require('../middleware/authJwt');
const uploadMiddleware = require('../middleware/upload');

/**
 * @swagger
 * tags:
 *   name: Notices
 *   description: 공지사항 관리
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Notice:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         title:
 *           type: string
 *         content:
 *           type: string
 *         category:
 *           type: string
 *           enum: [학과, 장학, 수업, 행사, 기타]
 *         importance:
 *           type: string
 *           enum: [일반, 중요, 긴급]
 *         startDate:
 *           type: string
 *           format: date
 *         endDate:
 *           type: string
 *           format: date
 *         viewCount:
 *           type: integer
 *         attachments:
 *           type: array
 *           items:
 *             type: object
 *         createdBy:
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
 * /api/notices:
 *   get:
 *     summary: 모든 공지사항 가져오기
 *     tags: [Notices]
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
 *           default: 10
 *     responses:
 *       200:
 *         description: 공지사항 목록 조회 성공
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: 서버 오류
 */
router.get('/', verifyToken, noticeService.getAllNotices);

/**
 * @swagger
 * /api/notices/{id}:
 *   get:
 *     summary: 특정 공지사항 가져오기
 *     tags: [Notices]
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
 *         description: 공지사항 조회 성공
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 공지사항을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.get('/:id', verifyToken, noticeService.getNoticeById);

/**
 * @swagger
 * /api/notices:
 *   post:
 *     summary: 공지사항 생성하기 (교수/관리자 전용)
 *     tags: [Notices]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               category:
 *                 type: string
 *                 enum: [학과, 장학, 수업, 행사, 기타]
 *                 default: 기타
 *               importance:
 *                 type: string
 *                 enum: [일반, 중요, 긴급]
 *                 default: 일반
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               lectureId:
 *                 type: integer
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: 공지사항 생성 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음
 *       500:
 *         description: 서버 오류
 */
router.post('/', [verifyToken, isProfessor, uploadMiddleware.array('attachments', 5)], noticeService.createNotice);

/**
 * @swagger
 * /api/notices/{id}:
 *   put:
 *     summary: 공지사항 수정하기 (교수/관리자 전용)
 *     tags: [Notices]
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
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               category:
 *                 type: string
 *                 enum: [학과, 장학, 수업, 행사, 기타]
 *               importance:
 *                 type: string
 *                 enum: [일반, 중요, 긴급]
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               lectureId:
 *                 type: integer
 *               removeAttachments:
 *                 type: array
 *                 items:
 *                   type: string
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: 공지사항 수정 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음
 *       404:
 *         description: 공지사항을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.put('/:id', [verifyToken, isProfessor, uploadMiddleware.array('attachments', 5)], noticeService.updateNotice);

/**
 * @swagger
 * /api/notices/{id}:
 *   delete:
 *     summary: 공지사항 삭제하기 (교수/관리자 전용)
 *     tags: [Notices]
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
 *         description: 공지사항 삭제 성공
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음
 *       404:
 *         description: 공지사항을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.delete('/:id', [verifyToken, isProfessor], noticeService.deleteNotice);

/**
 * @swagger
 * /api/notices/{id}/attachments/{filename}:
 *   get:
 *     summary: 첨부파일 다운로드
 *     tags: [Notices]
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
 *       404:
 *         description: 파일을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.get('/:id/attachments/:filename', verifyToken, noticeService.downloadAttachment);

module.exports = router; 