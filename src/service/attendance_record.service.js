const db = require('../models');
const AttendanceRecord = db.attendance_record;
const Attendance = db.attendance;
const Absence = db.absence;
const User = db.user;
const Lecture = db.lecture;
const LectureSchedule = db.lecture_schedule;
const { Op } = db.Sequelize;
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * 기본 출석 기록 생성
 */
const createAttendanceRecord = async (data) => {
  try {
    const record = await AttendanceRecord.create({
      date: data.date,
      status: data.status,
      notes: data.notes,
      lectureId: data.lectureId,
      studentId: data.studentId,
      recordType: data.recordType,
      lectureScheduleId: data.lectureScheduleId
    });
    return record;
  } catch (error) {
    throw error;
  }
};

/**
 * 일반 출석 생성 (일반 출석 기록 + 출석 세부 정보)
 */
exports.createAttendance = async (req, res) => {
  try {
    // 필수 데이터 확인
    const { lectureId, studentId, date, status, notes, lectureScheduleId } = req.body;
    if (!lectureId || !studentId || !date || !status) {
      return res.status(400).json({ message: '필수 입력값이 누락되었습니다' });
    }

    // 상태값 유효성 검사
    const validStatus = ['출석', '지각', '결석', '병결', '공결'];
    if (!validStatus.includes(status)) {
      return res.status(400).json({ message: '유효하지 않은 출석 상태입니다' });
    }

    // 학생, 강의 존재 확인
    const user = await User.findByPk(studentId);
    const lecture = await Lecture.findByPk(lectureId);

    if (!user) {
      return res.status(404).json({ message: '학생을 찾을 수 없습니다' });
    }

    if (!lecture) {
      return res.status(404).json({ message: '강의를 찾을 수 없습니다' });
    }

    // 날짜가 강의 일정인지 확인
    // 요일 확인
    const targetDate = new Date(date);
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const targetDay = dayNames[targetDate.getDay()];
    
    if (!lecture.dayOfWeek.includes(targetDay)) {
      return res.status(400).json({ 
        message: `${targetDay}요일은 강의 요일(${lecture.dayOfWeek})이 아닙니다.`
      });
    }
    
    // 해당 날짜에 예외 일정(휴강/보충)이 있는지 확인
    let lectureSchedule;
    if (lectureScheduleId) {
      lectureSchedule = await LectureSchedule.findByPk(lectureScheduleId);
      if (!lectureSchedule) {
        return res.status(404).json({ message: '해당 강의 일정을 찾을 수 없습니다' });
      }
      if (lectureSchedule.lectureId !== parseInt(lectureId)) {
        return res.status(400).json({ message: '강의 일정이 이 강의에 속하지 않습니다' });
      }
      
      // 휴강인지 확인
      if (lectureSchedule.scheduleType === '휴강') {
        return res.status(400).json({ message: '휴강으로 설정된 날짜에는 출석을 기록할 수 없습니다' });
      }
    } else {
      // 날짜에 해당하는 강의 일정 찾기 (예외 상황: 휴강/보충)
      lectureSchedule = await LectureSchedule.findOne({
        where: {
          lectureId,
          date
        }
      });
      
      // 휴강인지 확인
      if (lectureSchedule && lectureSchedule.scheduleType === '휴강') {
        return res.status(400).json({ message: '휴강으로 설정된 날짜에는 출석을 기록할 수 없습니다' });
      }
    }

    // 1. 기본 출석 기록 생성
    const recordData = {
      date: date,
      status: status,
      notes: notes,
      lectureId: lectureId,
      studentId: studentId,
      recordType: 'attendance',
      lectureScheduleId: lectureSchedule ? lectureSchedule.id : null
    };
    
    const record = await createAttendanceRecord(recordData);
    
    // 2. 확장 출석 정보 생성
    const attendance = await Attendance.create({
      recordId: record.id,
      checkTime: req.body.checkTime || new Date(),
      checkMethod: req.body.checkMethod || '수기'
    });
    
    return res.status(201).json({
      message: '출석 정보가 생성되었습니다.',
      data: {
        record,
        attendance,
        lectureSchedule: lectureSchedule || null
      }
    });
  } catch (error) {
    console.error('출석 정보 생성 오류:', error);
    return res.status(500).json({ message: '출석 정보를 생성하는 중 오류가 발생했습니다.' });
  }
};

/**
 * 병결 신청 생성 (병결 출석 기록 + 병결 세부 정보)
 */
