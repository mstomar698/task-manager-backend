## Task Manager API

A RESTful API built with Node.js, Express.js, PostgreSQL, and Redis for task management.

### 🚀 Features

- ✅ Complete CRUD operations for tasks
- ✅ Redis caching for improved performance
- ✅ PostgreSQL database with Sequelize ORM
- ✅ Comprehensive error handling
- ✅ Input validation
- ✅ Unit and integration tests with Jest
- ✅ Docker support for easy deployment
- ✅ CORS enabled for frontend integration

### 🛠️ Tech Stack

- **Runtime:** Node.js 22+
- **Framework:** Express.js
- **Database:** PostgreSQL 15
- **ORM:** Sequelize
- **Cache:** Redis 7
- **Testing:** Jest + Supertest
- **Development:** Nodemon

### 📦 Installation

#### Prerequisites

- Node.js 22 or higher
- Docker and Docker Compose (for databases)

#### Steps

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
cp .env.test.example .env.test
```

Edit `.env` with your configuration:
```env
PORT=5000
DATABASE_URL=postgresql://admin:admin123@localhost:5432/taskdb
REDIS_URL=redis://localhost:6379
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

4. **Start Docker services**
```bash
docker-compose up -d
```

This will start PostgreSQL and Redis containers.

5. **Run the application**

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

### 🧪 Testing

Run all tests with coverage:
```bash
# Run tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration
```

### 📡 API Endpoints

#### Base URL: `http://localhost:5000/api`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tasks` | Get all tasks |
| GET | `/tasks/:id` | Get a single task |
| POST | `/tasks` | Create a new task |
| PATCH | `/tasks/:id` | Update a task |
| DELETE | `/tasks/:id` | Delete a task |

#### Request/Response Examples

**Create Task**
```bash
POST /api/tasks
Content-Type: application/json

{
  "title": "Complete project",
  "description": "Finish the full-stack assessment",
  "status": "pending"
}
```

**Response**
```json
{
  "id": "uuid-here",
  "title": "Complete project",
  "description": "Finish the full-stack assessment",
  "status": "pending",
  "createdAt": "2024-12-03T10:00:00.000Z",
  "updatedAt": "2024-12-03T10:00:00.000Z"
}
```

**Update Task**
```bash
PATCH /api/tasks/:id
Content-Type: application/json

{
  "status": "completed"
}
```

### 🐳 Docker Deployment

#### Build Docker Image
```bash
docker build -t task-manager-api .
```

#### Run with Docker Compose
```bash
docker-compose up
```

### 📁 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.js      # Sequelize configuration
│   │   └── redis.js         # Redis client setup
│   ├── models/
│   │   └── Task.js          # Task model definition
│   ├── routes/
│   │   └── tasks.js         # Task routes with caching
│   ├── middleware/
│   │   └── errorHandler.js  # Global error handler
│   └── app.js               # Express app setup
├── tests/
│   ├── tasks.test.js              # Unit tests
│   └── integration/
│       └── tasks.integration.test.js  # Integration tests
├── .env                     # Environment variables
├── .env.example             # Environment template
├── docker-compose.yml       # Docker services
├── Dockerfile               # Backend container
├── package.json             # Dependencies
└── README.md                # This file
```

### 🔧 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 5000 |
| DATABASE_URL | PostgreSQL connection string | - |
| REDIS_URL | Redis connection string | - |
| NODE_ENV | Environment mode | development |
| CORS_ORIGIN | Allowed frontend origin | http://localhost:3000 |

### 📊 Performance Features

- **Redis Caching**: All GET requests are cached for 5 minutes
- **Connection Pooling**: PostgreSQL connection pool configured
- **Automatic Cache Invalidation**: Cache clears on data mutations

### 🛡️ Error Handling

The API includes comprehensive error handling:
- Validation errors (400)
- Not found errors (404)
- Database errors (400/500)
- Internal server errors (500)

### 📝 License

MIT
