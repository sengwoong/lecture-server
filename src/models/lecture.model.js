module.exports = (sequelize, Sequelize) => {
  const Lecture = sequelize.define('lectures', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false
    },
    code: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true
    },
    semester: {
      type: Sequelize.STRING,
      allowNull: false
    },
    department: {
      type: Sequelize.STRING,
      allowNull: false
    },
    // 강의 기간
    startDate: {
      type: Sequelize.DATEONLY,
      allowNull: false,
      comment: '강의 시작일'
    },
    endDate: {
      type: Sequelize.DATEONLY,
      allowNull: false,
      comment: '강의 종료일'
    },
    // 강의 요일 (복수 가능, 쉼표로 구분: "월,수")
    dayOfWeek: {
      type: Sequelize.STRING,
      allowNull: false,
      comment: '강의 요일 (예: 월,수)'
    },
    // 강의 시간
    startTime: {
      type: Sequelize.TIME,
      allowNull: false,
      comment: '강의 시작 시간'
    },
    endTime: {
      type: Sequelize.TIME,
      allowNull: false,
      comment: '강의 종료 시간'
    },
    // 강의실
    room: {
      type: Sequelize.STRING
    },
    // 강의 설명
    description: {
      type: Sequelize.TEXT
    },
    // 강의 활성화 여부
    isActive: {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    }
  });

  return Lecture;
}; 