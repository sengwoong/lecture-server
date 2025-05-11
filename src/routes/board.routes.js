const express = require('express');
const router = express.Router();
const boardService = require('../service/board.service');
const { verifyToken, isProfessor } = require('../middleware/authJwt');
const uploadMiddleware = require('../middleware/upload');

/**
 * @swagger
 * tags:
 *   name: Board
 *   description: 게시판 관리 API (교수만 게시글 작성 가능)
 */

/**
 * @swagger
 * /api/board:
 *   get:
 *     summary: 게시글 목록 조회
 *     description: 사용자 권한에 따라 게시글을 조회합니다. (학생은 수강중인 강의의 게시글만 조회 가능)
 *     tags: [Board]
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
 *         description: 페이지당 게시글 수
 *     responses:
 *       200:
 *         description: 게시글 목록 조회 성공
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: 서버 오류
 */
router.get('/', verifyToken, boardService.getAllPosts);

/**
 * @swagger
 * /api/board/{id}:
 *   get:
 *     summary: 특정 게시글 조회
 *     description: 게시글 ID로 특정 게시글의 상세 정보를 조회합니다. (학생은 수강중인 강의의 게시글만 조회 가능)
 *     tags: [Board]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 게시글 ID
 *     responses:
 *       200:
 *         description: 게시글 조회 성공
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 게시글을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.get('/:id', verifyToken, boardService.getPostById);

/**
 * @swagger
 * /api/board:
 *   post:
 *     summary: 게시글 작성 (교수만 가능)
 *     description: 새로운 게시글을 작성합니다. 첨부 파일도 업로드할 수 있습니다.
 *     tags: [Board]
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
 *               - lectureId
 *             properties:
 *               title:
 *                 type: string
 *                 description: 게시글 제목
 *               content:
 *                 type: string
 *                 description: 게시글 내용
 *               lectureId:
 *                 type: integer
 *                 description: 강의 ID (특정 강의에 대한 게시글)
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: 첨부 파일 (최대 5개)
 *     responses:
 *       201:
 *         description: 게시글 작성 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음
 *       500:
 *         description: 서버 오류
 */
router.post('/', [verifyToken, isProfessor, uploadMiddleware.array('attachments', 5)], boardService.createPost);

/**
 * @swagger
 * /api/board/{id}:
 *   put:
 *     summary: 게시글 수정 (교수만 가능)
 *     description: 기존 게시글을 수정합니다. 첨부 파일도 업데이트할 수 있습니다.
 *     tags: [Board]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 게시글 ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: 게시글 제목
 *               content:
 *                 type: string
 *                 description: 게시글 내용
 *               lectureId:
 *                 type: integer
 *                 description: 강의 ID
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: 첨부 파일 (최대 5개)
 *               removeAttachments:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 삭제할 첨부 파일 ID 목록
 *     responses:
 *       200:
 *         description: 게시글 수정 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음
 *       404:
 *         description: 게시글을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.put('/:id', [verifyToken, isProfessor, uploadMiddleware.array('attachments', 5)], boardService.updatePost);

/**
 * @swagger
 * /api/board/{id}:
 *   delete:
 *     summary: 게시글 삭제 (교수만 가능)
 *     description: 특정 게시글을 삭제합니다.
 *     tags: [Board]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 게시글 ID
 *     responses:
 *       200:
 *         description: 게시글 삭제 성공
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 권한 없음
 *       404:
 *         description: 게시글을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.delete('/:id', [verifyToken, isProfessor], boardService.deletePost);

/**
 * @swagger
 * /api/board/{id}/attachments/{filename}:
 *   get:
 *     summary: 첨부 파일 다운로드
 *     description: 게시글에 첨부된 파일을 다운로드합니다.
 *     tags: [Board]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 게시글 ID
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: 파일명
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
router.get('/:id/attachments/:filename', verifyToken, boardService.downloadAttachment);

module.exports = router;