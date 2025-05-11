const db = require('../models');
const Absence = db.absence;
const User = db.user;
const Lecture = db.lecture;
const { Op } = db.Sequelize;
const fs = require('fs');
const path = require('path');

// 모든 병결 신청 조회 (교수/관리자 전용)
exports.getAllAbsences = async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;
    
    // 조건 설정
    const condition = {};
    
    if (status) {
      condition.status = status;
    }
    
    if (startDate && endDate) {
      condition.startDate = {
        [Op.between]: [startDate, endDate]
      };
    } else if (startDate) {
      condition.startDate = {
        [Op.gte]: startDate
      };
    } else if (endDate) {
      condition.endDate = {
        [Op.lte]: endDate
      };
    }

    // 병결 신청 조회
    const absences = await Absence.findAll({
      where: condition,
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'studentId', 'email', 'phone']
        },
        {
          model: Lecture,
          attributes: ['id', 'name', 'code'],
          required: false
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json(absences);
  } catch (error) {
    console.error('병결 신청 조회 오류:', error);
    return res.status(500).json({ message: '병결 신청을 가져오는 중 오류가 발생했습니다' });
  }
};

// 학생별 병결 신청 조회
exports.getAbsencesByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { status } = req.query;

    // 조건 설정
    const condition = { studentId };
    if (status) {
      condition.status = status;
    }

    // 병결 신청 조회
    const absences = await Absence.findAll({
      where: condition,
      include: [
        {
          model: Lecture,
          attributes: ['id', 'name', 'code'],
          required: false
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json(absences);
  } catch (error) {
    console.error('학생별 병결 신청 조회 오류:', error);
    return res.status(500).json({ message: '병결 신청을 가져오는 중 오류가 발생했습니다' });
  }
};

// 특정 병결 신청 조회
exports.getAbsenceById = async (req, res) => {
  try {
    const { id } = req.params;

    // 병결 신청 조회
    const absence = await Absence.findByPk(id, {
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'studentId', 'email', 'phone']
        },
        {
          model: Lecture,
          attributes: ['id', 'name', 'code'],
          required: false
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'name'],
          required: false
        }
      ]
    });

    if (!absence) {
      return res.status(404).json({ message: '병결 신청을 찾을 수 없습니다' });
    }

    return res.status(200).json(absence);
  } catch (error) {
    console.error('병결 신청 상세 조회 오류:', error);
    return res.status(500).json({ message: '병결 신청을 가져오는 중 오류가 발생했습니다' });
  }
};

// 병결 신청 생성
exports.createAbsence = async (req, res) => {
  try {
    const { startDate, endDate, reason, lectureId } = req.body;
    const userId = req.userId;

    // 학생 정보 확인
    const student = await User.findOne({
      where: {
        id: userId,
        userType: 'student'
      }
    });

    if (!student) {
      return res.status(403).json({ message: '학생만 병결을 신청할 수 있습니다' });
    }

    // 필수 입력값 확인
    if (!startDate || !endDate || !reason) {
      return res.status(400).json({ message: '시작일, 종료일, 사유는 필수 입력값입니다' });
    }

    // 날짜 유효성 검사
    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ message: '시작일은 종료일보다 이전이어야 합니다' });
    }

    // 강의 존재 확인 (선택적)
    if (lectureId) {
      const lecture = await Lecture.findByPk(lectureId);
      if (!lecture) {
        return res.status(404).json({ message: '강의를 찾을 수 없습니다' });
      }
    }

    // 첨부파일 처리
    const documents = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        documents.push({
          filename: file.filename,
          originalname: file.originalname,
          path: file.path,
          size: file.size,
          mimetype: file.mimetype
        });
      });
    }

    // 병결 신청 생성
    const absence = await Absence.create({
      startDate,
      endDate,
      reason,
      documents: documents.length > 0 ? documents : null,
      studentId: student.id,
      lectureId: lectureId || null
    });

    return res.status(201).json({
      message: '병결 신청이 성공적으로 생성되었습니다',
      absence
    });
  } catch (error) {
    console.error('병결 신청 생성 오류:', error);
    return res.status(500).json({ message: '병결 신청 중 오류가 발생했습니다' });
  }
};

