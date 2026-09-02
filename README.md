# Task Manager

A full-stack task management application with role-based access for administrators and assigned team members. The project is split into a React/Vite frontend and an Express/MongoDB backend.

## Features

- Email/password login with JWT authentication stored in an HTTP-only cookie
- Google sign-in through Firebase Authentication
- Public user registration with administrator approval
- Administrator-created users with a chosen password and immediate active access
- Administrator task creation, assignment, editing, duplication, and management
- Assigned members can view their tasks, open details, edit task information, add subtasks, post activities, change task status, and use individual trash/restore actions
- Task stages: `todo`, `in progress`, and `completed`
- Priorities: `high`, `medium`, `normal`, and `low`
- Activity timeline and notifications for assigned users
- Dashboard statistics and task filtering
- Team member management, approval, activation, and deletion

## Technology Stack

### Frontend

- React 18
- Vite
- React Router
- Redux Toolkit and RTK Query
- Tailwind CSS
- React Hook Form
- Headless UI
- Recharts
- Firebase Authentication
- Sonner notifications

### Backend

- Node.js with ECMAScript modules
- Express
- MongoDB with Mongoose
- JSON Web Tokens
- HTTP-only cookies with `cookie-parser`
- `bcryptjs` password hashing
- CORS
- Morgan request logging
- Nodemon for development

## Project Structure

```text
taskmanager/
|-- client/                         React/Vite frontend
|   |-- public/                     Static public assets
|   |-- src/
|   |   |-- assets/                 Seed or static application data
|   |   |-- components/             Reusable UI components
|   |   |   |-- task/               Task forms, tables, dialogs, and subtasks
|   |   |-- pages/                  Dashboard, login, tasks, users, trash, details
|   |   |-- redux/                  Redux store, auth state, and API slices
|   |   |-- utils/                  Firebase setup and shared frontend helpers
|   |   |-- App.jsx                 Routes and authenticated layout
|   |   |-- main.jsx                React entry point and providers
|   |   `-- index.css               Global styles and Tailwind layers
|   |-- .env                       Frontend environment variables
|   |-- package.json                Frontend scripts and dependencies
|   |-- vite.config.js              Vite server and API proxy configuration
|   |-- tailwind.config.js          Tailwind configuration
|   `-- postcss.config.js           PostCSS configuration
|
|-- server/                         Express backend
|   |-- controllers/                Request handlers and business logic
|   |-- middlewares/                Authentication, authorization, and errors
|   |-- models/                     Mongoose schemas for users, tasks, notices
|   |-- routes/                     API route declarations
|   |-- scripts/                    Database administration utilities
|   |-- utils/                      MongoDB connection and JWT cookie helpers
|   |-- .env                       Backend environment variables
|   |-- index.js                    Express app, middleware, routes, and server start
|   `-- package.json                 Backend scripts and dependencies
|
`-- README.md                       This guide
```

## Application Workflow

### 1. Starting the application

The backend loads its environment variables, connects to MongoDB, ensures the default administrator exists, configures CORS and cookie parsing, registers `/api` routes, and listens on port `8800` by default.

The frontend starts Vite, reads the API base URL, loads the Redux store, and renders the router and authenticated layout. API requests use `credentials: "include"` so the browser sends the JWT cookie.

### 2. Authentication

1. A user submits the login form.
2. The frontend calls `POST /api/user/login`.
3. The server validates the account and password with bcrypt.
4. The server signs a JWT containing the user ID.
5. The JWT is returned as an HTTP-only `token` cookie.
6. Protected requests pass through `protectRoute`, which verifies the cookie and loads the user identity.
7. The frontend stores non-sensitive user information in Redux and local storage for UI state.

In development, the cookie uses `SameSite=Lax` and does not require HTTPS. In production, it uses `SameSite=None` and `Secure`, so production must use HTTPS.

### 3. User registration and creation

