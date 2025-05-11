const db = require('../models');
const LectureSchedule = db.lecture_schedule;
const Lecture = db.lecture;
const { Op } = db.Sequelize;

/**
 * 강의 일정 생성
 */
exports.createLectureSchedule = async (req, res) => {
  try {
    const { lectureId, week, date, startTime, endTime, topic, notes, scheduleType, makeupReason } = req.body;
    
    if (!lectureId || !week || !date || !startTime || !endTime) {
      return res.status(400).json({ message: '강의 ID, 주차, 날짜, 시작/종료 시간은 필수 입력값입니다' });
    }
    
    // 강의 존재 여부 확인
    const lecture = await Lecture.findByPk(lectureId);
    if (!lecture) {
      return res.status(404).json({ message: '해당 강의를 찾을 수 없습니다' });
    }
    
    // 중복 일정 확인 (보충 강의는 제외)
    const existingSchedule = await LectureSchedule.findOne({
      where: {
        lectureId,
        date
      }
    });
    
    if (existingSchedule) {
      return res.status(400).json({ message: '해당 날짜에 이미 일정이 존재합니다' });
    }
    
    // scheduleType 유효성 검사
    if (scheduleType && !['휴강', '보충'].includes(scheduleType)) {
      return res.status(400).json({ message: '유효한 일정 유형이 아닙니다. (휴강/보충)' });
    }
    
    const schedule = await LectureSchedule.create({
      lectureId,
      week,
      date,
      startTime,
      endTime,
      topic,
      notes,
      scheduleType,
      makeupReason
    });
    
    return res.status(201).json({
      message: '강의 일정이 생성되었습니다',
      data: schedule
    });
  } catch (error) {
    console.error('강의 일정 생성 오류:', error);
    return res.status(500).json({ message: '강의 일정 생성 중 오류가 발생했습니다' });
  }
};

/**
 * 강의별 일정 목록 조회 
 */
