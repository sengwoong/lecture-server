const db = require('../models');
const bcrypt = require('bcrypt');
const Role = db.role;
const User = db.user;

/**
 * 애플리케이션 초기 설정을 수행하는 함수
 * - 기본 역할(관리자, 교수, 학생) 생성
 * - 기본 관리자 계정 생성
 */
const initialSetup = async () => {
  try {
    // 기본 역할 생성
    await createRoles();
    
    // 기본 관리자 계정 생성
    await createAdminUser();
    
    console.log('초기 설정이 완료되었습니다.');
  } catch (error) {
    console.error('초기 설정 중 오류가 발생했습니다:', error);
  }
};

/**
 * 기본 역할 생성 함수
 */
const createRoles = async () => {
  try {
    // 기존 역할 개수 확인
    const count = await Role.count();
    
    if (count === 0) {
      // 역할이 없는 경우 기본 역할 생성
      await Role.bulkCreate([
        { name: 'admin', description: '관리자 - 시스템 관리 권한' },
        { name: 'professor', description: '교수 - 강의 관리, 출석 관리, 학생 조회 권한' },
        { name: 'student', description: '학생 - 자신의 출석 및 정보 조회 권한' }
      ]);
      
      console.log('기본 역할이 생성되었습니다.');
    } else {
      console.log('기본 역할이 이미 존재합니다.');
    }
  } catch (error) {
    console.error('역할 생성 중 오류 발생:', error);
    throw error;
  }
};

/**
 * 기본 관리자 계정 생성 함수
 */
const createAdminUser = async () => {
  try {
    // 관리자 계정 존재 여부 확인
    const adminExists = await User.findOne({
      where: { username: 'admin' }
    });
    
    if (!adminExists) {
      // 관리자 계정 생성
      const hashedPassword = await bcrypt.hash('admin1234', 10);
      
      const adminUser = await User.create({
        username: 'admin',
        email: 'admin@example.com',
        password: hashedPassword,
        name: '관리자',
        userType: 'admin',
        active: true
      });
      
      // 관리자 역할 찾기
      const adminRole = await Role.findOne({ where: { name: 'admin' } });
      
      if (adminRole) {
        // 관리자 역할 할당
        await adminUser.addRole(adminRole);
        console.log('관리자 계정이 생성되었습니다.');
      } else {
        console.error('관리자 역할을 찾을 수 없습니다.');
      }
    } else {
      console.log('관리자 계정이 이미 존재합니다.');
    }
  } catch (error) {
    console.error('관리자 계정 생성 중 오류 발생:', error);
    throw error;
  }
};

module.exports = initialSetup; 