exports.createAbsence = async (req, res) => {
  try {
    const { startDate, endDate, reason, lectureId } = req.body;
    const userId = req.userId;

    // 필수 입력값 확인
    if (!startDate || !endDate || !reason || !lectureId) {
      return res.status(400).json({ message: '시작일, 종료일, 사유, 강의ID는 필수 입력값입니다' });
    }

    // 날짜 유효성 검사
    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ message: '시작일은 종료일보다 이전이어야 합니다' });
    }

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

    // 강의 존재 확인
    const lecture = await Lecture.findByPk(lectureId);
    if (!lecture) {
      return res.status(404).json({ message: '강의를 찾을 수 없습니다' });
    }

    // 요청 파일 처리
    const files = req.files || [];
    const documents = files.map(file => ({
      filename: file.filename,
      originalname: file.originalname,
      path: file.path,
      size: file.size,
      mimetype: file.mimetype
    }));
    
    // 1. 기본 출석 기록 생성
    const recordData = {
      date: startDate, // 시작일을 기본 날짜로 설정
      status: '병결',
      notes: reason,
      lectureId: lectureId,
      studentId: userId, // 현재 로그인한 사용자
      recordType: 'absence'
    };
    
    const record = await createAttendanceRecord(recordData);
    
    // 2. 확장 병결 정보 생성
    const absence = await Absence.create({
      recordId: record.id,
      startDate: startDate,
      endDate: endDate,
      reason: reason,
      documents: documents.length > 0 ? documents : null
    });
    
    return res.status(201).json({
      message: '병결 신청이 등록되었습니다.',
      data: {
        record,
        absence
      }
    });
  } catch (error) {
    console.error('병결 신청 생성 오류:', error);
    return res.status(500).json({ message: '병결 신청을 등록하는 중 오류가 발생했습니다.' });
  }
};

/**
 * 특정 강의의 출석 목록 조회 (일반 출석 + 병결)
 */
exports.getAttendanceRecordsByLecture = async (req, res) => {
  try {
    const lectureId = req.params.lectureId;
    const { date, status, studentId } = req.query;
    
    // 강의 존재 여부 확인
    const lecture = await Lecture.findByPk(lectureId);
    if (!lecture) {
      return res.status(404).json({ message: '해당 강의를 찾을 수 없습니다.' });
    }
    
    // 조건 설정
    const condition = { lectureId };
    if (date) condition.date = date;
    if (status) condition.status = status;
    if (studentId) condition.studentId = studentId;
    
    // 출석 기록 조회
    const records = await AttendanceRecord.findAll({
      where: condition,
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'studentId', 'email']
        },
        {
          model: Attendance,
          required: false
        },
        {
          model: Absence,
          required: false,
          include: [{
            model: User,
            as: 'reviewer',
            attributes: ['id', 'name'],
            required: false
          }]
        }
      ],
      order: [['date', 'DESC']]
    });
    
    // 통계 계산
    const stats = {
      total: records.length,
      present: records.filter(r => r.status === '출석').length,
      late: records.filter(r => r.status === '지각').length,
      absent: records.filter(r => r.status === '결석').length,
      sickLeave: records.filter(r => r.status === '병결').length,
      officialLeave: records.filter(r => r.status === '공결').length
    };
    
    return res.status(200).json({
      message: '강의 출석 목록 조회 성공',
      data: {
        lecture,
        stats,
        records
      }
    });
  } catch (error) {
    console.error('강의 출석 목록 조회 오류:', error);
    return res.status(500).json({ message: '강의 출석 목록을 조회하는 중 오류가 발생했습니다.' });
  }
};

/**
 * 학생의 출석 기록 조회
 */
exports.getStudentAttendanceRecords = async (req, res) => {
  try {
    const studentId = req.params.studentId || req.userId;
    const { lectureId } = req.query;
    
    // 학생 존재 여부 확인
    const student = await User.findByPk(studentId);
    if (!student) {
      return res.status(404).json({ message: '학생을 찾을 수 없습니다.' });
    }
    
    // 조건 설정
    const condition = { studentId };
    if (lectureId) condition.lectureId = lectureId;
    
    // 출석 기록 조회
    const records = await AttendanceRecord.findAll({
      where: condition,
      include: [
        {
          model: Lecture,
          attributes: ['id', 'name', 'code', 'semester']
        },
        {
          model: Attendance,
          required: false
        },
        {
          model: Absence,
          required: false
        }
      ],
      order: [['date', 'DESC']]
    });
    
    // 통계 계산
    const stats = {
      total: records.length,
      present: records.filter(r => r.status === '출석').length,
      late: records.filter(r => r.status === '지각').length,
      absent: records.filter(r => r.status === '결석').length,
      sickLeave: records.filter(r => r.status === '병결').length,
      officialLeave: records.filter(r => r.status === '공결').length
    };
    
    return res.status(200).json({
      message: '학생 출석 목록 조회 성공',
      data: {
        student,
        stats,
        records
      }
    });
  } catch (error) {
    console.error('학생 출석 목록 조회 오류:', error);
    return res.status(500).json({ message: '학생 출석 목록을 조회하는 중 오류가 발생했습니다.' });
  }
};

