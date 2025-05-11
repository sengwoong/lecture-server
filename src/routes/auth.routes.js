const express = require('express');
const router = express.Router();
const authService = require('../service/auth.service');
const { verifyToken } = require('../middleware/authJwt');

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: 사용자 인증 및 계정 관리 API
 */

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: 회원가입
 *     description: 새로운 사용자 계정을 생성합니다. 역할을 지정하지 않으면 기본적으로 학생 역할이 부여됩니다.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *               - name
 *             properties:
 *               username:
 *                 type: string
 *                 description: 사용자 아이디
 *               email:
 *                 type: string
 *                 format: email
 *                 description: 이메일
 *               password:
 *                 type: string
 *                 format: password
 *                 description: 비밀번호
 *               name:
 *                 type: string
 *                 description: 사용자 이름
 *               roles:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [student, professor]
 *                 description: 사용자 역할 (student - 학생, professor - 교수자, 기본값은 student)
 *               phone:
 *                 type: string
 *                 description: 전화번호 (선택적)
 *               studentId:
 *                 type: string
 *                 description: 학번 (선택적)
 *     responses:
 *       201:
 *         description: 회원가입 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 회원가입이 완료되었습니다
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *                     roles:
 *                       type: array
 *                       items:
 *                         type: string
 *       400:
 *         description: 잘못된 요청 (이미 존재하는 사용자 등)
 *       500:
 *         description: 서버 오류
 */
router.post('/signup', authService.signup);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: 로그인
 *     description: 사용자 로그인 및 JWT 토큰 발급
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: 사용자 아이디
 *               password:
 *                 type: string
 *                 format: password
 *                 description: 비밀번호
 *     responses:
 *       200:
 *         description: 로그인 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 username:
 *                   type: string
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *                 roles:
 *                   type: array
 *                   items:
 *                     type: string
 *                 accessToken:
 *                   type: string
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: 서버 오류
 */
router.post('/login', authService.login);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: 현재 사용자 정보 조회
 *     description: 현재 로그인한 사용자의 정보를 반환합니다.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 사용자 정보 조회 성공
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: 서버 오류
 */
router.get('/me', verifyToken, authService.getUserInfo);

/**
 * @swagger
 * /api/auth/change-password:
 *   put:
 *     summary: 비밀번호 변경
 *     description: 현재 로그인한 사용자의 비밀번호를 변경합니다.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *                 description: 현재 비밀번호
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 description: 새 비밀번호
 *     responses:
 *       200:
 *         description: 비밀번호 변경 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: 서버 오류
 */
router.put('/change-password', verifyToken, authService.changePassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: 비밀번호 재설정
 *     description: 사용자의 비밀번호를 재설정합니다.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: 가입 시 등록한 이메일
 *     responses:
 *       200:
 *         description: 비밀번호 재설정 이메일 전송 성공
 *       404:
 *         description: 사용자를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.post('/reset-password', authService.resetPassword);

/**
 * @swagger
 * /api/auth/roles:
 *   get:
 *     summary: 사용 가능한 역할 목록 조회
 *     description: 시스템에서 사용 가능한 모든 역할을 조회합니다.
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: 역할 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *       500:
 *         description: 서버 오류
 */
router.get('/roles', authService.getRoles);

module.exports = router; 