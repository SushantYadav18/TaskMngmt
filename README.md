# Task Management System

## 1. Project Overview

This repository contains a full-stack task management system for organizing users into teams and assigning work through a fixed organizational hierarchy.

The live application currently supports:

- User registration, approval, login, logout, password changes, and account activation.
- Email/password authentication with an HTTP-only JWT cookie.
- Google sign-in integration through Firebase Authentication.
- Five intended organizational roles: `ADMIN`, `TEAM_LEADER`, `ASSOCIATE`, `JUNIOR`, and `INTERN`.
- Multiple teams with one Team Leader and lower-level team members.
- Projects owned by users and connected to participating teams, project members, and tasks.
- Role- and team-aware task creation and delegation.
- Task stages, priorities, activities, subtasks, assets, notifications, duplication, and trash/restore operations.
- Dashboard statistics, task board/list views, project details, task details, user/team management, and notification display.
- Docker Compose deployment for the frontend, backend, and external MongoDB connection.

The system is functional as a basic hierarchical project and task tracker. It is not yet a project scheduling or project optimization system. It now models Projects and their Tasks, but does not yet model task durations, task dependencies, resource capacity, or a dependency graph. Those missing concepts are important for the next development phase and for implementing a meaningful algorithm.

## 2. Current Architecture

### 2.1 Frontend

The frontend is a React 18 single-page application built with Vite.

Important frontend technologies:

- React 18
- Vite
- React Router
- Redux Toolkit
- RTK Query
- Tailwind CSS
- React Hook Form
- Headless UI
- React Icons

The frontend entry point is `client/src/main.jsx`. It provides the Redux store and `BrowserRouter`, then renders `App.jsx`.

- `Sidebar` provides navigation.
- `AdminRoute` protects administrator-only routes on the client.

- `client/src/pages/Login.jsx`: login, public registration, and Google sign-in.
- `client/src/pages/dashboard.jsx`: task statistics, recent tasks, and user summary data.
- `client/src/pages/Tasks.jsx`: task board/list views and administrator task creation entry point.
- `client/src/pages/TaskDetails.jsx`: task detail view and activity timeline.
- `client/src/pages/Teams.jsx`: visible team list, team creation, team member status controls, team search, and administrator drag-and-drop movement.
- `client/src/pages/Users.jsx`: user list, administrator user creation/editing, approval, deletion, and account status operations.
- `client/src/pages/Trash.jsx`: task restore and permanent deletion operations.

- `client/src/components/task/AddTask.jsx`: task creation and editing form.
- `client/src/components/task/UserList.jsx`: frontend assignee filtering.
- `client/src/components/task/TaskDialog.jsx`: task actions such as edit, duplicate, subtasks, and trash.
- `client/src/components/task/Table.jsx`, `BoardView.jsx`, and `TaskCard.jsx`: task presentation.
- `client/src/components/AddUser.jsx`: user creation and editing form.
- `api`: RTK Query cache and API middleware.

The API base query is defined in `client/src/redux/slices/apiSlice.js`. If `VITE_APP_BASE_URL` is configured, requests use that backend origin plus `/api`. If it is not configured, requests use the relative `/api` path and rely on the Vite development proxy.

### 2.2 Backend

The backend is an Express application using ECMAScript modules.

The server entry point is `server/index.js`. It:

1. Loads environment variables with `dotenv`.
2. Mounts all routes below `/api`.
3. Starts the HTTP server.

Backend technologies:

- JSON Web Tokens
- `cookie-parser`
- `bcryptjs`
- CORS
- Morgan
- Nodemon

The server uses controllers rather than a separate service layer. Business rules currently live mainly in:

- `server/controllers/userController.js`
- `server/controllers/teamController.js`
- `server/controllers/taskController.js`
- `server/controllers/projectController.js`
- `server/middlewares/authMiddlewave.js`
- `server/utils/roles.js`

### 2.3 Database

MongoDB is accessed through Mongoose. The configured connection string is `MONGODB_URI` in `server/.env`.

The current Mongoose models are:

- `User` in `server/models/user.js`
- `Team` in `server/models/team.js`
- `Task` in `server/models/task.js`
- `Project` in `server/models/project.js`
- `Notice` in `server/models/notification.js`

There is no separate Schedule model, Dependency model, Resource model, or Workload model.

### 2.4 Authentication and authorization

Authentication uses a JWT stored in an HTTP-only cookie named `token`.

Login flow:

1. The client calls `POST /api/user/login`.
2. The backend looks up the user by email.
3. Passwords are compared with bcrypt.
4. The backend creates a JWT containing the user ID.
5. The JWT is written to an HTTP-only cookie.
6. Protected routes run `protectRoute`.
7. `protectRoute` verifies the JWT and loads `isAdmin`, email, role, team, and user ID into `req.user`.

Google sign-in is handled by the frontend Firebase integration and `POST /api/user/google`. New Google accounts are created as pending accounts unless an existing active account is found.

Authorization is implemented in two places:

