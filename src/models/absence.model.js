module.exports = (sequelize, Sequelize) => {
  const Absence = sequelize.define('absences', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    startDate: {
      type: Sequelize.DATEONLY,
      allowNull: false
    },
    endDate: {
      type: Sequelize.DATEONLY,
      allowNull: false
    },
    reason: {
      type: Sequelize.TEXT,
      allowNull: false
    },
    status: {
      type: Sequelize.ENUM('대기', '승인', '반려'),
      defaultValue: '대기'
    },
    documents: {
      type: Sequelize.TEXT, // JSON 형태로 서류 경로 저장
      get() {
        const rawValue = this.getDataValue('documents');
        return rawValue ? JSON.parse(rawValue) : [];
      },
      set(value) {
        this.setDataValue('documents', JSON.stringify(value));
      }
    },
    feedback: {
      type: Sequelize.TEXT
    },
    createdAt: {
      type: Sequelize.DATE
    },
    studentId: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    lectureId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    }
  });

  return Absence;
}; 