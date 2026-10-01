# Task Management System

Technical and functional documentation for the implementation currently in this repository. The source code is authoritative where behavior differs from older notes or UI labels.

## Contents

- [1. Project Overview](#1-project-overview)
- [2. Core Domain Model](#2-core-domain-model)
- [3. Roles and Permissions](#3-roles-and-permissions)
- [4. Team Management](#4-team-management)
- [5. Project Management and Project Leader](#5-project-management-and-project-leader)
- [6. Task Management](#6-task-management)
- [7. Project Workload and Task Allocation Control](#7-project-workload-and-task-allocation-control)
- [8. Workload Window and Edge Cases](#8-workload-window-and-edge-cases)
- [9. Workload Monitoring](#9-workload-monitoring)
- [10. Task Assignment Validation](#10-task-assignment-validation)
- [11. Assignment Date and Calendar Rules](#11-assignment-date-and-calendar-rules)
- [12. Stages, Activities, and Subtasks](#12-stages-activities-and-subtasks)
- [13. Task Assets](#13-task-assets)
- [14. Notifications](#14-notifications)
- [15. Authentication and Registration](#15-authentication-and-registration)
- [16. Authorization and Security](#16-authorization-and-security)
- [17. Dashboard and Task Views](#17-dashboard-and-task-views)
- [18. Trash, Restore, and Deletion](#18-trash-restore-and-deletion)
- [19. Dependencies and Scheduling Analysis](#19-dependencies-and-scheduling-analysis)
- [20. Architecture and Repository Structure](#20-architecture-and-repository-structure)
- [21. Database Models](#21-database-models)
- [22. REST API Reference](#22-rest-api-reference)
- [23. Environment Variables](#23-environment-variables)
- [24. Local Development](#24-local-development)
- [25. Docker](#25-docker)
- [26. Development Workflow](#26-development-workflow)
- [27. Testing](#27-testing)
- [28. Current Limitations and Known Issues](#28-current-limitations-and-known-issues)
- [29. Business Rules Summary](#29-business-rules-summary)
- [30. Planned / Future Work](#30-planned--future-work)

## 1. Project Overview

Task Management System is a web application for coordinating organizational users, cross-team projects, task assignment, work progress, and task dependencies. It addresses the need to separate organizational reporting lines from project delivery: teams group people, while projects define a specific body of work and its own leader and members.

The system is intended for administrators who configure users, teams, and projects; project leaders who distribute and monitor project work; and team members who receive tasks, update task progress, record activities, and work through subtasks.

Tasks may be standalone or associated with a project. Project tasks have one current assignee and are constrained by project membership and workload checks. A task can also contain embedded activities and checklist subtasks, and can participate in Finish-to-Start dependencies with other tasks in the same project.

Authentication uses email/password or the frontend Google sign-in flow. Successful normal logins receive a JWT in an HTTP-only cookie. API routes apply server-side authentication and authorization; the frontend's route guards are for navigation and are not the security boundary.

## 2. Core Domain Model

```mermaid
graph TD
    Admin[Admin / system administrator] --> Users[Users]
    Admin --> Teams[Teams]
    Admin --> Projects[Projects]
    Teams --> TeamLeader[Team Leader]
    Teams --> TeamMembers[Organizational members]
    Projects --> ProjectLeader[One Project Leader]
    Projects --> ProjectMembers[Explicit Project Members]
    ProjectMembers --> Tasks[Project Tasks]
    Tasks --> Subtasks[Embedded Subtasks]
    Tasks --> Activities[Embedded Activities]
    Tasks --> Notices[Assignment-related Notifications]
    Tasks --> Dependencies[TaskDependency documents]
```

- **Admin:** system-level account with the `isAdmin` flag; administers users, teams, and projects. Admin is not intended to be a team member.
- **User:** account with a global role, approval/activation state, and optional team reference.
- **Team:** organizational grouping with one Team Leader and members. It is not the project task-allocation boundary.
- **Project:** body of work, with an owner, one project-specific leader, participating teams, explicit members, lifecycle status, and date fields.
- **Project Leader:** the user referenced by `Project.projectLeader`. This is a project relationship, not a separate global role.
- **Project Member:** a user explicitly listed in `Project.members`; project members may represent multiple participating teams.
- **Task:** individual work item, optionally linked to a project, with one current assignee, creator, priority, stage, dates, embedded activity history and subtasks.
- **TaskDependency:** separate document representing a directed Finish-to-Start relationship between tasks.
- **Notice:** notification document addressed to one or more users with per-user read tracking.

The distinction between the two organizational concepts is central:

```text
Team   = organizational membership
Project = delivery scope, project leader, project membership, project tasks
```

## 3. Roles and Permissions

The `User.role` enum is `ADMIN`, `TEAM_LEADER`, `ASSOCIATE`, `JUNIOR`, or `INTERN`. Separately, `User.isAdmin` is a boolean checked by administrator middleware. Backend checks generally use `isAdmin`; a role label alone should not be treated as proof of administrative authority.

| Role          | Organizational meaning                                                                | Team membership                                                                                                              | Can be Project Leader?                                                                                                                        | Task receipt and delegation rules                                                                                                                                                                                                                       |
| ------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ADMIN`       | System administration role; normal admin authority is represented by `isAdmin: true`. | Admin accounts are excluded from the unassigned list and `role: ADMIN` is rejected by the team-members update controller.    | The participant validator does not prohibit an approved active admin from being a project member/leader; project leader is not a global role. | An admin can create project tasks only for that project's leader through the create-task controller. Standalone delegation is restricted by the hierarchy helper to a Team Leader who has a team. Admin deletion and duplicate permissions are broader. |
| `TEAM_LEADER` | Leads one organizational team.                                                        | Created as the unique leader of a team and included in that team's member list. Cannot be moved by the move-member endpoint. | Yes, if approved, active, and included as a project member.                                                                                   | Can receive tasks. In standalone delegation, may delegate to lower-ranked users in the same team. Project delegation follows project membership and project-specific delegation rules.                                                                  |
| `ASSOCIATE`   | Organizational contributor above Junior and Intern in the delegation hierarchy.       | May be a team member.                                                                                                        | Yes, if approved, active, and included as a project member.                                                                                   | Can receive tasks; can delegate to Junior or Intern under the standalone same-team rule or when both users are project members in the same project.                                                                                                     |
| `JUNIOR`      | Organizational contributor above Intern in the delegation hierarchy.                  | May be a team member.                                                                                                        | Yes, if approved, active, and included as a project member.                                                                                   | Can receive tasks; can delegate to Intern under the applicable same-team or project-membership rule.                                                                                                                                                    |
| `INTERN`      | Entry-level organizational contributor in the delegation hierarchy.                   | May be a team member.                                                                                                        | Yes, if approved, active, and included as a project member.                                                                                   | Can receive tasks; cannot delegate to a lower role under the implemented hierarchy.                                                                                                                                                                     |

Project Leader authority overlays the user's global role. The project task delegation utility permits a project leader to delegate to non-Admin project members; a non-leader Associate can delegate to a Junior or Intern project member, and a non-leader Junior can delegate to an Intern project member. Self-assignment is accepted only for the Project Leader. These checks do not make a Team Leader automatically a Project Leader.

| Action                           |                                                              Admin (`isAdmin`) |                     Project Leader |                                  Team Leader |                                    Associate |                                       Junior |                                       Intern |
| -------------------------------- | -----------------------------------------------------------------------------: | ---------------------------------: | -------------------------------------------: | -------------------------------------------: | -------------------------------------------: | -------------------------------------------: |
| Create user / approve users      |                                                                            Yes |                                 No |                                           No |                                           No |                                           No |                                           No |
| Create or administer teams       |                                                                            Yes |                                 No |                                           No |                                           No |                                           No |                                           No |
| Create project                   |                                                                            Yes |                                 No |                                           No |                                           No |                                           No |                                           No |
| Manage project metadata          |                                                                            Yes |               Yes, for own project |                 No, unless also owner/leader |                 No, unless also owner/leader |                 No, unless also owner/leader |                 No, unless also owner/leader |
| View project                     |                                                                   All projects |                        Own project |           Depends on project/team visibility |        Depends on membership/team visibility |        Depends on membership/team visibility |        Depends on membership/team visibility |
| Create project task              |                              Admin create path; target is the project's leader |      Yes, subject to project rules |                  Only if also project leader |                  Only if also project leader |                  Only if also project leader |                  Only if also project leader |
| Delegate project task            | Only to project leader in create path; delegate endpoint applies its own check | To valid non-Admin project members |                        Role/member-dependent |             To Junior/Intern project members |                    To Intern project members |                                           No |
| Create standalone task           |             Hierarchy check still applies; target must satisfy standalone rule |       No special project authority |                 Hierarchy and same-team rule |                 Hierarchy and same-team rule |                 Hierarchy and same-team rule |                 No lower role to delegate to |
| Access task detail/edit/activity |                                                                            Yes |               Tasks in led project | Only if assignee, unless also project leader | Only if assignee, unless also project leader | Only if assignee, unless also project leader | Only if assignee, unless also project leader |
| Delete project task              |                                                                            Yes |               Yes, for own project |               No, unless also Project Leader |                                           No |                                           No |                                           No |
| Delete project                   |                                                                            Yes |                                 No |                                           No |                                           No |                                           No |                                           No |

The table summarizes role-based paths, not every combination of overlapping relationships. For example, a user who is both an assignee and a Project Leader receives the permissions from both relationships. Actual assignment checks are described in [Task Assignment Validation](#10-task-assignment-validation).

## 4. Team Management

Teams are created by an administrator with a name and one user whose role is `TEAM_LEADER`, whose account is approved and active, and who is not already assigned to a team. The new leader is set as both `Team.leader` and a member, and the user's `team` field is updated.

Team membership is represented in both `User.team` and `Team.members`. The team management UI supports assigning/removing members and moving eligible members between teams. The move-member endpoint accepts `ASSOCIATE`, `JUNIOR`, and `INTERN`; Team Leaders and Admin-role users cannot be moved through that endpoint. A team must have exactly one Team Leader; additional Team Leaders cannot be added as ordinary members.

Administrators can see all teams plus an unassigned-member list. That list contains approved, active users with no team and excludes `isAdmin` users and `role: ADMIN`. Admin is a system-level account, not an organizational team member. The member-update controller also rejects the `ADMIN` role. Team creation requires an active leader. Note that the member-update lookup checks approval but does not include `isActive` in its database query, despite returning an error message that says members must be active; see limitations.

Visibility:

- Admins can list all teams and eligible unassigned members.
- A Team Leader sees their own team only when they are the recorded leader.
- A non-admin team member sees their own team only when the team contains them.
- A non-admin without a team receives an empty team list.
- The user-list API returns approved users visible under the same organizational rules; it is distinct from the team-record API.

Only admins can create/delete teams, update membership, or use the move-member API. Deletion is rejected if the team is referenced by any project or if non-leader member references remain. On successful deletion, the leader's `User.team` is cleared. Membership and deletion updates are not wrapped in MongoDB transactions.

## 5. Project Management and Project Leader

Projects are the primary work-management unit and are not limited to one Team. The Project stores participating Team references and a separate explicit `members` array. Its Project Leader may lead project work with members from any participating team.

```text
Project A
├── Project Leader
├── Associate A — Team A
├── Junior B    — Team B
├── Intern C    — Team C
└── Associate D — Team D
```

Project fields include `name`, `description`, `owner`, `projectLeader`, `teams`, `members`, `status`, planned start/deadline, and actual start/completion. Status values are `planning`, `active`, `completed`, and `archived`.

Project creation is Admin-only. The owner is set to the authenticated administrator. Participant validation requires an approved, active owner; existing participating teams; approved, active members; and an approved, active Project Leader who is also an explicit project member. Members must belong to one of the participating teams or be the owner. The owner exception permits the project owner to participate without team membership. Team membership by itself does not make someone eligible to receive a project task: the assignee must be in the explicit project member list.

The Admin or current Project Leader can update project metadata and participants. The owner can also manage project metadata according to `canManageProject`. When a non-Admin owner who is not the Project Leader edits, the controller preserves the project's teams and existing members from other teams and constrains requested membership changes to that user's team. The Project Leader can distribute work across the project's explicit members regardless of their home team, subject to delegation and workload checks.

Project visibility allows Admin, owner, Project Leader, explicit project member, or user belonging to one of the project's teams. This visibility does not automatically grant access to every task. For non-admin/non-leader project detail responses, task results are filtered by assignee; Team Leaders receive tasks assigned to visible team members. Task detail middleware permits only Admin, current assignee, or Project Leader, not project owner by owner status alone.

Project deletion is Admin-only and permanently removes the project tasks, task dependencies involving those tasks, related notices, user task references, and parent-task references. There is no soft-archive operation in the controller despite the UI/API name `archiveProject`; it performs permanent deletion.

### Project Leader versus Team Leader

A Team Leader represents the user's organizational team relationship. A Project Leader is a field on an individual Project. A person can lead a project without being a Team Leader, and being a Team Leader alone does not grant project task deletion or project task management. Project leadership is validated per project and requires explicit project membership.

## 6. Task Management

A Task has one current assignee, one creator, an optional project, an optional parent task, a priority, a stage, assignment/schedule dates, embedded activities, and embedded subtasks. Project tasks are assigned only to explicit project members. Standalone tasks continue to use the organizational role/team delegation hierarchy.

The task UI includes a board view, list view, stage-filtered routes, task detail, status actions, activity/timeline, dependency management, and a subtask checklist. The Admin can create standalone tasks from the general Tasks page. Admins and Project Leaders have a Create Task action in eligible project details. Task editing is available from task controls, but backend task access rules still apply.

Task lifecycle operations:

- **Create:** backend derives the assignment timestamp; validates project membership/authority and, for project tasks, workload limits.
- **Assign/reassign:** the current assignee is a single User reference. Delegation changes the assignee, refreshes the assignment timestamp, records an `assigned` activity, and creates a notice for the new assignee.
- **Edit:** updates title, priority, stage, planned/due dates, estimated duration, and actual date values. It does not accept or change the assignment date. A requested stage change is validated by the transition utility.
- **Complete:** the task must be in `in progress`; predecessor tasks must be complete. The completion timestamp is recorded if missing.
- **Trash/restore/delete:** see [Trash, Restore, and Deletion](#18-trash-restore-and-deletion).
- **Duplicate:** Admin-only. Copies the task's core fields, legacy assets and subtasks, links it to the source through `parentTask`, and gives the duplicate a new server-generated assignment date. The duplicate endpoint does not run workload allocation validation.

Task model fields:

| Field                                     | Purpose                                                                       |
| ----------------------------------------- | ----------------------------------------------------------------------------- |
| `title`                                   | Required task title.                                                          |
| `createdBy`                               | Required reference to creator User.                                           |
| `assignee`                                | Required reference to one current assignee User.                              |
| `project`                                 | Optional Project reference; indexed.                                          |
| `parentTask`                              | Optional Task reference for duplicate/delegation lineage, not a dependency.   |
| `date`                                    | Assignment timestamp; backend sets it on create, duplicate, and reassignment. |
| `plannedStartDate`, `dueDate`             | Optional planned schedule dates.                                              |
| `estimatedDuration`                       | Optional positive numeric working-day duration.                               |
| `actualStartDate`, `actualCompletionDate` | Optional lifecycle timestamps.                                                |
| `priority`                                | `high`, `medium`, `normal`, or `low`; defaults to `normal`.                   |
| `stage`                                   | `todo`, `in progress`, or `completed`; defaults to `todo`.                    |
| `activities`                              | Embedded event/comment records.                                               |
| `subTasks`                                | Embedded title/completed checklist records.                                   |
| `assets`                                  | Legacy string array; no user-facing Add Asset functionality remains.          |
| `isTrashed`                               | Soft-delete flag; defaults to `false`.                                        |
| `createdAt`, `updatedAt`                  | Mongoose timestamps.                                                          |

## 7. Project Workload and Task Allocation Control

Project task assignment has two separate server-enforced checks: hard counts for HIGH/MEDIUM priority and a weighted workload capacity for every priority. These rules apply to project task creation and delegation. They are not just frontend warnings.

The configuration in `server/utils/workload.js` is:

| Priority | Workload points per task | Hard count limit within the window |
| -------- | -----------------------: | ---------------------------------: |
| HIGH     |                        5 |                                  1 |
| MEDIUM   |                        3 |                                  3 |
| NORMAL   |                        2 |                               None |
| LOW      |                        1 |                               None |

The maximum workload is **20 points per project member per project** in the active allocation window. There is no fixed count ceiling for NORMAL or LOW, but both contribute to the 20-point limit. HIGH and MEDIUM also contribute points in addition to their hard count restrictions.

For a project member, eligible workload is calculated as:

```text
Current Workload = sum(weight(priority(task)))
                   for eligible tasks in this project/window/member

Projected Workload = Current Workload + weight(new task priority)
```

An assignment is rejected if the new HIGH count would exceed 1, the new MEDIUM count would exceed 3, or the projected weighted workload would exceed 20. Exactly 20 points is allowed. The hard count rule is checked first; if it fails, that is the reported rejection reason.

Examples:

```text
1 HIGH + 3 MEDIUM + 4 NORMAL + 1 LOW
= 5 + 9 + 8 + 1
= 23 points  -> over capacity (also exceeds the point ceiling)

3 MEDIUM + 5 NORMAL + 1 LOW
= 9 + 10 + 1
= 20 points  -> allowed, assuming no other active-window tasks
```

The dashboard status thresholds are based on `totalWorkload / 20`:

| Status       | Threshold                               |
| ------------ | --------------------------------------- |
| `AVAILABLE`  | Zero workload or below 60% of capacity. |
| `NEAR_LIMIT` | At least 60% and below 86%.             |
| `FULL`       | At least 86% and below 100%.            |
| `OVERLOADED` | At or above 100%.                       |

An assignment can be accepted when the projected total is exactly capacity (20). A later overview may label that existing total `OVERLOADED` because status uses `ratio >= 1`; `FULL` means the interval from 86% up to but not including 100%.

## 8. Workload Window and Edge Cases

The allocation window is rolling, not a calendar month or fixed fortnight. The start boundary is calculated by subtracting `allocationPeriodDays` (15) from the current server date using JavaScript `Date.setDate`; an assignment timestamp is counted if it is greater than or equal to that boundary and less than or equal to `now`.

The window date is selected by `getLatestAssignmentDate`:

1. Use the most recent valid activity whose type is `assigned`.
2. If there is no valid `assigned` activity date, fall back to `Task.date`.
3. If neither exists or the date is invalid, exclude the task.

A counted task must match the project and assignee, be inside the window, and not be trashed. All stages count, including completed tasks. Overdue status does not remove a task from allocation; the overview separately counts overdue tasks only when the task is not completed and its due date is before now.

Consequences of the current implementation:

- **Reassignment:** delegation changes the current assignee and refreshes `Task.date`; it also appends an `assigned` activity. The workload calculation uses the latest assignment activity for window placement. The old assignee no longer owns the task for current workload because there is one current `assignee` field.
- **Completed tasks:** still consume workload while their latest assignment date remains in the window.
- **Trashed tasks:** excluded.
- **Restored tasks:** eligible again if the current assignee/project and assignment date still meet the window test.
- **Normal/low count:** there is no independent count limit, only the weighted cap.
- **Duplicate:** creates a fresh assignment date but does not validate workload before creation. This is an implementation gap.

The Task activity subdocument currently declares its date default as a `Date` object rather than a default-producing function. Since workload uses assignment-activity dates before `Task.date`, an assignment activity created without an explicit date can receive a stale process-start default. That can misclassify assignment age for workload-window calculations. The controller does explicitly set `Task.date` to server time, but the workload helper prefers the activity date when present. This is a known issue, not an intended rule.

## 9. Workload Monitoring

`GET /api/project/:id/workload` returns a workload summary to the project leader or Admin. It contains allocation period, capacity, project, member summaries, and, when a `memberId` query is supplied, that member's summary. Supplying `priority` with a member previews whether one additional task would be accepted. Member summaries include identity, team, per-priority task counts, workload points, remaining points, percentage, status, and overdue task count.

The project details UI requests workload for the current project and displays workload information for authorized views; the task form displays a workload preview after a project member and priority are selected. The API endpoint `GET /api/project/workload-overview` aggregates project and member workload information for Admins, including counts of members near limit/at capacity and members with overdue tasks. The current frontend does not provide a dedicated Admin-wide workload-overview page/query, so that endpoint is available to API clients but is not a standalone dashboard screen.

## 10. Task Assignment Validation

Task creation is authenticated and the server applies checks in the controller. Frontend visibility and workload preview improve the workflow but do not authorize a request.

Project task creation path:

1. **Authentication:** `protectRoute` requires a valid JWT cookie.
2. **Creator and target:** both users must exist.
3. **Schedule fields:** planned start and due date cannot be before the current server-local day; planned start cannot be after due date; duration must be positive when supplied.
4. **Project lookup:** project must exist.
5. **Creator authority:** an Admin may create the task for the project's Project Leader; otherwise the creator must be the Project Leader and pass project delegation rules.
6. **Target membership:** target must be an explicit project member.
7. **Priority count limit:** HIGH count cannot exceed one and MEDIUM cannot exceed three in the rolling window.
8. **Workload capacity:** projected weighted points cannot exceed 20.
9. **Persistence and notification:** task is created with server assignment time, followed by a notice for the assignee.

Standalone task creation uses `canDelegateTo`: the source and target must meet the role hierarchy and, for non-admin users, belong to the same non-null team. An Admin delegation target must be a Team Leader with a team.

Task delegation also requires task access, then applies the project or standalone delegation rules. Project delegation validates workload against the target member before changing the assignee. The task update endpoint validates schedule fields and stage transitions but does not permit a client to overwrite `Task.date`. Duplicate and general priority edits do not run the workload assignment validator; this is a known gap.

Backend validation and authorization are the enforcement layer. A caller can alter browser requests, so disabled controls or client-side preview must never be treated as a security boundary.

## 11. Assignment Date and Calendar Rules

### Assignment date

The Task form displays **Assignment Date** populated with the current local calendar date and disables the field. On create, the frontend omits this value from the request. The backend sets `Task.date` to the current server timestamp; client-supplied historical or future `date` values are ignored. Task edits do not change the original assignment date. Reassignment and task duplication establish a new server timestamp.

`Task.date` is a timestamp, not a due date. The date shown in a browser can be rendered in local time; the database stores a server-generated date/time instant.

### Planned dates and past-date restriction

The task creation/edit UI sets the native date input `min` to the browser's local today for planned start and due date. Project creation/edit date inputs also set that minimum. The backend independently rejects past **task** planned-start and due dates using the server's local calendar day, and checks that planned start is on or before due date. The Mongoose Task validation also rejects reversed planned start/due dates.

Project planned start/deadline have a browser input minimum but no equivalent server-side past-date validation in the project controller. The assignment timestamp is server-generated and does not use a user-editable calendar field. No past-date restriction is applied to actual start or actual completion timestamps.

Date-only strings such as `YYYY-MM-DD` are parsed by JavaScript as UTC before the validator extracts local date components. In a non-UTC server timezone, this can shift the interpreted calendar day; configure and test server timezone behavior for the deployment environment.

## 12. Stages, Activities, and Subtasks

### Task stages

The schema values are `todo`, `in progress`, and `completed` (UI labels are commonly uppercase). The transition utility permits:

```text
todo -> in progress -> completed
```

It rejects direct `todo -> completed`, reopening a completed task, and starting/completing when any predecessor is not completed. Entering `in progress` records `actualStartDate` if missing; entering `completed` records `actualCompletionDate` if missing. For project tasks, the controller sets project `actualStart` on first task start and sets project `actualCompletion` when every non-trashed project task is complete.

This is not enforced for every possible write path: task creation accepts a supplied enum stage and task duplication copies the existing stage. The activity endpoint's `assigned` action directly resets stage to `todo`. These are current implementation details; use the status transition actions for normal workflow.

### Activities and timeline

Activities are embedded in the Task document; there is no separate Activity collection. Every activity can contain `type`, text (`activity`), a `date`, and an optional `by` User reference.

Implemented activity types and behavior:

| Type          | Behavior                                                                                                                                      |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `assigned`    | Assignment/delegation record. The activity endpoint's assigned action resets stage to `todo`; create/delegate also create assignment history. |
| `started`     | Moves task to `in progress` through the transition validator.                                                                                 |
| `in progress` | Moves task to `in progress` through the transition validator.                                                                                 |
| `bug`         | Also moves task to `in progress` through the transition validator; it is not a separate task stage.                                           |
| `completed`   | Requests transition to completed and checks predecessors.                                                                                     |
| `commented`   | Records ordinary activity text without changing task stage.                                                                                   |

The UI offers activity/timeline interaction to users who can access the task. Activity entries cannot be edited or deleted through a dedicated API. Status event activities are added by transition handling; assignment and delegation append assigned activities; ordinary text becomes `commented`. No notice is generated for every activity/status change.

### Subtasks

Subtasks are embedded checklist items with a required trimmed title (maximum 200 characters) and `completed` boolean (default `false`). Users with access to the parent task can add a subtask and toggle its completion. The task details page displays the checklist and completion state. There is no subtask delete endpoint, assignee, date, priority, dependency, or independent lifecycle. Completing a subtask does not change its parent task stage or project progress.

## 13. Task Assets

The user-facing Add Asset feature has been removed: task forms no longer include a file picker, and task cards, lists, and details no longer show asset counts or a gallery. There is no asset upload endpoint in the API.

For backward compatibility, the Task schema still has a legacy `assets: [String]` field and the Admin duplicate controller copies that field. Normal task creation/editing does not accept or update assets. Existing database values and static sample data may remain, but users cannot add or manage assets through the current UI. Cloudinary and Multer packages remain in the server dependency list but are not wired to a current asset route/controller.

## 14. Notifications

Notifications are `Notice` documents. The schema field named `team` is actually an array of recipient User IDs; `isRead` is an array of User IDs that have read that notice. The notice can reference a task, has text and a `notiType` (`alert` or `message`), and has Mongoose timestamps. Current creation paths use the default `alert` type.

Current task notices are generated for task creation/assignment, delegation to a new assignee, and task duplication. The notice is addressed to the assignee. Status changes and comments do not generate a notice by default.

`GET /api/user/notifications` returns unread notices addressed to the authenticated user. The notification panel displays up to five items at a time, can open a notice, mark one as read, or mark all as read. Read state is tracked per user. There is no separate notification router; notification operations are under `/api/user`.

## 15. Authentication and Registration

### Email/password flow

1. The user submits email and password to `POST /api/user/login`.
2. The server looks up the email and checks pending/rejected/inactive state for non-admin accounts.
3. The server compares the submitted password with the bcrypt hash.
4. On success, the server signs a JWT containing the user ID with a one-day expiry and places it in the `token` HTTP-only cookie.
5. RTK Query sends requests with credentials; `protectRoute` verifies the cookie and loads the User's ID, role, team, and admin flag.
6. Logout clears the cookie. The frontend also stores profile data in local storage; the JWT itself is not stored there.

Passwords are hashed by the User Mongoose pre-save hook with bcryptjs using 10 salt rounds.

### Registration and approval lifecycle

```text
Public registration -> pending + inactive -> Admin review
                                   |                  |
                                rejected          approved + active
                                                       |
                                                      login
```

- **Normal registration:** requires name, email, password, role, and title. Public registration rejects `ADMIN`; new users are pending and inactive.
- **Admin-created user:** the same registration controller is mounted behind Admin middleware; the new account is approved and active immediately.
- **Approval/rejection:** Admins can set a user to `approved`, `rejected`, or `pending`. Approval activates the account; other statuses deactivate it.
- **Activation/deactivation:** Admins can change account activation. A Team Leader may change activation for eligible users in the same team, but cannot change their own state or another Team Leader's state.
- **Reactivation:** setting `isActive` true for a pending user also changes its status to approved. Reactivating rejected users through the activation route does not itself change the rejected status; approval endpoint is the explicit status workflow.
- **Google registration:** Firebase popup sign-in occurs in the frontend. The client posts identity fields to `/api/user/google`. A new Google account is created pending/inactive; an existing approved, active account receives a JWT. Pending/rejected/inactive accounts are rejected.

The Google endpoint does not verify a Firebase ID token server-side; it trusts posted identity fields. This is a security limitation, not equivalent to a verified OAuth backend flow.

### Password changes and recovery

Authenticated users can submit a new password to `PUT /api/user/change-password`; the endpoint does not request/verify the current password. The login page displays “Forget Password?” but there is no password-reset workflow/API.

## 16. Authorization and Security

- Protected API endpoints use `protectRoute`, which verifies the JWT from the HTTP-only `token` cookie and attaches a limited identity record to `req.user`.
- Admin-only routes use `isAdminRoute`, which checks `req.user.isAdmin`.
- Task access permits Admin, current assignee, or the Project Leader of the task's project. Task creator and project owner do not receive task access solely through those relationships.
- Task deletion is narrower: Admin or the Project Leader of the task's project. Standalone-task deletion is therefore Admin-only.
- Project visibility, management, membership, and task assignment are checked in project utilities/controllers.
- Team operations are Admin-only except read access and the controller-authorized activation route.
- The frontend also checks local user state for routes and controls, but API checks are authoritative.
- Cookies are HTTP-only, expire after one day, and set `secure` unless `NODE_ENV` is exactly `development`. `SameSite` is `none` only in production and otherwise `lax`. Express CORS is configured for a fixed list of local origins with credentials enabled; deployment origins must be configured in code.

Known security gaps include the unverified Google identity payload, password changes without current-password confirmation, and the middleware's failure to re-check `status`/`isActive` on every request. Login blocks inactive users, but an already-issued valid JWT is not immediately revoked when an account is deactivated. The startup default-admin helper also resets the password for an existing bootstrap account; see [Known Issues](#28-current-limitations-and-known-issues).

## 17. Dashboard and Task Views

### Dashboard

The Admin and non-admin users use the same dashboard UI with role-dependent API data. The dashboard displays total tasks, counts by stage, priority chart data, the latest ten tasks, and an Admin-only approved/active user summary. Admin task counts cover all non-trashed tasks. Non-admin counts cover tasks assigned to the user plus tasks belonging to projects they lead. It does not provide a dedicated workload-overview screen.

The dashboard also initializes an n8n chat widget using a webhook URL hard-coded in the client.

### Task list

The Tasks page provides Board View and List View tabs. Routes can filter by the implemented task stages (`todo`, `in progress`, `completed`). The task API also accepts `isTrashed` to switch between active and trashed tasks. There is no functional global text search or priority filter in the task list; the navbar search field is a visual control only.

### Task detail

Task Details displays priority, stage, schedule values, assignee, subtasks, task dependencies, and activity/timeline. Users with task access can use the available status actions, add comments/activities, manage dependencies through the current UI, and add/toggle subtasks. There is no user-facing asset section.

### Projects and teams

Projects lists visible projects; Admins can create them. Project Details provides project metadata, progress, team/member editing (subject to authority), project tasks, workload data when authorized, dependency order, and navigation to Scheduling Analysis. Teams provides organizational views and, for Admins, team creation, search, membership movement, account status controls, and guarded team deletion. The team search input is functional; the navbar's general search is not.

## 18. Trash, Restore, and Deletion

Moving a task to trash sets `isTrashed: true`; ordinary task lists, project progress, workload queries, CPM, and dependency-order task queries exclude trashed tasks where implemented. Task dependencies are not removed just because a task is trashed.

The Trash page supports restoring or permanently deleting individual items. Admins also have Restore All and Delete All controls.

- **Move to trash:** Admin or Project Leader of the task's project. Standalone task trashing is Admin-only.
- **Restore one:** task-access rules (Admin, assignee, or Project Leader) apply.
- **Restore all:** Admin-only; bulk task actions are restricted to Admin.
- **Delete one permanently:** Admin or Project Leader of the task's project; standalone deletion is Admin-only.
- **Delete all permanently:** Admin-only.

Permanent deletion removes dependency edges involving the task, notices referencing it, user task-reference entries, and parent-task references from remaining tasks. Project deletion performs similar cleanup for its tasks. These multiple-document operations are not transactional.

## 19. Dependencies and Scheduling Analysis

### Dependency model

Dependencies are separate `TaskDependency` documents. The only supported type is `FS` (Finish-to-Start): a predecessor must be completed before its successor may start or complete. Dependencies are project-scoped; creation rejects missing tasks, cross-project relationships, self-dependency, duplicates, unsupported types, and cycles. A unique compound index also prevents duplicate predecessor/successor pairs.

The Task Details page can add and remove dependencies. The server validates dependency graph constraints and the transition utility checks unfinished predecessors when moving tasks through status transitions.

### Kahn topological sort

`topologicalSortTasks` in `server/utils/taskDependencies.js` orders the selected project's non-trashed tasks so predecessors appear before successors. It detects cycles when fewer than all task nodes can be processed. For a graph with `V` tasks and `E` edges, traversal is `O(V + E)`.

### Critical Path Method

`calculateCriticalPath` in `server/utils/cpm.js` uses task `estimatedDuration` in working days and the topological order to calculate:

```text
Forward pass:
  ES = maximum EF of predecessors (0 when none)
  EF = ES + duration

Project duration = maximum EF among tasks

Backward pass:
  LF = project duration for terminal tasks,
       otherwise minimum successor LS
  LS = LF - duration

Slack = LS - ES
```

Zero-slack tasks are critical. The API can return multiple critical paths. Missing/invalid durations or a cyclic dependency graph prevents CPM calculation. The Scheduling Analysis page displays backend-generated values, dependency order, critical paths, and warnings; it does not compute the schedule in the browser.

This is dependency-aware analysis, not a Gantt chart or automatic scheduler. No holidays, work-hour calendars, resource leveling, or automatic date shifting are applied.

## 20. Architecture and Repository Structure

```text
Browser (React / Vite)
        | RTK Query, cookie credentials
        v
Express REST API (/api)
        | controllers, middleware, domain utilities
        v
MongoDB (Mongoose models)
```

### Technology stack

**Frontend:** React 18, Vite, React Router, Redux Toolkit, RTK Query, Tailwind CSS, Headless UI, React Hook Form, Recharts, React Icons, Sonner, Moment, and Firebase client SDK.

**Backend:** Node.js, Express 4, ES modules, MongoDB, Mongoose 8, JWT (`jsonwebtoken`), bcryptjs, cookie-parser, CORS, Morgan, and dotenv.

Cloudinary and Multer packages are present in server dependencies but are not connected to a current asset upload endpoint.

### Important repository structure

```text
TaskMngmt/
├── client/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── Dockerfile
│   ├── nginx.conf
│   └── src/
│       ├── App.jsx                 # Application routes and frontend route guards
│       ├── main.jsx                # React entry point
│       ├── pages/                  # Dashboard, task, project, team, login, trash views
│       ├── components/             # Shared and feature-specific UI
│       │   ├── project/            # Project membership controls
│       │   └── task/               # Task forms, table, dependency/subtask UI
│       ├── redux/                  # Store, auth state, RTK Query APIs
│       ├── utils/                  # Formatting and Firebase configuration
│       └── assets/data.js          # Legacy/static sample data
├── server/
│   ├── index.js                    # Express setup and API mount
│   ├── package.json
│   ├── Dockerfile
│   ├── controllers/                # User, team, project, task request handlers
│   ├── middlewares/                # JWT/auth, task access, error handling
│   ├── models/                     # User, Team, Project, Task, Notice, dependency
│   ├── routes/                     # REST route declarations
│   ├── scripts/                    # Admin/bootstrap and hierarchy utilities
│   ├── tests/                      # Node built-in test-runner tests
│   └── utils/                      # Role/access, workload, scheduling, CPM rules
├── docker-compose.yml
└── README.md
```

Important server utilities include `roles.js`, `projectAccess.js`, `workload.js`, `taskAssignment.js`, `scheduling.js`, `taskDependencies.js`, `subtasks.js`, and `cpm.js`. The client API definitions live under `client/src/redux/slices/api/`.

## 21. Database Models

### User

`name`, `title`, `role`, `email`, and `password` are required. `role` is restricted to the five values in the role table. Other fields include `team` (optional Team reference), `tasks` (legacy Task-reference array), `isAdmin`, `isActive`, `status` (`pending`, `approved`, `rejected`), and `googleAuth`. Timestamps are enabled. Passwords are hashed on save; `matchPassword` compares a supplied password. Current task ownership is primarily represented by `Task.assignee`, not `User.tasks`.

### Team

`name` is required, trimmed, and unique. `leader` is a required unique User reference. `members` is an array of User references. Timestamps are enabled. The controller maintains the redundant relationship with each member's `User.team` field.

### Project

`name` is required and trimmed; `description` defaults to an empty string. `owner` is a required indexed User reference; `projectLeader` is a nullable indexed User reference. `teams` and `members` are arrays of references. `status` is one of `planning`, `active`, `completed`, `archived`. Planned/actual dates default to `null`. Indexes cover `members` and `teams`; timestamps are enabled.

### Task

Task fields and enums are listed under [Task Management](#6-task-management). Activities and subtasks are embedded subdocuments; tasks are not separate collections. A model validation hook rejects a planned start later than the due date. `assets` is a legacy string array. `isTrashed` defaults to false.

### Notice / Notification

`team` is an array of recipient User references (historical field name), `text`, optional `task` reference, `notiType` (`alert` or `message`, default `alert`), and `isRead` User-reference array. Timestamps are enabled.

### TaskDependency

Required predecessor/successor Task references and `dependencyType` (`FS` only). A unique compound index prevents duplicate pairs; indexes also exist for either endpoint. Validation rejects self-dependency and normalizes dependency type to uppercase.

Relationship summary:

```mermaid
erDiagram
    USER }o--o| TEAM : belongs_to
    TEAM ||--o{ USER : contains
    USER ||--o{ PROJECT : owns
    USER ||--o{ PROJECT : leads
    PROJECT }o--o{ TEAM : includes
    PROJECT }o--o{ USER : members
    PROJECT ||--o{ TASK : contains
    USER ||--o{ TASK : creates
    USER ||--o{ TASK : assigned_to
    TASK ||--o{ TASK : parent_lineage
    TASK ||--o{ TASKDEPENDENCY : predecessor_or_successor
    TASK ||--o{ NOTICE : referenced_by
```

Activities and subtasks are embedded within Task; the diagram does not represent them as independent MongoDB collections.

## 22. REST API Reference

All endpoints are mounted below `/api`. Protected endpoints require the `token` cookie. “Task access” means Admin, current assignee, or the task's Project Leader. Unless noted, controller errors use a JSON response such as `{ "status": false, "message": "..." }` with a 4xx status; unexpected errors are generally returned as 400 by controllers.

### Authentication and users

| Method   | Endpoint                             | Access                                  | Purpose / key behavior                                                                                                                                             |
| -------- | ------------------------------------ | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `POST`   | `/api/user/register`                 | Public                                  | Register with `name`, `email`, `password`, `role`, `title`; public `ADMIN` registration rejected; account starts pending/inactive.                                 |
| `POST`   | `/api/user/create`                   | Admin                                   | Same controller, but creates approved/active account.                                                                                                              |
| `POST`   | `/api/user/login`                    | Public                                  | Email/password login; sets JWT cookie when approved/active and credentials match.                                                                                  |
| `POST`   | `/api/user/logout`                   | Public                                  | Clears `token` cookie.                                                                                                                                             |
| `POST`   | `/api/user/google`                   | Public                                  | Accepts posted identity/profile fields; new accounts become pending; existing approved/active account can receive JWT. Firebase token is not verified server-side. |
| `GET`    | `/api/user/get-team`                 | Authenticated                           | Return approved users visible in the requester's team; Admin receives all approved users. This is a user list, not the Team documents endpoint.                    |
| `GET`    | `/api/user/pending-users`            | Admin                                   | List pending and rejected accounts.                                                                                                                                |
| `GET`    | `/api/user/notifications`            | Authenticated                           | Return unread notifications addressed to current user.                                                                                                             |
| `PUT`    | `/api/user/profile`                  | Authenticated                           | Update own name/title; Admin may specify a target and update role.                                                                                                 |
| `PUT`    | `/api/user/read-noti?isReadType=all` | Authenticated                           | Mark all current user's notices read.                                                                                                                              |
| `PUT`    | `/api/user/read-noti?id=:noticeId`   | Authenticated                           | Mark one notice read.                                                                                                                                              |
| `PUT`    | `/api/user/change-password`          | Authenticated                           | Set a new password; current password is not checked. Request body field: `password`.                                                                               |
| `PUT`    | `/api/user/approve/:id`              | Admin                                   | Set status to `approved`, `rejected`, or `pending`; only `approved` activates the account.                                                                         |
| `PUT`    | `/api/user/:id`                      | Admin or eligible same-team Team Leader | Activate/deactivate through `isActive` or legacy `isAction` request field.                                                                                         |
| `DELETE` | `/api/user/:id`                      | Admin                                   | Delete user document. Related membership references are not comprehensively cleaned here.                                                                          |

### Teams

| Method   | Endpoint                | Access        | Purpose / key behavior                                                                               |
| -------- | ----------------------- | ------------- | ---------------------------------------------------------------------------------------------------- |
| `GET`    | `/api/team`             | Authenticated | Admin gets all teams and eligible unassigned members; non-admin visibility is limited to own team.   |
| `POST`   | `/api/team`             | Admin         | Create team with `name` and approved active `leaderId` whose role is `TEAM_LEADER`.                  |
| `PUT`    | `/api/team/:id/members` | Admin         | Replace member IDs while retaining the existing leader; rejects extra Team Leaders and `ADMIN` role. |
| `PUT`    | `/api/team/move-member` | Admin         | Move an Associate, Junior, or Intern using `userId`, `destinationTeamId`.                            |
| `DELETE` | `/api/team/:id`         | Admin         | Delete only if not referenced by a project and no non-leader membership remains.                     |

### Projects and workload

| Method   | Endpoint                            | Access                          | Purpose / key behavior                                                                                               |
| -------- | ----------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `GET`    | `/api/project`                      | Authenticated                   | List visible projects with progress summaries.                                                                       |
| `POST`   | `/api/project`                      | Admin                           | Create project; body includes `name`, `projectLeader`, `teams`, `members`, optional description/status/dates.        |
| `GET`    | `/api/project/workload-overview`    | Admin                           | Aggregate workload across projects.                                                                                  |
| `GET`    | `/api/project/:id/workload`         | Project Leader or Admin         | Project member workload; optional `memberId` and `priority` query fields return a member summary/assignment preview. |
| `GET`    | `/api/project/:id/dependency-order` | Authorized project viewer       | Return topological order of non-trashed project tasks.                                                               |
| `GET`    | `/api/project/:id/cpm`              | Authorized project viewer       | Return CPM metrics, critical paths, and dependencies.                                                                |
| `GET`    | `/api/project/:id`                  | Authorized project viewer       | Return project, visible tasks, progress, and dependency count.                                                       |
| `PUT`    | `/api/project/:id`                  | Admin, owner, or Project Leader | Update metadata/participants subject to project-specific constraints.                                                |
| `DELETE` | `/api/project/:id`                  | Admin                           | Permanently delete project and its task-related records.                                                             |

### Tasks, activities, subtasks, and dependencies

| Method   | Endpoint                                          | Access                                                       | Purpose / key behavior                                                                                                                    |
| -------- | ------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `POST`   | `/api/task/create`                                | Authenticated; controller checks hierarchy/project authority | Create task. Project tasks additionally validate explicit membership and workload. Client `date` is ignored; server sets assignment time. |
| `POST`   | `/api/task/delegate/:id`                          | Task access; controller checks target delegation             | Reassign task, refresh assignment time, record activity, and notify target. Body: `assignee`.                                             |
| `POST`   | `/api/task/duplicate/:id`                         | Admin                                                        | Duplicate task with new assignment time; does not validate workload.                                                                      |
| `POST`   | `/api/task/activity/:id`                          | Task access                                                  | Add comment/activity or request an activity-driven status transition. Body: `type`, `activity`.                                           |
| `POST`   | `/api/task/:id/dependencies`                      | Task access                                                  | Add dependency; body: `predecessorTask`, optional `dependencyType` (only `FS`).                                                           |
| `GET`    | `/api/task/dashboard`                             | Authenticated                                                | Dashboard task counts, priority chart data, latest tasks, Admin user summary.                                                             |
| `GET`    | `/api/task?stage=:stage&isTrashed=:bool`          | Authenticated                                                | List tasks filtered by stage/trash state and current visibility.                                                                          |
| `GET`    | `/api/task/:id`                                   | Task access                                                  | Return task, populated assignment/activity data, and dependency summary.                                                                  |
| `GET`    | `/api/task/:id/dependencies`                      | Task access                                                  | Return `dependsOn` and `blocks` relationships.                                                                                            |
| `PUT`    | `/api/task/create-subtask/:id`                    | Task access                                                  | Add subtask; body: `title`.                                                                                                               |
| `PUT`    | `/api/task/:id/subtasks/:subtaskId`               | Task access                                                  | Change subtask `completed` boolean.                                                                                                       |
| `PUT`    | `/api/task/update/:id`                            | Task access                                                  | Update editable task fields and validate stage/schedule; assignment `date` is not writable.                                               |
| `PUT`    | `/api/task/:id`                                   | Admin or Project Leader; Admin for standalone tasks          | Move task to trash.                                                                                                                       |
| `DELETE` | `/api/task/:id/dependencies/:dependencyId`        | Task access                                                  | Remove a dependency attached to that task.                                                                                                |
| `DELETE` | `/api/task/delete-restore/:id?actionType=restore` | Task access                                                  | Restore one task.                                                                                                                         |
| `DELETE` | `/api/task/delete-restore/:id?actionType=delete`  | Admin or Project Leader; Admin for standalone                | Permanently delete one task and references.                                                                                               |
| `DELETE` | `/api/task/delete-restore?actionType=restoreAll`  | Admin                                                        | Restore all trashed tasks.                                                                                                                |
| `DELETE` | `/api/task/delete-restore?actionType=deleteAll`   | Admin                                                        | Permanently delete all trashed tasks.                                                                                                     |

There is no asset upload endpoint and no separate Activity or Notification router. Notifications are handled by the user routes; activities and subtasks are embedded in tasks.

Task creation does not trust or require a client `date` field. The server creates the assignment timestamp:

```http
POST /api/task/create
Cookie: token=<http-only JWT>
Content-Type: application/json
```

```json
{
  "title": "Prepare the report",
  "assignee": "<user-id>",
  "project": "<project-id>",
  "stage": "todo",
  "priority": "normal",
  "plannedStartDate": "2026-10-01",
  "dueDate": "2026-10-05",
  "estimatedDuration": 3
}
```

The successful response contains the created `task`, including its server-generated `date`. A client may include a different `date` property, but the create controller does not read it. Schedule validation, authorization, project membership, and workload failures return a JSON error with a message and a 4xx status.

## 23. Environment Variables

Do not copy real secrets into documentation, source control, or issue reports. The server loads `.env` using dotenv. The repository's compose file requires `server/.env` to exist.

### Server

| Variable      | Use                                                                                             | Requirement                                     |
| ------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `MONGODB_URI` | Mongoose connection string.                                                                     | Required.                                       |
| `JWT_SECRET`  | Signs and verifies JWT cookies.                                                                 | Required; use a strong private value.           |
| `PORT`        | Express listening port; defaults to `5000`. Docker mapping expects `8800` inside the container. | Set to `8800` for the supplied Compose mapping. |
| `NODE_ENV`    | Controls cookie `secure`/`sameSite` settings and production error-stack behavior.               | Set appropriately per environment.              |

Example only:

```env
MONGODB_URI=mongodb://localhost:27017/taskmanager
JWT_SECRET=replace_with_a_long_random_secret
PORT=8800
NODE_ENV=development
```

### Client

| Variable                    | Use                                                                                                                                                         |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_APP_BASE_URL`         | Optional backend origin for RTK Query. Client appends `/api`; for example, set the origin `http://localhost:8800`, not a value that already ends in `/api`. |
| `VITE_API_URL`              | Base API URL used by the Google sign-in request; defaults to `http://localhost:8800/api`. Include `/api` in this value.                                     |
| `VITE_APP_FIREBASE_API_KEY` | Firebase web API key. Other Firebase project configuration values are currently hard-coded in `client/src/utils/firebase.js`.                               |

For Vite local development, omitting `VITE_APP_BASE_URL` uses relative `/api` and the Vite proxy. The Docker Nginx configuration does not currently proxy `/api`; see [Docker](#25-docker).

## 24. Local Development

### Requirements

- Node.js 20 or newer is recommended (Docker images use Node 20).
- npm.
- A reachable MongoDB instance.
- Firebase configuration for Google sign-in.

### Install dependencies

```powershell
cd server
npm install
cd ..\client
npm install
```

Create `server/.env` using the server variables above. For local Vite development, optionally create `client/.env` for Firebase and set `VITE_APP_BASE_URL` if not using the proxy.

### Start the backend

```powershell
cd server
npm start
```

The `start` script runs `nodemon index.js`. With `PORT=8800`, the API listens at `http://localhost:8800/api`. MongoDB is not started by the application or Docker Compose; configure a local or hosted instance first.

### Start the frontend

In a second terminal:

```powershell
cd client
npm run dev
```

Vite serves at `http://localhost:3001`. The development proxy forwards `/api` to `http://localhost:8800`.

### Default administrator bootstrap

The repository contains bootstrap utilities with the development account `admin@example.com` / `admin123`, including `server/scripts/set-default-admin.mjs`. Treat these as public development credentials: change them immediately and never use them in a deployed environment. The automatic startup helper `ensureDefaultAdmin` currently sets role text `Admin`, which does not match the schema enum `ADMIN`; a clean-database startup bootstrap can therefore fail validation. The explicit setup script sets `ADMIN` correctly but still uses the same weak development password.

## 25. Docker

`docker-compose.yml` defines two services:

| Service    | Build               | Host/container port | Configuration                                                              |
| ---------- | ------------------- | ------------------- | -------------------------------------------------------------------------- |
| `frontend` | `client/Dockerfile` | `3000:80`           | Vite production build served by Nginx; depends on backend container start. |
| `backend`  | `server/Dockerfile` | `8800:8800`         | Node/Express; reads `server/.env`; runs `npm start`.                       |

From the repository root:

```powershell
docker compose up -d --build
docker compose ps
docker compose down
```

There is no MongoDB service, volume, health check, or explicit custom network in the Compose file. MongoDB must be reachable from the backend container using `MONGODB_URI`. Compose provides the default network. The backend must listen on port 8800 inside the container for the declared port mapping.

The client Dockerfile builds static files and copies them into the Nginx image. `client/nginx.conf` only provides SPA route fallback; it does not proxy API requests to the backend. Since the client defaults to relative `/api`, the supplied Docker frontend needs an API-origin/proxy configuration to communicate with the backend. The current Compose file does not provide a Vite build argument or Nginx `/api` proxy. `depends_on` controls startup ordering only and does not wait for backend or MongoDB readiness.

## 26. Development Workflow

No feature-branch naming, `feature -> dev -> main` promotion rule, or other formal branching workflow is defined in the repository documentation/configuration inspected for this README. Use the workflow required by the project team; do not treat an undocumented branch convention as an application feature.

A practical local change cycle is:

1. Create a working branch according to the team's agreed convention.
2. Make a focused change and update the relevant backend tests/documentation.
3. Run `npm test` in `server` and the applicable client build/lint check.
4. Review the diff and verify environment-specific behavior before merge.
5. Merge through the team's agreed review process.

## 27. Testing

The backend uses Node's built-in test runner with `node:test` and `node:assert/strict`.

```powershell
cd server
npm test
```

Current suites cover:

- `cpm.test.mjs`: critical path calculations, graph cases, cycles, durations, and project isolation.
- `projectAccess.test.mjs`: project visibility/management/deletion and project-member assignment rules.
- `roles.test.mjs`: standalone delegation hierarchy.
- `scheduling.test.mjs`: date ordering, past task schedule dates, duration, progress, overdue logic.
- `subtasks.test.mjs`: title validation and persisted completion shape.
- `taskAssignmentDate.test.mjs`: server-owned assignment timestamp helper ignores caller-provided historical/future values.
- `taskDependencies.test.mjs`: dependency constraints and cycles.
- `taskStatusFlow.test.mjs`: status transitions and predecessor blockers.
- `teamMembership.test.mjs`: unassigned-member and Admin exclusion rules.
- `workload.test.mjs`: config, rolling window, priority counts, point capacity, overview aggregation.

These are primarily utility/business-rule unit tests. The repository does not provide a comprehensive MongoDB-backed HTTP integration suite or browser end-to-end suite. The assignment-date test verifies the server-time helper; route-level requests are not tested there.

Frontend scripts:

```powershell
cd client
npm run build
npm run lint
```

There is no frontend test script. The current lint script may fail because no ESLint configuration was found. The build currently reaches Vite/Rolldown but fails to resolve `@n8n/chat/style.css` from the dashboard in this environment; see known issues.

## 28. Current Limitations and Known Issues

The following items are observed in the current implementation and should not be represented as completed functionality:

- **Google authentication verification:** the backend Google endpoint does not validate a Firebase ID token; it trusts email/name fields sent by the browser. New accounts are pending/inactive, while the client currently stores the returned user and navigates to the dashboard even though no authenticated cookie is issued for a new pending account.
- **Active session revocation:** `protectRoute` verifies JWT validity but does not reload/reject a user based on current `isActive` or approval status. Deactivation blocks a later login but does not immediately invalidate an existing cookie.
- **Password controls:** password change does not verify the current password. Forgot-password UI has no reset workflow.
- **Default Admin startup helper:** `ensureDefaultAdmin` uses role string `Admin`, while the schema accepts uppercase `ADMIN`; creating the default account can fail on a clean database. If a matching account already exists, startup resets its password to the hard-coded development password. The explicit script sets the enum correctly but uses the same weak password.
- **Workload activity timestamp default:** activity subdocument date defaults to a `Date` instance created at module initialization. Workload prioritizes assigned-activity date over `Task.date`, so some assignment entries without explicit dates may be treated as older than the server-generated assignment timestamp.
- **Workload validation coverage:** workload assignment validation is used for project task creation and delegation, but not for task duplication or general priority edits. Restored tasks can re-enter the workload window if otherwise eligible.
- **Admin workload UI:** an Admin aggregate endpoint exists, but there is no dedicated all-project workload overview screen in the frontend.
- **Project date validation:** browser inputs disable past project planned dates, but the backend project controller does not enforce that restriction. Task planned start and due dates are backend-validated.
- **Date-only timezone interpretation:** task schedule validation compares JavaScript-parsed date-only strings using server-local calendar components; non-UTC deployments can observe a day shift around timezone boundaries.
- **Team active-state mismatch:** team creation validates an active Team Leader; membership update query filters for approved users but not `isActive`, despite its error text saying all members must be active. The move-member handler also does not consistently check approved/active state.
- **Task status write paths:** transition validation is used for normal updates/activity transitions, but creation can accept any valid stage and duplication copies the source stage. The `assigned` activity action directly resets a task to TODO.
- **Project/task visibility differences:** project visibility can derive from team membership, but that does not grant task access. Project owner alone is not included in task-access middleware. Project detail task lists are filtered for non-admin/non-leader users, while dependency-order and CPM endpoints calculate over all non-trashed tasks in the project after project visibility succeeds.
- **Legacy task data:** `Task.assets` remains in the schema and duplicate path but Add Asset UI/upload API is removed. `User.tasks` is retained as a legacy reference array; `Task.assignee` is the current assignment source. `client/src/assets/data.js` contains static sample data that is not the live database source.
- **Search and settings:** navbar global search and Sidebar Settings are UI controls without implemented search/settings workflows. Task filtering currently supports stage and trash state, not free-text/priority filtering.
- **Dashboard chat integration:** n8n chat uses a hard-coded external webhook URL. This creates an external service dependency and should be reviewed for privacy/deployment suitability.
- **Build/configuration:** in the current environment, `npm run build` fails resolving `@n8n/chat/style.css` from `dashboard.jsx` even though `@n8n/chat` appears in package dependencies. No ESLint configuration was found for the existing lint script.
- **Docker runtime configuration:** Compose does not run MongoDB and Nginx does not proxy `/api`; frontend API configuration needs deployment-specific work. There are no health checks or readiness gates.
- **Database transactions:** team/project/task multi-document updates and cleanup are not consistently run in MongoDB transactions.
- **Scheduling scope:** no Gantt view, holidays, work-hour calendar, resource leveling, resource skills/availability model, or automatic rescheduling exists. CPM analyzes dependencies and durations only.
- **Tests:** no browser E2E suite or comprehensive MongoDB-backed API integration suite currently exists.

## 29. Business Rules Summary

1. `isAdmin` is the server-side administrator authority flag; Admin accounts are system-level and excluded from the unassigned team list.
2. A Team has one Team Leader and represents organizational membership.
3. A Project has one project-specific Project Leader and explicit members; it can include members from multiple participating teams.
4. Project task assignment requires the target to be an explicit member of that Project.
5. Team leadership and project leadership are distinct relationships.
6. HIGH has a maximum of 1 task and MEDIUM a maximum of 3 tasks in the rolling 15-day project workload window.
7. NORMAL and LOW have no fixed count cap; all priorities contribute points to the 20-point capacity.
8. Workload includes completed tasks inside the window and excludes trashed tasks.
9. Task assignment date is server-generated. Client-supplied assignment dates are ignored; normal task edits preserve the original date.
10. Reassignment and duplication establish a new server assignment timestamp.
11. Task planned start and due dates cannot be before today according to backend validation; project planned dates currently receive only the browser input restriction.
12. Task stages are TODO, IN PROGRESS, and COMPLETED; normal transitions require start before completion and respect unfinished predecessors.
13. Subtasks are checklist items and do not control parent task status or project progress.
14. Add Asset functionality is unavailable; the remaining asset field is legacy data only.
15. Backend authentication, authorization, membership, and workload checks are authoritative; frontend controls are not a security boundary.

## 30. Planned / Future Work

No formal roadmap or planned-work list was found in the repository. The following are reasonable follow-up candidates based on documented current gaps, not implemented features or committed roadmap items:

- Verify Firebase ID tokens on the backend and complete the pending Google-registration experience.
- Correct bootstrap-admin setup and require a unique secret/password rather than resetting a known default on startup.
- Add route-level and MongoDB-backed integration tests, plus browser end-to-end coverage.
- Implement the Admin-wide workload overview UI and decide how workload should treat activity timestamps consistently.
- Apply backend validation to project planned dates and consistently enforce active-user membership rules.
- Add password reset/current-password confirmation and session revocation on account deactivation.
- Configure deployment API routing, environment injection, MongoDB readiness, health checks, and production CORS origins for Docker.
- Decide whether legacy asset data should remain readable, be migrated, or be removed in a future schema migration.
- Consider Gantt visualization, calendar/holiday rules, resource availability, or automatic schedule adjustment if those become explicit product requirements.