exports.getLectureSchedules = async (req, res) => {
  try {
    const { lectureId } = req.params;
    const { 
      date,  // 일 파라미터 (ex: 11)
      month, // 월 파라미터 (ex: 05)
      year,  // 연도 파라미터 (ex: 2025)
      scheduleType 
    } = req.query;
    
    // 강의 존재 여부 확인
    const lecture = await Lecture.findByPk(lectureId);
    if (!lecture) {
      return res.status(404).json({ message: '해당 강의를 찾을 수 없습니다' });
    }
    
    // 현재 연도 또는 지정된 연도 사용
    const currentYear = year ? parseInt(year) : new Date().getFullYear();
    
    // 검색 조건 설정
    const whereClause = { lectureId };
    
    // 날짜 필터링 (date, month, year 모두 옵션)
    if (month && date) {
      // 특정 연도/월/일 (ex: 2025년 5월 11일)
      const monthNum = parseInt(month);
      const dayNum = parseInt(date);
      
      // 날짜 생성
      const targetDate = new Date(currentYear, monthNum - 1, dayNum);
      whereClause.date = targetDate.toISOString().split('T')[0];
      
      console.log(`특정 날짜 조회: ${currentYear}년 ${monthNum}월 ${dayNum}일 (${whereClause.date})`);
    } else if (month) {
      // 특정 연도/월의 모든 날짜 (ex: 2025년 5월)
      const monthNum = parseInt(month);
      
      // 해당 월의 시작일과 종료일
      const startOfMonth = new Date(currentYear, monthNum - 1, 1);
      const endOfMonth = new Date(currentYear, monthNum, 0);
      
      whereClause.date = {
        [Op.between]: [
          startOfMonth.toISOString().split('T')[0],
          endOfMonth.toISOString().split('T')[0]
        ]
      };
      
      console.log(`월별 조회: ${currentYear}년 ${monthNum}월 (${startOfMonth.toISOString().split('T')[0]} ~ ${endOfMonth.toISOString().split('T')[0]})`);
    } else if (year && !month && !date) {
      // 특정 연도의 모든 날짜 (ex: 2025년 전체)
      const startOfYear = new Date(currentYear, 0, 1);
      const endOfYear = new Date(currentYear, 11, 31);
      
      whereClause.date = {
        [Op.between]: [
          startOfYear.toISOString().split('T')[0],
          endOfYear.toISOString().split('T')[0]
        ]
      };
      
      console.log(`연도별 조회: ${currentYear}년 (${startOfYear.toISOString().split('T')[0]} ~ ${endOfYear.toISOString().split('T')[0]})`);
    } else if (date) {
      // 특정 연도의 매월 특정 일 (ex: 2025년 매월 11일)
      const dayNum = parseInt(date).toString().padStart(2, '0');
      
      if (year) {
        // 특정 연도의 해당 일자만
        whereClause.date = { 
          [Op.like]: `${currentYear}-%-${dayNum}` 
        };
        console.log(`특정 일자 조회: ${currentYear}년 매월 ${dayNum}일`);
      } else {
        // 모든 연도의 해당 일자
        whereClause.date = { 
          [Op.like]: `%-${dayNum}` 
        };
        console.log(`특정 일자 조회: 매월 ${dayNum}일`);
      }
    } else if (year) {
      // 특정 연도의 모든 날짜
      whereClause.date = { 
        [Op.like]: `${currentYear}-%` 
      };
      console.log(`연도별 조회: ${currentYear}년`);
    }
    // else: date, month, year 모두 없으면 강의의 모든 일정 조회 (조건 없음)
    
    // 일정 유형 필터 (휴강, 보충 등)
    if (scheduleType) {
      whereClause.scheduleType = scheduleType;
    }
    
    // 일정 조회
    const lectureSchedules = await LectureSchedule.findAll({
      where: whereClause,
      include: [
        {
          model: LectureSchedule,
          as: 'makeupSchedule',
          required: false
        },
        {
          model: LectureSchedule,
          as: 'originalSchedule',
          required: false
        }
      ],
      order: [['date', 'ASC']]
    });
    
    return res.status(200).json({
      message: '강의 일정 조회 성공',
      data: {
        lecture,
        schedules: lectureSchedules
      }
    });
  } catch (error) {
    console.error('강의 일정 목록 조회 오류:', error);
    return res.status(500).json({ message: '강의 일정 목록 조회 중 오류가 발생했습니다' });
  }
};

/**
 * 강의 일정 조회
 */
exports.getLectureSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    
    const schedule = await LectureSchedule.findByPk(id, {
      include: [
        {
          model: Lecture,
          attributes: ['id', 'name', 'code', 'semester']
        },
        {
          model: LectureSchedule,
          as: 'makeupSchedule',
          required: false
        },
        {
          model: LectureSchedule,
          as: 'originalSchedule',
          required: false
        }
      ]
    });
    
    if (!schedule) {
      return res.status(404).json({ message: '해당 강의 일정을 찾을 수 없습니다' });
    }
    
    return res.status(200).json({
      message: '강의 일정 조회 성공',
      data: schedule
    });
  } catch (error) {
    console.error('강의 일정 조회 오류:', error);
    return res.status(500).json({ message: '강의 일정 조회 중 오류가 발생했습니다' });
  }
};

/**
 * 강의 일정 수정
 */
