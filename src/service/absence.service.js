const db = require('../models');
const Absence = db.absence;
const User = db.user;
const Lecture = db.lecture;
const { Op } = db.Sequelize;
const fs = require('fs');
const path = require('path');

// 모든 조퇴 신청 조회 (교수/관리자 전용)
exports.getAllAbsences = async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;
    
    // 조건 설정
    const condition = {};
    
    if (status) {
      condition.status = status;
    }
    
    if (startDate && endDate) {
      condition.date = {
        [Op.between]: [startDate, endDate]
      };
    } else if (startDate) {
      condition.date = {
        [Op.gte]: startDate
      };
    } else if (endDate) {
      condition.date = {
        [Op.lte]: endDate
      };
    }

    // 조퇴 신청 조회
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
          attributes: ['id', 'name', 'code']
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
    console.error('조퇴 신청 조회 오류:', error);
    return res.status(500).json({ message: '조퇴 신청을 가져오는 중 오류가 발생했습니다' });
  }
};

// 학생별 조퇴 신청 조회 (날짜 기반)
exports.getAbsencesByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { status, startDate, endDate } = req.query;

    // 조건 설정
    const condition = { studentId };
    if (status) {
      condition.status = status;
    }
    
    // 날짜 조건 추가
    if (startDate && endDate) {
      condition.date = {
        [Op.between]: [startDate, endDate]
      };
    } else if (startDate) {
      condition.date = {
        [Op.gte]: startDate
      };
    } else if (endDate) {
      condition.date = {
        [Op.lte]: endDate
      };
    }

    // 조퇴 신청 조회
    const absences = await Absence.findAll({
      where: condition,
      include: [
        {
          model: Lecture,
          attributes: ['id', 'name', 'code']
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      order: [['date', 'DESC'], ['createdAt', 'DESC']]
    });

    return res.status(200).json(absences);
  } catch (error) {
    console.error('학생별 조퇴 신청 조회 오류:', error);
    return res.status(500).json({ message: '조퇴 신청을 가져오는 중 오류가 발생했습니다' });
  }
};

// 내 조퇴 신청 조회 (강의실와 날짜기준)
exports.getMyAbsences = async (req, res) => {
  try {
    const userId = req.userId;
    const { status, lectureId, startDate, endDate } = req.query;

    console.log('getMyAbsences 호출됨: ', { userId, status, lectureId, startDate, endDate });

    // 학생 확인
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
    }

    console.log('사용자 조회됨: ', user.id, user.name);

    // 조건 설정
    const condition = { studentId: userId };
    if (status) {
      condition.status = status;
    }
    if (lectureId) {
      condition.lectureId = lectureId;
    }
    
    // 날짜 조건 추가
    if (startDate && endDate) {
      condition.date = {
        [Op.between]: [startDate, endDate]
      };
    } else if (startDate) {
      condition.date = {
        [Op.gte]: startDate
      };
    } else if (endDate) {
      condition.date = {
        [Op.lte]: endDate
      };
    }

    console.log('조회 조건: ', JSON.stringify(condition));

    try {
      // 조퇴 신청 조회 - 연관 모델 없이 먼저 시도
      const absences = await Absence.findAll({
        where: condition,
        order: [['date', 'DESC'], ['createdAt', 'DESC']]
      });

      console.log('조퇴 신청 조회 성공: ', absences.length, '건');
      
      return res.status(200).json({
        user,
        absences
      });
    } catch (findError) {
      console.error('조퇴 신청 조회 중 오류 발생: ', findError);
      return res.status(500).json({ message: '조퇴 신청 목록을 가져오는 중 오류가 발생했습니다', error: findError.message });
    }
  } catch (error) {
    console.error('내 조퇴 신청 조회 오류:', error);
    return res.status(500).json({ message: '조퇴 신청을 가져오는 중 오류가 발생했습니다', error: error.message });
  }
};

