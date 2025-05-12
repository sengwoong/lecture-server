const db = require('../models');
const Attendance = db.attendance;
const User = db.user;
const Lecture = db.lecture;
const { Op, Sequelize } = require('sequelize');
const crypto = require('crypto');


// 학생별 출석 현황 가져오기
exports.getAttendanceByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { lectureId } = req.query;

    // 학생 존재 여부 확인
    const student = await User.findOne({ 
      where: { 
        id: studentId,
        userType: 'student'
      }
    });
    
    if (!student) {
      return res.status(404).json({ message: '학생을 찾을 수 없습니다' });
    }

    // 조건 설정
    const condition = { studentId };
    if (lectureId) {
      condition.lectureId = lectureId;
    }

    // 출석 데이터 조회
    const attendances = await Attendance.findAll({
      where: condition,
      include: [
        {
          model: Lecture,
          attributes: ['id', 'name', 'code', 'semester', 'dayOfWeek', 'startTime', 'endTime']
        }
      ],
      order: [['date', 'DESC'], ['lectureId', 'ASC']]
    });

    // 통계 데이터 계산
    const stats = {
      total: attendances.length,
      present: attendances.filter(a => a.status === '출석').length,
      late: attendances.filter(a => a.status === '지각').length,
      absent: attendances.filter(a => a.status === '결석').length,
      sickLeave: attendances.filter(a => a.status === '병결').length,
      officialLeave: attendances.filter(a => a.status === '공결').length
    };

    return res.status(200).json({
      student,
      stats,
      attendances
    });
  } catch (error) {
    console.error('학생별 출석 현황 조회 오류:', error);
    return res.status(500).json({ message: '출석 현황을 가져오는 중 오류가 발생했습니다' });
  }
};


// 출석 체크하기
exports.checkAttendance = async (req, res) => {
  try {
    const { lectureId, studentId, date, status, notes, startTime, endTime } = req.body;

    // 필수 데이터 확인
    if (!lectureId || !studentId || !date || !status) {
      return res.status(400).json({ message: '필수 입력값이 누락되었습니다' });
    }

    // 상태값 유효성 검사
    const validStatus = ['출석', '지각', '결석', '병결', '공결'];
    if (!validStatus.includes(status)) {
      return res.status(400).json({ message: '유효하지 않은 출석 상태입니다' });
    }

    // 학생, 강의 존재 확인
    const student = await User.findOne({ 
      where: { 
        id: studentId,
        userType: 'student'
      }
    });
    
    const lecture = await Lecture.findByPk(lectureId);

    if (!student) {
      return res.status(404).json({ message: '학생을 찾을 수 없습니다' });
    }

    if (!lecture) {
      return res.status(404).json({ message: '강의를 찾을 수 없습니다' });
    }

    // 트랜잭션 시작
    const transaction = await db.sequelize.transaction();

    try {
      // 1. 먼저 attendance_record 생성 또는 조회
      let attendanceRecord = await db.attendance_record.findOne({
        where: {
          lectureId,
          studentId,
          date
        },
        transaction
      });

      if (!attendanceRecord) {
        // attendance_record 없으면 생성
        attendanceRecord = await db.attendance_record.create({
          lectureId,
          studentId,
          date,
          notes
        }, { transaction });
      } else {
        // 있으면 업데이트
        await attendanceRecord.update({
          notes
        }, { transaction });
      }

      // 2. 출석 상태에 따른 처리
      // 기존 출석 기록 확인
      let attendance = await Attendance.findOne({
        where: {
          lectureId,
          studentId,
          date
        },
        transaction
      });

      // 병결 증명서 필요 여부 확인
      const requiresAbsenceProof = ['결석', '지각', '병결'].includes(status);

      if (attendance) {
        // 기존 기록 업데이트
        attendance = await attendance.update({
          status,
          notes,
          checkTime: new Date(),
          checkMethod: req.body.checkMethod || '수기',
          recordId: attendanceRecord.id,
          requiresAbsenceProof,
          startTime: startTime || attendance.startTime,
          endTime: endTime || attendance.endTime
        }, { transaction });
      } else {
        // 새로운 출석 기록 생성
        attendance = await Attendance.create({
          lectureId,
          studentId,
          date,
          status,
          notes,
          checkTime: new Date(),
          checkMethod: req.body.checkMethod || '수기',
          recordId: attendanceRecord.id,
          requiresAbsenceProof,
          startTime,
          endTime
        }, { transaction });
      }

      // 트랜잭션 커밋
      await transaction.commit();

      return res.status(200).json({
        message: '출석이 기록되었습니다',
        attendance,
        requiresAbsenceProof
      });
    } catch (error) {
      // 오류 발생 시 트랜잭션 롤백
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('출석 체크 오류:', error);
    return res.status(500).json({ message: '출석 체크 중 오류가 발생했습니다' });
  }
};

// QR코드 생성하기
exports.generateQRCode = async (req, res) => {
  try {
    const { lectureId } = req.params;
    
    // 강의 존재 확인
    const lecture = await Lecture.findByPk(lectureId);
    if (!lecture) {
      return res.status(404).json({ message: '강의를 찾을 수 없습니다' });
    }

    // 현재 날짜와 시간으로 QR 코드 생성 데이터 만들기
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0];
    
    // 암호화된 QR 코드 데이터 생성 (10분간 유효)
    const validUntil = new Date(now.getTime() + 10 * 60000); // 10분 추가
    const qrData = {
      lectureId,
      date: dateStr,
      time: timeStr,
      validUntil: validUntil.toISOString(),
      key: crypto.randomBytes(10).toString('hex') // 무작위 키 추가
    };

    // 실제 구현에서는 이 데이터를 암호화하고 QR 코드 이미지로 변환해야 함
    // 여기서는 데이터만 반환
    return res.status(200).json({
      message: 'QR 코드가 생성되었습니다',
      qrData: JSON.stringify(qrData),
      validUntil
    });
  } catch (error) {
    console.error('QR 코드 생성 오류:', error);
    return res.status(500).json({ message: 'QR 코드 생성 중 오류가 발생했습니다' });
  }
};