exports.updateLectureSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const { week, date, startTime, endTime, topic, notes, scheduleType, makeupReason } = req.body;
    
    const schedule = await LectureSchedule.findByPk(id);
    if (!schedule) {
      return res.status(404).json({ message: '해당 강의 일정을 찾을 수 없습니다' });
    }
    
    // 중복 일정 확인 (자기 자신과 보충 강의는 제외)
    if (date && date !== schedule.date) {
      const existingSchedule = await LectureSchedule.findOne({
        where: {
          id: { [Op.ne]: id },
          lectureId: schedule.lectureId,
          date,
          scheduleType: { [Op.ne]: '보충' }
        }
      });
      
      if (existingSchedule) {
        return res.status(400).json({ message: '해당 날짜에 이미 다른 일정이 존재합니다' });
      }
    }
    
    await schedule.update({
      week: week || schedule.week,
      date: date || schedule.date,
      startTime: startTime || schedule.startTime,
      endTime: endTime || schedule.endTime,
      topic: topic !== undefined ? topic : schedule.topic,
      notes: notes !== undefined ? notes : schedule.notes,
      scheduleType: scheduleType || schedule.scheduleType,
      makeupReason: makeupReason !== undefined ? makeupReason : schedule.makeupReason
    });
    
    return res.status(200).json({
      message: '강의 일정이 수정되었습니다',
      data: schedule
    });
  } catch (error) {
    console.error('강의 일정 수정 오류:', error);
    return res.status(500).json({ message: '강의 일정 수정 중 오류가 발생했습니다' });
  }
};

/**
 * 휴강 설정
 */
exports.setClassCancellation = async (req, res) => {
  try {
    const { lectureId, date } = req.params;
    const { reason, notes } = req.body;
    
    // 강의 존재 여부 확인
    const lecture = await Lecture.findByPk(lectureId);
    if (!lecture) {
      return res.status(404).json({ message: '해당 강의를 찾을 수 없습니다' });
    }
    
    // 해당 날짜가 강의 기간 내에 있는지 확인
    const targetDate = new Date(date);
    const startDate = new Date(lecture.startDate);
    const endDate = new Date(lecture.endDate);
    
    if (targetDate < startDate || targetDate > endDate) {
      return res.status(400).json({ message: '해당 날짜는 강의 기간 내에 있지 않습니다' });
    }
    
    // 해당 날짜가 강의 요일과 일치하는지 확인
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const targetDay = dayNames[targetDate.getDay()];
    
    if (!lecture.dayOfWeek.includes(targetDay)) {
      return res.status(400).json({ message: `${targetDay}요일은 강의 요일(${lecture.dayOfWeek})이 아닙니다` });
    }
    
    // 이미 예외 스케줄이 있는지 확인
    const existingSchedule = await LectureSchedule.findOne({
      where: {
        lectureId,
        date
      }
    });
    
    if (existingSchedule) {
      if (existingSchedule.scheduleType === '휴강') {
        return res.status(400).json({ message: '해당 날짜는 이미 휴강으로 설정되어 있습니다' });
      } else if (existingSchedule.scheduleType === '보충') {
        // 보충 강의를 휴강으로 변경하는 경우 원래 휴강일과의 관계를 확인
        if (existingSchedule.relatedScheduleId) {
          // 원래 휴강일 일정을 찾아서 관계 삭제
          const originalSchedule = await LectureSchedule.findByPk(existingSchedule.relatedScheduleId);
          if (originalSchedule) {
            // 트랜잭션으로 처리
            await db.sequelize.transaction(async (t) => {
              // 보충 일정 삭제
              await existingSchedule.destroy({ transaction: t });
              
              // 새 휴강 일정 생성
              const newSchedule = await LectureSchedule.create({
                lectureId,
                scheduleType: '휴강',
                date,
                week: existingSchedule.week,
                reason: reason || '휴강',
                notes: notes
              }, { transaction: t });
              
              return res.status(200).json({
                message: '보충 강의가 삭제되고 해당 날짜가 휴강으로 설정되었습니다',
                data: newSchedule
              });
            });
            return; // 트랜잭션 내에서 응답을 보냈으므로 여기서 종료
          }
        }
        
        // 연관된 휴강 일정이 없는 보충 강의인 경우 단순히 휴강으로 변경
        await existingSchedule.update({
          scheduleType: '휴강',
          reason: reason || '휴강',
          notes: notes
        });
        
        return res.status(200).json({
          message: '보충 강의가 휴강으로 변경되었습니다',
          data: existingSchedule
        });
      }
    }
    
    // 이미 해당 일정에 대한 출석 기록이 있는지 확인
    const attendanceRecords = await db.attendance_record.count({
      where: { 
        lectureId,
        date
      }
    });
    
    if (attendanceRecords > 0) {
      return res.status(400).json({ 
        message: '이미 출석 기록이 있는 날짜는 휴강으로 변경할 수 없습니다',
        data: { attendanceCount: attendanceRecords }
      });
    }
    
    // 주차 계산
    const weekDiff = Math.floor((targetDate - startDate) / (7 * 24 * 60 * 60 * 1000)) + 1;
    
    // 휴강 설정 추가
    const schedule = await LectureSchedule.create({
      lectureId,
      scheduleType: '휴강',
      date,
      week: weekDiff > 0 ? weekDiff : 1,
      reason: reason || '휴강',
      notes
    });
    
    return res.status(200).json({
      message: '해당 날짜가 휴강으로 설정되었습니다',
      data: schedule
    });
  } catch (error) {
    console.error('휴강 설정 오류:', error);
    return res.status(500).json({ message: '휴강 설정 중 오류가 발생했습니다' });
  }
};

