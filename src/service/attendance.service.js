const db = require('../models');
const Attendance = db.attendance;
const Student = db.student;
const Lecture = db.lecture;
const User = db.user;
const { Op, Sequelize } = require('sequelize');
const crypto = require('crypto');

// 강의별 출석 현황 가져오기
exports.getAttendanceByLecture = async (req, res) => {
  try {
    const { lectureId } = req.params;
    const { date } = req.query;

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

    // 출석 데이터 조회
    const attendances = await Attendance.findAll({
      where: condition,
      include: [
        {
          model: Student,
          attributes: ['id', 'studentId', 'name', 'grade', 'department']
        },
        {
          model: Lecture,
          attributes: ['id', 'name', 'code']
        }
      ],
      order: [['date', 'DESC'], [Student, 'name', 'ASC']]
    });

    return res.status(200).json(attendances);
  } catch (error) {
    console.error('출석 현황 조회 오류:', error);
    return res.status(500).json({ message: '출석 현황을 가져오는 중 오류가 발생했습니다' });
  }
};

// 학생별 출석 현황 가져오기
exports.getAttendanceByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { lectureId } = req.query;

    // 학생 존재 여부 확인
    const student = await Student.findByPk(studentId);
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

// 특정 날짜 출석 현황 가져오기
exports.getAttendanceByDate = async (req, res) => {
  try {
    const { lectureId, date } = req.params;

    // 강의 존재 여부 확인
    const lecture = await Lecture.findByPk(lectureId);
    if (!lecture) {
      return res.status(404).json({ message: '강의를 찾을 수 없습니다' });
    }

    // 출석 데이터 조회
    const attendances = await Attendance.findAll({
      where: {
        lectureId,
        date
      },
      include: [
        {
          model: Student,
          attributes: ['id', 'studentId', 'name', 'grade', 'department']
        }
      ],
      order: [[Student, 'name', 'ASC']]
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
      lecture,
      date,
      stats,
      attendances
    });
  } catch (error) {
    console.error('특정 날짜 출석 현황 조회 오류:', error);
    return res.status(500).json({ message: '출석 현황을 가져오는 중 오류가 발생했습니다' });
  }
};

// 출석 체크하기
exports.checkAttendance = async (req, res) => {
  try {
    const { lectureId, studentId, date, status, notes } = req.body;

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
    const student = await Student.findByPk(studentId);
    const lecture = await Lecture.findByPk(lectureId);

    if (!student) {
      return res.status(404).json({ message: '학생을 찾을 수 없습니다' });
    }

    if (!lecture) {
      return res.status(404).json({ message: '강의를 찾을 수 없습니다' });
    }

    // 기존 출석 기록 확인
    let attendance = await Attendance.findOne({
      where: {
        lectureId,
        studentId,
        date
      }
    });

    if (attendance) {
      // 기존 기록 업데이트
      attendance = await attendance.update({
        status,
        notes,
        checkTime: new Date(),
        checkMethod: req.body.checkMethod || '수기'
      });
    } else {
      // 새로운 출석 기록 생성
      attendance = await Attendance.create({
        lectureId,
        studentId,
        date,
        status,
        notes,
        checkTime: new Date(),
        checkMethod: req.body.checkMethod || '수기'
      });
    }

    return res.status(200).json({
      message: '출석이 기록되었습니다',
      attendance
    });
  } catch (error) {
    console.error('출석 체크 오류:', error);
    return res.status(500).json({ message: '출석 체크 중 오류가 발생했습니다' });
  }
};