// 날짜기반 강의별 조퇴 신청 조회 (교수자용)
exports.getAbsencesByLectureAndDate = async (req, res) => {
  try {
    const { lectureId } = req.params;
    const { date, status } = req.query;
    const userId = req.userId;

    // 교수 권한 확인은 미들웨어에서 처리되었다고 가정

    // 강의 존재 확인
    const lecture = await Lecture.findByPk(lectureId);
    if (!lecture) {
      return res.status(404).json({ message: '강의를 찾을 수 없습니다' });
    }

    // 날짜 필수
    if (!date) {
      return res.status(400).json({ message: '날짜를 지정해주세요' });
    }

    // 조건 설정
    const condition = { 
      lectureId,
      date 
    };
    
    if (status) {
      condition.status = status;
    }

    // 조퇴 신청 조회
    const absences = await Absence.findAll({
      where: condition,
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'studentId', 'email', 'phone']
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      order: [['leaveTime', 'ASC']]
    });

    return res.status(200).json({
      lecture,
      date,
      absences
    });
  } catch (error) {
    console.error('강의별 조퇴 신청 조회 오류:', error);
    return res.status(500).json({ message: '조퇴 신청을 가져오는 중 오류가 발생했습니다' });
  }
};

// 특정 조퇴 신청 조회
exports.getAbsenceById = async (req, res) => {
  try {
    const { id } = req.params;

    // 조퇴 신청 조회
    const absence = await Absence.findByPk(id, {
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'studentId', 'email', 'phone']
        },
        {
          model: Lecture,
          attributes: ['id', 'name', 'code']
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
      return res.status(404).json({ message: '조퇴 신청을 찾을 수 없습니다' });
    }

    return res.status(200).json(absence);
  } catch (error) {
    console.error('조퇴 신청 상세 조회 오류:', error);
    return res.status(500).json({ message: '조퇴 신청을 가져오는 중 오류가 발생했습니다' });
  }
};

