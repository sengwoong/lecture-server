const db = require('../models');
const User = db.user;
const { Sequelize, Op } = db.Sequelize;

// 모든 학생 목록 가져오기
exports.getAllStudents = async (req, res) => {
  try {
    const students = await User.findAll({
      where: {
        userType: 'student'
      },
      attributes: { exclude: ['password'] }
    });

    return res.status(200).json(students);
  } catch (error) {
    console.error('학생 목록 조회 오류:', error);
    return res.status(500).json({ message: '학생 목록을 가져오는 중 오류가 발생했습니다' });
  }
};

// 학생 검색
exports.searchStudents = async (req, res) => {
  try {
    const { studentId, name, grade, department, status } = req.query;
    const condition = {
      userType: 'student'
    };

    if (studentId) {
      condition.studentId = { [Op.like]: `%${studentId}%` };
    }
    
    if (name) {
      condition.name = { [Op.like]: `%${name}%` };
    }
    
    if (grade) {
      condition.grade = grade;
    }
    
    
    if (status) {
      condition.status = status;
    }

    const students = await User.findAll({
      where: condition,
      attributes: { exclude: ['password'] }
    });

    return res.status(200).json(students);
  } catch (error) {
    console.error('학생 검색 오류:', error);
    return res.status(500).json({ message: '학생 검색 중 오류가 발생했습니다' });
  }
};

// 특정 학생 정보 가져오기
exports.getStudentById = async (req, res) => {
  try {
    const student = await User.findByPk(req.params.id, {
      where: {
        userType: 'student'
      },
      attributes: { exclude: ['password'] }
    });

    if (!student) {
      return res.status(404).json({ message: '학생을 찾을 수 없습니다' });
    }

    return res.status(200).json(student);
  } catch (error) {
    console.error('학생 정보 조회 오류:', error);
    return res.status(500).json({ message: '학생 정보를 가져오는 중 오류가 발생했습니다' });
  }
};