/**
 * 보충 강의 생성
 */
exports.createMakeupClass = async (req, res) => {
  try {
    const { lectureId, originalDate } = req.params;
    const { date, startTime, endTime, reason, notes } = req.body;
    
    if (!date) {
      return res.status(400).json({ message: '보충 강의 날짜는 필수 입력값입니다' });
    }
    
    // 강의 존재 여부 확인
    const lecture = await Lecture.findByPk(lectureId);
    if (!lecture) {
      return res.status(404).json({ message: '해당 강의를 찾을 수 없습니다' });
    }
    
    // 원래 휴강 일정 확인
    const originalSchedule = await LectureSchedule.findOne({
      where: {
        lectureId,
        date: originalDate,
        scheduleType: '휴강'
      },
      include: [{ 
        model: LectureSchedule, 
        as: 'makeupSchedule' 
      }]
    });
    
    if (!originalSchedule) {
      return res.status(404).json({ message: '해당 날짜에 휴강 일정이 없습니다' });
    }
    
    if (originalSchedule.makeupSchedule) {
      return res.status(400).json({ message: '이미 보충 강의가 등록된 휴강 일정입니다' });
    }
    
    // 보충 강의 날짜 유효성 검사
    const makeupDate = new Date(date);
    if (makeupDate <= new Date(originalDate)) {
      return res.status(400).json({ message: '보충 강의 날짜는 휴강일 이후여야 합니다' });
    }
    
    // 해당 날짜에 다른 일정이 있는지 확인
    const existingSchedule = await LectureSchedule.findOne({
      where: {
        lectureId,
        date
      }
    });
    
    if (existingSchedule) {
      return res.status(400).json({ 
        message: '해당 날짜에 이미 다른 일정이 존재합니다',
        data: existingSchedule
      });
    }
    
    // 트랜잭션으로 처리
    const makeupSchedule = await db.sequelize.transaction(async (t) => {
      // 보충 강의 생성
      const makeupSchedule = await LectureSchedule.create({
        lectureId,
        scheduleType: '보충',
        date,
        originalDate,
        startTime: startTime || lecture.startTime,
        endTime: endTime || lecture.endTime,
        week: originalSchedule.week,
        reason: reason || '휴강에 대한 보충 강의',
        notes: notes || `${originalDate} 휴강에 대한 보충 강의`,
        relatedScheduleId: originalSchedule.id
      }, { transaction: t });
      
      return makeupSchedule;
    });
    
    return res.status(201).json({
      message: '보충 강의가 생성되었습니다',
      data: {
        original: originalSchedule,
        makeup: makeupSchedule
      }
    });
  } catch (error) {
    console.error('보충 강의 생성 오류:', error);
    return res.status(500).json({ message: '보충 강의 생성 중 오류가 발생했습니다' });
  }
};

