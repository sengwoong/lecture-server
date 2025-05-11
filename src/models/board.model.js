module.exports = (sequelize, Sequelize) => {
  const Board = sequelize.define('boards', {
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
      type: Sequelize.ENUM('공지', '과제', '자료', '기타'),
      defaultValue: '공지'
    },
    viewCount: {
      type: Sequelize.INTEGER,
      defaultValue: 0
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
    isActive: {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    },
    lectureId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'lectures',
        key: 'id'
      }
    },
    userId: {
      type: Sequelize.INTEGER,
      allowNull: false
    }
  });

  return Board;
}; 