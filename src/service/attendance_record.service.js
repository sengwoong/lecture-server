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
    if (studentId) condition.studentId = studentId;
    
    // 출석 기록 조회
    let records = await AttendanceRecord.findAll({
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
        },
        {
          model: LectureSchedule,
          as: 'lectureSchedule',
          required: false,
          attributes: ['id', 'week', 'startTime', 'endTime']
        }
      ],
      order: [['date', 'DESC']]
    });
    
    // 출석 상태 처리: Attendance가 출석인 경우 또는 Absence에서 출석 인증된 경우 '출석'으로 표시
    records = records.map(record => {
      const recordObj = record.toJSON();
      
      // attendance가 '출석'인 경우 또는 absence가 '승인' 상태인 경우 '출석'으로 설정
      if ((recordObj.attendance && recordObj.attendance.status === '출석') || 
          (recordObj.absence && recordObj.absence.status === '승인')) {
        recordObj.status = '출석';
      } else if (recordObj.attendance) {
        // 그 외의 경우 attendance의 status 값 사용
        recordObj.status = recordObj.attendance.status;
      } else {
        // attendance가 없는 경우 기본값 설정
        recordObj.status = '미확인';
      }
      
      return recordObj;
    });
    
    // 상태 필터링 처리
    if (status) {
      records = records.filter(record => record.status === status);
    }
    
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
    let records = await AttendanceRecord.findAll({
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
        },
        {
          model: LectureSchedule,
          as: 'lectureSchedule',
          required: false,
          attributes: ['id', 'week', 'startTime', 'endTime']
        }
      ],
      order: [['date', 'DESC']]
    });
    
    // 출석 상태 처리: Attendance가 출석인 경우 또는 Absence에서 출석 인증된 경우 '출석'으로 표시
    records = records.map(record => {
      const recordObj = record.toJSON();
      
      // attendance가 '출석'인 경우 또는 absence가 '승인' 상태인 경우 '출석'으로 설정
      if ((recordObj.attendance && recordObj.attendance.status === '출석') || 
          (recordObj.absence && recordObj.absence.status === '승인')) {
        recordObj.status = '출석';
      } else if (recordObj.attendance) {
        // 그 외의 경우 attendance의 status 값 사용
        recordObj.status = recordObj.attendance.status;
      } else {
        // attendance가 없는 경우 기본값 설정
        recordObj.status = '미확인';
      }
      
      return recordObj;
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