/**
 * 강의 일정 삭제
 */
exports.deleteLectureSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    
    const schedule = await LectureSchedule.findByPk(id, {
      include: [
        { model: LectureSchedule, as: 'makeupSchedule' },
        { model: LectureSchedule, as: 'originalSchedule' }
      ]
    });
    
    if (!schedule) {
      return res.status(404).json({ message: '해당 강의 일정을 찾을 수 없습니다' });
    }
    
    // 보충 강의를 가진 휴강 일정인 경우
    if (schedule.makeupSchedule) {
      return res.status(400).json({ 
        message: '이 일정에는 연결된 보충 강의가 있습니다. 먼저 보충 강의를 삭제해주세요.',
        data: { makeupScheduleId: schedule.makeupSchedule.id }
      });
    }
    
    // 이미 해당 일정에 대한 출석 기록이 있는지 확인
    const attendanceRecords = await db.attendance_record.count({
      where: { lectureScheduleId: id }
    });
    
    if (attendanceRecords > 0) {
      return res.status(400).json({ 
        message: '이미 출석 기록이 있는 강의 일정은 삭제할 수 없습니다',
        data: { attendanceCount: attendanceRecords }
      });
    }
    
    // 보충 강의인 경우 원래 일정의 관계 업데이트
    if (schedule.originalSchedule) {
      // 트랜잭션 처리
      await db.sequelize.transaction(async (t) => {
        await schedule.destroy({ transaction: t });
      });
    } else {
      await schedule.destroy();
    }
    
    return res.status(200).json({
      message: '강의 일정이 삭제되었습니다'
    });
  } catch (error) {
    console.error('강의 일정 삭제 오류:', error);
    return res.status(500).json({ message: '강의 일정 삭제 중 오류가 발생했습니다' });
  }
};

/**
 * 주차별 강의 일정 생성 (대량 생성)
 */
exports.createMultipleSchedules = async (req, res) => {
  try {
    const { lectureId, startDate, endDate, dayOfWeek, startTime, endTime, skipWeeks } = req.body;
    
    if (!lectureId || !startDate || !endDate) {
      return res.status(400).json({ message: '강의 ID, 시작일, 종료일은 필수 입력값입니다' });
    }
    
    // 강의 존재 여부 및 기본 정보 확인
    const lecture = await Lecture.findByPk(lectureId);
    if (!lecture) {
      return res.status(404).json({ message: '해당 강의를 찾을 수 없습니다' });
    }
    
    // 요일과 시간 정보 - 입력값 우선, 없으면 기본값 사용
    const selectedDayOfWeek = dayOfWeek || lecture.defaultDayOfWeek || lecture.dayOfWeek;
    const selectedStartTime = startTime || lecture.defaultStartTime || lecture.startTime;
    const selectedEndTime = endTime || lecture.defaultEndTime || lecture.endTime;
    
    // 필수 정보 확인
    if (!selectedDayOfWeek || !selectedStartTime || !selectedEndTime) {
      return res.status(400).json({ 
        message: '요일, 시작/종료 시간 정보가 필요합니다. 요청에 포함하거나 강의에 기본값을 설정해주세요'
      });
    }
    
    // 날짜 계산하여 강의 일정 생성
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysOfWeek = { '월': 1, '화': 2, '수': 3, '목': 4, '금': 5, '토': 6, '일': 0 };
    
    // 다중 요일 처리 (월,수 형태)
    const targetDays = selectedDayOfWeek.split(',').map(day => day.trim());
    const targetDayNums = targetDays.map(day => daysOfWeek[day]).filter(num => num !== undefined);
    
    if (targetDayNums.length === 0) {
      return res.status(400).json({ message: '유효하지 않은 요일입니다. (월,화,수,목,금,토,일)' });
    }
    
    // 생성된 스케줄을 저장할 배열
    const schedulesToCreate = [];
    
    // 주차 계산용 변수
    let currentWeek = 1;
    
    // 스킵할 주차 배열 변환
    const weeksToSkip = skipWeeks ? skipWeeks.map(week => parseInt(week)) : [];
    
    // 시작 날짜부터 종료 날짜까지 반복하며 해당 요일인 날짜 찾기
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      if (targetDayNums.includes(date.getDay())) {
        // 현재 날짜의 주차가 스킵 목록에 있으면 건너뛰기
        if (weeksToSkip.includes(currentWeek)) {
          // 주차 증가는 일주일이 끝날 때 처리
          continue;
        }
        
        const formattedDate = date.toISOString().split('T')[0];
        
        schedulesToCreate.push({
          lectureId,
          week: currentWeek,
          date: formattedDate,
          startTime: selectedStartTime,
          endTime: selectedEndTime,
          topic: `${currentWeek}주차 강의`,
          notes: '',
        });
      }
      
      // 일주일의 마지막 날(토요일)에 도달하면 주차 증가
      if (date.getDay() === 6) {
        currentWeek++;
      }
    }
    
    if (schedulesToCreate.length === 0) {
      return res.status(400).json({ message: '생성할 수 있는 강의 일정이 없습니다' });
    }
    
    // 대량 생성
    const createdSchedules = await LectureSchedule.bulkCreate(schedulesToCreate);
    
    return res.status(201).json({
      message: `총 ${createdSchedules.length}개의 강의 일정이 생성되었습니다`,
      data: createdSchedules
    });
  } catch (error) {
    console.error('강의 일정 대량 생성 오류:', error);
    return res.status(500).json({ message: '강의 일정 생성 중 오류가 발생했습니다' });
  }
};

