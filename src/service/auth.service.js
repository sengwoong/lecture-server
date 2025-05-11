const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../models');
const User = db.user;
const Role = db.role;

/**
 * 회원가입
 * @param {Object} req - 요청 객체
 * @param {Object} res - 응답 객체
 * @returns {Object} JSON 응답
 */
exports.signup = async (req, res) => {

  const { username, email, password, name, userType, studentId, department, grade, status, address, emergencyContact } = req.body;
 
  // 이메일 중복 확인
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    return res.status(400).json({ message: '이미 사용중인 이메일입니다' });
  }
  
  // 학생인경우와 교수인경우 학번 중복 확인   
  if (userType === 'student') {
    // 학번 중복 확인   
    const existingStudentId = await User.findOne({ where: { studentId } });
    if (existingStudentId) {
      return res.status(400).json({ message: '이미 사용중인 학번입니다' });
  }
  }else if (userType === 'professor') {
    // 교번 중복 확인
    const existingProfessorId = await User.findOne({ where: { professorId } });
    if (existingProfessorId) {
      return res.status(400).json({ message: '이미 사용중인 교번입니다' });
    } 
  }

  // 비민번호 해쉬화
  const hashedPassword = await bcrypt.hash(password, 10);
  //  enrollmentDate 를 오늘 날짜로 설정  
  const enrollmentDate = new Date().toISOString().split('T')[0];

  // 회원가입
  const newUser = await User.create({ username, email, password: hashedPassword, name, userType, studentId, department, grade, status, address, emergencyContact, enrollmentDate });

  return res.status(200).json({ message: '회원가입이 성공적으로 완료되었습니다' });
  
};

// 로그인
exports.login = async (req, res) => {
  try {
    // 아이디와 비밀번호 확인
    const user = await User.findOne({
      where: {
        username: req.body.username
      }
    });

    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
    }

    // 계정 활성화 상태 확인
    if (!user.active) {
      return res.status(403).json({ message: '비활성화된 계정입니다' });
    }

    // 비밀번호 검증
    const passwordIsValid = await bcrypt.compare(req.body.password, user.password);

    if (!passwordIsValid) {
      return res.status(401).json({ message: '비밀번호가 올바르지 않습니다' });
    }

    // 사용자 역할 가져오기
    const roles = await user.getRoles();
    const roleNames = roles.map(role => role.name);

    // JWT 토큰 생성
    const token = jwt.sign(
      { id: user.id, roles: roleNames },
      process.env.JWT_SECRET || 'your_jwt_secret_key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );

    // 마지막 로그인 시간 업데이트
    await user.update({ lastLogin: new Date() });

    return res.status(200).json({
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      roles: roleNames,
      accessToken: token
    });
  } catch (error) {
    console.error('로그인 오류:', error);
    return res.status(500).json({ message: '로그인 중 오류가 발생했습니다' });
  }
};


// 사용자 정보 조회
exports.getUserInfo = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
    }

    const roles = await user.getRoles();
    const roleNames = roles.map(role => role.name);

    return res.status(200).json({
      ...user.toJSON(),
      roles: roleNames
    });
  } catch (error) {
    console.error('사용자 정보 조회 오류:', error);
    return res.status(500).json({ message: '사용자 정보 조회 중 오류가 발생했습니다' });
  }
};

// 비밀번호 변경
exports.changePassword = async (req, res) => {
  try {
    // 현재 비밀번호와 새 비밀번호 확인
    if (!req.body.currentPassword || !req.body.newPassword) {
      return res.status(400).json({ message: '현재 비밀번호와 새 비밀번호를 모두 입력해주세요' });
    }

    const user = await User.findByPk(req.userId);

    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
    }

    // 현재 비밀번호 확인
    const passwordIsValid = await bcrypt.compare(req.body.currentPassword, user.password);

    if (!passwordIsValid) {
      return res.status(401).json({ message: '현재 비밀번호가 올바르지 않습니다' });
    }

    // 새 비밀번호 해싱 및 업데이트
    const hashedPassword = await bcrypt.hash(req.body.newPassword, 10);
    await user.update({ password: hashedPassword });

    return res.status(200).json({ message: '비밀번호가 성공적으로 변경되었습니다' });
  } catch (error) {
    console.error('비밀번호 변경 오류:', error);
    return res.status(500).json({ message: '비밀번호 변경 중 오류가 발생했습니다' });
  }
};

// 비밀번호 초기화
exports.resetPassword = async (req, res) => {
  try {
    if (!req.body.resetToken || !req.body.newPassword) {
      return res.status(400).json({ message: '토큰과 새 비밀번호를 입력해주세요' });
    }

    // 토큰 검증
    let decoded;
    try {
      decoded = jwt.verify(
        req.body.resetToken,
        process.env.JWT_RESET_SECRET || 'reset_password_secret'
      );
    } catch (err) {
      return res.status(401).json({ message: '유효하지 않거나 만료된 토큰입니다' });
    }

    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
    }

    // 새 비밀번호 해싱 및 업데이트
    const hashedPassword = await bcrypt.hash(req.body.newPassword, 10);
    await user.update({ password: hashedPassword });

    return res.status(200).json({ message: '비밀번호가 성공적으로 초기화되었습니다' });
  } catch (error) {
    console.error('비밀번호 초기화 오류:', error);
    return res.status(500).json({ message: '비밀번호 초기화 중 오류가 발생했습니다' });
  }
};

// 역할 정보 조회
exports.getRoles = async (req, res) => {
  try {
    const roles = await Role.findAll();
    return res.status(200).json(roles);
  } catch (error) {
    console.error('역할 정보 조회 오류:', error);
    return res.status(500).json({ message: '역할 정보 조회 중 오류가 발생했습니다' });
  }
}; 