// 특정 학생의 날짜와 강의 기준 모든 조퇴 목록 가져오기
exports.getAbsencesByStudentLectureDate = async (req, res) => {
  try {
    const { studentId, lectureId } = req.params;
    const { startDate, endDate, status } = req.query;

    // 조건 설정
    const condition = { 
      studentId,
      lectureId 
    };
    
    if (status) {
      condition.status = status;
    }

    // 날짜 조건 추가
    if (startDate && endDate) {
      condition.date = {
        [Op.between]: [startDate, endDate]
      };
    } else if (startDate) {
      condition.date = {
        [Op.gte]: startDate
      };
    } else if (endDate) {
      condition.date = {
        [Op.lte]: endDate
      };
    }

    // 학생과 강의 존재 확인
    const student = await User.findByPk(studentId);
    const lecture = await Lecture.findByPk(lectureId);
    
    if (!student) {
      return res.status(404).json({ message: '학생을 찾을 수 없습니다' });
    }
    
    if (!lecture) {
      return res.status(404).json({ message: '강의를 찾을 수 없습니다' });
    }

    // 조퇴 신청 조회
    const absences = await Absence.findAll({
      where: condition,
      include: [
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      order: [['date', 'DESC'], ['createdAt', 'DESC']]
    });

    return res.status(200).json({
      student,
      lecture,
      absences
    });
  } catch (error) {
    console.error('학생/강의별 조퇴 신청 조회 오류:', error);
    return res.status(500).json({ message: '조퇴 신청을 가져오는 중 오류가 발생했습니다' });
  }
};

// 조퇴 신청 생성
exports.createAbsence = async (req, res) => {
  try {
    const { date, reason, lectureId, leaveTime, attendanceId } = req.body;
    const userId = req.userId;

    // 학생 정보 확인
    const student = await User.findOne({
      where: {
        id: userId,
        userType: 'student'
      }
    });

    if (!student) {
      return res.status(403).json({ message: '학생만 조퇴를 신청할 수 있습니다' });
    }

    // 필수 입력값 확인
    if (!date || !reason || !lectureId || !leaveTime || !attendanceId) {
      return res.status(400).json({ message: '날짜, 사유, 강의ID, 조퇴시간, 출석기록ID는 필수 입력값입니다' });
    }

    // 강의 존재 확인
    const lecture = await Lecture.findByPk(lectureId);
    if (!lecture) {
      return res.status(404).json({ message: '강의를 찾을 수 없습니다' });
    }

    // 해당 출석 기록이 존재하는지 및 결석증명서 제출이 필요한지 확인
    const attendance = await db.attendance.findOne({
      where: {
        id: attendanceId,
        studentId: userId,
        lectureId
      }
    });

    if (!attendance) {
      return res.status(404).json({ message: '해당 출석 기록을 찾을 수 없습니다' });
    }

    // 결석, 지각, 병결 상태이고 증명서가 필요한 경우에만 병결 신청 가능
    if (!attendance.requiresAbsenceProof || !['결석', '지각', '병결'].includes(attendance.status)) {
      return res.status(400).json({ 
        message: '결석, 지각, 병결 상태인 경우에만 조퇴 신청이 가능합니다', 
        status: attendance.status,
        requiresAbsenceProof: attendance.requiresAbsenceProof
      });
    }

    // 트랜잭션 시작
    const transaction = await db.sequelize.transaction();

    try {
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

      // attendance_record 레코드 찾기
      const attendanceRecord = await db.attendance_record.findByPk(attendance.recordId, { transaction });
      
      if (!attendanceRecord) {
        await transaction.rollback();
        return res.status(404).json({ message: '출석 기록을 찾을 수 없습니다' });
      }

      // 조퇴 신청 생성
      const absence = await Absence.create({
        date,
        reason,
        leaveTime,
        documents: documents.length > 0 ? documents : null,
        studentId: student.id,
        lectureId,
        recordId: attendanceRecord.id
      }, { transaction });

      await transaction.commit();

      return res.status(201).json({
        message: '조퇴 신청이 성공적으로 생성되었습니다',
        absence
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('조퇴 신청 생성 오류:', error);
    return res.status(500).json({ message: '조퇴 신청 중 오류가 발생했습니다', error: error.message });
  }
};

// 조퇴 신청 수정 (상태가 '대기' 일 때만 가능)
exports.updateAbsence = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, leaveTime, removeDocuments } = req.body;
    const userId = req.userId;

    // 조퇴 신청 조회
    const absence = await Absence.findByPk(id);
    if (!absence) {
      return res.status(404).json({ message: '조퇴 신청을 찾을 수 없습니다' });
    }

    // 본인 확인
    if (absence.studentId !== userId) {
      // 관리자나 교수인지 확인
      const user = await User.findByPk(userId);
      if (user.userType !== 'admin' && user.userType !== 'professor') {
        return res.status(403).json({ message: '본인의 조퇴 신청만 수정할 수 있습니다' });
      }
    }

    // 상태 확인
    if (absence.status !== '대기') {
      return res.status(400).json({ message: '이미 처리된 조퇴 신청은 수정할 수 없습니다' });
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

    // 조퇴 신청 업데이트
    await absence.update({
      reason: reason || absence.reason,
      leaveTime: leaveTime || absence.leaveTime,
      documents: documents.length > 0 ? documents : null
    });

    return res.status(200).json({
      message: '조퇴 신청이 성공적으로 수정되었습니다',
      absence
    });
  } catch (error) {
    console.error('조퇴 신청 수정 오류:', error);
    return res.status(500).json({ message: '조퇴 신청 수정 중 오류가 발생했습니다' });
  }
};

// 조퇴 신청 상태 변경 (교수/관리자 전용)
exports.updateAbsenceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, feedback } = req.body;
    const userId = req.userId;

    // 상태값 유효성 검사
    if (!status || !['승인', '반려', '검토중'].includes(status)) {
      return res.status(400).json({ message: '유효한 상태값을 입력해주세요 (승인/반려/검토중)' });
    }

    // 조퇴 신청 조회
    const absence = await Absence.findByPk(id);
    if (!absence) {
      return res.status(404).json({ message: '조퇴 신청을 찾을 수 없습니다' });
    }

    // 이미 처리된 경우
    if (absence.status !== '대기' && absence.status !== '검토중') {
      return res.status(400).json({ message: '이미 처리된 조퇴 신청입니다' });
    }

    // 조퇴 신청 업데이트
    await absence.update({
      status,
      feedback,
      reviewerId: userId,
      reviewedAt: new Date()
    });

    return res.status(200).json({
      message: `조퇴 신청이 ${status}되었습니다`,
      absence
    });
  } catch (error) {
    console.error('조퇴 신청 상태 변경 오류:', error);
    return res.status(500).json({ message: '조퇴 신청 상태 변경 중 오류가 발생했습니다' });
  }
};

