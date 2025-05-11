const { Sequelize } = require('sequelize');
const dbConfig = require('../config/db.config');

// Sequelize 초기화
const sequelize = new Sequelize(
  dbConfig.DB,
  dbConfig.USER,
  dbConfig.PASSWORD,
  {
    host: dbConfig.HOST,
    port: dbConfig.PORT,
    dialect: dbConfig.dialect,
    pool: {
      max: dbConfig.pool.max,
      min: dbConfig.pool.min,
      acquire: dbConfig.pool.acquire,
      idle: dbConfig.pool.idle
    }
  }
);

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// 모델 정의
db.user = require('./user.model')(sequelize, Sequelize);
db.role = require('./role.model')(sequelize, Sequelize);
db.attendance = require('./attendance.model')(sequelize, Sequelize);
db.lecture = require('./lecture.model')(sequelize, Sequelize);
db.notice = require('./notice.model')(sequelize, Sequelize);
db.board = require('./board.model')(sequelize, Sequelize);
db.notification = require('./notification.model')(sequelize, Sequelize);
db.absence = require('./absence.model')(sequelize, Sequelize);
db.enrollment = require('./enrollment.model')(sequelize, Sequelize);

// 관계 설정
db.role.belongsToMany(db.user, {
  through: 'user_roles',
  foreignKey: 'roleId',
  otherKey: 'userId'
});

db.user.belongsToMany(db.role, {
  through: 'user_roles',
  foreignKey: 'userId',
  otherKey: 'roleId'
});

// 강의와 출석 1:N 관계
db.lecture.hasMany(db.attendance);
db.attendance.belongsTo(db.lecture);

// 사용자와 출석 1:N 관계
db.user.hasMany(db.attendance);
db.attendance.belongsTo(db.user, { foreignKey: 'studentId' });

// 교수와 강의 1:N 관계
db.user.hasMany(db.lecture, { as: 'professorLectures' });
db.lecture.belongsTo(db.user, { as: 'professor' });

// 학생과 수강신청 1:N 관계
db.user.hasMany(db.enrollment, { foreignKey: 'studentId', as: 'studentEnrollments' });
db.enrollment.belongsTo(db.user, { foreignKey: 'studentId', as: 'student' });

// 강의와 수강신청 1:N 관계
db.lecture.hasMany(db.enrollment, { as: 'lectureEnrollments' });
db.enrollment.belongsTo(db.lecture, { as: 'lecture' });

// 학생과 강의 M:N 관계 (수강신청을 통해)
db.user.belongsToMany(db.lecture, { 
  through: db.enrollment,
  foreignKey: 'studentId',
  otherKey: 'lectureId',
  as: 'enrolledLectures'
});

db.lecture.belongsToMany(db.user, {
  through: db.enrollment,
  foreignKey: 'lectureId',
  otherKey: 'studentId',
  as: 'enrolledStudents'
});

// 강의와 게시판 1:N 관계
db.lecture.hasMany(db.board);
db.board.belongsTo(db.lecture);

// 교수와 게시판 1:N 관계 (게시글 작성자)
db.user.hasMany(db.board, { foreignKey: 'userId' });
db.board.belongsTo(db.user, { foreignKey: 'userId' });

// 사용자와 병결 신청 1:N 관계
db.user.hasMany(db.absence, { foreignKey: 'studentId' });
db.absence.belongsTo(db.user, { foreignKey: 'studentId' });

// 사용자와 알림 1:N 관계
db.user.hasMany(db.notification);
db.notification.belongsTo(db.user);

// 역할 기본값 설정 함수
db.ROLES = [ 'professor', 'student'];

module.exports = db; 