const db = require('../models');
const Board = db.board;
const User = db.user;
const Lecture = db.lecture;
const fs = require('fs');
const path = require('path');
const { Op } = db.Sequelize;

// 게시글 목록 조회 - 학생은 자신이 수강중인 강의의 게시글만 볼 수 있음
exports.getAllPosts = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      category, 
      search, 
      searchBy = 'title',
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      lectureId
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
    
    if (category) {
      condition.category = category;
    }
    
    if (lectureId) {
      condition.lectureId = lectureId;
    }
    
    if (search) {
      if (searchBy === 'title') {
        condition.title = { [Op.like]: `%${search}%` };
      } else if (searchBy === 'content') {
        condition.content = { [Op.like]: `%${search}%` };
      } else if (searchBy === 'author') {
        // 작성자 검색은 include에서 처리
      } else if (searchBy === 'all') {
        condition[Op.or] = [
          { title: { [Op.like]: `%${search}%` } },
          { content: { [Op.like]: `%${search}%` } }
        ];
      }
    }
    
    // 학생인 경우, 자신이 수강 중인 강의의 게시글만 조회 가능
    if (!isProfessorOrAdmin) {
      // 학생이 수강 중인 강의 목록 조회
      const studentLectures = await db.attendance.findAll({
        where: { studentId: userId },
        attributes: ['lectureId'],
        group: ['lectureId']
      });
      
      const enrolledLectureIds = studentLectures.map(item => item.lectureId);
      
      if (enrolledLectureIds.length === 0) {
        return res.status(200).json({
          posts: [],
          pagination: {
            totalItems: 0,
            totalPages: 0,
            currentPage: parseInt(page),
            itemsPerPage: parseInt(limit)
          },
          message: '수강 중인 강의가 없습니다.'
        });
      }
      
      // 수강 중인 강의의 게시글만 조회
      condition.lectureId = { [Op.in]: enrolledLectureIds };
    }
    
    // 정렬 설정
    const order = [[sortBy, sortOrder]];
    
    // 게시글 조회
    const { count, rows: posts } = await Board.findAndCountAll({
      where: condition,
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'userType']
        },
        {
          model: Lecture,
          attributes: ['id', 'name', 'code', 'semester']
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
      posts,
      pagination: {
        totalItems: count,
        totalPages,
        currentPage,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('게시글 조회 오류:', error);
    return res.status(500).json({ message: '게시글을 가져오는 중 오류가 발생했습니다' });
  }
};

// 특정 게시글 조회 - 학생은 자신이 수강 중인 강의의 게시글만 볼 수 있음
exports.getPostById = async (req, res) => {
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
    
    // 게시글 조회
    const post = await Board.findOne({
      where: { 
        id,
        isActive: true
      },
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'userType']
        },
        {
          model: Lecture,
          attributes: ['id', 'name', 'code', 'semester']
        }
      ]
    });
    
    if (!post) {
      return res.status(404).json({ message: '게시글을 찾을 수 없습니다' });
    }
    
    // 학생인 경우, 자신이 수강 중인 강의의 게시글만 조회 가능
    if (!isProfessorOrAdmin) {
      // 학생이 수강 중인 강의 목록 조회
      const studentLectures = await db.attendance.findAll({
        where: { studentId: userId },
        attributes: ['lectureId'],
        group: ['lectureId']
      });
      
      const enrolledLectureIds = studentLectures.map(item => item.lectureId);
      
      // 수강 중인 강의의 게시글이 아닌 경우 접근 거부
      if (!enrolledLectureIds.includes(post.lectureId)) {
        return res.status(403).json({ message: '이 게시글에 접근할 권한이 없습니다' });
      }
    }
    
    // 조회수 증가
    await post.update({ viewCount: post.viewCount + 1 });
    
    return res.status(200).json(post);
  } catch (error) {
    console.error('게시글 상세 조회 오류:', error);
    return res.status(500).json({ message: '게시글을 가져오는 중 오류가 발생했습니다' });
  }
};

// 게시글 작성 - 교수만 가능
exports.createPost = async (req, res) => {
  try {
    const { title, content, category, lectureId } = req.body;
    const userId = req.userId;
    
    // 필수 입력값 확인
    if (!title || !content || !lectureId) {
      return res.status(400).json({ message: '제목, 내용, 강의 ID는 필수 입력값입니다' });
    }
    
    // 강의 존재 여부 확인
    const lecture = await Lecture.findByPk(lectureId);
    if (!lecture) {
      return res.status(404).json({ message: '해당 강의를 찾을 수 없습니다' });
    }
    
    // 강의 담당 교수 확인 (본인의 강의에만 게시글 작성 가능)
    if (lecture.professorId !== userId) {
      return res.status(403).json({ message: '본인이 담당하는 강의에만 게시글을 작성할 수 있습니다' });
    }
    
    // 첨부파일 처리
    const attachments = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        attachments.push({
          filename: file.filename,
          originalname: file.originalname,
          path: file.path,
          size: file.size,
          mimetype: file.mimetype
        });
      });
    }
    
    // 게시글 생성
    const post = await Board.create({
      title,
      content,
      category: category || '공지',
      attachments: attachments.length > 0 ? attachments : null,
      lectureId,
      userId
    });
    
    // 생성된 게시글 조회
    const createdPost = await Board.findByPk(post.id, {
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'userType']
        },
        {
          model: Lecture,
          attributes: ['id', 'name', 'code', 'semester']
        }
      ]
    });
    
    return res.status(201).json({
      message: '게시글이 성공적으로 작성되었습니다',
      post: createdPost
    });
  } catch (error) {
    console.error('게시글 작성 오류:', error);
    return res.status(500).json({ message: '게시글 작성 중 오류가 발생했습니다' });
  }
};

