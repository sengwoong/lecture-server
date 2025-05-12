module.exports = (sequelize, Sequelize) => {
  const AttendanceRecord = sequelize.define('attendance_records', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    date: {
      type: Sequelize.DATEONLY,
      allowNull: false
    },

    notes: {
      type: Sequelize.TEXT
    },
    lectureId: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    studentId: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    // 강의 일정 참조 (주차, 시작/종료 시간 정보)
    lectureScheduleId: {
      type: Sequelize.INTEGER,
      references: {
        model: 'lecture_schedules',
        key: 'id'
      },
      comment: '강의 일정 참조 ID'
    }
  });

  return AttendanceRecord;
}; 