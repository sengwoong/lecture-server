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
    dayOfWeek: {
      type: Sequelize.STRING
    },
    startTime: {
      type: Sequelize.TIME
    },
    endTime: {
      type: Sequelize.TIME
    },
    room: {
      type: Sequelize.STRING
    },
    description: {
      type: Sequelize.TEXT
    },
    isActive: {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    }
  });

  return Lecture;
}; 