// 여러 학생 출석 체크 (일괄 처리)
exports.checkMultipleAttendance = async (req, res) => {
  const t = await db.sequelize.transaction();
  
  try {
    const { lectureId, date, attendances } = req.body;

    // 필수 데이터 확인
    if (!lectureId || !date || !attendances || !Array.isArray(attendances)) {
      await t.rollback();
      return res.status(400).json({ message: '필수 입력값이 누락되었습니다' });
    }

    // 강의 존재 확인
    const lecture = await Lecture.findByPk(lectureId);
    if (!lecture) {
      await t.rollback();
      return res.status(404).json({ message: '강의를 찾을 수 없습니다' });
    }

    const validStatus = ['출석', '지각', '결석', '병결', '공결'];
    const results = [];

    // 각 학생별 출석 처리
    for (const item of attendances) {
      if (!item.studentId || !item.status) {
        continue;
      }

      if (!validStatus.includes(item.status)) {
        continue;
      }

      // 학생 존재 확인
      const student = await Student.findByPk(item.studentId, { transaction: t });
      if (!student) {
        continue;
      }

      // 기존 출석 기록 확인
      let attendance = await Attendance.findOne({
        where: {
          lectureId,
          studentId: item.studentId,
          date
        },
        transaction: t
      });

      if (attendance) {
        // 기존 기록 업데이트
        attendance = await attendance.update({
          status: item.status,
          notes: item.notes,
          checkTime: new Date(),
          checkMethod: '수기'
        }, { transaction: t });
      } else {
        // 새로운 출석 기록 생성
        attendance = await Attendance.create({
          lectureId,
          studentId: item.studentId,
          date,
          status: item.status,
          notes: item.notes,
          checkTime: new Date(),
          checkMethod: '수기'
        }, { transaction: t });
      }

      results.push(attendance);
    }

    await t.commit();

    return res.status(200).json({
      message: `${results.length}명의 출석이 처리되었습니다`,
      attendances: results
    });
  } catch (error) {
    await t.rollback();
    console.error('다중 출석 체크 오류:', error);
    return res.status(500).json({ message: '출석 체크 중 오류가 발생했습니다' });
  }
};

// 출석 상태 수정하기
exports.updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    // 필수 데이터 확인
    if (!status) {
      return res.status(400).json({ message: '출석 상태를 입력해주세요' });
    }

    // 상태값 유효성 검사
    const validStatus = ['출석', '지각', '결석', '병결', '공결'];
    if (!validStatus.includes(status)) {
      return res.status(400).json({ message: '유효하지 않은 출석 상태입니다' });
    }

    // 출석 기록 찾기
    const attendance = await Attendance.findByPk(id);
    if (!attendance) {
      return res.status(404).json({ message: '출석 기록을 찾을 수 없습니다' });
    }

    // 데이터 업데이트
    await attendance.update({
      status,
      notes,
      checkTime: new Date()
    });

    return res.status(200).json({
      message: '출석 정보가 업데이트되었습니다',
      attendance
    });
  } catch (error) {
    console.error('출석 상태 수정 오류:', error);
    return res.status(500).json({ message: '출석 상태 수정 중 오류가 발생했습니다' });
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

    const student = await Student.findOne({ where: { userId } });
    if (!student) {
      return res.status(404).json({ message: '학생 정보를 찾을 수 없습니다' });
    }

    // 출석 기록
    let attendance = await Attendance.findOne({
      where: {
        lectureId: parsedQRData.lectureId,
        studentId: student.id,
        date: parsedQRData.date
      }
    });

    if (attendance) {
      // 이미 출석했는지 확인
      if (attendance.status === '출석' || attendance.status === '지각') {
        return res.status(400).json({ message: '이미 출석 처리되었습니다' });
      }
      
      // 기존 기록 업데이트
      attendance = await attendance.update({
        status: '출석', // 또는 시간에 따라 '지각'으로 설정
        checkTime: now,
        checkMethod: 'QR'
      });
    } else {
      // 새로운 출석 기록 생성
      attendance = await Attendance.create({
        lectureId: parsedQRData.lectureId,
        studentId: student.id,
        date: parsedQRData.date,
        status: '출석', // 또는 시간에 따라 '지각'으로 설정
        checkTime: now,
        checkMethod: 'QR'
      });
    }

    return res.status(200).json({
      message: '출석이 성공적으로 기록되었습니다',
      attendance
    });
  } catch (error) {
    console.error('QR 출석 오류:', error);
    return res.status(500).json({ message: 'QR 출석 처리 중 오류가 발생했습니다' });
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
          model: Student,
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
          model: Student,
          attributes: ['id', 'studentId', 'name', 'department', 'grade']
        }
      ],
      order: [['date', 'ASC'], [Student, 'name', 'ASC']]
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
    const { lectureId, studentId, date, status, notes } = req.body;

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
    const student = await Student.findByPk(studentId);
    const lecture = await Lecture.findByPk(lectureId);

    if (!student) {
      return res.status(404).json({ message: '학생을 찾을 수 없습니다' });
    }

    if (!lecture) {
      return res.status(404).json({ message: '강의를 찾을 수 없습니다' });
    }

    // 새로운 출석 기록 생성
    const attendance = await Attendance.create({
      lectureId,
      studentId,
      date,
      status,
      notes,
      checkTime: new Date(),
      checkMethod: req.body.checkMethod || '수기'
    });

    return res.status(201).json(attendance);
  } catch (error) {
    console.error('출석 생성 오류:', error);
    return res.status(500).json({ message: '출석을 생성하는 중 오류가 발생했습니다' });
  }
}; 