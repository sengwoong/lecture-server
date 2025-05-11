module.exports = (sequelize, Sequelize) => {
  const Notice = sequelize.define('notices', {
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
    category: {
      type: Sequelize.ENUM('학과', '장학', '수업', '행사', '기타'),
      defaultValue: '기타'
    },
    importance: {
      type: Sequelize.ENUM('일반', '중요', '긴급'),
      defaultValue: '일반'
    },
    startDate: {
      type: Sequelize.DATEONLY,
      allowNull: false,
      defaultValue: Sequelize.NOW
    },
    endDate: {
      type: Sequelize.DATEONLY
    },
    attachments: {
      type: Sequelize.TEXT, // JSON 문자열로 저장
      get() {
        const rawValue = this.getDataValue('attachments');
        return rawValue ? JSON.parse(rawValue) : [];
      },
      set(value) {
        this.setDataValue('attachments', JSON.stringify(value));
      }
    },
    viewCount: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    },
    isActive: {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    },
    lectureId: {
      type: Sequelize.INTEGER,
      allowNull: true
    },
    authorId: {
      type: Sequelize.INTEGER,
      allowNull: false
    }
  });

  return Notice;
}; 