// 비밀번호 생성하기 
exports.generatePassword = async (req, res) => {
  try {
    const { lectureId } = req.params;
    
    // 강의 존재 확인
    const lecture = await Lecture.findByPk(lectureId);
    if (!lecture) {
      return res.status(404).json({ message: '강의를 찾을 수 없습니다' });
    }

    // 현재 날짜와 시간
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    
    // 6자리 랜덤 비밀번호 생성
    const password = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 만료 시간 설정 (10분)
    const validUntil = new Date(now.getTime() + 10 * 60000);
    
    // 비밀번호 데이터 생성
    const passwordData = {
      lectureId,
      date: dateStr,
      password,
      validUntil: validUntil.toISOString()
    };

    // 여기서는 암호화나 DB 저장 없이 바로 반환
    // 실제 서비스에서는 비밀번호를 DB에 저장하고 암호화하여 관리해야 함
    return res.status(200).json({
      message: '출석 비밀번호가 생성되었습니다',
      passwordData,
      validUntil
    });
  } catch (error) {
    console.error('비밀번호 생성 오류:', error);
    return res.status(500).json({ message: '출석 비밀번호 생성 중 오류가 발생했습니다' });
  }
};

// QR코드로 출석하기
exports.checkAttendanceByQR = async (req, res) => {
  try {
    const { qrData } = req.body;
    const userId = req.userId;

    if (!qrData) {
      return res.status(400).json({ message: 'QR 코드 데이터가 필요합니다' });
    }

    // QR 데이터 파싱
    let parsedQRData;
    try {
      parsedQRData = JSON.parse(qrData);
    } catch (e) {
      return res.status(400).json({ message: '유효하지 않은 QR 코드 데이터입니다' });
    }

    // QR 코드 유효성 검사
    const now = new Date();
    const validUntil = new Date(parsedQRData.validUntil);
    
    if (now > validUntil) {
      return res.status(400).json({ message: 'QR 코드가 만료되었습니다' });
    }

    // 사용자와 학생 정보 확인
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
    }

    if (user.userType !== 'student') {
      return res.status(404).json({ message: '학생만 출석할 수 있습니다' });
    }

    const lectureId = parsedQRData.lectureId;
    const date = parsedQRData.date;

    // 강의 정보 확인
    const lecture = await db.lecture.findByPk(lectureId);
    if (!lecture) {
      return res.status(404).json({ message: '강의를 찾을 수 없습니다' });
    }

    // 트랜잭션 시작
    const transaction = await db.sequelize.transaction();

    try {
      // 1. 먼저 attendance_record 생성 또는 조회
      let attendanceRecord = await db.attendance_record.findOne({
        where: {
          lectureId,
          studentId: userId,
          date
        },
        transaction
      });

      if (!attendanceRecord) {
        // attendance_record 없으면 생성
        attendanceRecord = await db.attendance_record.create({
          lectureId,
          studentId: userId,
          date
        }, { transaction });
      }

      // 2. 출석 기록
      let attendance = await Attendance.findOne({
        where: {
          lectureId,
          studentId: userId,
          date
        },
        transaction
      });

      // 이미 출석했는지 확인
      if (attendance) {
        if (attendance.status === '출석' || attendance.status === '지각') {
          await transaction.rollback();
          return res.status(400).json({ message: '이미 출석 처리되었습니다' });
        }
        
        // 기존 기록 업데이트
        attendance = await attendance.update({
          status: '출석', // 또는 시간에 따라 '지각'으로 설정
          checkTime: now,
          checkMethod: 'QR',
          recordId: attendanceRecord.id,
          requiresAbsenceProof: false,
          startTime: lecture.startTime,
          endTime: lecture.endTime
        }, { transaction });
      } else {
        // 새로운 출석 기록 생성
        attendance = await Attendance.create({
          lectureId,
          studentId: userId,
          date,
          status: '출석', // 또는 시간에 따라 '지각'으로 설정
          checkTime: now,
          checkMethod: 'QR',
          recordId: attendanceRecord.id,
          requiresAbsenceProof: false,
          startTime: lecture.startTime,
          endTime: lecture.endTime
        }, { transaction });
      }

      // 트랜잭션 커밋
      await transaction.commit();

      return res.status(200).json({
        message: '출석이 성공적으로 기록되었습니다',
        attendance
      });
    } catch (error) {
      // 오류 발생 시 트랜잭션 롤백
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('QR 출석 오류:', error);
    return res.status(500).json({ message: 'QR 출석 처리 중 오류가 발생했습니다', error: error.message });
  }
};

