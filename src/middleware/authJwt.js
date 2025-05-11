const jwt = require('jsonwebtoken');
const db = require('../models');
const User = db.user;

// JWT 토큰 검증
const verifyToken = (req, res, next) => {
  const token = req.headers['x-access-token'] || req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(403).json({
      message: '토큰이 제공되지 않았습니다.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key');
    req.userId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({
      message: '인증되지 않았습니다.'
    });
  }
};

// 관리자 권한 확인
const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.userId);
    
    // userType으로 확인
    if (user.userType === 'professor') {
      return next();
    }
    
    // 역할로 확인
    const roles = await user.getRoles();
    for (let i = 0; i < roles.length; i++) {
      if (roles[i].name === 'professor') {
        return next();
      }
    }

    return res.status(403).json({
      message: '관리자 권한이 필요합니다.'
    });
  } catch (error) {
    return res.status(500).json({
      message: '서버 오류가 발생했습니다.'
    });
  }
};

// 교수 권한 확인
const isProfessor = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.userId);
    
    // admin 또는 professor 확인
    if (user.userType === 'admin' || user.userType === 'professor') {
      return next();
    }
    
    // 역할로 확인
    const roles = await user.getRoles();
    for (let i = 0; i < roles.length; i++) {
      if (roles[i].name === 'professor' || roles[i].name === 'admin') {
        return next();
      }
    }

    return res.status(403).json({
      message: '교수 권한이 필요합니다.'
    });
  } catch (error) {
    return res.status(500).json({
      message: '서버 오류가 발생했습니다.'
    });
  }
};

// 학생 권한 확인
const isStudent = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.userId);
    
    // student 확인
    if (user.userType === 'student') {
      return next();
    }
    
    // 역할로 확인
    const roles = await user.getRoles();
    for (let i = 0; i < roles.length; i++) {
      if (roles[i].name === 'student') {
        return next();
      }
    }

    return res.status(403).json({
      message: '학생 권한이 필요합니다.'
    });
  } catch (error) {
    return res.status(500).json({
      message: '서버 오류가 발생했습니다.'
    });
  }
};

// 학생 본인 확인 (학생 ID가 URL 파라미터로 제공됨)
const isOwnerOrAuthorized = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.userId);
    
    // 관리자나 교수인 경우 접근 허용
    if (user.userType === 'admin' || user.userType === 'professor') {
      return next();
    }
    
    // 역할로 확인
    const roles = await user.getRoles();
    for (let i = 0; i < roles.length; i++) {
      if (roles[i].name === 'admin' || roles[i].name === 'professor') {
        return next();
      }
    }
    
    // 자신의 정보인지 확인
    if (user.id == req.params.id || user.studentId == req.params.studentId) {
      return next();
    }

    return res.status(403).json({
      message: '접근 권한이 없습니다.'
    });
  } catch (error) {
    return res.status(500).json({
      message: '서버 오류가 발생했습니다.'
    });
  }
};

const authJwt = {
  verifyToken,
  isAdmin,
  isProfessor,
  isStudent,
  isOwnerOrAuthorized
};

module.exports = authJwt; 