- Frontend route and control visibility improves usability.
- Backend middleware and controllers enforce the actual security boundary.

Important backend authorization functions:

- `protectRoute`: verifies the authentication cookie.
- `isAdminRoute`: requires `req.user.isAdmin`.
- `canAccessTask`: requires the requester to be the current task assignee or an administrator.
- `canDelegateTo` in `server/utils/roles.js`: preserves the legacy standalone-task hierarchy.
- `canDelegateProjectTask` in `server/utils/projectAccess.js`: enforces project membership and project-specific delegation.

### 2.5 API structure

All backend routes are mounted below `/api`:

```text
/api/user
/api/team
/api/task
/api/project
/api/project
```

The route registration is in `server/routes/index.js`.

### 2.6 Docker setup

Docker Compose is defined in `docker-compose.yml`.

Services:

- `frontend`
  - Builds from `client/Dockerfile`.
  - Builds the Vite production bundle.
  - Serves the bundle with Nginx.
  - Maps host port `3000` to container port `80`.
- `backend`
  - Builds from `server/Dockerfile`.
  - Runs the Express server.
  - Maps host port `8800` to container port `8800`.
  - Loads variables from `server/.env`.

The frontend Nginx configuration uses SPA fallback routing through `try_files ... /index.html`.

For local non-Docker development, Vite is configured for port `3001` and proxies `/api` to `http://localhost:8800`.

## 3. Current User Roles

The fixed role constants are defined in `server/utils/roles.js` and the Mongoose enum is defined in `server/models/user.js`.

The intended roles are:

| Role          | Current responsibility                                | Current delegation permission                                                         |
| ------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `ADMIN`       | Manages users and teams; creates main tasks.          | Main task creation targets `TEAM_LEADER`.                                             |
| `TEAM_LEADER` | Leads one organizational team.                        | Project-specific permissions depend on the user's Project Leader/member relationship. |
| `ASSOCIATE`   | Performs work and delegates lower-level project work. | Can delegate to `JUNIOR` or `INTERN` in the same project.                             |
| `JUNIOR`      | Performs work and can pass work to an Intern.         | Can delegate to `INTERN` in the same project.                                         |
| `INTERN`      | Performs assigned work.                               | Cannot delegate.                                                                      |

`isAdmin` is also stored on `User` and is used by authentication and administrator middleware. The current code intends `ADMIN` to be the canonical role, but there is a current inconsistency: `server/utils/index.js` still contains the legacy default role string `"Admin"` when constructing the default administrator. Because the User schema enum expects `ADMIN`, default-admin initialization should be treated as a known compatibility issue until that helper is corrected.

Role input is not intended to be free text:

- The frontend uses fixed role options.
- Registration and profile update controllers normalize and validate roles.
- Public registration is prevented from selecting `ADMIN`.
- The User schema validates the role enum as a final database boundary.

## 4. Team Management

### 4.1 Team model and membership

A Team document contains `name`, one `leader` User reference, and a `members` array of User references. A User contains a `team` reference to one Team or `null`.

Team membership is represented in both directions:

```text
User.team -> Team._id
Team.members -> User._id
Team.leader -> User._id
```

The existing organizational hierarchy remains authoritative. Teams contain one Team Leader and lower-level Associates, Juniors, and Interns.

Projects add a separate project-specific `projectLeader` relationship. Project Leader is not a global User role. A user can be a Team Leader for one team and Project Leader for a different project, while a non-Team-Leader user may also be Project Leader.

### 4.2 Team visibility

Backend visibility is determined from the authenticated user and database relationships:

- `ADMIN`: sees all teams and approved members.
- `TEAM_LEADER`: sees only the team where the authenticated user is both `User.team` and `Team.leader`.
- `ASSOCIATE`, `JUNIOR`, and `INTERN`: see only their own validated team.
- Users without a valid team relationship receive no team data.

The Teams page displays teams as visible sections, supports team-name search, separates the Team Leader from normal members, and provides administrator drag-and-drop movement for eligible members.

### 4.3 Team administration and movement

Administrators can create teams, update membership, activate/deactivate users, and move Associates, Juniors, and Interns between teams. Team Leaders cannot be moved or reassigned through this functionality.

The movement endpoint updates the User's `team` reference and both old and destination Team member arrays. Team Leaders and administrators are rejected as movement targets.

Administrators also have a confirmed delete action. Deletion is blocked if:

- The team still has Associates, Juniors, or Interns.
- Any Project references the team.

If only the leader remains and no Project references the team, the leader's `User.team` reference is cleared before the Team document is deleted. This avoids orphaned membership references.

### 4.4 Team Leader capabilities

A Team Leader can view their own team and activate/deactivate eligible members of that team. They cannot manage another team, manage themselves, manage another Team Leader, move members, or change leadership.

### 4.5 Associate, Junior, and Intern capabilities

These roles can view only their own validated team and its members. They cannot activate/deactivate users, move users, modify membership, or modify Team Leader information.

### 4.6 Activation and deactivation

