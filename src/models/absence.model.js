module.exports = (sequelize, Sequelize) => {
  const Absence = sequelize.define('absences', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    date: {
      type: Sequelize.DATEONLY,
      allowNull: false,
      comment: '조퇴 신청 날짜'
    },
    leaveTime: {
      type: Sequelize.TIME,
      allowNull: false,
      comment: '조퇴 예정 시간'
    },
    reason: {
      type: Sequelize.TEXT,
      allowNull: false,
      comment: '조퇴 사유'
    },
    status: {
      type: Sequelize.ENUM('대기', '승인', '반려', '검토중'),
      defaultValue: '대기',
      comment: '조퇴 승인 상태'
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
    documents: {
      type: Sequelize.TEXT, // JSON 형태로 서류 경로 저장
      get() {
        const rawValue = this.getDataValue('documents');
        return rawValue ? JSON.parse(rawValue) : [];
      },
      set(value) {
        this.setDataValue('documents', JSON.stringify(value));
      },
      comment: '첨부파일'
    },
    feedback: {
      type: Sequelize.TEXT,
      comment: '교수자 피드백'
    },
    reviewerId: {
      type: Sequelize.INTEGER,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: '검토자(교수자) ID'
    },
    reviewedAt: {
      type: Sequelize.DATE,
      comment: '검토 시간'
    }
  });

  return Absence;
}; 