// 비밀번호로 출석하기
exports.checkAttendanceByPassword = async (req, res) => {
  try {
    const { lectureId, password } = req.body;
    const userId = req.userId;

    if (!lectureId || !password) {
      return res.status(400).json({ message: '강의 ID와 비밀번호가 필요합니다' });
    }

    // 여기서는 간단한 예시로 진행
    // 실제로는 DB에서 현재 유효한 비밀번호를 조회하여 검증해야 함
    
    // 사용자와 학생 정보 확인
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
    }

    if (user.userType !== 'student') {
      return res.status(404).json({ message: '학생만 출석할 수 있습니다' });
    }
    
    // 강의 존재 확인
    const lecture = await Lecture.findByPk(lectureId);
    if (!lecture) {
      return res.status(404).json({ message: '강의를 찾을 수 없습니다' });
    }

    // 현재 날짜
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // 트랜잭션 시작
    const transaction = await db.sequelize.transaction();

    try {
      // 1. 먼저 attendance_record 생성 또는 조회
      let attendanceRecord = await db.attendance_record.findOne({
        where: {
          lectureId,
          studentId: userId,
          date: today
        },
        transaction
      });

      if (!attendanceRecord) {
        // attendance_record 없으면 생성
        attendanceRecord = await db.attendance_record.create({
          lectureId,
          studentId: userId,
          date: today
        }, { transaction });
      }

      // 2. 출석 기록
      let attendance = await Attendance.findOne({
        where: {
          lectureId,
          studentId: userId,
          date: today
        },
        transaction
      });

      // 이미 출석했는지 확인
      if (attendance) {
        if (attendance.status === '출석' || attendance.status === '지각') {
          await transaction.rollback();
          return res.status(400).json({ message: '이미 출석 처리되었습니다' });
        }
        
        // 기존 기록 업데이트
        attendance = await attendance.update({
          status: '출석',
          checkTime: now,
          checkMethod: '비밀번호',
          recordId: attendanceRecord.id,
          requiresAbsenceProof: false,
          startTime: lecture.startTime,
          endTime: lecture.endTime
        }, { transaction });
      } else {
        // 새로운 출석 기록 생성
        attendance = await Attendance.create({
          lectureId,
          studentId: userId,
          date: today,
          status: '출석',
          checkTime: now,
          checkMethod: '비밀번호',
          recordId: attendanceRecord.id,
          requiresAbsenceProof: false,
          startTime: lecture.startTime,
          endTime: lecture.endTime
        }, { transaction });
      }

      // 트랜잭션 커밋
      await transaction.commit();

      return res.status(200).json({
        message: '출석이 성공적으로 기록되었습니다',
        attendance
      });
    } catch (error) {
      // 오류 발생 시 트랜잭션 롤백
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('비밀번호 출석 오류:', error);
    return res.status(500).json({ message: '비밀번호 출석 처리 중 오류가 발생했습니다', error: error.message });
  }
};