/**
 * 특정 날짜에 대한 강의 스케줄 조회
 */
exports.getLectureScheduleByDate = async (req, res) => {
  try {
    const { lectureId, date } = req.params;
    
    // 강의 존재 여부 확인
    const lecture = await Lecture.findByPk(lectureId);
    if (!lecture) {
      return res.status(404).json({ message: '해당 강의를 찾을 수 없습니다' });
    }
    
    // 해당 날짜가 강의 요일인지 확인
    const targetDate = new Date(date);
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const targetDay = dayNames[targetDate.getDay()];
    
    // 해당 날짜의 예외 스케줄 확인 (휴강/보충)
    const exceptionSchedule = await LectureSchedule.findOne({
      where: {
        lectureId,
        date
      },
      include: [
        {
          model: LectureSchedule,
          as: 'makeupSchedule',
          required: false
        },
        {
          model: LectureSchedule,
          as: 'originalSchedule',
          required: false
        }
      ]
    });
    
    // 응답 데이터 생성
    let scheduleData;
    
    if (exceptionSchedule) {
      // 예외 스케줄이 있는 경우 (휴강/보충)
      scheduleData = {
        lectureId,
        date,
        isRegularDay: lecture.dayOfWeek.includes(targetDay),
        hasClass: exceptionSchedule.scheduleType === '보충', // 보충이면 수업 있음, 휴강이면 없음
        scheduleType: exceptionSchedule.scheduleType,
        startTime: exceptionSchedule.startTime || lecture.startTime,
        endTime: exceptionSchedule.endTime || lecture.endTime,
        reason: exceptionSchedule.reason,
        notes: exceptionSchedule.notes,
        isVirtual: false,
        exceptionSchedule
      };
      
      if (exceptionSchedule.scheduleType === '휴강' && exceptionSchedule.makeupSchedule) {
        scheduleData.makeupInfo = {
          date: exceptionSchedule.makeupSchedule.date,
          startTime: exceptionSchedule.makeupSchedule.startTime || lecture.startTime,
          endTime: exceptionSchedule.makeupSchedule.endTime || lecture.endTime
        };
      } else if (exceptionSchedule.scheduleType === '보충' && exceptionSchedule.originalSchedule) {
        scheduleData.originalInfo = {
          date: exceptionSchedule.originalDate || exceptionSchedule.originalSchedule.date,
          reason: exceptionSchedule.originalSchedule.reason
        };
      }
    } else if (lecture.dayOfWeek.includes(targetDay)) {
      // 정규 수업일인 경우 (해당 요일에 강의가 있고 예외가 없는 경우)
      // 주차 계산
      const startDate = new Date(lecture.startDate);
      const weekDiff = Math.floor((targetDate - startDate) / (7 * 24 * 60 * 60 * 1000)) + 1;
      
      scheduleData = {
        lectureId,
        date,
        isRegularDay: true,
        hasClass: true,
        startTime: lecture.startTime,
        endTime: lecture.endTime,
        week: weekDiff > 0 ? weekDiff : 1,
        isVirtual: true // 실제 DB 레코드가 아닌 가상 일정
      };
    } else {
      // 강의 요일이 아닌 경우
      scheduleData = {
        lectureId,
        date,
        isRegularDay: false,
        hasClass: false,
        isVirtual: true
      };
    }
    
    return res.status(200).json({
      message: '강의 스케줄 조회 성공',
      data: scheduleData
    });
  } catch (error) {
    console.error('강의 스케줄 조회 오류:', error);
    return res.status(500).json({ message: '강의 스케줄 조회 중 오류가 발생했습니다' });
  }
};

