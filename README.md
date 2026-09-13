# Task Management System

## 1. Project Overview

Task Management System is a full-stack web application for organizing users, teams, projects, tasks, dependencies, and project scheduling information.

The system is **project-centric**. Teams provide the organizational structure, but a Project is the primary execution unit. A project can include members from multiple organizational teams, and its Project Leader is stored on that individual Project. Project task assignment, task work, scheduling analysis, and task deletion use project membership and project leadership rules where applicable rather than treating one team as the only authority boundary.

The application supports:

- User registration, approval, authentication, activation, and profile management.
- Organizational teams with Team Leaders and members.
- Projects with owners, project leaders, participating teams, members, lifecycle status, and progress.
- Tasks with assignment, delegation, workflow stages, priorities, activities, subtasks, assets, scheduling fields, and trash/restore.
- Finish-to-Start task dependencies with validation and cycle protection.
- Kahn's Topological Sort for project dependency order.
- Critical Path Method (CPM) for ES, EF, LS, LF, slack, critical tasks, critical paths, and project duration.
- A Scheduling Analysis page that displays backend-generated scheduling results.
- Notifications for task-related events.
- Dashboard statistics and project/task views.
- Backend-enforced project and task deletion permissions with related-data cleanup.

## 2. Key Features

### Authentication

- Email/password login and logout.
- JWT authentication stored in an HTTP-only `token` cookie.
- Password hashing with `bcryptjs`.
- Public registration creates pending accounts.
- Administrators approve, reject, activate, and deactivate users.
- Google sign-in uses Firebase Authentication in the frontend and `/api/user/google` in the backend.
- Inactive, pending, and rejected accounts are prevented from normal login access.
- Protected routes verify the JWT and load the authenticated user's identity, role, team, and admin flag.

### User Management

- Public user registration.
- Administrator-created users through the protected create route.
- Administrator approval and rejection of pending accounts.
- User profile updates.
- Administrator role changes during profile management.
- Account activation and deactivation.
- Administrator user deletion.
- Pending and rejected user listing.

### Team Management

- Administrator team creation with one approved, active `TEAM_LEADER`.
- Team membership stored in both `User.team` and `Team.members`.
- Team leader stored in `Team.leader`.
- Team member updates and administrator member movement.
- Team visibility restricted according to the authenticated user's organizational relationship.
- Team deletion protection when non-leader members remain or the team is referenced by a project.

Team membership is organizational. It is **not** the primary authority for project task assignment, project task deletion, or scheduling analysis. Project membership and the Project's `projectLeader` are the relevant project-level concepts.

### Project Management

- Administrator project creation.
- Project owner, Project Leader, participating teams, and explicit project members.
- Project editing by the project owner, administrator, or current Project Leader according to the backend rules.
- Project statuses: `planning`, `active`, `completed`, and `archived`.
- Planned start and planned deadline.
- Actual project start and completion tracking through task lifecycle activity.
- Stage-based project progress reporting.
- Cross-team project membership.
- Project Details page with members, teams, progress, tasks, dependencies, and scheduling navigation.
- Administrator-only permanent project deletion.

A Project Leader is a project-specific relationship, not an additional global value in the User role enum. The Project Leader must be an approved active project member when a project is created or updated. The same user may lead one project while holding a different global organizational role.

### Task Management

- Standalone tasks and project-associated tasks.
- Single current assignee per task.
- Project-aware creation and delegation.
- Task title, date, priority, stage, assets, scheduling fields, activity history, and optional parent task.
- Task stages:
  - `todo`
  - `in progress`
  - `completed`
- Priorities:
  - `high`
  - `medium`
  - `normal`
  - `low`
- Task duplication by administrators.
- Embedded subtasks.
- Lightweight subtask checklist items with persisted `completed` state.
- Embedded activities and timeline display.
- Task trash and restore.
- Permanent task deletion with dependency and reference cleanup.
- Backend validation of task status transitions.

The enforced lifecycle is:

```text
TODO -> IN_PROGRESS -> COMPLETED
```

The backend rejects direct `todo -> completed` transitions, rejects reopening completed tasks, and checks unfinished predecessor tasks before starting or completing a dependent task.

### Task Dependencies

Dependencies are explicit `TaskDependency` documents. They are separate from `parentTask`, which represents task lineage such as duplication or delegation context.

The supported relationship is Finish-to-Start (`FS`):

```text
A -> B
```

