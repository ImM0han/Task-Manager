# Task Manager Pro

A full-stack Task Management Web Application built with Node.js, Express, SQLite, and vanilla JavaScript. Features JWT authentication, CRUD operations, filtering, sorting, search, and a responsive modern UI.

![Task Manager Pro](https://img.shields.io/badge/Task%20Manager-Pro-blue)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)
![Express](https://img.shields.io/badge/Express-4.x-lightgrey)
![SQLite](https://img.shields.io/badge/SQLite-3-orange)

## Features

### Core Features
- User Authentication (Register/Login with JWT)
- Create, Read, Update, Delete (CRUD) tasks
- Task fields: Title, Description, Status, Priority, Due Date
- Persistent data storage with SQLite
- Responsive design for desktop and mobile

### Bonus Features
- JWT-based authentication with secure password hashing (bcrypt)
- Advanced filtering by status and priority
- Real-time search functionality
- Sorting options (date, priority, title, due date)
- Pagination for task lists
- Statistics dashboard with task counts
- Toast notifications for user feedback
- Input validation on both frontend and backend
- Modern, polished UI with animations
- Mobile-responsive sidebar navigation

## Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - MongoDB ODM
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT authentication
- **express-validator** - Input validation
- **cors** - Cross-origin resource sharing
- **dotenv** - Environment variables

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with CSS variables
- **Vanilla JavaScript** - No framework dependency
- **Font Awesome** - Icons
- **Google Fonts (Inter)** - Typography

## Project Structure

```
task-manager-pro/
├── database/
│   └── db.js              # Database initialization and helpers
├── middleware/
│   ├── auth.js            # JWT authentication middleware
│   └── validation.js      # Input validation rules
├── public/
│   ├── css/
│   │   └── style.css      # Stylesheet
│   ├── js/
│   │   └── app.js         # Frontend application
│   └── index.html         # Main HTML file
├── routes/
│   ├── auth.js            # Authentication routes
│   └── tasks.js           # Task CRUD routes
├── .env                   # Environment variables
├── .env.example           # Environment variables example
├── .gitignore             # Git ignore file
├── package.json           # Project dependencies
├── README.md              # This file
└── server.js              # Express server entry point
```

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- MongoDB (local or MongoDB Atlas)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd task-manager-pro
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` file and set your MongoDB connection string:
   ```
   MONGODB_URI=mongodb://localhost:27017/taskmanager
   ```
   
   For MongoDB Atlas, use:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/taskmanager
   ```

4. **Start the server**
   
   For development (with auto-reload):
   ```bash
   npm run dev
   ```
   
   For production:
   ```bash
   npm start
   ```

5. **Access the application**
   
   Open your browser and navigate to: `http://localhost:3000`

## API Documentation

### Authentication Endpoints

#### POST /api/auth/register
Register a new user.

**Request Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### POST /api/auth/login
Login existing user.

**Request Body:**
```json
{
  "username": "johndoe",
  "password": "SecurePass123"
}
```

#### GET /api/auth/profile
Get current user profile (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
```

### Task Endpoints

All task endpoints require authentication via `Authorization: Bearer <token>` header.

#### GET /api/tasks
Get all tasks with filtering, sorting, and pagination.

**Query Parameters:**
- `status` - Filter by status (pending, in-progress, completed)
- `priority` - Filter by priority (low, medium, high)
- `search` - Search in title and description
- `sort_by` - Sort field (created_at, priority, title, due_date)
- `sort_order` - Sort direction (asc, desc)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)

**Response:**
```json
{
  "success": true,
  "data": {
    "tasks": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "total_pages": 3
    },
    "stats": {
      "total": 25,
      "pending": 10,
      "in_progress": 8,
      "completed": 7,
      "high_priority": 5
    }
  }
}
```

#### GET /api/tasks/:id
Get a single task by ID.

#### POST /api/tasks
Create a new task.

**Request Body:**
```json
{
  "title": "Complete project",
  "description": "Finish the task manager assignment",
  "status": "in-progress",
  "priority": "high",
  "due_date": "2024-12-31"
}
```

#### PUT /api/tasks/:id
Update an existing task.

#### DELETE /api/tasks/:id
Delete a task.

#### PATCH /api/tasks/bulk/status
Bulk update task status.

**Request Body:**
```json
{
  "task_ids": [1, 2, 3],
  "status": "completed"
}
```

## Database Schema

### Users Table
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key, auto-increment |
| username | TEXT | Unique, required |
| email | TEXT | Unique, required |
| password | TEXT | Hashed password |
| created_at | DATETIME | Auto-generated |

### Tasks Table
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key, auto-increment |
| user_id | INTEGER | Foreign key to users |
| title | TEXT | Required, max 100 chars |
| description | TEXT | Optional, max 500 chars |
| status | TEXT | pending, in-progress, completed |
| priority | TEXT | low, medium, high |
| due_date | DATE | Optional |
| created_at | DATETIME | Auto-generated |
| updated_at | DATETIME | Auto-updated |

## Validation Rules

### User Registration
- Username: 3-30 characters, alphanumeric and underscores only
- Email: Valid email format
- Password: Minimum 6 characters, at least 1 uppercase, 1 lowercase, 1 number

### Task Creation/Update
- Title: Required, max 100 characters
- Description: Optional, max 500 characters
- Status: Must be pending, in-progress, or completed
- Priority: Must be low, medium, or high
- Due Date: Must be valid ISO 8601 date

## Security Features

- Password hashing with bcrypt (10 salt rounds)
- JWT token authentication with 24-hour expiration
- Protected API routes with middleware
- Input validation and sanitization
- SQL injection prevention via parameterized queries
- XSS protection through HTML escaping

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Development

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 3000 |
| JWT_SECRET | Secret key for JWT signing | (required) |
| NODE_ENV | Environment mode | development |
| MONGODB_URI | MongoDB connection string | mongodb://localhost:27017/taskmanager |

### Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon

## Deployment

### Deploy to Render/Railway/Heroku

1. Set environment variables in your hosting platform
2. Ensure `NODE_ENV=production`
3. Change `JWT_SECRET` to a strong random string
4. The SQLite database will be created automatically

### Docker Deployment (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## Screenshots

*Add screenshots here showing:*
- Login/Register page
- Dashboard with statistics
- Task list with filters
- Add/Edit task modal
- Mobile responsive view

## Future Enhancements

- [ ] Email notifications for due tasks
- [ ] Task categories/tags
- [ ] Task sharing between users
- [ ] Recurring tasks
- [ ] File attachments
- [ ] Dark mode
- [ ] Export tasks to CSV/PDF
- [ ] Real-time updates with WebSockets

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Author

Your Name
- GitHub: [@yourusername](https://github.com/yourusername)
- LinkedIn: [Your Name](https://linkedin.com/in/yourprofile)

## Acknowledgments

- Font Awesome for icons
- Google Fonts for Inter typography
- Express.js community for excellent documentation