`PUT /api/user/:id` accepts an activation value through `isActive` or the legacy `isAction` request field. Administrators can manage any user. Team Leaders can manage eligible non-leader members in their own team. Associates, Juniors, and Interns are rejected by the backend.

## 5. Current Task Management

### 5.1 Task creation

Task creation is available through `POST /api/task/create` and is protected by `protectRoute`. Standalone tasks remain administrator-created; project tasks may be created by an administrator or the configured Project Leader.

The administrator supplies:

- `title`
- `assignee`
- `stage`
- `date`
- `priority`
- `assets`

The backend loads the creator and target User and applies `canDelegateTo`. For the administrator path, the target must be a `TEAM_LEADER` with a team. A main task cannot be created directly for an Associate, Junior, or Intern.

The task stores:

- `createdBy`: User reference for the creator.
- `assignee`: one current responsible User reference.
- `project`: optional Project reference. Project tasks use project-centric authorization.
- `parentTask`: optional Task reference.
- `title`, `date`, `priority`, `stage`, `assets`, and activity history.

A Notice is created for the initial assignee.

### 5.2 Task assignment and delegation

The live task model uses one current `assignee`, not a list of arbitrary assigned team members.

For project tasks, the normal flow is:

```text
ADMIN
  -> creates a main task for TEAM_LEADER
  -> PROJECT LEADER delegates to project members from any organizational team
  -> ASSOCIATE delegates to JUNIOR or INTERN in the same project
  -> JUNIOR delegates to INTERN in the same project
  -> INTERN executes the assigned work
```

Delegation uses `POST /api/task/delegate/:id`.

For a project task, the backend checks:

- The requester is authenticated.
- The requester can access the task.
- The target User exists.
- The role transition is valid.
- The task belongs to the selected Project.
- The source and target are members of that Project.
- The source is the Project Leader, or has `ASSOCIATE`/`JUNIOR` authority for the requested lower-level target.
- Organizational team equality is not required.

The project-specific hierarchy is:

```text
ADMIN -> PROJECT LEADER -> ASSOCIATE -> JUNIOR -> INTERN
```

The Project Leader relationship is stored on the Project and is not added to the global User role enum. Admin project creation assigns the Project Leader. Project Leaders can create or delegate project tasks to appropriate project members across teams. Associate and Junior delegation is also project-scoped. Interns cannot delegate.

Standalone tasks without a Project continue to use the existing team-based `canDelegateTo` behavior for backward compatibility.

Successful delegation:

- Replaces `Task.assignee`.
- Sets `parentTask` to the task ID when it is not already set.
- Appends an `assigned` activity.
- Creates a Notice for the new assignee.

The frontend `UserList` filters project members for project tasks, but the backend independently enforces the same rules.

### 5.3 Task access

`canAccessTask` grants access to:

- The administrator, or
- The User whose ID equals `Task.assignee`.

For non-admin users, task list queries also filter by `assignee`.

This means the current system does not automatically give a Team Leader access to every task delegated within their team. Access is based on the current assignee and administrator status.

### 5.4 Task stages and priorities

Task stages are constrained by the Task schema:

- `todo`
- `in progress`
- `completed`

Task priorities are constrained by the Task schema:

- `high`
- `medium`
- `normal`
- `low`

Posting activity can update the stage:

- `completed` sets the task to `completed`.
- `in progress`, `started`, and `bug` set the task to `in progress`.
- `assigned` sets the task to `todo`.

### 5.5 Activities

A Task embeds an `activities` array. Each activity contains:

- `type`: one of `assigned`, `started`, `in progress`, `bug`, `completed`, or `commented`.
- `activity`: text content.
- `date`.
- `by`: User reference.

The task detail page displays the activity timeline and lets the current assignee or administrator post activity through `POST /api/task/activity/:id`.

### 5.6 Subtasks

A Task embeds a `subTasks` array. Each subtask currently contains:

- `title`
- `date`
- `tag`

Subtasks are added through `PUT /api/task/create-subtask/:id`. They are embedded records, not independent Task documents and cannot be independently assigned, scheduled, or linked by dependencies.

### 5.7 Assets

Tasks contain an `assets` array of strings. The current task form records selected file names. The repository includes Cloudinary-related packages, but the current task form does not implement a complete server-side asset upload workflow.

### 5.8 Notifications

Notifications are stored in the `Notice` model.

A Notice contains:

- `team`: an array of User references receiving the notice. Despite the field name, it is currently used as a recipient list.
- `text`
- `task`: Task reference.
- `notiType`: `alert` or `message`.
- `isRead`: array of User references who have read it.

Notices are created when a task is initially assigned, duplicated, or delegated. Users retrieve notifications with `GET /api/user/notifications` and mark one or all as read with `PUT /api/user/read-noti`.

### 5.9 Editing tasks

`PUT /api/task/update/:id` allows the current assignee or an administrator to update:

- Title
- Date
- Stage
- Priority
- Assets

The current update controller does not change the assignee. Delegation is handled separately through the delegation endpoint.