means task A must be completed before task B can proceed.

Implemented dependency rules:

- Both tasks must exist.
- Both tasks must belong to the same project.
- Self-dependencies are rejected.
- Duplicate predecessor/successor pairs are rejected.
- Dependency cycles are rejected during dependency creation.
- Dependency-aware task start and completion validation is enforced on the backend.
- Deleting a task removes dependencies where it is either predecessor or successor.
- Deleting a project removes dependencies for all tasks in that project.
- The system does not automatically reconnect surrounding tasks after deletion.

### Subtask Checklist

Subtasks are embedded checklist items inside a parent Task. Each item contains only a trimmed title and a persisted `completed` boolean. They intentionally have no assignee, date, priority, dependency, project, duration, or CPM fields.

Users who can access the parent task can add subtasks and toggle their completion. The backend uses the existing parent-task access middleware for both operations. Completing a subtask does not change the parent task's stage, scheduling fields, dependencies, or project progress.

The Task Details page provides an inline checklist with a title-only Add form. Checked items are crossed out, and RTK Query invalidates the task cache after create/toggle mutations so later views receive the persisted state.

### Scheduling Fields and Progress

Tasks support:

- `plannedStartDate`
- `dueDate`
- `estimatedDuration`
- `actualStartDate`
- `actualCompletionDate`

`estimatedDuration` is interpreted as a positive number of **working days**. The application does not currently apply holiday calendars, working-hour calendars, resource capacity, or timezone scheduling rules.

Implemented scheduling behavior:

- Planned start cannot be after the due date.
- Estimated duration must be positive when supplied.
- Actual start is recorded when a task enters `in progress`, if it was not already recorded.
- Actual completion is recorded when a task enters `completed`, if it was not already recorded.
- Project actual start is updated when project work begins.
- Project actual completion is recorded when all non-trashed project tasks are completed.
- A task is overdue when its due date has passed and it is not completed.
- Project progress is calculated from non-trashed task stage counts.

### Scheduling Analysis UI

The route `/projects/:id/scheduling` provides a project-level Scheduling Analysis view. It displays:

- Project duration.
- Total tasks.
- Number of critical tasks.
- Task duration, ES, EF, LS, LF, slack, and critical status.
- Recommended dependency order from the Session 4 API.
- One or more critical paths from the CPM API.
- Dependency relationships.
- Warnings for incomplete predecessors, overdue tasks, and zero-slack tasks.
- Loading, empty project, no-dependency, unauthorized, and API error states.

The frontend displays values returned by the backend. It does not calculate CPM values independently.

### Notifications

Notifications use the `Notice` model. Current task-related notices are created for events such as task assignment, delegation, and duplication. Notifications contain recipient users, text, optional task reference, notification type, read tracking, and timestamps.

The notification panel retrieves unread notices and supports marking one notification or all notifications as read.

### Dashboard

The dashboard displays backend-generated summaries including:

- Total visible tasks.
- Tasks grouped by stage.
- Priority distribution data for charts.
- Recent tasks.
- Administrator user summary data.

Non-admin task visibility is filtered by assignment and, for Project Leaders, their project tasks according to the current backend query rules.

## 3. User Roles and Permissions

The User schema accepts these global role values:

| Role          | Organizational responsibility                           | Project/task authority                                                                                                            |
| ------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `ADMIN`       | System administration                                   | Can manage users and teams, create projects, delete projects, delete any task, duplicate tasks, and access all project/task data. |
| `TEAM_LEADER` | Leads one organizational team                           | Team-level management is limited to the current team. Being a Team Leader alone does not authorize project task deletion.         |
| `ASSOCIATE`   | Performs work and may delegate lower-level project work | Can work on assigned/project-authorized tasks and may delegate according to project rules. Cannot delete tasks solely by role.    |
| `JUNIOR`      | Performs work and may delegate to an Intern             | Can work on assigned/project-authorized tasks and may delegate according to project rules. Cannot delete tasks solely by role.    |
| `INTERN`      | Performs assigned work                                  | Cannot delegate or delete tasks solely by role.                                                                                   |

`isAdmin` is also stored on User and is used by the backend admin middleware. The backend, not frontend visibility, is the security boundary.

### Project Leader

Project Leader is not a global User role. It is the `projectLeader` reference on a Project.

A Project Leader:

- Must be an approved active project member when assigned.
- Can create or delegate project tasks according to project membership and role rules.
- Can access and manage project work according to the existing project access logic.
- Can delete tasks belonging to their project.
- Can work across participating organizational teams.
- Cannot delete the project itself; project deletion is administrator-only.

### Deletion permissions

| Operation               | Administrator | Project Leader             | Assignee/creator/member    | Team Leader only           |
| ----------------------- | ------------- | -------------------------- | -------------------------- | -------------------------- |
| Delete project          | Yes           | No                         | No                         | No                         |
| Move task to trash      | Any task      | Tasks in own project       | No                         | No                         |
| Permanently delete task | Any task      | Tasks in own project       | No                         | No                         |
| Restore a task          | Yes           | Existing task-access rules | Existing task-access rules | Existing task-access rules |

A task assignee or creator cannot delete a task merely because they are assigned to or created it. A Team Leader cannot delete a project task merely because the assignee belongs to their team.

## 4. Project-Centric Architecture

The important domain distinction is:

```text
Team
  Organizational grouping

Project
  Primary execution/work unit

Project Leader
  Project-specific authority stored on Project.projectLeader

Task
  Work item with optional Project association and one current assignee
```

Example:

```text
Project Alpha
├── Team A members
├── Team B members
├── Team C members
├── Project Leader
└── Project tasks
```

The Project Leader can manage project tasks involving members from all participating teams, subject to project membership and the existing delegation rules. Team membership is not used as a substitute for project leadership when authorizing project task deletion.

Standalone tasks remain supported. Tasks with no `project` continue to use the existing standalone hierarchy for creation/delegation, while project tasks use project-centric rules.

## 5. Algorithms

### 5.1 Dependency Graph

For a selected project:

- Each relevant non-trashed task is a graph node.
- Each `TaskDependency` is a directed edge.
- The edge direction is predecessor to successor.

```text
A -> B
B -> C
```

means A must precede B and B must precede C.

The graph is built in memory for the selected project. Tasks and dependency edges from other projects are not included.

### 5.2 Topological Sort: Kahn's Algorithm

The project implements Kahn's Algorithm through `topologicalSortTasks` in `server/utils/taskDependencies.js`.

It is used to produce a dependency-respecting execution order and to detect cycles before scheduling analysis proceeds.

Process:

1. Create a node for every relevant task.
2. Add each successor to its predecessor's adjacency list.
3. Increment the successor's indegree.
4. Put every zero-indegree task into a queue.
5. Remove a task from the queue and append it to the result.
6. Decrement the indegree of every successor.
7. Add successors whose indegree reaches zero to the queue.
8. Continue until the queue is empty.
9. If fewer tasks were processed than exist in the graph, report a cycle.

Example:

```text
A -> B
A -> D
B -> C
D -> C
```

Valid orders include:

```text
A -> B -> D -> C
A -> D -> B -> C
```

Independent tasks may appear in different valid positions. There is not necessarily one unique correct topological order.

Complexity:

- Time: `O(V + E)`
- Space: `O(V + E)`

where `V` is the number of tasks and `E` is the number of dependency edges.

API endpoint:

```text
GET /api/project/:id/dependency-order
```

### 5.3 Critical Path Method

The CPM implementation is in `server/utils/cpm.js`. It reuses the existing Kahn topological order rather than creating a second graph-ordering implementation.

CPM uses each task's `estimatedDuration` in working days and calculates:

- Earliest Start (`ES`)
- Earliest Finish (`EF`)
- Latest Start (`LS`)
- Latest Finish (`LF`)
- Slack
- Critical-task status
- Project duration
- Critical path(s)

#### Forward pass

Tasks are processed in topological order:

```text
ES = maximum EF of all predecessors
ES = 0 when there are no predecessors
EF = ES + duration
```

For multiple predecessors, the latest predecessor finish controls the successor's start.

#### Project duration

```text
Project duration = maximum EF among all project tasks
```

An empty project has duration `0`.

#### Backward pass

Tasks are processed in reverse topological order:

```text
LF = project duration                  for tasks with no successors
LF = minimum successor LS              for tasks with successors
LS = LF - duration
```

#### Slack and critical tasks

```text
Slack = LS - ES
```

A task is critical when its slack is zero. The implementation uses a small floating-point tolerance when comparing calculated values.

Critical paths are returned in dependency order. Equal-length branches can produce multiple critical paths; the implementation returns all critical paths found by the zero-slack dependency relationships rather than assuming only one path exists.

