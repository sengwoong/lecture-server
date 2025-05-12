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
db.attendance_record = require('./attendance_record.model')(sequelize, Sequelize);
db.attendance = require('./attendance.model')(sequelize, Sequelize);
db.lecture = require('./lecture.model')(sequelize, Sequelize);
db.lecture_schedule = require('./lecture_schedule.model')(sequelize, Sequelize);
db.notice = require('./notice.model')(sequelize, Sequelize);
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

// 강의와 출석 기록 1:N 관계
db.lecture.hasMany(db.attendance_record, { foreignKey: 'lectureId' });
db.attendance_record.belongsTo(db.lecture, { foreignKey: 'lectureId' });

// 강의와 강의 일정 1:N 관계
db.lecture.hasMany(db.lecture_schedule, { foreignKey: 'lectureId', as: 'schedules' });
db.lecture_schedule.belongsTo(db.lecture, { foreignKey: 'lectureId' });

// 강의 일정 - 휴강/보충 자기 참조 관계 (self-referencing relationship)
db.lecture_schedule.hasOne(db.lecture_schedule, { 
  foreignKey: 'relatedScheduleId', 
  as: 'makeupSchedule'  // 휴강 일정에서 보충 일정을 찾을 때
});
db.lecture_schedule.belongsTo(db.lecture_schedule, { 
  foreignKey: 'relatedScheduleId', 
  as: 'originalSchedule'  // 보충 일정에서 원래 휴강 일정을 찾을 때
});

// 강의 일정과 출석 기록 1:N 관계
db.lecture_schedule.hasMany(db.attendance_record, { foreignKey: 'lectureScheduleId', as: 'attendanceRecords' });
db.attendance_record.belongsTo(db.lecture_schedule, { foreignKey: 'lectureScheduleId', as: 'lectureSchedule' });

// 사용자와 출석 기록 1:N 관계
db.user.hasMany(db.attendance_record, { foreignKey: 'studentId' });
db.attendance_record.belongsTo(db.user, { foreignKey: 'studentId', as: 'student' });

// 출석 기록과 확장 모델 관계
db.attendance_record.hasOne(db.attendance, { foreignKey: 'recordId' });
db.attendance.belongsTo(db.attendance_record, { foreignKey: 'recordId' });

db.attendance_record.hasOne(db.absence, { foreignKey: 'recordId' });
db.absence.belongsTo(db.attendance_record, { foreignKey: 'recordId' });

// 병결 리뷰어 관계 추가
db.user.hasMany(db.absence, { foreignKey: 'reviewerId', as: 'reviewedAbsences' });
db.absence.belongsTo(db.user, { foreignKey: 'reviewerId', as: 'reviewer' });

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

// 사용자와 알림 1:N 관계
db.user.hasMany(db.notification);
db.notification.belongsTo(db.user);

// 사용자와 공지사항 1:N 관계
db.user.hasMany(db.notice, { as: 'authoredNotices', foreignKey: 'authorId' });
db.notice.belongsTo(db.user, { as: 'author', foreignKey: 'authorId' });

// 강의와 공지사항 1:N 관계
db.lecture.hasMany(db.notice, { foreignKey: 'lectureId' });
db.notice.belongsTo(db.lecture, { foreignKey: 'lectureId' });

// 역할 기본값 설정 함수
db.ROLES = [ 'professor', 'student'];

module.exports = db; 