// 조퇴 신청 삭제 (상태가 '대기' 일 때만 가능)
exports.deleteAbsence = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // 조퇴 신청 조회
    const absence = await Absence.findByPk(id);
    if (!absence) {
      return res.status(404).json({ message: '조퇴 신청을 찾을 수 없습니다' });
    }

    // 본인 확인
    if (absence.studentId !== userId) {
      // 관리자나 교수인지 확인
      const user = await User.findByPk(userId);
      if (user.userType !== 'admin' && user.userType !== 'professor') {
        return res.status(403).json({ message: '본인의 조퇴 신청만 삭제할 수 있습니다' });
      }
    }

    // 상태 확인 (관리자는 모든 상태 삭제 가능)
    const user = await User.findByPk(userId);
    if (user.userType !== 'admin' && absence.status !== '대기') {
      return res.status(400).json({ message: '이미 처리된 조퇴 신청은 삭제할 수 없습니다' });
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

    // 조퇴 신청 삭제
    await absence.destroy();

    return res.status(200).json({
      message: '조퇴 신청이 삭제되었습니다'
    });
  } catch (error) {
    console.error('조퇴 신청 삭제 오류:', error);
    return res.status(500).json({ message: '조퇴 신청 삭제 중 오류가 발생했습니다' });
  }
};