Complexity is linear in the project graph:

- Time: `O(V + E)` for graph traversal and passes, plus output proportional to the number of critical paths returned.
- Space: `O(V + E)` for maps, adjacency relationships, schedule values, and path results.

API endpoint:

```text
GET /api/project/:id/cpm
```

The endpoint returns project duration, per-task metrics, critical task IDs, critical paths, and project-scoped dependency edges.

### 5.4 Algorithm Flow

```text
Task Dependencies
        |
        v
Dependency Graph
        |
        v
Cycle Validation
        |
        v
Kahn Topological Sort
        |
        v
Valid Dependency Order
        |
        v
Critical Path Method
        |
        v
ES / EF / LS / LF
        |
        v
Slack
        |
        v
Critical Tasks and Critical Paths
        |
        v
Project Duration
```

## 6. Activity Tracking

Activities are embedded in each Task document. There is no separate Activity collection.

Current activity types are:

- `assigned`
- `started`
- `in progress`
- `bug`
- `completed`
- `commented`

Each activity stores activity text, timestamp, and an optional author reference through `activities.by`.

Automatic lifecycle behavior:

- Starting a task creates a `started` activity and may record `actualStartDate`.
- Completing a task creates a `completed` activity and may record `actualCompletionDate`.
- Manual comments create `commented` activities.
- Assignment/delegation creates assignment activity entries.

The Task Details page displays the activity timeline.

## 7. Task and Project Deletion

### Project deletion

`DELETE /api/project/:id` is protected by authentication and the admin middleware. Only an administrator can delete a project.

Project deletion removes:

- The Project document.
- All tasks belonging to that project.
- Task dependencies where either endpoint belongs to the project.
- Notifications referencing those tasks.
- Deleted task IDs from `User.tasks` reference arrays.
- `parentTask` references from remaining tasks that pointed to deleted tasks.

The system does not reconnect dependencies automatically after deletion.

### Task deletion

Task deletion is authorized by `canDeleteTask` and `canDeleteRestoreAction` in `server/middlewares/authMiddlewave.js`:

- Admin can delete any task.
- Project Leader can delete tasks whose `project.projectLeader` is the current user.
- Regular members, assignees, creators, and Team Leaders without project leadership are rejected.
- Standalone non-project tasks can be deleted by administrators only.

Permanent deletion removes dependency records where the task is predecessor or successor, related notices, user task references, and remaining tasks' `parentTask` references.

The existing trash/restore flow remains available. Restore actions continue through the existing task-access rules, while permanent deletion uses the stricter deletion authorization.

## 8. System Architecture

### Frontend

- React 18
- Vite
- React Router
- Tailwind CSS
- Headless UI
- React Hook Form
- React Icons
- Sonner

Important pages:

- `Login.jsx`: email/password, registration, and Google sign-in.
- `dashboard.jsx`: dashboard statistics and recent tasks.
- `Tasks.jsx`: task board/list entry point.
- `TaskDetails.jsx`: task details, dependencies, status actions, schedule fields, and activity timeline.
- `Projects.jsx`: project listing and creation.
- `ProjectDetails.jsx`: project metadata, members, progress, tasks, project deletion, and scheduling navigation.
- `SchedulingAnalysis.jsx`: CPM and dependency-order presentation.
- `Teams.jsx`: team administration and membership views.
- `Users.jsx`: user administration.
- `Trash.jsx`: task restore and permanent deletion views.

### State and API

Redux Toolkit and RTK Query are used for server data and cache invalidation.

- `client/src/redux/store.js`: Redux store.
- `client/src/redux/slices/apiSlice.js`: RTK Query base API and tag types.
- `client/src/redux/slices/api/`: authentication, task, user, and project API endpoints.

### Backend

- Node.js
- Express
- Mongoose
- JWT
- `cookie-parser`
- `bcryptjs`
- CORS
- Morgan

The server entry point is `server/index.js`. It loads environment variables, connects to MongoDB through `server/utils/index.js`, mounts routes under `/api`, and starts the HTTP server.

### Database

MongoDB is accessed through Mongoose models in `server/models`.

### Authentication flow

```text
Browser
  |
  v
React Login / Firebase Google Sign-in
  |
  v
RTK Query API request with credentials
  |
  v
Express protectRoute middleware
  |
  v
JWT in HTTP-only cookie
  |
  v
MongoDB User lookup and authorization
```

General application communication:

```text
Browser
  |
  v
React frontend
  |
  v
Redux Toolkit / RTK Query
  |
  v
Express API
  |
  v
MongoDB through Mongoose
```

## 9. Data Models and Relationships

### User

Important fields:

- `name`, `title`, `email`, `password`
- `role`: fixed role enum
- `isAdmin`
- `team`: optional Team reference
- `tasks`: legacy/reference array of Task IDs
- `isActive`
- `status`: `pending`, `approved`, or `rejected`
- `googleAuth`

Live task ownership is represented primarily by `Task.assignee`; `User.tasks` is cleaned when tasks are deleted but is not the main assignment source.

### Team

Important fields:

- `name`
- `leader`: one User reference
- `members`: User references

Team membership is represented redundantly by `User.team` and `Team.members`.

### Project

Important fields:

- `name`, `description`
- `owner`: User reference
- `projectLeader`: project-specific User reference
- `teams`: participating Team references
- `members`: project User references
- `status`: `planning`, `active`, `completed`, or `archived`
- `plannedStart`, `plannedDeadline`
- `actualStart`, `actualCompletion`

### Task

Important fields:

- `title`
- `createdBy`: User reference
- `assignee`: User reference
- `project`: optional Project reference
- `parentTask`: optional Task reference for lineage
- `date`
- `plannedStartDate`, `dueDate`, `estimatedDuration`
- `actualStartDate`, `actualCompletionDate`
- `priority`, `stage`
- Embedded `activities`
- Embedded `subTasks`
- `assets`
- `isTrashed`

### TaskDependency

Important fields:

- `predecessorTask`: Task reference
- `successorTask`: Task reference
- `dependencyType`: currently only `FS`

There is a unique compound index on predecessor and successor IDs, plus validation against self-dependencies.

### Notice

Important fields:

- `team`: recipient User IDs; the field name is historical and functions as a recipient list
- `text`
- `task`: optional Task reference
- `notiType`: `alert` or `message`
- `isRead`: User IDs who have read the notice
- timestamps

Conceptual relationship summary:

```text
User
├── optional Team membership
├── Project memberships
├── Projects owned or led
├── Tasks created
└── Tasks currently assigned

Team
├── Team Leader
└── Members

Project
├── Owner
├── Project Leader
├── Participating Teams
├── Project Members
└── Tasks through Task.project

Task
├── Creator
├── Assignee
├── Optional Project
├── Optional parent Task
├── Embedded Activities
├── Embedded Subtasks
└── TaskDependency predecessor/successor edges

Notice
├── Recipient Users
├── Optional Task
└── Per-user read state
```

## 10. API Reference

All routes are mounted under `/api`. Protected routes require the JWT cookie and use the existing backend authorization middleware.

### Authentication and users

| Method   | Endpoint                | Authorization                               | Purpose                                                               |
| -------- | ----------------------- | ------------------------------------------- | --------------------------------------------------------------------- |
| `POST`   | `/user/register`        | Public                                      | Register a pending user.                                              |
| `POST`   | `/user/create`          | Admin                                       | Create a user through the admin flow.                                 |
| `POST`   | `/user/login`           | Public                                      | Authenticate and set the HTTP-only JWT cookie.                        |
| `POST`   | `/user/logout`          | Public                                      | Clear the authentication cookie.                                      |
| `POST`   | `/user/google`          | Public/Firebase client flow                 | Login an existing Google user or create a pending Google account.     |
| `GET`    | `/user/get-team`        | Authenticated                               | Return users/teams visible to the requester under current team rules. |
| `GET`    | `/user/pending-users`   | Admin                                       | List pending and rejected users.                                      |
| `GET`    | `/user/notifications`   | Authenticated                               | Return unread notifications for the current user.                     |
| `PUT`    | `/user/profile`         | Authenticated                               | Update the current profile; administrators may target a user ID.      |
| `PUT`    | `/user/read-noti`       | Authenticated                               | Mark one notification or all notifications as read.                   |
| `PUT`    | `/user/change-password` | Authenticated                               | Change the current password.                                          |
| `PUT`    | `/user/approve/:id`     | Admin                                       | Approve, reject, or reset a user's approval state.                    |
| `PUT`    | `/user/:id`             | Authenticated with controller authorization | Activate/deactivate a user.                                           |
| `DELETE` | `/user/:id`             | Admin                                       | Delete a user.                                                        |

### Teams

