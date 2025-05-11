module.exports = (sequelize, Sequelize) => {
  const LectureSchedule = sequelize.define('lecture_schedules', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    lectureId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'lectures',
        key: 'id'
      }
    },
    scheduleType: {
      type: Sequelize.ENUM('휴강', '보충'),
      allowNull: true,
      comment: '스케줄 유형 (휴강/보충 - 정규 강의는 null)'
    },
    date: {
      type: Sequelize.DATEONLY,
      allowNull: false,
      comment: '날짜'
    },
    originalDate: {
      type: Sequelize.DATEONLY,
      comment: '원래 날짜 (보충 강의인 경우)'
    },
    startTime: {
      type: Sequelize.TIME,
      comment: '시작 시간 (기본값은 강의 정보에서 가져옴)'
    },
    endTime: {
      type: Sequelize.TIME,
      comment: '종료 시간 (기본값은 강의 정보에서 가져옴)'
    },
    week: {
      type: Sequelize.INTEGER,
      comment: '주차 정보'
    },
    reason: {
      type: Sequelize.TEXT,
      comment: '휴강/보충 사유'
    },
    notes: {
      type: Sequelize.TEXT,
      comment: '비고'
    },
    relatedScheduleId: {
      type: Sequelize.INTEGER,
      comment: '연관된 스케줄 ID (휴강-보충 관계)',
      references: {
        model: 'lecture_schedules',
        key: 'id'
      }
    }
  });

  return LectureSchedule;
}; 