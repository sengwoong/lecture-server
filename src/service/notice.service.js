const db = require('../models');
const Notice = db.notice;
const User = db.user;
const Lecture = db.lecture;
const { Op } = db.Sequelize;
const fs = require('fs');
const path = require('path');

// 모든 공지사항 가져오기
exports.getAllNotices = async (req, res) => {
  try {
    // 쿼리 파라미터 가져오기
    const { page = 1, limit = 10, sort = 'createdAt', order = 'DESC' } = req.query;
    const offset = (page - 1) * limit;

    // 공지사항 조회
    const { count, rows: notices } = await Notice.findAndCountAll({
      where: { isActive: true },
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'name'],
          as: 'author'
        },
        {
          model: Lecture,
          attributes: ['id', 'name', 'code'],
          required: false
        }
      ],
      order: [[sort, order]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // 페이지네이션 정보
    const totalPages = Math.ceil(count / limit);
    const currentPage = parseInt(page);

    return res.status(200).json({
      notices,
      pagination: {
        totalItems: count,
        totalPages,
        currentPage,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('공지사항 조회 오류:', error);
    return res.status(500).json({ message: '공지사항을 가져오는 중 오류가 발생했습니다' });
  }
};

// 특정 공지사항 가져오기
exports.getNoticeById = async (req, res) => {
  try {
    const { id } = req.params;

    // 공지사항 조회
    const notice = await Notice.findOne({
      where: { id, isActive: true },
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'name'],
          as: 'author'
        },
        {
          model: Lecture,
          attributes: ['id', 'name', 'code'],
          required: false
        }
      ]
    });

    if (!notice) {
      return res.status(404).json({ message: '공지사항을 찾을 수 없습니다' });
    }

    // 조회수 증가
    await notice.increment('viewCount');

    return res.status(200).json(notice);
  } catch (error) {
    console.error('공지사항 상세 조회 오류:', error);
    return res.status(500).json({ message: '공지사항을 가져오는 중 오류가 발생했습니다' });
  }
};