| Method   | Endpoint            | Authorization | Purpose                                                                  |
| -------- | ------------------- | ------------- | ------------------------------------------------------------------------ |
| `GET`    | `/team`             | Authenticated | Return all teams for admins or the requester's permitted team.           |
| `POST`   | `/team`             | Admin         | Create a team with an approved active Team Leader.                       |
| `PUT`    | `/team/:id/members` | Admin         | Update team members while preserving one leader.                         |
| `PUT`    | `/team/move-member` | Admin         | Move eligible Associate, Junior, or Intern members.                      |
| `DELETE` | `/team/:id`         | Admin         | Delete a team when membership and project-reference safeguards allow it. |

### Projects

| Method   | Endpoint                        | Authorization                   | Purpose                                                                                    |
| -------- | ------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------ |
| `GET`    | `/project`                      | Authenticated                   | List visible projects with progress summaries.                                             |
| `POST`   | `/project`                      | Admin                           | Create a project and validate its participants.                                            |
| `GET`    | `/project/:id`                  | Authorized project viewer       | Return project details, visible non-trashed tasks, progress, and dependency count.         |
| `GET`    | `/project/:id/dependency-order` | Authorized project viewer       | Return a Kahn topological order of non-trashed project tasks.                              |
| `GET`    | `/project/:id/cpm`              | Authorized project viewer       | Return CPM task metrics, project duration, critical tasks/paths, and project dependencies. |
| `PUT`    | `/project/:id`                  | Admin, owner, or Project Leader | Update project metadata and participants under controller rules.                           |
| `DELETE` | `/project/:id`                  | Admin only                      | Permanently delete the project and related project task data.                              |

### Tasks

| Method   | Endpoint                                      | Authorization                                           | Purpose                                                               |
| -------- | --------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------- |
| `POST`   | `/task/create`                                | Authenticated; controller validates admin/project rules | Create a standalone or project task.                                  |
| `POST`   | `/task/delegate/:id`                          | Task-access user                                        | Delegate using project or standalone hierarchy rules.                 |
| `POST`   | `/task/duplicate/:id`                         | Admin                                                   | Duplicate a task.                                                     |
| `POST`   | `/task/activity/:id`                          | Task-access user                                        | Add an activity or request a status transition.                       |
| `GET`    | `/task/dashboard`                             | Authenticated                                           | Return dashboard task statistics.                                     |
| `GET`    | `/task`                                       | Authenticated                                           | List active or trashed tasks according to query and visibility rules. |
| `GET`    | `/task/:id`                                   | Task-access user                                        | Return task details, activities, and dependency summary.              |
| `PUT`    | `/task/create-subtask/:id`                    | Task-access user                                        | Add an embedded subtask.                                              |
| `PUT`    | `/task/:id/subtasks/:subtaskId`               | Task-access user                                        | Persist a subtask's checked/unchecked `completed` state.              |
| `PUT`    | `/task/update/:id`                            | Task-access user                                        | Edit task data and validate status changes.                           |
| `PUT`    | `/task/:id`                                   | Admin or Project Leader of the task's project           | Move a task to trash.                                                 |
| `DELETE` | `/task/delete-restore/:id?actionType=restore` | Existing task-access rules                              | Restore one task.                                                     |
| `DELETE` | `/task/delete-restore/:id?actionType=delete`  | Admin or Project Leader of the task's project           | Permanently delete one task.                                          |
| `DELETE` | `/task/delete-restore?actionType=restoreAll`  | Existing bulk-access rules                              | Restore trashed tasks.                                                |
| `DELETE` | `/task/delete-restore?actionType=deleteAll`   | Admin only                                              | Permanently delete all trashed tasks.                                 |

### Dependencies

| Method   | Endpoint                               | Authorization    | Purpose                                            |
| -------- | -------------------------------------- | ---------------- | -------------------------------------------------- |
| `GET`    | `/task/:id/dependencies`               | Task-access user | Return `dependsOn` and `blocks` relationships.     |
| `POST`   | `/task/:id/dependencies`               | Task-access user | Add an FS predecessor dependency after validation. |
| `DELETE` | `/task/:id/dependencies/:dependencyId` | Task-access user | Remove a dependency attached to the task.          |

## 11. Project Structure

