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
    const student = await User.findOne({
      where: {
        id: studentId,
        userType: 'student'
      }
    });
    
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

// 새로운 출석 기록 생성 (통합 관리)
exports.createAttendanceRecord = async (req, res) => {
  try {
    const { lectureId, studentId, date, status, notes, checkMethod, leaveTime, absenceReason, startTime, endTime } = req.body;
    const userId = req.userId;
    
    // 필수 데이터 확인
    if (!lectureId || !studentId || !date || !status) {
      return res.status(400).json({ message: '필수 입력값이 누락되었습니다' });
    }
    
    // 상태값 유효성 검사
    const validStatus = ['출석', '지각', '결석', '병결', '공결'];
    if (!validStatus.includes(status)) {
      return res.status(400).json({ message: '유효하지 않은 출석 상태입니다' });
    }
    
    // 사용자 권한 확인
    const user = await User.findByPk(userId);
    if (!user || user.userType !== 'professor') {
      return res.status(403).json({ message: '교수자만 출석 기록을 생성할 수 있습니다' });
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
      const attendanceRecord = await AttendanceRecord.create({
        lectureId,
        studentId,
        date,
        notes
      }, { transaction });
      
      // 2. 출석 상태에 따른 처리
      // 병결 증명서 필요 여부 확인
      const requiresAbsenceProof = ['결석', '지각', '병결'].includes(status);
      
      // Attendance 생성
      const attendance = await Attendance.create({
        lectureId,
        studentId,
        date,
        status,
        notes,
        checkTime: new Date(),
        checkMethod: checkMethod || '수기',
        recordId: attendanceRecord.id,
        requiresAbsenceProof,
        startTime,
        endTime
      }, { transaction });
      
      // 3. 병결 상태인 경우 Absence 생성
      let absence = null;
      if ((status === '병결' || status === '결석') && absenceReason && leaveTime) {
        absence = await Absence.create({
          date,
          reason: absenceReason,
          leaveTime,
          studentId,
          lectureId,
          recordId: attendanceRecord.id,
          status: '승인',  // 교수자가 생성하는 경우 바로 승인 상태
          reviewerId: userId,
          reviewedAt: new Date()
        }, { transaction });
      }
      
      // 트랜잭션 커밋
      await transaction.commit();
      
      return res.status(201).json({
        message: '출석 기록이 성공적으로 생성되었습니다',
        attendanceRecord,
        attendance,
        absence,
        requiresAbsenceProof
      });
    } catch (error) {
      // 오류 발생 시 트랜잭션 롤백
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('출석 기록 생성 오류:', error);
    return res.status(500).json({ message: '출석 기록 생성 중 오류가 발생했습니다' });
  }
};