- Public registration uses `POST /api/user/register`. New accounts are `pending` and inactive until approved by an administrator.
- An administrator uses the Team page to create a user. The form sends the chosen password to `POST /api/user/create`.
- The protected admin endpoint creates the account as `approved` and active, so the new user can log in immediately.
- Passwords are hashed by the User model before storage and are never returned in API responses.

### 4. Task workflow

1. An administrator creates a task and selects one or more team members.
2. The task stores the assigned user IDs in its `team` field.
3. A notification is created for those assigned users.
4. Administrators can see and manage all tasks.
5. Members receive only tasks assigned to them in task lists and dashboard results.
6. An assigned member can open the task, edit task fields, add a subtask, write timeline activity, change the stage, and move the task to Trash.
7. Individual restore or permanent deletion is available for a trashed task. Bulk trash operations remain administrator-only.

### 5. Dashboard and notifications

The dashboard requests task statistics from `GET /api/task/dashboard`. Administrators receive global statistics; members receive statistics for their assigned tasks.

The notification panel requests `GET /api/user/notifications`. Notifications are created when tasks are assigned. A user can mark one notification or all notifications as read.

## API Overview

All API routes are prefixed with `/api`.

### Authentication and users

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/user/register` | Public | Submit a pending registration |
| POST | `/user/create` | Admin | Create an active user with a password |
| POST | `/user/login` | Public | Log in and receive the JWT cookie |
| POST | `/user/logout` | Public | Clear the JWT cookie |
| POST | `/user/google` | Public | Sign in or submit Google registration |
| GET | `/user/get-team` | Authenticated | List approved team members |
| GET | `/user/pending-users` | Admin | List pending users |
| GET | `/user/notifications` | Authenticated | Get the current user's notifications |
| PUT | `/user/profile` | Authenticated | Update a profile |
| PUT | `/user/change-password` | Authenticated | Change the current password |
| PUT | `/user/approve/:id` | Admin | Approve or reject a user |
| PUT | `/user/read-noti` | Authenticated | Mark notifications as read |
| PUT/DELETE | `/user/:id` | Admin | Activate or delete a user |

### Tasks

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/task/create` | Admin | Create and assign a task |
| POST | `/task/duplicate/:id` | Admin | Duplicate a task |
| POST | `/task/activity/:id` | Assigned member or admin | Add activity and update stage when applicable |
| GET | `/task/dashboard` | Authenticated | Return dashboard statistics |
| GET | `/task` | Authenticated | List tasks; members receive assigned tasks only |
| GET | `/task/:id` | Assigned member or admin | Get task details and populated timeline |
| PUT | `/task/create-subtask/:id` | Assigned member or admin | Add a subtask |
| PUT | `/task/update/:id` | Assigned member or admin | Update task fields |
| PUT | `/task/:id` | Assigned member or admin | Move an individual task to Trash |
| DELETE | `/task/delete-restore/:id` | Assigned member or admin | Restore or permanently delete one task |
| DELETE | `/task/delete-restore` | Admin | Bulk restore or permanently delete trashed tasks |

## Requirements for a New Device

Install the following before setup:

- Node.js 18 or newer (Node.js 20 or newer is recommended)
- npm
- A MongoDB Atlas database or local MongoDB server
- A Firebase project if Google sign-in is required
- Git, if cloning the repository

## Setup on Another Device or Environment

### 1. Get the source code

```bash
git clone <repository-url>
cd taskmanager
```

Or copy the complete project folder, including both `client` and `server` directories.

### 2. Install backend dependencies

```bash
cd server
npm install
```

### 3. Configure the backend

Create `server/.env`:

```env
MONGODB_URI=mongodb+srv://<database-user>:<database-password>@<cluster>/<database-name>
JWT_SECRET=<long-random-secret>
PORT=8800
NODE_ENV=development
```

Use a new strong `JWT_SECRET` for every real environment. Do not commit `.env` files or database credentials.

### 4. Configure MongoDB

