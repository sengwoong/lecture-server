const db = require('../models');
const Enrollment = db.enrollment;
const Lecture = db.lecture;
const User = db.user;
const { Op } = db.Sequelize;

/**
 * 학생의 수강신청 목록 조회
 */
exports.getStudentEnrollments = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.userId;

    // 사용자 역할 확인
    const user = await User.findByPk(userId, {
      include: [{
        model: db.role,
        attributes: ['name'],
        through: { attributes: [] }
      }]
    });

    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    const roles = user.roles.map(role => role.name);
    
    // 학생 자신의 수강신청 목록 또는 관리자/교수의 학생 목록 조회
    let condition = {};
    const studentId = req.params.studentId || userId;

    // 관리자나 교수가 아닌 경우, 자신의 수강신청만 볼 수 있음
    if (!roles.includes('admin') && !roles.includes('professor')) {
      if (studentId != userId) {
        return res.status(403).json({ message: '다른 학생의 수강신청을 조회할 권한이 없습니다.' });
      }
    }

    condition.studentId = studentId;

    const { count, rows: enrollments } = await Enrollment.findAndCountAll({
      where: condition,
      include: [
        {
          model: Lecture,
          as: 'lecture',
          attributes: ['id', 'name', 'code', 'semester', 'department', 'dayOfWeek', 'startTime', 'endTime', 'room'],
          include: [
            {
              model: User,
              as: 'professor',
              attributes: ['id', 'name', 'email']
            }
          ]
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['enrolledAt', 'DESC']]
    });

    const totalPages = Math.ceil(count / limit);
    const currentPage = parseInt(page);

    return res.status(200).json({
      enrollments,
      pagination: {
        totalItems: count,
        totalPages,
        currentPage,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('수강신청 목록 조회 오류:', error);
    return res.status(500).json({ message: '수강신청 목록을 조회하는 중 오류가 발생했습니다.' });
  }
};

/**
 * 강의의 수강신청 학생 목록 조회 (교수 전용)
 */
exports.getLectureEnrollments = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.userId;
    const lectureId = req.params.lectureId;

    // 사용자 역할 확인
    const user = await User.findByPk(userId, {
      include: [{
        model: db.role,
        attributes: ['name'],
        through: { attributes: [] }
      }]
    });

    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    const roles = user.roles.map(role => role.name);
    const isProfessorOrAdmin = roles.includes('professor') || roles.includes('admin');

    if (!isProfessorOrAdmin) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    // 강의 존재 여부 확인
    const lecture = await Lecture.findByPk(lectureId);
    if (!lecture) {
      return res.status(404).json({ message: '강의를 찾을 수 없습니다.' });
    }

    // 교수인 경우 본인의 강의만 조회 가능
    if (roles.includes('professor') && !roles.includes('admin')) {
      if (lecture.professorId !== userId) {
        return res.status(403).json({ message: '본인의 강의만 조회할 수 있습니다.' });
      }
    }

    const { count, rows: enrollments } = await Enrollment.findAndCountAll({
      where: { lectureId },
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'email', 'studentId', 'department', 'grade']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['enrolledAt', 'DESC']]
    });

    const totalPages = Math.ceil(count / limit);
    const currentPage = parseInt(page);

    return res.status(200).json({
      enrollments,
      pagination: {
        totalItems: count,
        totalPages,
        currentPage,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('수강생 목록 조회 오류:', error);
    return res.status(500).json({ message: '수강생 목록을 조회하는 중 오류가 발생했습니다.' });
  }
};

/**
 * 수강신청 등록
 */
exports.createEnrollment = async (req, res) => {
  try {
    const userId = req.userId;
    const { lectureId } = req.body;

    // 사용자 존재 여부 확인
    const user = await User.findByPk(userId, {
      include: [{
        model: db.role,
        attributes: ['name'],
        through: { attributes: [] }
      }]
    });

    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    // 학생인지 확인
    const roles = user.roles.map(role => role.name);
    if (!roles.includes('student') && user.userType !== 'student') {
      return res.status(403).json({ message: '학생만 수강신청이 가능합니다.' });
    }

    // 강의 존재 여부 확인
    const lecture = await Lecture.findByPk(lectureId);
    if (!lecture) {
      return res.status(404).json({ message: '강의를 찾을 수 없습니다.' });
    }

    // 이미 수강신청한 강의인지 확인
    const existingEnrollment = await Enrollment.findOne({
      where: {
        studentId: userId,
        lectureId
      }
    });

    if (existingEnrollment) {
      return res.status(400).json({ message: '이미 수강신청한 강의입니다.' });
    }

    // 수강신청 생성
    const enrollment = await Enrollment.create({
      studentId: userId,
      lectureId,
      isEnrolled: true,
      enrolledAt: new Date()
    });

    return res.status(201).json({
      message: '수강신청이 완료되었습니다.',
      enrollment
    });
  } catch (error) {
    console.error('수강신청 오류:', error);
    return res.status(500).json({ message: '수강신청 중 오류가 발생했습니다.' });
  }
};

/**
 * 수강신청 취소
 */
exports.deleteEnrollment = async (req, res) => {
  try {
    const userId = req.userId;
    const enrollmentId = req.params.id;

    // 수강신청 정보 조회
    const enrollment = await Enrollment.findByPk(enrollmentId);
    if (!enrollment) {
      return res.status(404).json({ message: '수강신청 정보를 찾을 수 없습니다.' });
    }

    // 사용자 정보 및 역할 확인
    const user = await User.findByPk(userId, {
      include: [{
        model: db.role,
        attributes: ['name'],
        through: { attributes: [] }
      }]
    });

    const roles = user.roles.map(role => role.name);
    const isAdminOrProfessor = roles.includes('admin') || roles.includes('professor');

    // 본인의 수강신청만 취소 가능 (관리자, 교수 제외)
    if (enrollment.studentId !== userId && !isAdminOrProfessor) {
      return res.status(403).json({ message: '본인의 수강신청만 취소할 수 있습니다.' });
    }

    // 수강신청 삭제
    await enrollment.destroy();

    return res.status(200).json({ message: '수강신청이 취소되었습니다.' });
  } catch (error) {
    console.error('수강신청 취소 오류:', error);
    return res.status(500).json({ message: '수강신청 취소 중 오류가 발생했습니다.' });
  }
};

/**
 * 특정 수강신청 조회
 */
exports.getEnrollmentById = async (req, res) => {
  try {
    const userId = req.userId;
    const enrollmentId = req.params.id;

    // 수강신청 정보 조회
    const enrollment = await Enrollment.findByPk(enrollmentId, {
      include: [
        {
          model: Lecture,
          as: 'lecture',
          attributes: ['id', 'name', 'code', 'semester', 'department', 'dayOfWeek', 'startTime', 'endTime', 'room'],
          include: [
            {
              model: User,
              as: 'professor',
              attributes: ['id', 'name', 'email']
            }
          ]
        },
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'email', 'studentId', 'department', 'grade']
        }
      ]
    });

    if (!enrollment) {
      return res.status(404).json({ message: '수강신청 정보를 찾을 수 없습니다.' });
    }

    // 사용자 정보 및 역할 확인
    const user = await User.findByPk(userId, {
      include: [{
        model: db.role,
        attributes: ['name'],
        through: { attributes: [] }
      }]
    });

    const roles = user.roles.map(role => role.name);
    const isAdminOrProfessor = roles.includes('admin') || roles.includes('professor');

    // 본인의 수강신청만 조회 가능 (관리자, 교수 제외)
    if (enrollment.studentId !== userId && !isAdminOrProfessor) {
      return res.status(403).json({ message: '본인의 수강신청만 조회할 수 있습니다.' });
    }

    return res.status(200).json(enrollment);
  } catch (error) {
    console.error('수강신청 조회 오류:', error);
    return res.status(500).json({ message: '수강신청 조회 중 오류가 발생했습니다.' });
  }
}; 