### 5.10 Duplication

`POST /api/task/duplicate/:id` is administrator-only.

The duplicate receives:

- A `- Duplicate` title suffix.
- The requesting administrator as `createdBy`.
- The original task's assignee.
- The original task as `parentTask`.
- Copied subtasks, assets, priority, stage, and date.

A notification is sent to the duplicate's assignee.

### 5.11 Trash, restore, and deletion

`PUT /api/task/:id` moves an individual task to trash.

`DELETE /api/task/delete-restore/:id?` supports:

- `delete`: permanently delete one task.
- `restore`: restore one task.
- `deleteAll`: permanently delete all trashed tasks.
- `restoreAll`: restore all trashed tasks.

The route uses `canAccessTask`, so administrators can perform bulk actions while normal users are limited to tasks assigned to them.

## 6. Current Data Model

### 6.1 User

`server/models/user.js` defines User fields including:

- `name`
- `title`
- `role`
- `team`
- `email`
- `password`
- `isAdmin`
- `tasks`
- `isActive`
- `status`
- `googleAuth`
- timestamps

Relationships:

- `team` references one Team.
- `tasks` is an array of Task references, although current task controllers primarily use `Task.assignee` and do not maintain this array as the main assignment mechanism.

### 6.2 Team

`server/models/team.js` defines:

- `name`
- `leader`: one User reference.
- `members`: array of User references.
- timestamps

Team membership is represented redundantly in both directions:

```text
User.team -> Team._id
Team.members -> User._id
Team.leader -> User._id
```

The team controllers update these relationships for normal member movement and membership updates. There is no separate TeamMember model.

### 6.3 Task

`server/models/task.js` defines:

- `title`
- `createdBy`: User reference.
- `assignee`: User reference.
- `project`: optional Project reference.
- `parentTask`: optional self-reference to another Task.
- `plannedStartDate`: optional planned start date.
- `dueDate`: optional due date.
- `estimatedDuration`: optional positive number of working days.
- `actualStartDate`: optional actual start date.
- `actualCompletionDate`: optional actual completion date.
- `date`
- `priority`
- `stage`
- `activities`: embedded activity records.
- `subTasks`: embedded subtask records.
- `assets`: string array.
- `isTrashed`
- timestamps

Scheduling fields are optional for backward compatibility. `estimatedDuration` is measured in working days for this session; no weekend, holiday, timezone, or working-hours calendar is applied. Existing tasks may have all scheduling fields unset.

### 6.4 Project

`server/models/project.js` defines:

- `name`
- `description`
- `owner`: User reference.
- `projectLeader`: one project-specific User reference.
- `teams`: participating Team references.
- `members`: project-level User references.
- `status`: `planning`, `active`, `completed`, or `archived`.
- `plannedStart`
- `plannedDeadline`
- `actualStart`
- `actualCompletion`
- timestamps

Projects do not replace organizational team membership. A project member must be an approved active user and must belong to one of the participating teams, unless that user is the project owner. New projects require exactly one Project Leader who is also a project member. Legacy projects without a Project Leader remain readable and require a replacement leader when edited. Project membership also does not override the existing task assignment and delegation hierarchy.

Project creation and editing use team-scoped member selection: select a participating team and only that team's members appear. With multiple participating teams, the user can switch between teams. Project Details groups assigned members under their organizational team. Non-admin project responses are filtered to the authenticated user's authorized team.

### 6.5 Embedded activity

Activities are embedded inside Task documents rather than stored in a separate Activity collection. Each activity can reference the User who created it through `activities.by`.

### 6.6 Embedded subtask

Subtasks are embedded inside Task documents. They do not have their own model or assignment relationship.

### 6.7 Notice

Notice is the notification model. It references Tasks and recipient Users through ObjectIds.

### 6.8 Relationships summary

```text
User 1 ---- 0..1 Team through User.team
Team 1 ---- 1 User through Team.leader
Team 1 ---- many Users through Team.members
User 1 ---- many Tasks through Task.createdBy
User 1 ---- many Tasks through Task.assignee
Project 1 ---- many Tasks through Task.project
Project 1 ---- 1 User through Project.owner
Project 1 ---- 1 User through Project.projectLeader
Project many ---- many Teams through Project.teams
Project many ---- many Users through Project.members
Task 1 ---- many embedded Activities
Task 1 ---- many embedded Subtasks
Task 1 ---- 0..1 parent Task through Task.parentTask
Task 1 ---- many Notices
Notice many ---- many Users through Notice.team / Notice.isRead
```

## 7. Current Limitations and Missing Domain Concepts

This section distinguishes what exists, what is partial, and what is missing for a realistic scheduling or optimization system.

### 7.1 Project concept

**Status: implemented for a first project-management version.**

The system now has a Project model, project routes, project ownership, project teams, project members, project status, planned dates, archive behavior, and project task retrieval.

Project progress is returned by the backend as completed non-trashed project tasks divided by total non-trashed project tasks. Zero-task projects report `0%`; responses also include completed, in-progress, and todo counts.

