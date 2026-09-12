# Task Management System

## Project Overview

This project is a full-stack task management application centered on projects rather than only teams. The current implementation supports user authentication, project creation, project membership, task assignment, task status tracking, dependency validation, notifications, and dashboard reporting.

The system is intentionally project-centric:

- Team membership is still part of the user model and team management flow.
- A project is the primary unit of work.
- Project Leader is a project-specific authority, not a global user role.
- A project may include members from multiple teams.
- Task assignment and delegation are enforced against project membership and project-scoped authorization, not only team membership.

## Tech Stack

### Frontend

- React
- Vite
- Redux Toolkit
- RTK Query
- React Router
- Tailwind CSS
- React Hook Form
- Headless UI
- React Icons
- Sonner notifications

### Backend

- Node.js
- Express
- MongoDB + Mongoose
- JWT via cookie authentication
- bcryptjs
- CORS, cookie-parser, morgan

### Deployment

- Docker Compose for local containerized setup

## Current Architecture

### Core model distinction

- Team: organizational grouping for users.
- Project: primary work container.
- Project Leader: project-level authority stored on the Project.
- Task: work item belonging to a project when relevant.

### Authorization model

The current backend uses project-aware authorization in addition to role-based checks:

- User roles still include ADMIN, TEAM_LEADER, ASSOCIATE, JUNIOR, and INTERN.
- Project access and delegation are validated using project membership and projectLeader membership in `server/utils/projectAccess.js`.
- Project tasks are not restricted by team-only assumptions; a user can be assigned a project task if they are a valid project member and pass the project delegation rules.

## Implemented Features

### Authentication

- Login/logout with JWT stored in an HTTP-only cookie
- Password change flow
- Registration and admin approval flow
- Google sign-in entry point using Firebase on the frontend and a backend route for account lookup/creation
- User approval / rejection / inactive status handling

### User management

- Admin approval workflow for pending users
- User activation/deactivation
- User profile updates
- Pending users listing
- User deletion by admin

### Roles and teams

- Fixed role enum: ADMIN, TEAM_LEADER, ASSOCIATE, JUNIOR, INTERN
- Team creation and team membership management
- Team leader assignment
- Team member movement and validation
- Team visibility based on authenticated user and team membership

### Projects

- Project creation with owner, projectLeader, teams, and members
- Cross-team project membership support
- Project update and archive flows
- Project access rules via projectLeader and member membership
- Project progress summary based on task stage counts

### Project leader and project membership

- Project Leader is stored on the Project model, not as a global user role
- A project leader must also be a project member
- Project membership can include users from multiple teams
- Project members are validated against participating teams or the project owner

### Task management

- Task creation with assignee, project, title, date, priority, stage, schedule fields, assets, and activities
- Single assignee model, with task reassignment/delegation handled by project or hierarchy rules
- Task duplication by admin
- Task trash/restore flows
- Task deletion and restoration operations
- Subtasks embedded in the task document
- Task priority values: high, medium, normal, low
- Task stage values: todo, in progress, completed

### Task assignment and delegation

- Task delegation uses project-aware rules when a task belongs to a project
- Project-level assignment checks verify the relevant member relationship and role ladder
- Delegation logic validates source/target project membership, role compatibility, and project leadership rules
- Non-project tasks still rely on the existing standalone hierarchy helper

### Task scheduling

- Planned start date
- Due date
- Estimated duration in working days
- Actual start date
- Actual completion date
- Overdue detection for unfinished tasks past due date
- Project progress calculation from task stage totals

### Task dependencies

- Explicit `TaskDependency` model with predecessorTask, successorTask, dependencyType
- Dependency summary as Depends On / Blocks
- Finish-to-Start semantics only (`FS`)
- Same-project restriction
- Self-dependency prevention
- Duplicate dependency prevention
- Cycle detection for dependency chains
- Dependency enforcement during task status transitions

