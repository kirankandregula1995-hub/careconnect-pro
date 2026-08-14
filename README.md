# CareConnect Pro

Create a modern, enterprise-grade WEB application UI for a

Hospital Care Workforce / Care Giver Management System.

This is a FRONTEND DESIGN AND CLICKABLE PROTOTYPE only.

Use mock data and local UI state.

DO NOT build a backend.

DO NOT create APIs.

DO NOT create a database.

DO NOT implement real authentication.

DO NOT implement real notification services.

DO NOT implement real task processing.

DO NOT implement complex workflow engines.

The goal is to create a polished frontend reference that can later

be implemented in a hospital application.

============================================================

CORE CONCEPT

============================================================

The system manages hospital Care Givers across:

Role

Responsibility

Floor

Nursing Station

Shift

A Care Giver can be assigned to one or multiple Nursing Stations.

A Nursing Station can have multiple Care Givers.

Patient assignment is only required for applicable roles.

Some roles only require Station/Floor assignment and will later

participate in Task Management.

============================================================

ROLES

============================================================

Use these roles in the prototype:

- Nurse

- Nurse Manager

- Station In-Charge

- Clinical Admin

- Coordinator

- Clinical Pharmacist (CP)

- IP Manager

- Floor Manager

Do not create separate role-management screens.

Roles are already defined by the hospital application.

Responsibility is separate from Role.

Examples:

Role:

Nurse

Responsibility:

Station In-Charge

Role:

Clinical Admin

Responsibility:

Clinical Administration

Role:

Coordinator

Responsibility:

Coordinator

Role:

Clinical Pharmacist

Responsibility:

Clinical Pharmacy

============================================================

ACCESS MODEL

============================================================

Nurse Manager:

Can view and manage all permitted Nursing Stations.

Station In-Charge:

Can view and manage only assigned Nursing Stations.

Clinical Admin:

Can access assigned Floors/Stations.

Coordinator:

Can access assigned Floors/Stations.

Clinical Pharmacist:

Can access assigned Floors/Stations.

IP Manager / Floor Manager:

Can view Coordinator mapping within their permitted scope.

Nurse:

Retain the normal Nurse experience.

Do not show users screens that they are not authorized to access.

============================================================

APPLICATION NAVIGATION

============================================================

Create a clean left navigation with:

Dashboard

Care Workforce

Assignments

Roster

Stations

Patients

Tasks

Approvals

Notifications

Reports

Audit

Navigation must be role-aware.

Use realistic hospital enterprise UI patterns.

============================================================

1. DASHBOARD

============================================================

Create a role-aware dashboard.

Common dashboard cards:

Total Care Givers

Assigned Care Givers

Unassigned Care Givers

Active Stations

Station Coverage

Open Tasks

Overdue Tasks

Pending Approvals

Notifications

Show charts/visualizations for:

Care Giver Distribution

Station Coverage

Shift Coverage

Provide filters:

Floor

Nursing Station

Shift

Role

Responsibility

Floor and Nursing Station filters:

- Multi-select

- Select All

- Clear All

Shift filter:

- Multi-select

- Select All

- Clear All

Only show data within the user's authorized scope.

============================================================

2. NURSE MANAGER DASHBOARD

============================================================

Show organization-wide permitted information.

Example:

All Floors

All Nursing Stations

All Care Givers

Assignments

Coverage

Pending Approvals

Tasks

Notifications

Provide quick actions:

Assign Care Giver

View Assignments

View Coordinator Mapping

Review Approvals

============================================================

3. STATION IN-CHARGE DASHBOARD

============================================================

Show only assigned stations.

Example:

My Stations

Ward 301

Ward 302

Show:

Care Givers

Station Coverage

Shift Coverage

Open Tasks

Pending Changes

Notifications

Provide:

Assign Care Giver

Modify Assignment

View Station

Do not show unrelated stations.

============================================================

4. CARE WORKFORCE

============================================================

Create a Care Workforce management module.

Tabs:

Care Givers

Assignments

Coverage

Unassigned

Care Giver table:

Employee Name

Employee ID

Role

Responsibility

Floor

Nursing Station

Shift

Shift Time

Status

Actions

Provide:

Search

Filters

Sort

Pagination

============================================================

5. CARE GIVER ASSIGNMENT

============================================================

Create a modern assignment screen.

Fields:

Care Giver

Role

Responsibility

Assignment Type

Floor

Nursing Station

Shift

Assignment Type:

Floor Wise

Nursing Station Wise

============================================================

6. FLOOR-WISE ASSIGNMENT

============================================================