// 중요한 공지사항 가져오기
exports.getImportantNotices = async (req, res) => {
  try {
    const notices = await Notice.findAll({
      where: { 
        importance: '중요',
        isActive: true,
        [Op.or]: [
          { endDate: { [Op.is]: null } },
          { endDate: { [Op.gte]: new Date() } }
        ]
      },
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'name'],
          as: 'author'
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    return res.status(200).json(notices);
  } catch (error) {
    console.error('중요 공지사항 조회 오류:', error);
    return res.status(500).json({ message: '중요 공지사항을 가져오는 중 오류가 발생했습니다' });
  }
};

// 카테고리별 공지사항 가져오기
exports.getNoticesByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // 유효한 카테고리인지 확인
    const validCategories = ['학과', '장학', '수업', '행사', '기타'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ message: '유효하지 않은 카테고리입니다' });
    }

    // 카테고리별 공지사항 조회
    const { count, rows: notices } = await Notice.findAndCountAll({
      where: { 
        category,
        isActive: true
      },
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'name'],
          as: 'author'
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // 페이지네이션 정보
    const totalPages = Math.ceil(count / limit);
    const currentPage = parseInt(page);

    return res.status(200).json({
      category,
      notices,
      pagination: {
        totalItems: count,
        totalPages,
        currentPage,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('카테고리별 공지사항 조회 오류:', error);
    return res.status(500).json({ message: '공지사항을 가져오는 중 오류가 발생했습니다' });
  }
};

// 강의별 공지사항 가져오기
exports.getNoticesByLecture = async (req, res) => {
  try {
    const { lectureId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // 강의 존재 확인
    const lecture = await Lecture.findByPk(lectureId);
    if (!lecture) {
      return res.status(404).json({ message: '강의를 찾을 수 없습니다' });
    }

    // 강의별 공지사항 조회
    const { count, rows: notices } = await Notice.findAndCountAll({
      where: { 
        lectureId,
        isActive: true
      },
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'name'],
          as: 'author'
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // 페이지네이션 정보
    const totalPages = Math.ceil(count / limit);
    const currentPage = parseInt(page);

    return res.status(200).json({
      lecture,
      notices,
      pagination: {
        totalItems: count,
        totalPages,
        currentPage,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('강의별 공지사항 조회 오류:', error);
    return res.status(500).json({ message: '공지사항을 가져오는 중 오류가 발생했습니다' });
  }
};

// 공지사항 생성하기
exports.createNotice = async (req, res) => {
  try {
    const { title, content, category, importance, startDate, endDate, lectureId } = req.body;
    
    // 필수 입력값 확인
    if (!title || !content) {
      return res.status(400).json({ message: '제목과 내용을 입력해주세요' });
    }

    // 카테고리 유효성 검사
    const validCategories = ['학과', '장학', '수업', '행사', '기타'];
    const validImportanceValues = ['일반', '중요', '긴급'];
    
    // 카테고리가 유효하지 않은 경우 기본값 사용
    const validCategory = category && validCategories.includes(category) 
      ? category 
      : '기타';
      
    // 중요도가 유효하지 않은 경우 기본값 사용
    const validImportance = importance && validImportanceValues.includes(importance)
      ? importance
      : '일반';

    // 첨부파일 처리
    const attachments = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        attachments.push({
          filename: file.filename,
          originalname: file.originalname,
          path: file.path,
          size: file.size,
          mimetype: file.mimetype
        });
      });
    }

    // 공지사항 생성
    const notice = await Notice.create({
      title,
      content,
      category: validCategory,
      importance: validImportance,
      startDate: startDate || new Date(),
      endDate: endDate || null,
      attachments: attachments.length > 0 ? attachments : null,
      lectureId: lectureId ? parseInt(lectureId, 10) : null,
      authorId: req.userId
    });

    return res.status(201).json({
      message: '공지사항이 성공적으로 생성되었습니다',
      notice
    });
  } catch (error) {
    console.error('공지사항 생성 오류:', error);
    return res.status(500).json({ message: '공지사항 생성 중 오류가 발생했습니다', error: error.message });
  }
};

// 공지사항 수정하기
exports.updateNotice = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category, importance, startDate, endDate, lectureId, removeAttachments } = req.body;

    // 공지사항 조회
    const notice = await Notice.findByPk(id);
    if (!notice) {
      return res.status(404).json({ message: '공지사항을 찾을 수 없습니다' });
    }

    // 작성자 또는 관리자 확인
    if (notice.authorId !== req.userId) {
      const user = await User.findByPk(req.userId);
      const roles = await user.getRoles();
      
      const isAdmin = roles.some(role => role.name === 'admin');
      if (!isAdmin) {
        return res.status(403).json({ message: '공지사항을 수정할 권한이 없습니다' });
      }
    }

    // 첨부파일 처리
    let attachments = notice.attachments || [];
    
    // 삭제할 첨부파일이 있는 경우
    if (removeAttachments && Array.isArray(removeAttachments)) {
      const filesToKeep = [];
      
      for (const file of attachments) {
        if (!removeAttachments.includes(file.filename)) {
          filesToKeep.push(file);
        } else {
          // 파일 시스템에서 삭제
          try {
            fs.unlinkSync(file.path);
          } catch (err) {
            console.error('파일 삭제 오류:', err);
          }
        }
      }
      
      attachments = filesToKeep;
    }

    // 새로운 첨부파일 추가
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        attachments.push({
          filename: file.filename,
          originalname: file.originalname,
          path: file.path,
          size: file.size,
          mimetype: file.mimetype
        });
      });
    }

    // 공지사항 업데이트
    await notice.update({
      title: title || notice.title,
      content: content || notice.content,
      category: category || notice.category,
      importance: importance || notice.importance,
      startDate: startDate || notice.startDate,
      endDate: endDate === '' ? null : (endDate || notice.endDate),
      attachments: attachments.length > 0 ? attachments : null,
      lectureId: lectureId === '' ? null : (lectureId ? parseInt(lectureId, 10) : notice.lectureId)
    });

    return res.status(200).json({
      message: '공지사항이 성공적으로 수정되었습니다',
      notice
    });
  } catch (error) {
    console.error('공지사항 수정 오류:', error);
    return res.status(500).json({ message: '공지사항 수정 중 오류가 발생했습니다' });
  }
};