```text
TaskMngmt/
├── client/
│   ├── package.json
│   ├── vite.config.js
│   ├── Dockerfile
│   ├── nginx.conf
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── index.css
│       ├── pages/
│       │   ├── Login.jsx
│       │   ├── dashboard.jsx
│       │   ├── Projects.jsx
│       │   ├── ProjectDetails.jsx
│       │   ├── SchedulingAnalysis.jsx
│       │   ├── Tasks.jsx
│       │   ├── TaskDetails.jsx
│       │   ├── Teams.jsx
│       │   ├── Users.jsx
│       │   └── Trash.jsx
│       ├── components/
│       │   ├── project/
│       │   ├── task/
│       │   ├── Navbar.jsx
│       │   ├── Sidebar.jsx
│       │   ├── NotificationPanel.jsx
│       │   └── Dialogs.jsx
│       ├── redux/
│       │   ├── store.js
│       │   └── slices/api/
│       └── utils/
│           └── firebase.js
├── server/
│   ├── package.json
│   ├── index.js
│   ├── Dockerfile
│   ├── controllers/
│   ├── middlewares/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   │   ├── projectAccess.js
│   │   ├── roles.js
│   │   ├── scheduling.js
│   │   ├── taskDependencies.js
│   │   └── cpm.js
│   └── tests/
│       ├── roles.test.mjs
│       ├── projectAccess.test.mjs
│       ├── scheduling.test.mjs
│       ├── taskDependencies.test.mjs
│       ├── taskStatusFlow.test.mjs
│       └── cpm.test.mjs
├── docker-compose.yml
└── README.md
```

## 12. Environment Variables

Do not commit real secrets. Use placeholders in local environment files.

### Backend: `server/.env`

| Variable      | Purpose                                                                 | Required            |
| ------------- | ----------------------------------------------------------------------- | ------------------- |
| `MONGODB_URI` | MongoDB connection string used by Mongoose.                             | Yes                 |
| `JWT_SECRET`  | Secret used to sign and verify JWT cookies.                             | Yes                 |
| `PORT`        | Express server port; defaults to `5000` in code and Docker uses `8800`. | Recommended: `8800` |
| `NODE_ENV`    | Controls cookie security behavior and production error stack behavior.  | Recommended         |

Example:

```env
MONGODB_URI=<your-mongodb-uri>
JWT_SECRET=<your-long-random-secret>
PORT=8800
NODE_ENV=development
```

### Frontend: `client/.env`

| Variable                    | Purpose                                                                                                     |
| --------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `VITE_APP_BASE_URL`         | Optional backend origin used by RTK Query. The client appends `/api`.                                       |
| `VITE_API_URL`              | Backend API URL used by the Google sign-in request in `Login.jsx`; defaults to `http://localhost:8800/api`. |
| `VITE_APP_FIREBASE_API_KEY` | Firebase web API key used by the frontend Firebase configuration.                                           |

When `VITE_APP_BASE_URL` is absent, RTK Query uses the relative `/api` path and relies on the Vite development proxy.

## 13. Local Development and Docker

### Requirements

- Node.js 20 or newer is recommended.
- npm.
- MongoDB locally or a reachable MongoDB deployment.
- Docker Desktop for the Docker Compose workflow.
- Firebase configuration if Google sign-in is required.

### Standard development

Install dependencies:

```powershell
cd server
npm install
cd ..\client
npm install
```

Start the backend:

```powershell
cd server
npm start
```

Start the frontend in another terminal:

```powershell
cd client
npm run dev
```

The Vite development server is configured for port `3001` and proxies `/api` to `http://localhost:8800`.

- Frontend: `http://localhost:3001`
- Backend API: `http://localhost:8800/api`

### Docker Compose

From the repository root:

```powershell
docker compose up -d --build
```

Stop the services:

```powershell
docker compose down
```

Docker configuration:

- Frontend builds with `client/Dockerfile` and is served by Nginx.
- Backend runs `npm start` from `server/Dockerfile`.
- Frontend container port `80` maps to host port `3000`.
- Backend container port `8800` maps to host port `8800`.
- Backend variables are loaded from `server/.env`.