### 7.2 Project ownership and membership

**Status: implemented with deliberate limits.**

Projects have one owner, participating organizational teams, and explicit project members. Only approved active users can be project members. Project members must belong to participating teams unless they are the project owner.

Project authorization does not create a second role hierarchy. Existing User/Team membership and task assignment rules remain authoritative.

### 7.3 Project lifecycle and dates

**Status: partially implemented.**

Projects have a status, planned start/deadline fields, actual start, and actual completion. A Project actual start is recorded when its first project task begins. Project actual completion is recorded when all non-trashed project tasks are completed. There is no baseline, automatic project date adjustment, dependency schedule, or algorithmic schedule calculation.

### 7.4 Task scheduling

**Status: implemented for basic scheduling data.**

Tasks retain the legacy `date` field and now optionally support planned start, due date, working-day duration, actual start, and actual completion. Backend validation rejects planned starts after due dates and non-positive durations.

When an activity moves a task into `in progress`, `actualStartDate` is recorded only if empty. When an activity completes a task, `actualCompletionDate` is recorded only if empty. Existing manually recorded dates are not overwritten. The UI shows an overdue indicator when the current date is after `dueDate` and the task is not completed.

Task dates remain independent from Project planned dates; changing a task date does not automatically change its Project.

### 7.5 Task effort and advanced scheduling

**Status: completely missing.**

The Task model still has no:

- Estimated duration
- Actual duration
- Estimated effort
- Remaining effort
- Story points
- Complexity value
- Work hours
- Calendar or working-time assumptions

The current `date` field cannot answer how long a task is expected to take.

### 7.6 Task dependencies

**Status: completely missing.**

There is no dependency collection or dependency field. `parentTask` exists, but it represents a duplication/delegation lineage and is not a predecessor relationship.

The system cannot currently represent:

- Finish-to-start dependencies
- Start-to-start dependencies
- Finish-to-finish dependencies
- Lag or lead time
- Task predecessor/successor lists
- Dependency validation
- Circular dependency detection

### 7.7 Graph representation

**Status: completely missing.**

No directed task graph is stored or generated. There is no graph traversal, topological ordering, cycle detection, adjacency list, or dependency edge model.

### 7.8 Project-level progress

**Status: completely missing.**

The dashboard counts tasks by stage and priority, but it does not calculate progress for a project because no project exists. It also does not calculate weighted progress based on effort or duration.

### 7.9 Resources and workload

**Status: partially exists at organizational level, missing at scheduling level.**

The system knows:

- Users
- Roles
- Teams
- Whether a user is active
- Which user currently owns a task

It does not know:

- User capacity
- Working hours
- Availability windows
- Leave or holidays
- Concurrent task limits
- Current workload in hours
- Skill requirements
- Skill levels
- Cost rates
- Resource allocation over time

### 7.10 Scheduling information

**Status: completely missing.**

There is no scheduler, calendar, working-day model, time zone planning, capacity calculation, baseline schedule, or forecast completion date.

### 7.11 Algorithm input data

**Status: insufficient.**

The system has enough data for role hierarchy and access-control algorithms, but not enough domain data for meaningful project scheduling or optimization. The current task date, stage, priority, assignee, and embedded subtasks are not sufficient to calculate a critical path or resource-constrained schedule.

### 7.12 Legacy and consistency issues

**Status: present technical limitations.**

- `client/src/assets/data.js` contains legacy sample tasks with a `team` array and free-text roles such as `Admin`, `Manager`, and `Designer`. This is static sample data and does not match the live Task/User schemas.
- `server/utils/index.js` contains a legacy default role string `"Admin"`, while the User schema expects `ADMIN`.
- The User schema has a `tasks` reference array, but live task assignment is represented by `Task.assignee` and the controllers do not use the User array as the main source of truth.
- Team membership is stored redundantly on User and Team, so consistency depends on controller updates.
- The API/controller layer has no transaction boundary for multi-document team movement. A failure between updating the User, old Team, and destination Team could leave inconsistent membership data.
- The server has focused role/delegation tests, but there is no comprehensive integration test suite for MongoDB-backed API behavior, team movement, authentication, or UI flows.
- The client package exposes an ESLint script, but no ESLint configuration is present in the repository, so the lint command is not currently a reliable validation command.

## 8. Why the Current System Is Not Yet Algorithm-Ready

The application can answer operational questions such as:

- Who is assigned to a task?
- What role does the assignee have?
- Which team does the assignee belong to?
- What stage and priority does a task have?
- Which activities and subtasks are recorded?
- Which users are active or inactive?

It cannot reliably answer the scheduling questions needed for a meaningful project algorithm:

- What tasks belong to the same project?
- What tasks determine overall project completion time?
- Which tasks block other tasks?
- Which tasks can run in parallel?
- Which tasks have no scheduling flexibility?
- What is the critical path?
- How much slack does each task have?
- What is the expected project completion date?
- What happens to the project if one task is delayed?
- Which resource is overloaded during a time window?
- Which eligible user should receive work based on capacity or skills?