// 출석 상태 수정하기
exports.updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, startTime, endTime } = req.body;

    // 필수 데이터 확인
    if (!status) {
      return res.status(400).json({ message: '출석 상태를 입력해주세요' });
    }

    // 상태값 유효성 검사
    const validStatus = ['출석', '지각', '결석', '병결', '공결'];
    if (!validStatus.includes(status)) {
      return res.status(400).json({ message: '유효하지 않은 출석 상태입니다' });
    }

    // 트랜잭션 시작
    const transaction = await db.sequelize.transaction();

    try {
      // 출석 기록 찾기
      const attendance = await Attendance.findByPk(id, { transaction });
      if (!attendance) {
        await transaction.rollback();
        return res.status(404).json({ message: '출석 기록을 찾을 수 없습니다' });
      }

      // attendance_record 조회 또는 생성
      let attendanceRecord = null;
      if (attendance.recordId) {
        attendanceRecord = await db.attendance_record.findByPk(attendance.recordId, { transaction });
      }

      // attendance_record가 없으면 생성
      if (!attendanceRecord) {
        attendanceRecord = await db.attendance_record.create({
          lectureId: attendance.lectureId,
          studentId: attendance.studentId,
          date: attendance.date,
          notes: notes || attendance.notes
        }, { transaction });
      } else {
        // 있으면 업데이트
        await attendanceRecord.update({
          notes: notes || attendance.notes
        }, { transaction });
      }

      // 병결 증명서 필요 여부 확인
      const requiresAbsenceProof = ['결석', '지각', '병결'].includes(status);

      // 데이터 업데이트
      await attendance.update({
        status,
        notes: notes || attendance.notes,
        checkTime: new Date(),
        recordId: attendanceRecord.id,
        requiresAbsenceProof,
        startTime: startTime || attendance.startTime,
        endTime: endTime || attendance.endTime
      }, { transaction });

      await transaction.commit();

      return res.status(200).json({
        message: '출석 정보가 업데이트되었습니다',
        attendance
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('출석 상태 수정 오류:', error);
    return res.status(500).json({ message: '출석 상태 수정 중 오류가 발생했습니다', error: error.message });
  }
};

// 출석 통계 가져오기
exports.getAttendanceStatistics = async (req, res) => {
  try {
    const { lectureId } = req.params;
    
    // 강의 존재 확인
    const lecture = await Lecture.findByPk(lectureId);
    if (!lecture) {
      return res.status(404).json({ message: '강의를 찾을 수 없습니다' });
    }

    // 강의의 모든 출석 기록 가져오기
    const attendances = await Attendance.findAll({
      where: { lectureId },
      include: [
        {
          model: User,
          as: 'student',
          where: { userType: 'student' },
          attributes: ['id', 'studentId', 'name']
        }
      ]
    });

    // 날짜별 출석 현황
    const dateStats = {};
    attendances.forEach(attendance => {
      if (!dateStats[attendance.date]) {
        dateStats[attendance.date] = {
          total: 0,
          present: 0,
          late: 0,
          absent: 0,
          sickLeave: 0,
          officialLeave: 0
        };
      }
      
      dateStats[attendance.date].total++;
      switch (attendance.status) {
        case '출석': dateStats[attendance.date].present++; break;
        case '지각': dateStats[attendance.date].late++; break;
        case '결석': dateStats[attendance.date].absent++; break;
        case '병결': dateStats[attendance.date].sickLeave++; break;
        case '공결': dateStats[attendance.date].officialLeave++; break;
      }
    });

    // 학생별 출석 현황
    const studentStats = {};
    attendances.forEach(attendance => {
      const studentId = attendance.studentId;
      if (!studentStats[studentId]) {
        studentStats[studentId] = {
          id: studentId,
          name: attendance.student ? attendance.student.name : '알 수 없음',
          studentId: attendance.student ? attendance.student.studentId : '알 수 없음',
          total: 0,
          present: 0,
          late: 0,
          absent: 0,
          sickLeave: 0,
          officialLeave: 0,
          attendanceRate: 0
        };
      }
      
      studentStats[studentId].total++;
      switch (attendance.status) {
        case '출석': studentStats[studentId].present++; break;
        case '지각': studentStats[studentId].late++; break;
        case '결석': studentStats[studentId].absent++; break;
        case '병결': studentStats[studentId].sickLeave++; break;
        case '공결': studentStats[studentId].officialLeave++; break;
      }
      
      // 출석률 계산 (출석 + 지각 / 전체)
      const attend = studentStats[studentId].present + studentStats[studentId].late;
      studentStats[studentId].attendanceRate = (attend / studentStats[studentId].total) * 100;
    });

    // 전체 통계
    const totalStats = {
      total: attendances.length,
      present: attendances.filter(a => a.status === '출석').length,
      late: attendances.filter(a => a.status === '지각').length,
      absent: attendances.filter(a => a.status === '결석').length,
      sickLeave: attendances.filter(a => a.status === '병결').length,
      officialLeave: attendances.filter(a => a.status === '공결').length,
      attendanceRate: 0
    };

    // 전체 출석률 계산
    const totalAttend = totalStats.present + totalStats.late;
    totalStats.attendanceRate = totalStats.total > 0 ? (totalAttend / totalStats.total) * 100 : 0;

    return res.status(200).json({
      lecture,
      totalStats,
      dateStats,
      studentStats: Object.values(studentStats)
    });
  } catch (error) {
    console.error('출석 통계 오류:', error);
    return res.status(500).json({ message: '출석 통계를 가져오는 중 오류가 발생했습니다' });
  }
};

// 출석 현황 엑셀 다운로드
exports.exportToExcel = async (req, res) => {
  try {
    const { lectureId } = req.params;
    
    // 강의 존재 확인
    const lecture = await Lecture.findByPk(lectureId);
    if (!lecture) {
      return res.status(404).json({ message: '강의를 찾을 수 없습니다' });
    }

    // 강의의 모든 출석 기록 가져오기
    const attendances = await Attendance.findAll({
      where: { lectureId },
      include: [
        {
          model: User,
          as: 'student',
          where: { userType: 'student' },
          attributes: ['id', 'studentId', 'name', 'department', 'grade']
        }
      ],
      order: [['date', 'ASC'], ['student', 'name', 'ASC']]
    });

    // 실제 구현에서는 엑셀 생성 라이브러리 사용 필요
    // 여기서는 데이터만 반환
    return res.status(200).json({
      message: '엑셀 데이터가 생성되었습니다',
      lecture,
      attendances
    });
  } catch (error) {
    console.error('엑셀 내보내기 오류:', error);
    return res.status(500).json({ message: '엑셀 데이터 생성 중 오류가 발생했습니다' });
  }
};

// 출석 생성하기
exports.createAttendance = async (req, res) => {
  try {
    const { lectureId, studentId, date, status, notes, startTime, endTime } = req.body;

    // 필수 데이터 확인
    if (!lectureId || !studentId || !date || !status) {
      return res.status(400).json({ message: '필수 입력값이 누락되었습니다' });
    }

    // 상태값 유효성 검사
    const validStatus = ['출석', '지각', '결석', '병결', '공결'];
    if (!validStatus.includes(status)) {
      return res.status(400).json({ message: '유효하지 않은 출석 상태입니다' });
    }

    // 학생, 강의 존재 확인
    const student = await User.findOne({ 
      where: { 
        id: studentId,
        userType: 'student'
      }
    });
    
    const lecture = await Lecture.findByPk(lectureId);

    if (!student) {
      return res.status(404).json({ message: '학생을 찾을 수 없습니다' });
    }

    if (!lecture) {
      return res.status(404).json({ message: '강의를 찾을 수 없습니다' });
    }

    // 트랜잭션 시작
    const transaction = await db.sequelize.transaction();

    try {
      // 1. 먼저 attendance_record 생성
      const attendanceRecord = await db.attendance_record.create({
        lectureId,
        studentId,
        date,
        notes
      }, { transaction });

      // 2. 병결 증명서 필요 여부 확인
      const requiresAbsenceProof = ['결석', '지각', '병결'].includes(status);

      // 3. 새로운 출석 기록 생성
      const attendance = await Attendance.create({
        lectureId,
        studentId,
        date,
        status,
        notes,
        checkTime: new Date(),
        checkMethod: req.body.checkMethod || '수기',
        recordId: attendanceRecord.id,
        requiresAbsenceProof,
        startTime,
        endTime
      }, { transaction });

      // 트랜잭션 커밋
      await transaction.commit();

      return res.status(201).json({
        message: '출석 정보가 생성되었습니다',
        attendance,
        requiresAbsenceProof
      });
    } catch (error) {
      // 오류 발생 시 트랜잭션 롤백
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('출석 생성 오류:', error);
    return res.status(500).json({ message: '출석을 생성하는 중 오류가 발생했습니다' });
  }
};

// 강의별 출석 현황 가져오기 - 날짜 & 시간 필터링 추가
exports.getAttendanceByLecture = async (req, res) => {
  try {
    const { lectureId } = req.params;
    const { date, startTime, endTime } = req.query;

    // 강의 존재 여부 확인
    const lecture = await Lecture.findByPk(lectureId);
    if (!lecture) {
      return res.status(404).json({ message: '강의를 찾을 수 없습니다' });
    }

    // 조건 설정
    const condition = { lectureId };
    if (date) {
      condition.date = date;
    }

    // 시간 조건 처리 (checkTime 필드 사용)
    let timeCondition = {};
    if (startTime && endTime) {
      const startDateTime = date ? `${date}T${startTime}:00` : null;
      const endDateTime = date ? `${date}T${endTime}:59` : null;
      
      if (startDateTime && endDateTime) {
        timeCondition = {
          checkTime: {
            [Op.between]: [startDateTime, endDateTime]
          }
        };
      }
    } else if (startTime) {
      const startDateTime = date ? `${date}T${startTime}:00` : null;
      if (startDateTime) {
        timeCondition = {
          checkTime: {
            [Op.gte]: startDateTime
          }
        };
      }
    } else if (endTime) {
      const endDateTime = date ? `${date}T${endTime}:59` : null;
      if (endDateTime) {
        timeCondition = {
          checkTime: {
            [Op.lte]: endDateTime
          }
        };
      }
    }

    // 출석 데이터 조회
    const attendances = await Attendance.findAll({
      where: {
        ...condition,
        ...timeCondition
      },
      include: [
        {
          model: User,
          as: 'student',
          where: { userType: 'student' },
          attributes: ['id', 'studentId', 'name', 'grade', 'department']
        },
        {
          model: Lecture,
          attributes: ['id', 'name', 'code']
        }
      ],
      order: [['date', 'DESC'], ['student', 'name', 'ASC']]
    });

    // 수강생 전체 조회 (출석 상태와 관계 없이 모든 수강생)
    const enrolledStudents = await db.enrollment.findAll({
      where: { lectureId },
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'studentId', 'name', 'grade', 'department']
        }
      ]
    });

    // 출석/결석 상태를 포함한 전체 학생 목록 생성
    const studentAttendanceStatus = enrolledStudents.map(enrollment => {
      const student = enrollment.student;
      const attendance = attendances.find(a => a.studentId === student.id);
      
      return {
        studentId: student.id,
        studentNumber: student.studentId,
        name: student.name,
        grade: student.grade,
        department: student.department,
        attendanceStatus: attendance ? attendance.status : '미확인',
        checkTime: attendance ? attendance.checkTime : null,
        checkMethod: attendance ? attendance.checkMethod : null
      };
    });

    // 통계 계산
    const stats = {
      totalEnrolled: enrolledStudents.length,
      present: attendances.filter(a => a.status === '출석').length,
      late: attendances.filter(a => a.status === '지각').length,
      absent: attendances.filter(a => a.status === '결석').length,
      sickLeave: attendances.filter(a => a.status === '병결').length,
      officialLeave: attendances.filter(a => a.status === '공결').length,
      unchecked: enrolledStudents.length - attendances.length
    };

    return res.status(200).json({
      lecture,
      date,
      timeRange: startTime && endTime ? `${startTime} - ${endTime}` : null,
      stats,
      students: studentAttendanceStatus
    });
  } catch (error) {
    console.error('출석 현황 조회 오류:', error);
    return res.status(500).json({ message: '출석 현황을 가져오는 중 오류가 발생했습니다' });
  }
};

module.exports = exports; 