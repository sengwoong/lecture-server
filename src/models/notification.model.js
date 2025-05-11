module.exports = (sequelize, Sequelize) => {
  const Notification = sequelize.define('notifications', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: Sequelize.STRING,
      allowNull: false
    },
    content: {
      type: Sequelize.TEXT,
      allowNull: false
    },
    type: {
      type: Sequelize.ENUM('공지', '출석', '병결', '피드백', '기타'),
      defaultValue: '기타'
    },
    isRead: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    },
    userId: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    link: {
      type: Sequelize.STRING,
      comment: '연결될 경로'
    }
  });

  return Notification;
}; 