### Activities and notifications

- Embedded task activity timeline with type, text, author, and timestamp
- Automatic activities for task start and completion
- Manual timestamped comments / updates
- Notification model for task events and read tracking
- Activity timeline available in task detail view

### Dashboard and reporting

- Dashboard statistics for task counts by status and priority
- Recent task list and summary data
- Project progress reporting

## Project-Centric Architecture

The current system is not organized around team-only task ownership.

Current project architecture:

- Team = organizational grouping
- Project = execution unit
- Project Leader = project-specific authority
- Members may come from different teams inside the same project
- Project tasks are validated with project membership and project leader rules

This is the key distinction from older team-centric assumptions. Team membership is still relevant, but it is no longer the sole constraint for project work.

## Current Task Flow

The implemented lifecycle is:

TODO -> IN_PROGRESS -> COMPLETED

Current enforced behavior:

- A task cannot move directly from TODO to COMPLETED.
- A task cannot start if one or more prerequisite tasks are incomplete.
- A task cannot complete if one or more prerequisite tasks are incomplete.
- Dependencies are treated as Finish-to-Start dependencies.
- Completed tasks are not reopened in the current flow.
- Validation is enforced in the backend, not only in the frontend.

## Task Dependencies

The codebase uses an explicit dependency model separate from `parentTask`.

Important differences:

- `parentTask` is used for task lineage/duplication context, not dependency ordering.
- `TaskDependency` is the actual dependency relationship.

Current dependency model:

- `predecessorTask`: the task that must finish first
- `successorTask`: the task that waits on the predecessor
- `dependencyType`: only `FS` is supported

Current validation rules:

- dependency must be within the same project
- task cannot depend on itself
- duplicate dependency is rejected
- dependency cycle is rejected
- a task cannot start or complete while an unfinished predecessor remains

## Task Scheduling

The project currently includes scheduling fields on both Task and Project models:

### Task schedule fields

- plannedStartDate
- dueDate
- estimatedDuration
- actualStartDate
- actualCompletionDate

### Scheduling behavior implemented

- planned start cannot be after due date
- estimated duration must be a positive number
- overdue is flagged when a task is not completed and the due date has passed
- project progress is calculated from task stage totals

CPM is implemented for project-level schedule analysis. Gantt views, resource scheduling, and automatic rescheduling are not implemented.

## Activities

Tasks include an embedded activity timeline.

Current activity behavior:

- System-generated activities are added when a task is started or completed
- Manual comments are added through the activity form
- Each activity includes author and timestamp
- Activity types currently supported include: assigned, started, in progress, bug, completed, commented
- Activity timeline is rendered in the task detail review screen

## Notifications

The app stores notification records in the `Notice` model.

Current notification behavior:

- notifications are created when tasks are assigned or duplicated
- notification records include recipients, task reference, text, notification type, and read tracking
- notification read state is tracked per user

## Current Implementation Status

| Area                   | Status   | Summary                                                                                               |
| ---------------------- | -------- | ----------------------------------------------------------------------------------------------------- |
| Stabilization          | COMPLETE | Core server and frontend are operating together with backend validation and current build/test checks |
| Authentication         | COMPLETE | Login, JWT cookie auth, password change, basic approval flow, Google sign-in integration path         |
| User Management        | COMPLETE | User create, approval, activation, profile update, deletion, pending-user flow                        |
| Team Management        | COMPLETE | Team creation, membership, visibility, and member movement exist                                      |
| Project Management     | COMPLETE | Projects, project leader, member validation, visibility, update, archive                              |
| Project Membership     | COMPLETE | Multi-team membership and project-scoped validation are implemented                                   |
| Task Management        | COMPLETE | Task create, update, assignment, trash, duplicate, restore, subtasks, assets                          |
| Task Scheduling        | COMPLETE | Scheduling fields and overdue/project progress logic exist                                            |
| Task Dependencies      | COMPLETE | Explicit dependency model, validation, and cycle protection exist                                     |
| Task Status Flow       | COMPLETE | TODO -> IN_PROGRESS -> COMPLETED flow is enforced in backend validation                               |
| Activities             | COMPLETE | Automatic and manual activities exist with timeline support                                           |
| Notifications          | COMPLETE | Notice model and read flow exist                                                                      |
| Dashboard              | COMPLETE | Dashboard statistics and recent task summaries exist                                                  |
| Algorithmic Scheduling | PARTIAL  | Project dependency ordering and CPM are implemented; resource optimization remains                    |

