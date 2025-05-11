const express = require('express');
const router = express.Router();
const notificationService = require('../service/notification.service');
const { verifyToken } = require('../middleware/authJwt');

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: 알림 관리 API
 */

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: 알림 목록 조회
 *     description: 현재 로그인한 사용자의 모든 알림을 조회합니다.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 알림 목록 조회 성공
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: 서버 오류
 */
router.get('/', verifyToken, notificationService.getNotifications);

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   put:
 *     summary: 알림 읽음 표시
 *     description: 특정 알림을 읽음으로 표시합니다.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 알림 ID
 *     responses:
 *       200:
 *         description: 알림 읽음 표시 성공
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 알림을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.put('/:id/read', verifyToken, notificationService.markAsRead);

/**
 * @swagger
 * /api/notifications/read-all:
 *   put:
 *     summary: 모든 알림 읽음 표시
 *     description: 현재 사용자의 모든 알림을 읽음으로 표시합니다.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 모든 알림 읽음 표시 성공
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: 서버 오류
 */
router.put('/read-all', verifyToken, notificationService.markAllAsRead);

/**
 * @swagger
 * /api/notifications/{id}:
 *   delete:
 *     summary: 알림 삭제
 *     description: 특정 알림을 삭제합니다.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 알림 ID
 *     responses:
 *       200:
 *         description: 알림 삭제 성공
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 알림을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.delete('/:id', verifyToken, notificationService.deleteNotification);

module.exports = router; 