/**
 * QR코드 생성하기 (강의 출석 체크용)
 */
exports.generateQRCode = async (req, res) => {
  try {
    const { lectureId } = req.params;
    const { date } = req.query;
    
    // 강의 존재 확인
    const lecture = await Lecture.findByPk(lectureId);
    if (!lecture) {
      return res.status(404).json({ message: '강의를 찾을 수 없습니다' });
    }

    // 생성할 날짜 결정 (지정된 날짜 또는 오늘 날짜)
    const now = new Date();
    const targetDate = date ? new Date(date) : now;
    const dateStr = targetDate.toISOString().split('T')[0];
    
    // 해당 날짜가 강의 요일인지 확인
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const targetDay = dayNames[targetDate.getDay()];
    
    if (!lecture.dayOfWeek.includes(targetDay)) {
      return res.status(400).json({ 
        message: `${targetDay}요일은 강의 요일(${lecture.dayOfWeek})이 아닙니다`
      });
    }
    
    // 해당 날짜에 예외 일정(휴강/보충)이 있는지 확인
    const exceptionSchedule = await LectureSchedule.findOne({
      where: {
        lectureId,
        date: dateStr
      }
    });
    
    // 휴강인지 확인
    if (exceptionSchedule && exceptionSchedule.scheduleType === '휴강') {
      return res.status(400).json({ 
        message: `${dateStr} 날짜는 휴강으로 설정되어 있어 출석 체크를 할 수 없습니다`
      });
    }
    
    // 10분간 유효한 QR 코드 생성
    const validUntil = new Date(now.getTime() + 10 * 60000);
    const crypto = require('crypto');
    
    const qrData = {
      lectureId,
      date: dateStr,
      time: now.toTimeString().split(' ')[0],
      validUntil: validUntil.toISOString(),
      // 보충 일정이 있는 경우 해당 일정 ID 포함
      lectureScheduleId: (exceptionSchedule && exceptionSchedule.scheduleType === '보충') 
        ? exceptionSchedule.id 
        : null,
      key: crypto.randomBytes(10).toString('hex') // 무작위 키
    };
    
    return res.status(200).json({
      message: 'QR 코드가 생성되었습니다',
      qrData: JSON.stringify(qrData),
      validUntil,
      lectureSchedule: exceptionSchedule || null,
      isRegularClass: !exceptionSchedule
    });
  } catch (error) {
    console.error('QR 코드 생성 오류:', error);
    return res.status(500).json({ message: 'QR 코드 생성 중 오류가 발생했습니다' });
  }
};

module.exports = exports; 