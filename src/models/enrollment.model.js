module.exports = (sequelize, Sequelize) => {
  const Enrollment = sequelize.define('enrollments', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    // 학생 ID (외래 키로 user 테이블 참조)
    studentId: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    // 강의 ID (외래 키로 lecture 테이블 참조)
    lectureId: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    // 수강신청 상태 (항상 true)
    isEnrolled: {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    },
    // 신청 일자
    enrolledAt: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW
    }
  });

  return Enrollment;
}; 