// 병결 신청 수정 (상태가 '대기' 일 때만 가능)
exports.updateAbsence = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, reason, removeDocuments } = req.body;
    const userId = req.userId;

    // 병결 신청 조회
    const absence = await Absence.findByPk(id);
    if (!absence) {
      return res.status(404).json({ message: '병결 신청을 찾을 수 없습니다' });
    }

    // 본인 확인
    if (absence.studentId !== userId) {
      // 관리자나 교수인지 확인
      const user = await User.findByPk(userId);
      if (user.userType !== 'admin' && user.userType !== 'professor') {
        return res.status(403).json({ message: '본인의 병결 신청만 수정할 수 있습니다' });
      }
    }

    // 상태 확인
    if (absence.status !== '대기') {
      return res.status(400).json({ message: '이미 처리된 병결 신청은 수정할 수 없습니다' });
    }

    // 첨부파일 처리
    let documents = absence.documents || [];
    
    // 삭제할 첨부파일이 있는 경우
    if (removeDocuments && Array.isArray(removeDocuments)) {
      const filesToKeep = [];
      
      for (const file of documents) {
        if (!removeDocuments.includes(file.filename)) {
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
      
      documents = filesToKeep;
    }

    // 새로운 첨부파일 추가
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        documents.push({
          filename: file.filename,
          originalname: file.originalname,
          path: file.path,
          size: file.size,
          mimetype: file.mimetype
        });
      });
    }

    // 병결 신청 업데이트
    await absence.update({
      startDate: startDate || absence.startDate,
      endDate: endDate || absence.endDate,
      reason: reason || absence.reason,
      documents: documents.length > 0 ? documents : null
    });

    return res.status(200).json({
      message: '병결 신청이 성공적으로 수정되었습니다',
      absence
    });
  } catch (error) {
    console.error('병결 신청 수정 오류:', error);
    return res.status(500).json({ message: '병결 신청 수정 중 오류가 발생했습니다' });
  }
};

// 병결 신청 상태 변경 (교수/관리자 전용)
exports.updateAbsenceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, feedback } = req.body;
    const userId = req.userId;

    // 상태값 유효성 검사
    if (!status || !['승인', '반려'].includes(status)) {
      return res.status(400).json({ message: '유효한 상태값을 입력해주세요 (승인/반려)' });
    }

    // 병결 신청 조회
    const absence = await Absence.findByPk(id);
    if (!absence) {
      return res.status(404).json({ message: '병결 신청을 찾을 수 없습니다' });
    }

    // 이미 처리된 경우
    if (absence.status !== '대기') {
      return res.status(400).json({ message: '이미 처리된 병결 신청입니다' });
    }

    // 병결 신청 업데이트
    await absence.update({
      status,
      feedback,
      reviewerId: userId,
      reviewedAt: new Date()
    });

    return res.status(200).json({
      message: `병결 신청이 ${status === '승인' ? '승인' : '반려'}되었습니다`,
      absence
    });
  } catch (error) {
    console.error('병결 신청 상태 변경 오류:', error);
    return res.status(500).json({ message: '병결 신청 상태 변경 중 오류가 발생했습니다' });
  }
};

// 병결 신청 삭제 (상태가 '대기' 일 때만 가능)
exports.deleteAbsence = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // 병결 신청 조회
    const absence = await Absence.findByPk(id);
    if (!absence) {
      return res.status(404).json({ message: '병결 신청을 찾을 수 없습니다' });
    }

    // 본인 확인
    if (absence.studentId !== userId) {
      // 관리자나 교수인지 확인
      const user = await User.findByPk(userId);
      if (user.userType !== 'admin' && user.userType !== 'professor') {
        return res.status(403).json({ message: '본인의 병결 신청만 삭제할 수 있습니다' });
      }
    }

    // 상태 확인 (관리자는 모든 상태 삭제 가능)
    const user = await User.findByPk(userId);
    if (user.userType !== 'admin' && absence.status !== '대기') {
      return res.status(400).json({ message: '이미 처리된 병결 신청은 삭제할 수 없습니다' });
    }

    // 첨부파일 삭제
    if (absence.documents && Array.isArray(absence.documents)) {
      for (const file of absence.documents) {
        try {
          fs.unlinkSync(file.path);
        } catch (err) {
          console.error('파일 삭제 오류:', err);
        }
      }
    }

    // 병결 신청 삭제
    await absence.destroy();

    return res.status(200).json({
      message: '병결 신청이 삭제되었습니다'
    });
  } catch (error) {
    console.error('병결 신청 삭제 오류:', error);
    return res.status(500).json({ message: '병결 신청 삭제 중 오류가 발생했습니다' });
  }
};

// 첨부 문서 다운로드
exports.downloadDocument = async (req, res) => {
  try {
    const { id, filename } = req.params;

    // 병결 신청 조회
    const absence = await Absence.findByPk(id);
    if (!absence) {
      return res.status(404).json({ message: '병결 신청을 찾을 수 없습니다' });
    }

    // 첨부파일 찾기
    if (!absence.documents || !Array.isArray(absence.documents)) {
      return res.status(404).json({ message: '첨부파일이 없습니다' });
    }

    const file = absence.documents.find(f => f.filename === filename);
    if (!file) {
      return res.status(404).json({ message: '요청한 파일을 찾을 수 없습니다' });
    }

    // 파일 다운로드
    const filePath = file.path;
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: '파일이 서버에 존재하지 않습니다' });
    }

    res.download(filePath, file.originalname);
  } catch (error) {
    console.error('첨부파일 다운로드 오류:', error);
    return res.status(500).json({ message: '첨부파일 다운로드 중 오류가 발생했습니다' });
  }
}; 