Docker URLs:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8800/api`

## 14. Testing and Verification

### Backend tests

The backend uses Node's built-in test runner:

```powershell
cd server
npm test
```

The current test files cover:

- `roles.test.mjs`: delegation role matrix.
- `projectAccess.test.mjs`: project visibility, management, project-scoped delegation, and deletion authorization.
- `scheduling.test.mjs`: schedule validation, project progress, and overdue behavior.
- `taskDependencies.test.mjs`: graph direction, topological ordering, isolation, cycle detection, and dependency validation.
- `taskStatusFlow.test.mjs`: valid/invalid task lifecycle transitions and predecessor blocking.
- `cpm.test.mjs`: CPM forward/backward passes, multiple critical paths, slack, duration validation, cycles, and project isolation.

Latest verified backend result during this documentation update: `58` tests passed and `0` failed.

The repository does not currently contain a browser end-to-end test suite or a comprehensive MongoDB-backed API integration suite. Deletion cleanup is implemented in the controllers; the existing automated tests primarily validate authorization helpers and algorithm/business-rule utilities.

### Frontend build

```powershell
cd client
npm run build
```

### Frontend lint

`client/package.json` includes an ESLint command:

```powershell
cd client
npm run lint
```

There is currently no ESLint configuration file in the repository, so lint may fail because configuration is missing. The production build is the reliable current frontend validation command.

### Docker verification

```powershell
docker compose up -d --build
docker compose ps
```

The expected services are `taskmanager_frontend` and `taskmanager_backend` with host ports `3000` and `8800`.

## 15. Current Implementation Status

| Feature                | Status   | Current implementation                                                                                                        |
| ---------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Authentication         | Complete | JWT cookie authentication, login/logout, password changes, approval states, and Firebase Google flow.                         |
| User Management        | Complete | Registration, admin creation, approval, activation, profile, pending users, and deletion.                                     |
| Team Management        | Complete | Team creation, membership, leader rules, visibility, movement, and guarded deletion.                                          |
| Project Management     | Complete | Projects, ownership, leaders, members, teams, dates, progress, editing, and deletion cleanup.                                 |
| Project Membership     | Complete | Explicit cross-team project membership with project-scoped access rules.                                                      |
| Task Management        | Complete | Assignment, delegation, editing, stages, priorities, duplication, subtasks, assets, activities, trash, restore, and deletion. |
| Task Scheduling        | Complete | Planned/actual dates, working-day estimated duration, overdue detection, and progress calculations.                           |
| Task Dependencies      | Complete | FS dependency model, same-project validation, duplicate/self/cycle prevention, status blocking, and cleanup.                  |
| Task Status Flow       | Complete | Backend-enforced `todo -> in progress -> completed` lifecycle.                                                                |
| Activities             | Complete | Automatic lifecycle activities and manual comments with authors/timestamps.                                                   |
| Notifications          | Complete | Task-related notices, unread retrieval, and per-user read tracking.                                                           |
| Dashboard              | Complete | Stage totals, priority chart data, recent tasks, and user summary data.                                                       |
| Topological Sort       | Complete | Project-scoped Kahn's Algorithm with cycle detection.                                                                         |
| Critical Path Method   | Complete | ES, EF, LS, LF, slack, critical tasks, multiple critical paths, and duration.                                                 |
| Scheduling Analysis UI | Complete | Project route with CPM table, dependency order, critical paths, relationships, and warnings.                                  |
| Project Deletion       | Complete | Admin-only permanent deletion with related project data cleanup.                                                              |
| Task Deletion          | Complete | Admin/project-leader authorization with dependency/reference cleanup.                                                         |

## 16. Known Limitations and Future Improvements

These are current limitations or intentionally out-of-scope features, not missing descriptions of existing functionality:

- No Gantt chart.
- No resource optimization or resource leveling.
- No employee workload balancing.
- No capacity planning, skills matching, or availability scheduling.
- No holiday, calendar, or working-hours engine.
- No automatic task rescheduling.
- No automatic dependency reconnection after deletion.
- No browser end-to-end test suite.
- No comprehensive MongoDB-backed API integration suite.
- Task assets are represented as strings; a complete server-side upload workflow is not established by the current task controller.
- Some legacy static sample data in `client/src/assets/data.js` does not match the live database schemas and is not the source of truth for the application.
- `server/utils/index.js` still contains the legacy default-admin role string `Admin`, while the User schema enum uses `ADMIN`; default-admin initialization should be corrected before relying on a fresh database bootstrap.
- `User.tasks` exists as a legacy reference array; `Task.assignee` is the live assignment source.
- Multi-document membership/deletion operations are not wrapped in database transactions.
- The frontend lint script exists, but repository ESLint configuration is absent.

The system deliberately stops at dependency-aware scheduling analysis. CPM calculates schedule metrics from the project graph and task durations; it does not perform resource planning or automatic schedule changes.
