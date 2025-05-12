module.exports = (sequelize, Sequelize) => {
  const Attendance = sequelize.define('attendances', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    date: {
      type: Sequelize.DATEONLY,
      allowNull: false,
      comment: '출석 날짜'
    },
    status: {
      type: Sequelize.ENUM('출석', '지각', '결석', '병결', '공결'),
      allowNull: false,
      defaultValue: '출석',
      comment: '출석 상태'
    },
    notes: {
      type: Sequelize.TEXT,
      comment: '비고'
    },
    checkTime: {
      type: Sequelize.DATE,
      comment: '출석 체크 시간'
    },
    checkMethod: {
      type: Sequelize.ENUM('QR', '수기', '자동', '비밀번호'),
      defaultValue: '자동',
      comment: '출석 확인 방법'
    },
    lectureId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'lectures',
        key: 'id'
      },
      comment: '강의 ID'
    },
    studentId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: '학생 ID'
    },
    recordId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'attendance_records',
        key: 'id'
      },
      comment: '출석 기록 ID (attendance_records 테이블 참조)'
    },
    requiresAbsenceProof: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      comment: '결석증명서 필요 여부 (결석, 지각, 병결 시 true)'
    },
    startTime: {
      type: Sequelize.TIME,
      comment: '강의 시작 시간'
    },
    endTime: {
      type: Sequelize.TIME,
      comment: '강의 종료 시간'
    }
  });
 
  return Attendance;
}; 