/**
 * 병결 신청 상태 변경 (교수/관리자 전용)
 */
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
    const absence = await Absence.findByPk(id, {
      include: [{ model: AttendanceRecord }]
    });
    
    if (!absence) {
      return res.status(404).json({ message: '병결 신청을 찾을 수 없습니다' });
    }

    // 이미 처리된 경우
    if (absence.status !== '대기') {
      return res.status(400).json({ message: '이미 처리된 병결 신청입니다' });
    }

    // 병결 신청 및 연관 출석 기록 업데이트
    await db.sequelize.transaction(async (t) => {
      await absence.update({
        status,
        feedback,
        reviewerId: userId,
        reviewedAt: new Date()
      }, { transaction: t });
      
      // 승인 시 출석 상태 업데이트
      if (status === '승인' && absence.AttendanceRecord) {
        await absence.AttendanceRecord.update({
          status: '병결'
        }, { transaction: t });
      }
    });

    return res.status(200).json({
      message: `병결 신청이 ${status === '승인' ? '승인' : '반려'}되었습니다`,
      data: absence
    });
  } catch (error) {
    console.error('병결 신청 상태 변경 오류:', error);
    return res.status(500).json({ message: '병결 신청 상태 변경 중 오류가 발생했습니다' });
  }
};

/**
 * 병결 신청 삭제
 */
exports.deleteAbsence = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // 병결 신청 조회
    const absence = await Absence.findByPk(id, {
      include: [{ model: AttendanceRecord }]
    });
    
    if (!absence) {
      return res.status(404).json({ message: '병결 신청을 찾을 수 없습니다' });
    }

    // 본인 확인
    if (absence.AttendanceRecord && absence.AttendanceRecord.studentId !== userId) {
      const user = await User.findByPk(userId);
      if (user.userType !== 'admin' && user.userType !== 'professor') {
        return res.status(403).json({ message: '본인의 병결 신청만 삭제할 수 있습니다' });
      }
    }

    // 트랜잭션으로 관련 레코드 모두 삭제
    await db.sequelize.transaction(async (t) => {
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
      await absence.destroy({ transaction: t });
      
      // 연관된 출석 기록 삭제
      if (absence.AttendanceRecord) {
        await absence.AttendanceRecord.destroy({ transaction: t });
      }
    });

    return res.status(200).json({
      message: '병결 신청이 삭제되었습니다'
    });
  } catch (error) {
    console.error('병결 신청 삭제 오류:', error);
    return res.status(500).json({ message: '병결 신청 삭제 중 오류가 발생했습니다' });
  }
};

/**
 * QR코드 생성하기
 */
exports.generateQRCode = async (req, res) => {
  try {
    const { lectureId } = req.params;
    const { lectureScheduleId } = req.query;
    
    // 강의 존재 확인
    const lecture = await Lecture.findByPk(lectureId);
    if (!lecture) {
      return res.status(404).json({ message: '강의를 찾을 수 없습니다' });
    }

    // 현재 날짜와 시간
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0];

    // 강의 일정 확인
    let lectureSchedule;
    if (lectureScheduleId) {
      // 지정된 일정 사용
      lectureSchedule = await LectureSchedule.findByPk(lectureScheduleId);
      if (!lectureSchedule) {
        return res.status(404).json({ message: '해당 강의 일정을 찾을 수 없습니다' });
      }
      if (lectureSchedule.lectureId !== parseInt(lectureId)) {
        return res.status(400).json({ message: '강의 일정이 이 강의에 속하지 않습니다' });
      }
    } else {
      // 오늘 날짜의 강의 일정 찾기
      lectureSchedule = await LectureSchedule.findOne({
        where: {
          lectureId,
          date: dateStr
        }
      });
      
      if (!lectureSchedule) {
        // 오늘 강의 일정이 없는 경우, 가장 가까운 미래 일정 조회
        lectureSchedule = await LectureSchedule.findOne({
          where: {
            lectureId,
            date: { [Op.gte]: dateStr }
          },
          order: [['date', 'ASC']]
        });
      }
    }
    
    // 암호화된 QR 코드 데이터 생성 (10분간 유효)
    const validUntil = new Date(now.getTime() + 10 * 60000); // 10분 추가
    const qrData = {
      lectureId,
      date: lectureSchedule ? lectureSchedule.date : dateStr,
      time: timeStr,
      validUntil: validUntil.toISOString(),
      lectureScheduleId: lectureSchedule ? lectureSchedule.id : null,
      key: crypto.randomBytes(10).toString('hex') // 무작위 키 추가
    };

    return res.status(200).json({
      message: 'QR 코드가 생성되었습니다',
      qrData: JSON.stringify(qrData),
      validUntil,
      lectureSchedule: lectureSchedule || null
    });
  } catch (error) {
    console.error('QR 코드 생성 오류:', error);
    return res.status(500).json({ message: 'QR 코드 생성 중 오류가 발생했습니다' });
  }
};