## Work Completed So Far

### Project Management

- Projects introduced as the primary work container
- Project Leader added as a project-specific authority
- Cross-team project membership supported
- Project-centric assignment and delegation implemented on the backend

### Task Scheduling

- Scheduling model added to task and project records
- Actual start and completion timestamps captured
- Project progress calculations implemented
- Overdue indicators introduced

### Task Dependencies

- Explicit dependency model added
- Same-project validation and cycle detection implemented
- Dependency-aware task start/complete logic added
- Dependency summary presented as Depends On / Blocks
- Kahn's Algorithm returns a project-scoped execution order
- Cycles are rejected by the ordering service rather than returning a partial order

### Status and activity flow

- Backend task lifecycle rules were centralized and validated
- Auto-generated task activities for start and completion were added
- Activity timeline and task detail status controls reflect current rules

## Remaining Work

### High Priority

- Final audit of all task mutation paths to ensure they use the same backend validation rules consistently
- UI polish for task detail and activity interactions
- Additional endpoint-level validation coverage for edge conditions and status transitions

### Algorithm / Advanced Scheduling

- Gantt-style view generation
- Resource optimization and workload balancing
- Gantt-style view generation
- Automatic scheduling engine

### Finalization

- Expand automated regression tests around remaining task and project flows
- Improve project and task UX consistency
- Documentation and deployment cleanup for production readiness

## Proposed Next Development Steps

### Next Session

Goal: continue validating the project-centric task flow after the dependency-order foundation.

Key tasks:

- audit remaining task update and activity endpoints for final consistency
- confirm dependency and status handling across project views and task detail actions
- add final test coverage for status transitions and dependency edge cases

### Following Session

Goal: expose the existing CPM and dependency-order results through the project UI.

Key tasks:

- display project duration and per-task ES, EF, LS, LF, and slack values
- show dependency order, dependency relationships, warnings, and multiple critical paths
- keep scheduling values sourced from the backend CPM and topological-order APIs

## Algorithmic Functionality

### Already Implemented

- schedule validation checks
- task dependency graph validation
- cycle detection for dependency creation
- project progress calculation
- overdue detection
- project-level adjacency-list graph construction
- Kahn's topological sort with cycle detection
- `GET /api/project/:id/dependency-order`
- CPM forward/backward passes with ES, EF, LS, LF, slack, and critical paths
- `GET /api/project/:id/cpm`

### Not Yet Implemented

- Gantt chart generation
- resource optimization
- automatic project scheduling or dependency-based sequencing algorithms

The advanced scheduling items above are explicitly not in the current implementation.

## How to Run

### Local development

1. Install dependencies in both folders:
   - `npm install` in the root client folder
   - `npm install` in the server folder
2. Start the backend from the server folder.
3. Start the frontend from the client folder.
4. Ensure MongoDB is available and environment variables are configured for the backend.

### Docker

From the project root:

```bash
docker compose up --build
```

This starts the frontend and backend services defined in `docker-compose.yml`.

## Summary

The current codebase is a functional project-centric task management system with role-based user management, team structure, project membership, task lifecycle enforcement, dependency validation, scheduling metadata, activity tracking, and dashboard reporting. It is not yet an algorithmic scheduling or planning engine, and the project is intentionally positioned before that advanced phase.

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

