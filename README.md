# 학생 출석체크 시스템 (Lecture Check) 백엔드

Express와 Sequelize를 사용한 학생 출석체크 및 학사 관리 시스템의 백엔드 서버입니다.

## 주요 기능

- 학생 정보 관리 (CRUD 기능, 엑셀 내보내기)
- QR 코드를 이용한 간편 출석 체크
- 강의별/날짜별/학생별 출석 현황 관리
- 공지사항 관리 (첨부파일 기능 포함)
- 학생 게시판 (댓글, 좋아요 기능 포함)
- 실시간 알림 시스템 (SSE 방식)
- 병결 신청 및 관리
- 권한 기반 사용자 관리 (관리자, 교수, 학생)

## 기술 스택

- **프레임워크**: Express.js
- **데이터베이스**: MySQL
- **ORM**: Sequelize
- **인증**: JWT (JSON Web Token)
- **파일 업로드**: Multer
- **API 보안**: CORS, Helmet

## 시작하기

### 필수 조건

- Node.js (v14 이상)
- MySQL (v5.7 이상)

### 설치 방법

1. 저장소 클론:
```bash
git clone <repository-url>
cd lecture-check-back
```

2. 의존성 설치:
```bash
npm install
```

3. 환경 변수 설정:
   `.env` 파일을 루트 디렉토리에 생성하고 다음 내용을 추가하세요.
```
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=lecture_check_db
DB_PORT=3306

JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=1d

MAX_FILE_SIZE=5242880
```

4. 데이터베이스 생성:
   MySQL에서 `lecture_check_db` 데이터베이스를 생성하세요.

5. 서버 실행:
```bash
npm run dev  # 개발 모드로 실행 (nodemon)
npm start    # 프로덕션 모드로 실행
```

초기 관리자 계정:
- 아이디: admin
- 비밀번호: admin1234

### Docker로 실행하기

Docker를 사용하여 애플리케이션을 간편하게 실행할 수 있습니다.

1. Docker 및 Docker Compose 설치:
   [Docker 설치](https://docs.docker.com/get-docker/)
   [Docker Compose 설치](https://docs.docker.com/compose/install/)

2. Docker Compose로 실행:
```bash
docker-compose up -d
```

3. 서비스 확인:
```bash
docker-compose ps
```

4. 로그 확인:
```bash
docker-compose logs -f app
```

5. 서비스 중지:
```bash
docker-compose down
```

## API 문서

주요 API 엔드포인트:

- 인증: `/api/auth`
  - 로그인: `POST /api/auth/login`
  - 회원가입: `POST /api/auth/signup`
  
- 학생 관리: `/api/students`
  - 학생 목록: `GET /api/students`
  - 학생 검색: `GET /api/students/search`
  
- 출석 관리: `/api/attendance`
  - 강의별 출석: `GET /api/attendance/lectures/:lectureId`
  - QR 코드 생성: `GET /api/attendance/qr/:lectureId`
  
- 공지사항: `/api/notices`
  - 공지사항 목록: `GET /api/notices`
  - 중요 공지: `GET /api/notices/important`
  
- 게시판: `/api/boards`
  - 게시글 목록: `GET /api/boards`
  - 게시글 생성: `POST /api/boards`
  
- 알림: `/api/notifications`
  - 알림 목록: `GET /api/notifications`
  - SSE 연결: `GET /api/notifications/sse`
  
- 병결 신청: `/api/absences`
  - 병결 목록: `GET /api/absences`
  - 병결 신청: `POST /api/absences`

## 프로젝트 구조

```
lecture-check-back/
├── src/
│   ├── config/
│   │   └── db.config.js
│   ├── services/
│   │   ├── auth.service.js
│   │   ├── student.service.js
│   │   └── ...
│   ├── middleware/
│   │   ├── authJwt.js
│   │   └── upload.js
│   ├── models/
│   │   ├── index.js
│   │   ├── user.model.js
│   │   └── ...
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── student.routes.js
│   │   └── ...
│   ├── utils/
│   │   └── initialSetup.js
│   └── app.js
├── uploads/
├── .env
├── docker-compose.yml
├── Dockerfile
├── .dockerignore
├── package.json
└── README.md
```

## 라이센스

이 프로젝트는 MIT 라이센스 하에 배포됩니다. 