1. Create a MongoDB database.
2. Create a database user and password.
3. Allow the development machine's IP address in MongoDB Atlas Network Access, or use a suitable private network in production.
4. Put the connection string in `server/.env`.
5. Start the server once. It connects to MongoDB and ensures the default administrator exists.

The development default administrator is:

```text
Email: admin@example.com
Password: admin123
```

Change this password before using the application outside local development.

You can also run the database utility from the server directory:

```bash
node scripts/set-default-admin.mjs
```

### 5. Configure the frontend

Create `client/.env`:

```env
VITE_APP_BASE_URL=http://localhost:8800
VITE_APP_FIREBASE_API_KEY=<firebase-web-api-key>
```

`VITE_APP_BASE_URL` must point to the backend origin without the `/api` suffix because the client adds `/api` itself.

For Google sign-in, update the Firebase project configuration in `client/src/utils/firebase.js` and enable Google as a Firebase Authentication provider. Add the local development origins, such as `http://localhost:3000` and `http://localhost:3001`, to Firebase authorized domains when required.

### 6. Install frontend dependencies

Open a new terminal at the project root and run:

```bash
cd client
npm install
```

### 7. Start both applications

Terminal 1, backend:

```bash
cd server
npm start
```

Terminal 2, frontend:

```bash
cd client
npm run dev
```

Open the URL printed by Vite, normally:

```text
http://localhost:3000
```

If port `3000` is occupied, Vite chooses another port such as `3001`. The backend CORS list already includes the common local ports; add any custom frontend origin to `server/index.js`.

## Useful Commands

### Frontend

```bash
cd client
npm run dev       # Start Vite development server
npm run build     # Create a production build
npm run preview   # Preview the production build
npm run lint      # Run ESLint
```

### Backend

```bash
cd server
npm start         # Start Express with Nodemon
node index.js     # Start Express without Nodemon
node scripts/check-admin-user.mjs
node scripts/set-default-admin.mjs
```

The backend currently has no automated test suite configured; `npm test` is a placeholder command.

## Environment and Deployment Notes

- Keep database URLs, JWT secrets, and private credentials out of source control.
- Use HTTPS in production because secure cross-site cookies require it.
- Set `NODE_ENV=production` in production.
- Set the frontend `VITE_APP_BASE_URL` to the deployed backend origin.
- Add the deployed frontend origin to the CORS allowlist in `server/index.js`.
- Add the deployed frontend domain to Firebase authorized domains for Google sign-in.
- Rebuild the frontend after changing any `VITE_` variable because Vite embeds those values at build time.
- Never expose the JWT secret in frontend variables. Only variables prefixed with `VITE_` are intended for the frontend bundle.

## Troubleshooting

### Every protected request returns 401

1. Confirm the server is running on the port in `VITE_APP_BASE_URL`.
2. Log out and log in again to create a fresh cookie.
3. Clear cookies for the frontend/API localhost origins.
4. Confirm every RTK Query request uses `credentials: "include"`.
5. In development, use `http://`, not `https://`, unless the local certificate is configured correctly.

### Port already in use

Only run one backend on port `8800` and one frontend on the chosen Vite port. Stop the existing process or use a different port, then update the frontend URL and backend CORS allowlist if necessary.

### Database data does not load

Check the server terminal for MongoDB connection errors, verify `MONGODB_URI`, confirm the MongoDB IP allowlist, and make sure the browser is authenticated. An unauthenticated request to a protected endpoint correctly returns `401`.

### New user cannot log in

Confirm the user was created from the administrator Team page, not only through public registration. Public registrations remain pending until approved. The admin-created user must use the password entered in the Add New User form.

## Security Notes

- Passwords are hashed with bcrypt before being stored.
- JWTs are stored in HTTP-only cookies so frontend JavaScript cannot read them.
- Protected API routes verify the JWT server-side.
- Task access is checked server-side. Members cannot access tasks to which they are not assigned.
- Replace all development credentials and secrets before deployment.
