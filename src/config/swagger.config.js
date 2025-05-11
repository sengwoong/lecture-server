const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '학생 출석체크 시스템 API',
      version: '1.0.0',
      description: '학생 정보 관리, 출석 관리, 게시판 등의 API 문서',
      contact: {
        name: '시스템 관리자',
        email: 'admin@example.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: '개발 서버'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [{
      bearerAuth: []
    }]
  },
  apis: [
    './src/routes/*.js',
    './src/models/*.js',
    './src/app.js'
  ]
};

const specs = swaggerJsdoc(options);

module.exports = specs; 