// 게시글 수정 - 교수만 가능
exports.updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category, lectureId, removeAttachments } = req.body;
    const userId = req.userId;
    
    // 게시글 조회
    const post = await Board.findByPk(id);
    if (!post) {
      return res.status(404).json({ message: '게시글을 찾을 수 없습니다' });
    }
    
    // 작성자 확인
    if (post.userId !== userId) {
      return res.status(403).json({ message: '본인의 게시글만 수정할 수 있습니다' });
    }
    
    // 강의 변경이 있는 경우, 강의 존재 여부 및 권한 확인
    if (lectureId && lectureId !== post.lectureId) {
      const lecture = await Lecture.findByPk(lectureId);
      if (!lecture) {
        return res.status(404).json({ message: '해당 강의를 찾을 수 없습니다' });
      }
      
      // 강의 담당 교수 확인
      if (lecture.professorId !== userId) {
        return res.status(403).json({ message: '본인이 담당하는 강의에만 게시글을 작성할 수 있습니다' });
      }
    }
    
    // 첨부파일 처리
    let attachments = post.attachments || [];
    
    // 삭제할 첨부파일이 있는 경우
    if (removeAttachments && Array.isArray(removeAttachments)) {
      const filesToKeep = [];
      
      // 문자열 배열로 변환 (form-data에서 문자열로 올 수 있음)
      const removeIds = removeAttachments.map(id => id.toString());
      
      for (const file of attachments) {
        if (!removeIds.includes(file.filename)) {
          filesToKeep.push(file);
        } else {
          // 파일 시스템에서 삭제
          try {
            fs.unlinkSync(file.path);
          } catch (err) {
            console.error('파일 삭제 오류:', err);
          }
        }
      }
      
      attachments = filesToKeep;
    }
    
    // 새로운 첨부파일 추가
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        attachments.push({
          filename: file.filename,
          originalname: file.originalname,
          path: file.path,
          size: file.size,
          mimetype: file.mimetype
        });
      });
    }
    
    // 게시글 업데이트
    const updatedData = {
      title: title || post.title,
      content: content || post.content,
      category: category || post.category,
      attachments: attachments.length > 0 ? attachments : null
    };
    
    if (lectureId) {
      updatedData.lectureId = lectureId;
    }
    
    await post.update(updatedData);
    
    // 업데이트된 게시글 조회
    const updatedPost = await Board.findByPk(post.id, {
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'userType']
        },
        {
          model: Lecture,
          attributes: ['id', 'name', 'code', 'semester']
        }
      ]
    });
    
    return res.status(200).json({
      message: '게시글이 성공적으로 수정되었습니다',
      post: updatedPost
    });
  } catch (error) {
    console.error('게시글 수정 오류:', error);
    return res.status(500).json({ message: '게시글 수정 중 오류가 발생했습니다' });
  }
};

// 게시글 삭제 - 교수만 가능
exports.deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    
    // 게시글 조회
    const post = await Board.findByPk(id);
    if (!post) {
      return res.status(404).json({ message: '게시글을 찾을 수 없습니다' });
    }
    
    // 작성자 확인
    if (post.userId !== userId) {
      return res.status(403).json({ message: '본인의 게시글만 삭제할 수 있습니다' });
    }
    
    // 첨부파일 삭제
    if (post.attachments && post.attachments.length > 0) {
      for (const file of post.attachments) {
        try {
          fs.unlinkSync(file.path);
        } catch (err) {
          console.error('파일 삭제 오류:', err);
        }
      }
    }
    
    // 게시글 삭제 (소프트 삭제)
    await post.update({ isActive: false });
    
    return res.status(200).json({
      message: '게시글이 성공적으로 삭제되었습니다'
    });
  } catch (error) {
    console.error('게시글 삭제 오류:', error);
    return res.status(500).json({ message: '게시글 삭제 중 오류가 발생했습니다' });
  }
};

// 첨부파일 다운로드
exports.downloadAttachment = async (req, res) => {
  try {
    const { id, filename } = req.params;
    
    // 게시글 조회
    const post = await Board.findByPk(id);
    if (!post) {
      return res.status(404).json({ message: '게시글을 찾을 수 없습니다' });
    }
    
    // 첨부파일 찾기
    if (!post.attachments || !Array.isArray(post.attachments)) {
      return res.status(404).json({ message: '첨부파일이 없습니다' });
    }
    
    const file = post.attachments.find(f => f.filename === filename);
    if (!file) {
      return res.status(404).json({ message: '요청한 파일을 찾을 수 없습니다' });
    }
    
    // 파일 다운로드
    const filePath = file.path;
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: '파일이 서버에 존재하지 않습니다' });
    }
    
    res.download(filePath, file.originalname);
  } catch (error) {
    console.error('첨부파일 다운로드 오류:', error);
    return res.status(500).json({ message: '첨부파일 다운로드 중 오류가 발생했습니다' });
  }
};
