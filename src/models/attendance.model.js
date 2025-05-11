module.exports = (sequelize, Sequelize) => {
  const Attendance = sequelize.define('attendances', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    date: {
      type: Sequelize.DATEONLY,
      allowNull: false
    },
    status: {
      type: Sequelize.ENUM('출석', '지각', '결석', '병결', '공결'),
      allowNull: false,
      defaultValue: '출석'
    },
    checkTime: {
      type: Sequelize.DATE
    },
    checkMethod: {
      type: Sequelize.ENUM('QR', '수기', '자동'),
      defaultValue: '자동'
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
    }
  });

  return Attendance;
}; 