/**
 * QR코드로 출석하기
 */
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

    // 사용자 정보 확인
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
    }

    if (user.userType !== 'student') {
      return res.status(403).json({ message: '학생만 출석할 수 있습니다' });
    }
    
    // 강의 정보 확인
    const lecture = await Lecture.findByPk(parsedQRData.lectureId);
    if (!lecture) {
      return res.status(404).json({ message: '강의를 찾을 수 없습니다' });
    }

    // 날짜 확인 (QR 생성 시 날짜)
    const attendanceDate = parsedQRData.date;
    
    // 해당 날짜가 강의 요일인지 확인
    const targetDate = new Date(attendanceDate);
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const targetDay = dayNames[targetDate.getDay()];
    
    if (!lecture.dayOfWeek.includes(targetDay)) {
      return res.status(400).json({ 
        message: `${targetDay}요일은 강의 요일(${lecture.dayOfWeek})이 아닙니다` 
      });
    }

    // 예외 일정(휴강/보충) 확인
    let lectureSchedule;
    if (parsedQRData.lectureScheduleId) {
      lectureSchedule = await LectureSchedule.findByPk(parsedQRData.lectureScheduleId);
      if (lectureSchedule && lectureSchedule.scheduleType === '휴강') {
        return res.status(400).json({ message: '휴강으로 설정된 날짜에는 출석할 수 없습니다' });
      }
    } else {
      // 날짜에 해당하는 강의 일정 찾기
      lectureSchedule = await LectureSchedule.findOne({
        where: {
          lectureId: parsedQRData.lectureId,
          date: attendanceDate
        }
      });
      
      if (lectureSchedule && lectureSchedule.scheduleType === '휴강') {
        return res.status(400).json({ message: '휴강으로 설정된 날짜에는 출석할 수 없습니다' });
      }
    }

    // 기존 출석 기록 확인
    let record = await AttendanceRecord.findOne({
      where: {
        lectureId: parsedQRData.lectureId,
        studentId: userId,
        date: attendanceDate,
        ...(lectureSchedule ? { lectureScheduleId: lectureSchedule.id } : {})
      },
      include: [{ model: Attendance }]
    });

    if (record) {
      // 이미 출석했는지 확인
      if ((record.status === '출석' || record.status === '지각') && record.Attendance) {
        return res.status(400).json({ message: '이미 출석 처리되었습니다' });
      }
      
      await db.sequelize.transaction(async (t) => {
        // 레코드 업데이트
        await record.update({
          status: '출석',
          recordType: 'attendance',
          ...(lectureSchedule && !record.lectureScheduleId ? { lectureScheduleId: lectureSchedule.id } : {})
        }, { transaction: t });
        
        // 출석 정보 생성 또는 업데이트
        if (record.Attendance) {
          await record.Attendance.update({
            checkTime: now,
            checkMethod: 'QR'
          }, { transaction: t });
        } else {
          await Attendance.create({
            recordId: record.id,
            checkTime: now,
            checkMethod: 'QR'
          }, { transaction: t });
        }
      });
    } else {
      await db.sequelize.transaction(async (t) => {
        // 새 레코드 생성
        record = await AttendanceRecord.create({
          date: attendanceDate,
          status: '출석',
          lectureId: parsedQRData.lectureId,
          studentId: userId,
          recordType: 'attendance',
          lectureScheduleId: lectureSchedule ? lectureSchedule.id : null
        }, { transaction: t });
        
        // 출석 정보 생성
        await Attendance.create({
          recordId: record.id,
          checkTime: now,
          checkMethod: 'QR'
        }, { transaction: t });
      });
    }

    return res.status(200).json({
      message: '출석이 성공적으로 기록되었습니다',
      data: {
        record,
        lectureSchedule: lectureSchedule || null
      }
    });
  } catch (error) {
    console.error('QR 출석 오류:', error);
    return res.status(500).json({ message: 'QR 출석 처리 중 오류가 발생했습니다' });
  }
};

/**
 * 첨부 문서 다운로드
 */
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

module.exports = exports; 