// 공지사항 삭제하기
exports.deleteNotice = async (req, res) => {
  try {
    const { id } = req.params;

    // 공지사항 조회
    const notice = await Notice.findByPk(id);
    if (!notice) {
      return res.status(404).json({ message: '공지사항을 찾을 수 없습니다' });
    }

    // 작성자 또는 관리자 확인
    if (notice.authorId !== req.userId) {
      const user = await User.findByPk(req.userId);
      const roles = await user.getRoles();
      
      const isAdmin = roles.some(role => role.name === 'admin');
      if (!isAdmin) {
        return res.status(403).json({ message: '공지사항을 삭제할 권한이 없습니다' });
      }
    }

    // 첨부파일 삭제
    if (notice.attachments && Array.isArray(notice.attachments)) {
      for (const file of notice.attachments) {
        try {
          fs.unlinkSync(file.path);
        } catch (err) {
          console.error('파일 삭제 오류:', err);
        }
      }
    }

    // 공지사항 삭제 (또는 비활성화)
    // await notice.destroy(); // 완전 삭제
    await notice.update({ isActive: false }); // 소프트 삭제

    return res.status(200).json({
      message: '공지사항이 성공적으로 삭제되었습니다'
    });
  } catch (error) {
    console.error('공지사항 삭제 오류:', error);
    return res.status(500).json({ message: '공지사항 삭제 중 오류가 발생했습니다' });
  }
};

// 공지사항 읽음 표시
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // 공지사항 조회
    const notice = await Notice.findByPk(id);
    if (!notice) {
      return res.status(404).json({ message: '공지사항을 찾을 수 없습니다' });
    }

    // 읽음 기록 처리 (별도 테이블 사용 필요)
    // 여기서는 간단히 알림 관련 로직으로 대체
    
    // 관련 알림 조회 및 읽음 처리
    await db.notification.update(
      { isRead: true },
      { 
        where: { 
          userId,
          type: '공지',
          relatedId: notice.id,
          isRead: false
        }
      }
    );

    return res.status(200).json({
      message: '공지사항을 읽음으로 표시했습니다'
    });
  } catch (error) {
    console.error('공지사항 읽음 표시 오류:', error);
    return res.status(500).json({ message: '공지사항 읽음 표시 중 오류가 발생했습니다' });
  }
};

// 첨부파일 다운로드
exports.downloadAttachment = async (req, res) => {
  try {
    const { id, filename } = req.params;

    // 공지사항 조회
    const notice = await Notice.findByPk(id);
    if (!notice) {
      return res.status(404).json({ message: '공지사항을 찾을 수 없습니다' });
    }

    // 첨부파일 찾기
    if (!notice.attachments || !Array.isArray(notice.attachments)) {
      return res.status(404).json({ message: '첨부파일이 없습니다' });
    }

    const file = notice.attachments.find(f => f.filename === filename);
    if (!file) {
      return res.status(404).json({ message: '요청한 파일을 찾을 수 없습니다' });
    }

    // 파일 다운로드
    const filePath = file.path;
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: '파일이 서버에 존재하지 않습니다' });
    }

    // 한글 파일명 인코딩 처리
    const originalFileName = file.originalname;
    const userAgent = req.headers['user-agent'];
    
    // IE, Edge를 위한 인코딩
    if (userAgent.includes('MSIE') || userAgent.includes('Trident') || userAgent.includes('Edge')) {
      const encodedFileName = encodeURIComponent(originalFileName).replace(/\\+/g, '%20');
      res.setHeader('Content-Disposition', `attachment; filename=${encodedFileName}`);
    } 
    // Chrome, Firefox, Safari 등 기타 브라우저를 위한 인코딩
    else {
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(originalFileName)}`);
    }
    
    res.setHeader('Content-Type', file.mimetype || 'application/octet-stream');
    
    // 파일 전송
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error('첨부파일 다운로드 오류:', error);
    return res.status(500).json({ message: '첨부파일 다운로드 중 오류가 발생했습니다' });
  }
}; 