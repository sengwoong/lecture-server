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
  try {
    // 사용자 정보 유효성 검사
    if (!req.body.username || !req.body.email || !req.body.password || !req.body.name) {
      return res.status(400).json({ message: '모든 필수 필드를 입력해주세요' });
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    // 역할 확인
    let roleNames = ['student']; // 기본값은 학생 역할
    let isProfessor = false;
    
    // 요청에 역할이 지정된 경우 해당 역할 사용
    if (req.body.roles && req.body.roles.length > 0) {
      // 요청된 역할이 'professor'인 경우에만 교수 역할 부여, 그 외에는 학생 역할 유지
      if (req.body.roles.includes('professor')) {
        roleNames = ['professor'];
        isProfessor = true;
      }
    }
    
    // studentId 처리
    let studentId = req.body.studentId;
    
    // 교수 계정이고 studentId가 비어있거나 없는 경우 자동 생성
    if (isProfessor && (!studentId || studentId.trim() === '')) {
      // 현재 시간을 기반으로 고유한 ID 생성
      const timestamp = new Date().getTime();
      const randomNum = Math.floor(Math.random() * 10000);
      studentId = `P${timestamp % 10000}${randomNum}`;
    }

    // 사용자 생성
    const user = await User.create({
      username: req.body.username,
      email: req.body.email,
      password: hashedPassword,
      name: req.body.name,
      phone: req.body.phone,
      studentId: studentId
    });
    
    const roles = await Role.findAll({
      where: {
        name: {
          [db.Sequelize.Op.in]: roleNames
        }
      }
    });
    
    await user.setRoles(roles);

    return res.status(201).json({ 
      message: '회원가입이 완료되었습니다',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        roles: roleNames
      }
    });
  } catch (error) {
    console.error('회원가입 오류:', error);
    return res.status(500).json({ message: '회원가입 중 오류가 발생했습니다' });
  }
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