// 첨부 문서 다운로드
exports.downloadDocument = async (req, res) => {
  try {
    const { id, filename } = req.params;

    // 조퇴 신청 조회
    const absence = await Absence.findByPk(id);
    if (!absence) {
      return res.status(404).json({ message: '조퇴 신청을 찾을 수 없습니다' });
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

// 특정 학생의 특정 날짜 조퇴 신청 조회
exports.getAbsencesByStudentAndDate = async (req, res) => {
  try {
    const { studentId, date } = req.params;
    const { status } = req.query;

    // 학생 존재 확인
    const student = await User.findByPk(studentId);
    if (!student) {
      return res.status(404).json({ message: '학생을 찾을 수 없습니다' });
    }

    // 조건 설정
    const condition = { 
      studentId,
      date
    };
    
    if (status) {
      condition.status = status;
    }

    // 조퇴 신청 조회
    const absences = await Absence.findAll({
      where: condition,
      include: [
        {
          model: Lecture,
          attributes: ['id', 'name', 'code']
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      order: [['leaveTime', 'ASC']]
    });

    return res.status(200).json({
      student,
      date,
      absences
    });
  } catch (error) {
    console.error('학생별 날짜별 조퇴 신청 조회 오류:', error);
    return res.status(500).json({ message: '조퇴 신청을 가져오는 중 오류가 발생했습니다' });
  }
};

// 강의별 월단위 모든 학생 조퇴 신청 조회 (교수자용)
exports.getMonthlyAbsencesByLecture = async (req, res) => {
  try {
    const { lectureId } = req.params;
    const { year, month, status } = req.query;
    
    // 필수값 검증
    if (!year || !month) {
      return res.status(400).json({ message: '년도와 월은 필수 입력값입니다' });
    }

    // 숫자로 변환
    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);
    
    // 유효성 검사
    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ message: '유효한 년도와 월을 입력해주세요' });
    }

    // 강의 존재 확인
    const lecture = await Lecture.findByPk(lectureId);
    if (!lecture) {
      return res.status(404).json({ message: '강의를 찾을 수 없습니다' });
    }

    // 해당 월의 시작일과 마지막일 계산
    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0); // 월의 마지막 날

    // 조건 설정
    const condition = { 
      lectureId,
      date: {
        [Op.between]: [
          startDate.toISOString().split('T')[0], 
          endDate.toISOString().split('T')[0]
        ]
      }
    };
    
    if (status) {
      condition.status = status;
    }

    // 조퇴 신청 조회
    const absences = await Absence.findAll({
      where: condition,
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'studentId', 'email', 'phone']
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      order: [['date', 'ASC'], ['leaveTime', 'ASC']]
    });

    // 학생별로 그룹화
    const studentAbsences = {};
    absences.forEach(absence => {
      const studentId = absence.student.id;
      if (!studentAbsences[studentId]) {
        studentAbsences[studentId] = {
          student: absence.student,
          absences: []
        };
      }
      studentAbsences[studentId].absences.push(absence);
    });

    return res.status(200).json({
      lecture,
      year: yearNum,
      month: monthNum,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      studentAbsences: Object.values(studentAbsences),
      totalAbsences: absences.length
    });
  } catch (error) {
    console.error('월단위 강의별 조퇴 신청 조회 오류:', error);
    return res.status(500).json({ message: '조퇴 신청을 가져오는 중 오류가 발생했습니다' });
  }
};

// 학생이 자신의 특정 강의에 대한 월단위 조퇴 신청 조회
exports.getMyMonthlyAbsencesByLecture = async (req, res) => {
  try {
    const { lectureId } = req.params;
    const { year, month, status } = req.query;
    const userId = req.userId;
    
    // 필수값 검증
    if (!year || !month) {
      return res.status(400).json({ message: '년도와 월은 필수 입력값입니다' });
    }

    // 숫자로 변환
    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);
    
    // 유효성 검사
    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ message: '유효한 년도와 월을 입력해주세요' });
    }

    // 학생 확인
    const student = await User.findByPk(userId);
    if (!student) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
    }

    // 강의 존재 확인
    const lecture = await Lecture.findByPk(lectureId);
    if (!lecture) {
      return res.status(404).json({ message: '강의를 찾을 수 없습니다' });
    }

    // 해당 월의 시작일과 마지막일 계산
    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0); // 월의 마지막 날

    // 조건 설정
    const condition = { 
      studentId: userId,
      lectureId,
      date: {
        [Op.between]: [
          startDate.toISOString().split('T')[0], 
          endDate.toISOString().split('T')[0]
        ]
      }
    };
    
    if (status) {
      condition.status = status;
    }

    // 조퇴 신청 조회
    const absences = await Absence.findAll({
      where: condition,
      include: [
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      order: [['date', 'ASC'], ['createdAt', 'DESC']]
    });

    // 일자별로 그룹화
    const dateAbsences = {};
    absences.forEach(absence => {
      const date = absence.date;
      if (!dateAbsences[date]) {
        dateAbsences[date] = [];
      }
      dateAbsences[date].push(absence);
    });

    return res.status(200).json({
      student,
      lecture,
      year: yearNum,
      month: monthNum,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      dateAbsences,
      totalAbsences: absences.length
    });
  } catch (error) {
    console.error('내 월단위 강의별 조퇴 신청 조회 오류:', error);
    return res.status(500).json({ message: '조퇴 신청을 가져오는 중 오류가 발생했습니다' });
  }
};

module.exports = exports; 