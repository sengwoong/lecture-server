module.exports = (sequelize, Sequelize) => {
  const Attendance = sequelize.define('attendances', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    // 외래 키로 attendance_records 참조
    recordId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'attendance_records',
        key: 'id'
      }
    },
    // 출석 체크 시간
    checkTime: {
      type: Sequelize.DATE
    },
    // 출석 확인 방법
    checkMethod: {
      type: Sequelize.ENUM('QR', '수기', '자동'),
      defaultValue: '자동'
    }
  });

  return Attendance;
}; 