The current `parentTask` field does not solve these questions because it is used as a duplication/delegation lineage reference, not as a dependency edge. The current task `date` is a single date, not a duration-based schedule. The current role hierarchy determines who may delegate, but it does not model work effort or resource capacity.

Adding an algorithm directly to this data model would likely produce an artificial result based on assumptions rather than meaningful project data. For example, a critical-path calculation cannot be valid without task durations and dependency edges, and a resource-allocation algorithm cannot be valid without capacity and workload data.

## 9. Recommended Next Development Phase

The next phase should improve the domain model before implementing an algorithm.

### 9.1 Current Project foundation

The Project model now owns a collection of tasks through `Task.project` and contains:

- Name
- Description
- Owner
- Project members or participating teams
- Lifecycle status
- Planned start date
- Planned deadline
- Actual completion date
- Project participants and archive status

This first version intentionally does not calculate progress or schedule projects.

### 9.2 Give tasks scheduling semantics

Add separate fields for:

- Planned start date
- Due date
- Estimated duration
- Actual start date
- Actual completion date
- Estimated effort
- Remaining effort

Keep `stage` for workflow state, but do not use it as a substitute for schedule data.

### 9.3 Add task dependencies

Introduce an explicit dependency model or task dependency fields containing:

- Predecessor task
- Successor task
- Dependency type
- Optional lag

Start with finish-to-start dependencies if the project scope must remain focused. Validate that dependencies belong to the same project and reject cycles.

### 9.4 Add project progress and schedule calculations

Once Projects, task dates, duration, effort, and dependencies exist, calculate:

- Project progress
- Earliest start and finish
- Latest start and finish
- Expected project completion date
- Critical-path membership
- Slack/float
- Delayed-task impact

### 9.5 Add resource information only after task semantics exist

A useful second step is to add:

- User capacity per day or week
- Availability exceptions
- Current workload
- Skill or role requirements
- Optional task assignment constraints

This enables resource-aware scheduling without confusing organizational hierarchy with actual work capacity.

## 10. Algorithm Readiness Roadmap

```text
CURRENT SYSTEM
  |
  v
Add task scheduling data: duration, effort, start, due date
  |
  v
Add task dependency entities and dependency validation
  |
  v
Build and validate a directed acyclic dependency graph
  |
  v
Calculate project schedule and progress
  |
  v
Implement an algorithm suited to the collected data
  |
  v
Display schedule, critical tasks, delays, or allocations in the UI
```

Stage details:

1. **Current system:** retain the working user, team, role, task, activity, and delegation flows.
2. **Scheduling data:** record dates, duration, effort, and completion facts rather than only a generic task date.
3. **Dependencies:** represent predecessor/successor relationships and reject invalid or circular dependencies.
4. **Graph generation:** convert dependency records into a directed graph with validated nodes and edges.
5. **Algorithm implementation:** select an algorithm based on the actual problem and available data.
6. **UI results:** present useful outputs such as critical path, project forecast, bottlenecks, or resource conflicts.

## 11. Candidate Algorithms

These algorithms should only be considered after the missing domain concepts are added.

### 11.1 Critical Path Method

**Problem solved:** Calculates the longest dependency path and identifies tasks that determine the project completion date.

**Required data:** Project, tasks, task durations, dependency edges, and project calendar assumptions.

**Fit:** Natural fit after dependencies and durations exist. It would be artificial in the current system because there is no dependency graph or task duration.

### 11.2 Topological Sort / Kahn's Algorithm

**Problem solved:** Produces a valid execution order for dependency-linked tasks and detects cycles when a complete ordering cannot be generated.

**Required data:** Tasks and directed predecessor/successor edges.

**Fit:** Natural foundational algorithm for dependency validation and graph-based scheduling. It is not useful with the current absence of dependency edges.

### 11.3 Earliest/Latest Schedule and Slack Calculation

**Problem solved:** Calculates earliest and latest task times and the amount of delay a task can tolerate without delaying the project.

**Required data:** A validated acyclic dependency graph, task durations, project start assumptions, and dependency semantics.

**Fit:** Natural extension of Critical Path Method and highly useful for project planning.

### 11.4 Resource-Constrained Scheduling

**Problem solved:** Produces a feasible schedule when users have limited capacity and tasks compete for resources.

**Required data:** Task effort/duration, user availability, capacity, calendars, skills, and assignment constraints.

**Fit:** Natural after the resource model exists. It would be artificial if based only on the current organizational roles.

### 11.5 Hungarian Algorithm

**Problem solved:** Finds a minimum-cost one-to-one assignment between tasks and workers.

**Required data:** A cost matrix derived from skills, capacity, availability, workload, and task requirements.

**Fit:** Potentially useful for a specific assignment-planning feature, but it is not the first algorithm to add. Current task delegation is hierarchical and does not provide a cost matrix or one-to-one batch assignment problem.

### 11.6 Knapsack or Multiple Knapsack

