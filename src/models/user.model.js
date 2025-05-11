module.exports = (sequelize, Sequelize) => {
  const User = sequelize.define('users', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true
    },
    email: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: Sequelize.STRING,
      allowNull: false
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false
    },
    phone: {
      type: Sequelize.STRING,
      allowNull: true
    },
    // 학번(학생) 또는 교번(교수)을 저장하는 필드
    // 교수 계정은 'P'+숫자 형식 권장 (예: P12345)
    studentId: {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true
    },
    userType: {
      type: Sequelize.ENUM('admin', 'professor', 'student'),
      defaultValue: 'student'
    },
    active: {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    },
    lastLogin: {
      type: Sequelize.DATE,
      defaultValue: null
    },
    // 학생 관련 필드
    grade: {
      type: Sequelize.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 4
      }
    },
    department: {
      type: Sequelize.STRING,
      allowNull: true
    },
    status: {
      type: Sequelize.ENUM('재학', '휴학', '졸업', '제적'),
      defaultValue: '재학'
    },
    address: {
      type: Sequelize.STRING,
      allowNull: true
    },
    emergencyContact: {
      type: Sequelize.STRING,
      allowNull: true
    },
    enrollmentDate: {
      type: Sequelize.DATEONLY,
      allowNull: true
    }
  });

  return User;
}; 