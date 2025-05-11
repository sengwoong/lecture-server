const db = require('../models');
const Notification = db.notification;
const User = db.user;
const { Op } = db.Sequelize;

// SSE 클라이언트 관리 객체
const clients = {};

// 사용자의 모든 알림 가져오기
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // 알림 조회
    const { count, rows: notifications } = await Notification.findAndCountAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // 페이지네이션 정보
    const totalPages = Math.ceil(count / limit);
    const currentPage = parseInt(page);

    return res.status(200).json({
      notifications,
      pagination: {
        totalItems: count,
        totalPages,
        currentPage,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('알림 조회 오류:', error);
    return res.status(500).json({ message: '알림을 가져오는 중 오류가 발생했습니다' });
  }
};

// 읽지 않은 알림 가져오기
exports.getUnreadNotifications = async (req, res) => {
  try {
    const userId = req.userId;

    // 알림 조회
    const notifications = await Notification.findAll({
      where: { 
        userId,
        isRead: false
      },
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json(notifications);
  } catch (error) {
    console.error('읽지 않은 알림 조회 오류:', error);
    return res.status(500).json({ message: '알림을 가져오는 중 오류가 발생했습니다' });
  }
};

// 알림 읽음 표시하기
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // 알림 조회
    const notification = await Notification.findOne({
      where: {
        id,
        userId
      }
    });

    if (!notification) {
      return res.status(404).json({ message: '알림을 찾을 수 없습니다' });
    }

    // 업데이트
    await notification.update({ isRead: true });

    return res.status(200).json({
      message: '알림이 읽음으로 표시되었습니다',
      notification
    });
  } catch (error) {
    console.error('알림 읽음 표시 오류:', error);
    return res.status(500).json({ message: '알림 읽음 표시 중 오류가 발생했습니다' });
  }
};

// 모든 알림 읽음 표시하기
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.userId;

    // 모든 알림 업데이트
    await Notification.update(
      { isRead: true },
      { where: { userId, isRead: false } }
    );

    return res.status(200).json({
      message: '모든 알림이 읽음으로 표시되었습니다'
    });
  } catch (error) {
    console.error('알림 일괄 읽음 표시 오류:', error);
    return res.status(500).json({ message: '알림 읽음 표시 중 오류가 발생했습니다' });
  }
};

// 알림 삭제하기
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // 알림 조회
    const notification = await Notification.findOne({
      where: {
        id,
        userId
      }
    });

    if (!notification) {
      return res.status(404).json({ message: '알림을 찾을 수 없습니다' });
    }

    // 삭제
    await notification.destroy();

    return res.status(200).json({
      message: '알림이 삭제되었습니다'
    });
  } catch (error) {
    console.error('알림 삭제 오류:', error);
    return res.status(500).json({ message: '알림 삭제 중 오류가 발생했습니다' });
  }
};

// 모든 알림 삭제하기
exports.deleteAllNotifications = async (req, res) => {
  try {
    const userId = req.userId;

    // 모든 알림 삭제
    await Notification.destroy({
      where: { userId }
    });

    return res.status(200).json({
      message: '모든 알림이 삭제되었습니다'
    });
  } catch (error) {
    console.error('알림 일괄 삭제 오류:', error);
    return res.status(500).json({ message: '알림 삭제 중 오류가 발생했습니다' });
  }
};

// SSE 연결 설정 (Server-Sent Events)
exports.setupSSEConnection = async (req, res) => {
  const userId = req.userId;

  // 헤더 설정
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  // 클라이언트에게 연결 확인 메시지 전송
  res.write(`data: ${JSON.stringify({ type: 'connection', message: 'Connected to notification stream' })}\n\n`);

  // 클라이언트 등록
  clients[userId] = res;

  // 연결 종료 시 처리
  req.on('close', () => {
    delete clients[userId];
  });
};

// 알림 전송 (내부 함수)
exports.sendNotification = async (userId, notification) => {
  try {
    // 데이터베이스에 알림 저장
    const savedNotification = await Notification.create({
      userId,
      title: notification.title,
      content: notification.content,
      type: notification.type || '기타',
      relatedId: notification.relatedId,
      link: notification.link
    });

    // SSE를 통한 실시간 알림
    if (clients[userId]) {
      clients[userId].write(`data: ${JSON.stringify(savedNotification)}\n\n`);
    }

    return savedNotification;
  } catch (error) {
    console.error('알림 전송 오류:', error);
    throw error;
  }
}; 