**Status: basic duration data implemented; advanced scheduling is missing.**

Tasks support estimated duration in working days, along with planned and actual dates. The system does not yet model estimated effort, remaining effort, story points, resource capacity, or working-time calendars.

### 7.6 Task dependencies

**Status: implemented for Finish-to-Start dependencies.**

`TaskDependency` stores predecessor-to-successor edges. The backend validates same-project membership, rejects self and duplicate dependencies, prevents cycles during creation, and blocks task status changes while prerequisites remain incomplete.

### 7.7 Graph representation

**Status: implemented for project-level ordering.**

The dependency-order service builds an in-memory adjacency list from the selected project's non-trashed tasks and dependency records. Kahn's Algorithm calculates indegrees, processes zero-indegree tasks, and returns a valid task order. Tasks and dependencies outside the selected project are ignored.

If the processed task count is less than the project task count, the service reports a cycle instead of returning a misleading partial order.

### 7.8 Project-level progress

**Status: implemented for stage-based progress.**

The dashboard and project details calculate progress from non-trashed project tasks by stage. Weighted progress based on effort or duration is not implemented.

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

**Status: basic task scheduling data implemented; advanced scheduling is missing.**

The app stores planned dates, due dates, estimated working-day duration, and actual task dates. It does not yet provide a scheduler, calendar, time-zone planning, capacity calculation, baseline schedule, or forecast completion date.

### 7.11 Algorithm input data

**Status: sufficient for dependency ordering; insufficient for advanced scheduling.**

The system has tasks, estimated duration, project-scoped dependency edges, and enough data for topological ordering. It still lacks the calendars, capacity, effort, and scheduling assumptions needed for a critical path or resource-constrained schedule.

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

**Fit:** Implemented in `server/utils/cpm.js` using the project dependency graph and estimated task durations. It deliberately does not calculate resources, calendars, or automatic rescheduling.

### 11.2 Topological Sort / Kahn's Algorithm

**Problem solved:** Produces a valid execution order for dependency-linked tasks and detects cycles when a complete ordering cannot be generated.

**Required data:** Tasks and directed predecessor/successor edges.

**Fit:** Implemented as the project-level dependency-order foundation. It does not calculate dates, durations, critical paths, or resource assignments.

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

The dependency-order and CPM algorithms are now implemented. Continue with advanced scheduling only after validating this foundation.

First build a realistic project and scheduling foundation:

1. Add Projects and connect Tasks to Projects.
2. Add project ownership, members, lifecycle status, start date, and deadline.
3. Add task planned start, due date, estimated duration, effort, and actual completion data.
4. Add explicit task dependencies with cycle validation.
5. Add project progress and schedule calculations.
6. Add basic user capacity and availability only if resource-aware scheduling is required.
7. Build a dependency graph from validated project data.
8. Extend the CPM result into a user-facing schedule analysis view.
9. Add resource and calendar assumptions only when the product requires advanced scheduling.

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

| Method   | Endpoint                        | Access                 | Current purpose                                                      |
| -------- | ------------------------------- | ---------------------- | -------------------------------------------------------------------- |
| `GET`    | `/project`                      | Authenticated          | List projects visible to the current user.                           |
| `POST`   | `/project`                      | Admin                  | Create a project owned by the authenticated administrator.           |
| `GET`    | `/project/:id`                  | Authorized user        | Return project details and its non-trashed tasks.                    |
| `GET`    | `/project/:id/dependency-order` | Authorized user        | Return a Kahn topological order for the project's non-trashed tasks. |
| `GET`    | `/project/:id/cpm`              | Authorized user        | Return ES, EF, LS, LF, slack, project duration, and critical paths.  |
| `PUT`    | `/project/:id`                  | Project owner or Admin | Update project metadata and participants.                            |
| `DELETE` | `/project/:id`                  | Project owner or Admin | Archive the project by setting status to `archived`.                 |

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