Allow a user to assign a Care Giver to a Floor.

Example:

Care Giver:

Anitha Kumar

Role:

Clinical Admin

Responsibility:

Clinical Administration

Assignment Type:

Floor Wise

Floor:

Floor 3

Display the Nursing Stations belonging to that Floor.

Allow:

Select All

Individual selection

============================================================

7. NURSING STATION-WISE ASSIGNMENT

============================================================

Example:

Care Giver:

Ravi Kumar

Role:

Coordinator

Responsibility:

Coordinator

Floor:

Floor 3

Nursing Stations:

☑ Ward 301

☑ Ward 302

☐ Ward 303

☑ Ward 304

Shift:

Morning

Allow one Care Giver to have multiple stations.

Allow multiple Care Givers to belong to the same station.

============================================================

8. STATION MASTER

============================================================

Create a Station Master screen.

Display:

Hospital

Location

Floor

Nursing Station

Station Code

Department

Status

Station detail page should show:

Assigned Care Givers

Coordinators

Clinical Admins

Clinical Pharmacists

Nurses

Station Coverage

Station Master should be focused on station information.

============================================================

9. ROSTER

============================================================

Create a clean Roster screen.

Show:

Care Giver

Role

Floor

Station

Shift

Shift Time

Status

Filters:

Floor

Station

Shift

Role

Use the concept of existing hospital shifts.

Do not create a separate shift-management product.

============================================================

10. COORDINATOR MAPPING

============================================================

Create a dedicated Coordinator Mapping screen.

Provide two views:

Floor View

Station View

Table:

Coordinator Name

Employee ID

Floor

Nursing Station

Shift

Shift Time

Status

Filters:

Floor

Nursing Station

Shift

All filters support:

Multi-select

Select All

Clear All

============================================================

11. UNASSIGNED COORDINATORS

============================================================

Create an Unassigned Coordinators view.

Display:

Coordinator Name

Employee ID

Status

Provide:

Assign Now

An Unassigned Coordinator means:

The Coordinator has no active Nursing Station assignment.

============================================================

12. CLINICAL ADMIN MAPPING

============================================================

Create Clinical Admin mapping.

Support:

Floor-wise

Nursing Station-wise

Display:

Employee

Employee ID

Floor

Nursing Station

Shift

Status

Allow:

Add

Edit

Remove

View Details

============================================================

13. CLINICAL PHARMACIST MAPPING

============================================================

Create Clinical Pharmacist mapping.

Support:

Floor

Nursing Station

Shift

Responsibility

Patient assignment is NOT mandatory.

Show future task capability visually.

============================================================

14. PATIENT ASSIGNMENT

============================================================

Keep Patient Assignment as a separate module.

For applicable roles such as Nurse:

Care Giver

→ Patient

Show:

Patient Name

MRN

Bed

Station

Care Giver

Role

Shift

Status

Do not force Clinical Admin, Coordinator or Clinical Pharmacist

into patient assignment.

============================================================

15. TASK MANAGEMENT

============================================================

Create a lightweight FUTURE Task Management UI concept.

Do not build a real task engine.

Screens:

My Tasks

Team Tasks

Task Details

Task list:

Task

Assigned To

Role

Responsibility

Station

Priority

Due

Status

Statuses:

Open

In Progress

Completed

Overdue

Escalated

Filters:

Role

Floor

Station

Shift

Priority

Status

Task detail:

Task Title

Task Type

Assigned To

Role

Responsibility

Station

Patient if applicable

Priority

Due Date

Status

Comments

Actions:

Start

Complete

Reassign

Escalate

Keep this as a visual prototype.

============================================================

16. POLICY MANAGEMENT

============================================================

Create a lightweight FUTURE Policy Management UI.

Do not build a real policy engine.

Create:

Policy List

Policy Details

Policy Builder

Example policy:

WHEN

Role = Station In-Charge

AND

Action = Major Assignment Change

THEN

Approval Required = Nurse Manager

AND

Notification = Nurse Manager

AND

Escalation = After SLA

Show policy sections:

Conditions

Action

Approval

Notification

Escalation

============================================================

17. APPROVALS

============================================================

Create a future Approval screen.

Tabs:

Pending

Approved

Rejected

Example:

Station In-Charge requests major assignment change.

Approval detail:

Requested By

Role

Station

Change

Reason

Date

Priority

Actions:

Approve

Reject

Request Changes

============================================================

18. NOTIFICATIONS

============================================================

Create a Notification Center.

Categories:

Assignment

Approval

Task

Escalation

Station Coverage

Roster

System

Example notifications:

"New Coordinator assigned to Ward 301."

"Approval required for assignment change."

"Task overdue for Clinical Pharmacist."

"Station Ward 301 has insufficient coverage."

Provide:

Unread

Read

All

Filters:

Type

Priority

Station

Actions:

Mark Read

Mark All Read

Open

============================================================

19. NOTIFICATION PREFERENCES

============================================================

Create a simple Notification Preferences screen.

Channels:

In-App

Email

Push

Preferences:

Immediate

Digest

Critical Only

This is UI only.

============================================================

20. ESCALATION

============================================================

Create a lightweight escalation timeline.

Example:

Task overdue

↓

Notify Care Giver

↓

Notify Station In-Charge

↓

Notify Nurse Manager

Show:

Event

Time

Recipient

Status

UI prototype only.

============================================================

21. AUDIT

============================================================

Create Audit Trail screen.

Display:

Date

User

Action

Role

Responsibility

Floor

Station

Shift

Old Value

New Value

Actions:

CREATE

UPDATE

REMOVE

APPROVE

REJECT

Filters:

Date

Role

Station

Action

User

============================================================

22. REPORTS

============================================================

Create Reports screen.

Reports:

Care Workforce Coverage

Coordinator Mapping

Clinical Admin Mapping

CP Mapping

Unassigned Care Givers

Task Performance

Assignment Changes

Approval Summary

Provide:

View

Filter

Export

============================================================

23. EXCEL EXPORT

============================================================

On Coordinator Mapping, provide:

Export Excel

Export should use the selected:

Floor

Station

Shift

filters.

Show a simple export confirmation state.

============================================================

24. RESPONSIVE DESIGN

============================================================

The application must be fully responsive.

Desktop:

Sidebar

Tables

Dashboard cards

Filters

Split panels

Tablet:

Responsive tables

Cards

Collapsible filters

Mobile:

Compact navigation

Cards

Stacked forms

Scrollable filters

Mobile-friendly assignment flow

Do not create separate business logic for mobile.

============================================================

25. UI STATES

============================================================

Design:

Loading

Empty

No Permission

No Station Assigned

No Shift

Unassigned Coordinator

No Tasks

No Notifications

Success

Error

Approval Pending

Task Overdue

Task Escalated

============================================================

26. END-TO-END DEMO FLOWS

============================================================

Create clickable prototype flows for:

FLOW 1 — NURSE MANAGER

Dashboard

→ Care Workforce

→ Assign Coordinator

→ Select Floor

→ Select Stations

→ Select Shift

→ Assign

→ Success

→ Notification

FLOW 2 — STATION IN-CHARGE

Dashboard

→ My Stations

→ View Care Givers

→ Modify Assignment

→ Approval Required

→ Notification

FLOW 3 — COORDINATOR

Dashboard

→ My Stations

→ Tasks

→ Open Task

→ Complete Task

FLOW 4 — CLINICAL PHARMACIST

Dashboard

→ My Stations

→ Pharmacy Tasks

→ Complete Task

FLOW 5 — CLINICAL ADMIN

Dashboard

→ Floor

→ Station Coverage

→ Care Workforce

FLOW 6 — IP/FLOOR MANAGER

Dashboard

→ Coordinator Mapping

→ Floor Filter

→ Station Filter

→ Shift Filter

→ Export Excel

FLOW 7 — UNASSIGNED COORDINATOR

Dashboard

→ Unassigned Coordinators

→ Select Coordinator

→ Assign Station

→ Success

============================================================

DESIGN STYLE

============================================================

Design a professional hospital enterprise application.

Prioritize:

Clarity

Speed

Readability

Accessibility

Data density

Simple workflows

Clear permissions

Responsive design

Avoid:

Excessive animations

Consumer-style UI

Large decorative graphics

Unnecessary gradients

Overly complex visual effects

Use realistic hospital sample data.

Do not use lorem ipsum.

============================================================

IMPORTANT SCOPE

============================================================

The design should feel like ONE coherent Care Workforce platform.

Do not create a huge unrelated hospital ERP.

Focus on:

Care Workforce

Station Mapping

Responsibilities

Shifts

Dashboard

Coordinator Mapping

Clinical Admin Mapping

CP Mapping

Patient Assignment

Tasks

Policies

Approvals

Notifications

Audit

Reports

Task Management, Policy, Approval, Notification and Escalation are

FUTURE UI concepts and should remain lightweight prototypes, not

fully implemented engines.

Use mock data only.

Create the complete responsive clickable frontend reference.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4753e645-7ca8-44b6-b2ef-1f62c46fd8b3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