**Problem solved:** Selects a set of tasks that fits a time, effort, or capacity budget.

**Required data:** Task values, effort/duration, capacity limits, and a clear optimization objective.

**Fit:** Could support sprint or weekly work selection, but requires effort and capacity data that are currently missing.

### 11.7 Maximum Flow / Minimum Cut

**Problem solved:** Models movement of limited resources through constrained networks or identifies bottlenecks.

**Required data:** A meaningful flow network, capacities, demand, and a specific allocation or bottleneck problem.

**Fit:** Possible for advanced resource allocation, but likely artificial until project/resource concepts are mature.

### 11.8 Longest Path in a DAG

**Problem solved:** Calculates the longest dependency chain in a directed acyclic task graph.

**Required data:** Acyclic task dependencies and task durations or weights.

**Fit:** Natural for project completion-time analysis and closely related to Critical Path Method.

## 12. Final Recommendation

Do not implement the algorithm requirement immediately.

First build a realistic project and scheduling foundation:

1. Add Projects and connect Tasks to Projects.
2. Add project ownership, members, lifecycle status, start date, and deadline.
3. Add task planned start, due date, estimated duration, effort, and actual completion data.
4. Add explicit task dependencies with cycle validation.
5. Add project progress and schedule calculations.
6. Add basic user capacity and availability only if resource-aware scheduling is required.
7. Build a dependency graph from validated project data.
8. Implement Critical Path Method and topological sorting first.
9. Expose the calculated schedule, critical path, slack, and dependency warnings in the existing task/project UI.

This path improves the application itself and gives the algorithm a real domain problem to solve. It avoids attaching an unrelated algorithm to the current role-and-task workflow merely to satisfy a requirement.

## Local Development

### Prerequisites

- Node.js 20 or newer recommended.
- npm.
- MongoDB Atlas or a local MongoDB server.
- Firebase project configuration if Google sign-in is required.
- Docker Desktop only if using Docker Compose.

### Backend setup

Create `server/.env` with values appropriate for the environment:

```env
MONGODB_URI=mongodb+srv://<database-user>:<database-password>@<cluster>/<database-name>
JWT_SECRET=<long-random-secret>
PORT=8800
NODE_ENV=development
```

Install and run:

```powershell
cd server
npm install
npm start
```

The backend API is normally available at `http://localhost:8800/api`.

### Frontend setup

The frontend can use the Vite proxy when no `VITE_APP_BASE_URL` is supplied. To use the local backend directly, create `client/.env` with:

```env
VITE_APP_BASE_URL=http://localhost:8800
```

Install and run:

```powershell
cd client
npm install
npm run dev
```

The current Vite configuration uses `http://localhost:3001` for local development. The Vite proxy sends `/api` requests to `http://localhost:8800`.

Useful frontend commands:

```powershell
npm run dev
npm run build
npm run preview
npm run lint
```

The repository currently has no ESLint configuration file, so `npm run lint` may fail with a missing configuration error even when the application builds successfully.

### Docker Compose

From the repository root:

```powershell
docker compose up -d --build
docker compose down
```

