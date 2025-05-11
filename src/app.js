const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger.config');

// 환경변수 설정
dotenv.config();

// 라우터 임포트
const authRoutes = require('./routes/auth.routes');
const studentRoutes = require('./routes/student.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const noticeRoutes = require('./routes/notice.routes');
const boardRoutes = require('./routes/board.routes');
const notificationRoutes = require('./routes/notification.routes');
const absenceRoutes = require('./routes/absence.routes');
const lectureRoutes = require('./routes/lecture.routes');
const enrollmentRoutes = require('./routes/enrollment.routes');

// 데이터베이스 연결
const db = require('./models');

// 초기 설정
const initialSetup = require('./utils/initialSetup');

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 정적 파일 제공 (업로드된 파일 등)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Swagger UI 설정
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, { explorer: true }));

// API 라우트
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/absences', absenceRoutes);
app.use('/api/lectures', lectureRoutes);
app.use('/api/enrollments', enrollmentRoutes);

// 기본 라우트
app.get('/', (req, res) => {
  res.json({ 
    message: '학생 출석체크 시스템 API가 실행 중입니다.',
    docs: '/api-docs'
  });
});

// 데이터베이스 초기화 및 서버 시작
db.sequelize.sync({ alter: false })
  .then(async () => {
    console.log('데이터베이스 연결 및 동기화 완료');
    
    // 초기 설정 실행
    await initialSetup();
    
    app.listen(PORT, () => {
      console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
      console.log(`API 문서는 http://localhost:${PORT}/api-docs 에서 확인 가능합니다.`);
    });
  })
  .catch(err => {
    console.error('데이터베이스 연결 실패:', err);
  });

module.exports = app; 