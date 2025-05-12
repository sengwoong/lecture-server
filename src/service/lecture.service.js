const db = require('../models');
const Lecture = db.lecture;
const User = db.user;
const Attendance = db.attendance;
const { Op } = db.Sequelize;

// 모든 강의 목록 조회 - 학생은 자신이 수강 중인 강의만 볼 수 있음
exports.getAllLectures = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      semester, 
      department, 
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.userId;
    
    // 사용자 정보 및 역할 확인
    const user = await User.findByPk(userId, {
      include: [{
        model: db.role,
        attributes: ['name'],
        through: { attributes: [] }
      }]
    });
    
    // 역할 확인
    const roles = user.roles.map(role => role.name);
    const isProfessorOrAdmin = roles.includes('professor') || roles.includes('admin');
    
    // 조건 설정
    const condition = {
      isActive: true
    };
    
    if (semester) {
      condition.semester = semester;
    }
    
    if (department) {
      condition.department = department;
    }
    
    if (search) {
      condition[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { code: { [Op.like]: `%${search}%` } },
        { department: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }
    
    // 학생인 경우, 자신이 수강 중인 강의만 조회 가능
    if (!isProfessorOrAdmin) {
      // 학생이 수강 중인 강의 목록 조회
      const studentLectures = await Attendance.findAll({
        where: { studentId: userId },
        attributes: ['lectureId'],
        group: ['lectureId']
      });
      
      const enrolledLectureIds = studentLectures.map(item => item.lectureId);
      
      if (enrolledLectureIds.length === 0) {
        return res.status(200).json({
          lectures: [],
          pagination: {
            totalItems: 0,
            totalPages: 0,
            currentPage: parseInt(page),
            itemsPerPage: parseInt(limit)
          },
          message: '수강 중인 강의가 없습니다.'
        });
      }
      
      // 수강 중인 강의만 조회
      condition.id = { [Op.in]: enrolledLectureIds };
    }
    
    // 정렬 설정
    const order = [[sortBy, sortOrder]];
    
    // 교수인 경우 본인이 담당하는 강의만 조회
    if (roles.includes('professor') && !roles.includes('admin')) {
      condition.professorId = userId;
    }
    
    // 강의 조회
    const { count, rows: lectures } = await Lecture.findAndCountAll({
      where: condition,
      include: [
        {
          model: User,
          as: 'professor',
          attributes: ['id', 'name', 'email']
        }
      ],
      order,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    // 페이지네이션 정보
    const totalPages = Math.ceil(count / limit);
    const currentPage = parseInt(page);
    
    return res.status(200).json({
      lectures,
      pagination: {
        totalItems: count,
        totalPages,
        currentPage,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('강의 조회 오류:', error);
    return res.status(500).json({ message: '강의를 가져오는 중 오류가 발생했습니다' });
  }
};

// 권한 체크 없이 모든 강의 조회
exports.getAllLecturesWithoutAuth = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      semester, 
      department, 
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;
    const offset = (page - 1) * limit;
    
    // 조건 설정
    const condition = {
      isActive: true
    };
    
    if (semester) {
      condition.semester = semester;
    }
    
    if (department) {
      condition.department = department;
    }
    
    if (search) {
      condition[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { code: { [Op.like]: `%${search}%` } },
        { department: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }
    
    // 정렬 설정
    const order = [[sortBy, sortOrder]];
    
    // 강의 조회
    const { count, rows: lectures } = await Lecture.findAndCountAll({
      where: condition,
      include: [
        {
          model: User,
          as: 'professor',
          attributes: ['id', 'name', 'email']
        }
      ],
      order,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    // 페이지네이션 정보
    const totalPages = Math.ceil(count / limit);
    const currentPage = parseInt(page);
    
    return res.status(200).json({
      lectures,
      pagination: {
        totalItems: count,
        totalPages,
        currentPage,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('강의 조회 오류:', error);
    return res.status(500).json({ message: '강의를 가져오는 중 오류가 발생했습니다' });
  }
};

// 특정 강의 조회
exports.getLectureById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    
    // 사용자 정보 및 역할 확인
    const user = await User.findByPk(userId, {
      include: [{
        model: db.role,
        attributes: ['name'],
        through: { attributes: [] }
      }]
    });
    
    // 역할 확인
    const roles = user.roles.map(role => role.name);
    const isProfessorOrAdmin = roles.includes('professor') || roles.includes('admin');
    
    // 강의 조회
    const lecture = await Lecture.findByPk(id, {
      include: [
        {
          model: User,
          as: 'professor',
          attributes: ['id', 'name', 'email']
        }
      ]
    });
    
    if (!lecture) {
      return res.status(404).json({ message: '강의를 찾을 수 없습니다' });
    }
    
    // 학생인 경우, 자신이 수강 중인 강의만 조회 가능
    if (!isProfessorOrAdmin) {
      // 학생이 해당 강의를 수강 중인지 확인
      const isEnrolled = await Attendance.findOne({
        where: { 
          studentId: userId,
          lectureId: id
        }
      });
      
      if (!isEnrolled) {
        return res.status(403).json({ message: '이 강의에 접근할 권한이 없습니다' });
      }
    }
    
    // 교수인 경우 본인의 강의만 조회 가능
    if (roles.includes('professor') && !roles.includes('admin')) {
      if (lecture.professorId !== userId) {
        return res.status(403).json({ message: '본인의 강의만 조회할 수 있습니다' });
      }
    }
    
    return res.status(200).json(lecture);
  } catch (error) {
    console.error('강의 상세 조회 오류:', error);
    return res.status(500).json({ message: '강의를 가져오는 중 오류가 발생했습니다' });
  }
};

// 강의 생성 - 교수만 가능
exports.createLecture = async (req, res) => {
  try {
    const { 
      name, 
      code, 
      semester, 
      department, 
      dayOfWeek, 
      startTime, 
      endTime, 
      room, 
      description,
      startDate,
      endDate
    } = req.body;
    const userId = req.userId;
    
    // 필수 입력값 확인
    if (!name || !code || !semester || !department || !startDate || !endDate) {
      return res.status(400).json({ 
        message: '강의명, 코드, 학기, 소속 학과, 시작일, 종료일은 필수 입력값입니다' 
      });
    }
    
    // 중복 코드 확인
    const existingLecture = await Lecture.findOne({ where: { code } });
    if (existingLecture) {
      return res.status(400).json({ 
        message: '이미 사용 중인 강의 코드입니다' 
      });
    }
    
    // 강의 생성
    const lecture = await Lecture.create({
      name,
      code,
      semester,
      department,
      dayOfWeek: dayOfWeek || null,
      startTime: startTime || null,
      endTime: endTime || null,
      room: room || null,
      description: description || null,
      startDate,
      endDate,
      professorId: userId
    });
    
    // 생성된 강의 조회
    const createdLecture = await Lecture.findByPk(lecture.id, {
      include: [
        {
          model: User,
          as: 'professor',
          attributes: ['id', 'name', 'email']
        }
      ]
    });
    
    return res.status(201).json({
      message: '강의가 성공적으로 생성되었습니다',
      lecture: createdLecture
    });
  } catch (error) {
    console.error('강의 생성 오류:', error);
    return res.status(500).json({ message: '강의 생성 중 오류가 발생했습니다' });
  }
};

// 강의 수정 - 교수만 가능
exports.updateLecture = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      code, 
      semester, 
      department, 
      dayOfWeek, 
      startTime, 
      endTime, 
      room,
      description,
      isActive
    } = req.body;
    const userId = req.userId;
    
    // 강의 조회
    const lecture = await Lecture.findByPk(id);
    if (!lecture) {
      return res.status(404).json({ message: '강의를 찾을 수 없습니다' });
    }
    
    // 본인의 강의인지 확인
    if (lecture.professorId !== userId) {
      return res.status(403).json({ message: '본인의 강의만 수정할 수 있습니다' });
    }
    
    // 코드 변경 시 중복 확인
    if (code && code !== lecture.code) {
      const existingLecture = await Lecture.findOne({ 
        where: { 
          code,
          id: { [Op.ne]: id }
        } 
      });
      
      if (existingLecture) {
        return res.status(400).json({ message: '이미 사용 중인 강의 코드입니다' });
      }
    }
    
    // 강의 업데이트
    const updateData = {
      name: name || lecture.name,
      code: code || lecture.code,
      semester: semester || lecture.semester,
      department: department || lecture.department,
      dayOfWeek: dayOfWeek !== undefined ? dayOfWeek : lecture.dayOfWeek,
      startTime: startTime !== undefined ? startTime : lecture.startTime,
      endTime: endTime !== undefined ? endTime : lecture.endTime,
      room: room !== undefined ? room : lecture.room,
      description: description !== undefined ? description : lecture.description
    };
    
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }
    
    await lecture.update(updateData);
    
    // 업데이트된 강의 조회
    const updatedLecture = await Lecture.findByPk(id, {
      include: [
        {
          model: User,
          as: 'professor',
          attributes: ['id', 'name', 'email']
        }
      ]
    });
    
    return res.status(200).json({
      message: '강의가 성공적으로 수정되었습니다',
      lecture: updatedLecture
    });
  } catch (error) {
    console.error('강의 수정 오류:', error);
    return res.status(500).json({ message: '강의 수정 중 오류가 발생했습니다' });
  }
};

// 강의 삭제 - 교수만 가능
exports.deleteLecture = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    
    // 강의 조회
    const lecture = await Lecture.findByPk(id);
    if (!lecture) {
      return res.status(404).json({ message: '강의를 찾을 수 없습니다' });
    }
    
    // 본인의 강의인지 확인
    if (lecture.professorId !== userId) {
      return res.status(403).json({ message: '본인의 강의만 삭제할 수 있습니다' });
    }
    
    // 관련 데이터가 있는지 확인
    const attendanceCount = await Attendance.count({ where: { lectureId: id } });
    
    if (attendanceCount > 0) {
      // 실제 삭제 대신 비활성화
      await lecture.update({ isActive: false });
      return res.status(200).json({ 
        message: '강의가 비활성화되었습니다. 출석 기록이 있어 완전히 삭제되지 않았습니다.' 
      });
    } else {
      // 관련 데이터가 없으면 실제 삭제
      await lecture.destroy();
      return res.status(200).json({ 
        message: '강의가 성공적으로 삭제되었습니다' 
      });
    }
  } catch (error) {
    console.error('강의 삭제 오류:', error);
    return res.status(500).json({ message: '강의 삭제 중 오류가 발생했습니다' });
  }
};

// 강의 수강생 목록 조회 - 교수만 가능
exports.getLectureStudents = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    
    // 강의 조회
    const lecture = await Lecture.findByPk(id);
    if (!lecture) {
      return res.status(404).json({ message: '강의를 찾을 수 없습니다' });
    }
    
    // 본인의 강의인지 확인
    if (lecture.professorId !== userId) {
      return res.status(403).json({ message: '본인의 강의 수강생만 조회할 수 있습니다' });
    }
    
    // 수강생 조회 - Enrollment 테이블을 통해 수강 신청한 학생들 조회
    const enrollments = await db.enrollment.findAll({
      where: { lectureId: id },
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'email', 'studentId', 'phone', 'department']
        }
      ]
    });
    console.log("enrollments");
    console.log("enrollments");
    console.log(enrollments);
    console.log(enrollments);
    // 학생 정보 추출
    const students = enrollments.map(enrollment => enrollment.student);
    
    return res.status(200).json({
      lecture: {
        id: lecture.id,
        name: lecture.name,
        code: lecture.code,
        semester: lecture.semester
      },
      studentCount: students.length,
      students
    });
  } catch (error) {
    console.error('수강생 목록 조회 오류:', error);
    return res.status(500).json({ message: '수강생 목록 조회 중 오류가 발생했습니다' });
  }
}; 