Docker Compose exposes:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8800`

Use port `3001` for the current local Vite frontend and port `3000` for the Dockerized Nginx frontend.

## API Reference

All endpoints below are prefixed with `/api`.

### User routes

| Method   | Endpoint                | Access                          | Current purpose                                                  |
| -------- | ----------------------- | ------------------------------- | ---------------------------------------------------------------- |
| `POST`   | `/user/register`        | Public                          | Create a pending user registration.                              |
| `POST`   | `/user/create`          | Admin                           | Create an approved active user.                                  |
| `POST`   | `/user/login`           | Public                          | Authenticate and set JWT cookie.                                 |
| `POST`   | `/user/logout`          | Public                          | Clear JWT cookie.                                                |
| `POST`   | `/user/google`          | Public                          | Existing Google login or pending Google registration.            |
| `GET`    | `/user/get-team`        | Authenticated                   | Return role/team-scoped approved users.                          |
| `GET`    | `/user/pending-users`   | Admin                           | Return pending or rejected users.                                |
| `GET`    | `/user/notifications`   | Authenticated                   | Return unread notifications for the current user.                |
| `PUT`    | `/user/profile`         | Authenticated                   | Update the current profile; administrators can target a user ID. |
| `PUT`    | `/user/read-noti`       | Authenticated                   | Mark one or all notifications as read.                           |
| `PUT`    | `/user/change-password` | Authenticated                   | Change the current password.                                     |
| `PUT`    | `/user/approve/:id`     | Admin                           | Approve, reject, or set pending status.                          |
| `PUT`    | `/user/:id`             | Admin or authorized Team Leader | Activate or deactivate a user.                                   |
| `DELETE` | `/user/:id`             | Admin                           | Delete a user.                                                   |

### Team routes

| Method   | Endpoint            | Access        | Current purpose                                                                   |
| -------- | ------------------- | ------------- | --------------------------------------------------------------------------------- |
| `GET`    | `/team`             | Authenticated | Return all teams for Admin or the requester’s validated team for non-admin users. |
| `POST`   | `/team`             | Admin         | Create a team with one approved active Team Leader.                               |
| `PUT`    | `/team/:id/members` | Admin         | Update a team membership list while preserving one Team Leader.                   |
| `PUT`    | `/team/move-member` | Admin         | Move an Associate, Junior, or Intern to another team.                             |
| `DELETE` | `/team/:id`         | Admin         | Delete a team only when no members or Project references would be orphaned.       |

### Project routes

| Method   | Endpoint       | Access                 | Current purpose                                            |
| -------- | -------------- | ---------------------- | ---------------------------------------------------------- |
| `GET`    | `/project`     | Authenticated          | List projects visible to the current user.                 |
| `POST`   | `/project`     | Admin                  | Create a project owned by the authenticated administrator. |
| `GET`    | `/project/:id` | Authorized user        | Return project details and its non-trashed tasks.          |
| `PUT`    | `/project/:id` | Project owner or Admin | Update project metadata and participants.                  |
| `DELETE` | `/project/:id` | Project owner or Admin | Archive the project by setting status to `archived`.       |

### Task routes

| Method   | Endpoint                    | Access                                     | Current purpose                                                            |
| -------- | --------------------------- | ------------------------------------------ | -------------------------------------------------------------------------- |
| `POST`   | `/task/create`              | Admin or Project Leader for a project      | Create a standalone or project task with valid project authorization.      |
| `POST`   | `/task/delegate/:id`        | Current assignee, Project Leader, or Admin | Delegate according to project membership or legacy standalone rules.       |
| `POST`   | `/task/duplicate/:id`       | Admin                                      | Duplicate a task.                                                          |
| `POST`   | `/task/activity/:id`        | Current assignee or Admin                  | Add an activity and update stage where applicable.                         |
| `GET`    | `/task/dashboard`           | Authenticated                              | Return dashboard statistics.                                               |
| `GET`    | `/task`                     | Authenticated                              | List non-trashed or trashed tasks; non-admin users receive assigned tasks. |
| `GET`    | `/task/:id`                 | Current assignee or Admin                  | Return task details and activities.                                        |
| `PUT`    | `/task/create-subtask/:id`  | Current assignee or Admin                  | Add an embedded subtask.                                                   |
| `PUT`    | `/task/update/:id`          | Current assignee or Admin                  | Edit task metadata.                                                        |
| `PUT`    | `/task/:id`                 | Current assignee or Admin                  | Move a task to trash.                                                      |
| `DELETE` | `/task/delete-restore/:id?` | Current assignee or Admin                  | Restore or permanently delete tasks.                                       |

## Validation and Tests

The server has a focused role/delegation test suite:

```powershell
cd server
npm test
```

The current tests cover the fixed delegation matrix, including:

- Admin to Team Leader allowed.
- Admin to Associate rejected.
- Project Leader to appropriate members across organizational teams allowed.
- Cross-team delegation rejected.
- Same-role delegation rejected.
- Intern delegation rejected.

The repository does not currently contain a complete MongoDB integration suite or browser end-to-end suite for all user, team, task, and Docker workflows.

## Current-State Summary

Implemented now:

- User accounts and approval states.
- Cookie-based JWT authentication.
- Firebase Google sign-in integration.
- Fixed roles and backend role validation.
- Teams, Team Leaders, member relationships, visibility restrictions, activation controls, and administrator member movement.
- Hierarchical task assignment and delegation.
- Task stages, priorities, activities, subtasks, assets, notifications, duplication, and trash/restore.
- Dashboard and task presentation UI.
- Projects list and details UI with project creation, editing, archiving, participants, and project task display.
- Optional Project association when creating tasks from Project Details.
- Local Vite development and Docker Compose deployment.

Partially implemented or inconsistent:

- Default administrator initialization still contains a legacy role string that conflicts with the fixed role enum.
- Static client sample data still uses the old multi-user `team` task shape and free-text roles.
- User-to-task references exist in the User schema but are not the primary live assignment source.
- Team membership is duplicated on User and Team without database transactions.
- Task assets are represented, but a complete upload workflow is not evident in the current task form/controller path.
- Automated validation is focused rather than comprehensive.
- Project APIs and authorization are covered by focused unit tests, but not by a full MongoDB integration suite.

Missing for algorithm-ready project scheduling:

- Task duration, effort, planned dates, and completion calculations.
- Task dependency edges and dependency types.
- Dependency graph validation and cycle detection.
- Resource availability, capacity, workload, and skill constraints.
- Schedule generation, critical path, slack, and delay impact calculations.

Existing tasks without a Project remain valid because `Task.project` is optional. Standalone task creation is still supported. New tasks created from Project Details include the selected Project reference, and the backend verifies that the assignee participates in that Project.

The recommended next phase is to add task scheduling semantics, then dependency validation and graph generation, and only then implement Critical Path Method or another algorithm that naturally fits the collected data.
