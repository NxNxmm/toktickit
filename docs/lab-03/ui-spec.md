# Lab 3 Zen Green UI Specification

## 1. Design System & Color Tokens

TokTickIT preserves and extends the **Zen Green** design language established in Lab 2. All interfaces must maintain a calm, accessible, high-contrast, and professional aesthetic across desktop, tablet, and mobile displays.

### 1.1 Color Tokens Palette

| Token Name | Hex Code | Role & Usage |
|---|---|---|
| `--color-primary-green` | `#006B3C` | App header background, primary action buttons, brand emphasis |
| `--color-secondary-green` | `#0B7A46` | Active navigation tabs, interactive links, hover states, focus rings |
| `--color-pale-green` | `#EAF6EF` | Selected row highlights, public comment container borders, subtle callout backgrounds |
| `--color-page-bg` | `#F5F7F6` | Quiet, off-white background across all application views |
| `--color-surface` | `#FFFFFF` | Card backgrounds, dialog containers, form panels, dropdown menus |
| `--color-surface-subtle` | `#F9FAFB` | Table header background, secondary container backgrounds |
| `--color-text-primary` | `#1A2820` | High-contrast dark charcoal-green for headlines, body copy, form labels |
| `--color-text-secondary` | `#4B5563` | Subtitles, helper captions, metadata timestamps, table column headers |
| `--color-text-muted` | `#6B7280` | Placeholder text, disabled icon fills, secondary timestamps |
| `--color-border-neutral` | `#D1D5DB` | 1px neutral borders for editable inputs, table dividers, card boundaries |
| `--color-border-subtle` | `#E5E7EB` | Dividers between table rows and list items |
| `--color-field-readonly-bg` | `#EEF2EE` | Soft gray-green shading distinctly identifying non-editable / system-generated fields |
| `--color-field-readonly-border` | `#CBD5E1` | Muted border surrounding read-only controls |
| `--color-error-text` | `#991B1B` | Validation error messages below inputs, destructive button hover text |
| `--color-error-border` | `#DC2626` | 1px red border applied to invalid input elements |
| `--color-error-bg` | `#FEF2F2` | Background banner for API submission errors and alerts |
| `--color-warning-amber` | `#D97706` | Warning badges, attention callouts |
| `--color-warning-bg` | `#FFFBEB` | Warning banner background |
| `--color-success-green` | `#059669` | Success confirmation badges, toast alerts |
| `--color-success-bg` | `#ECFDF5` | Success confirmation banner background |
| `--color-note-gold` | `#D97706` | Border and icon accents for private Internal Notes |
| `--color-note-bg` | `#FEF3C7` | Soft gold/amber container background for private Internal Notes |

### 1.2 Role & Priority Badges

```css
/* Role Badges */
.badge-role-requester { background-color: #E0F2FE; color: #0369A1; border: 1px solid #BAE6FD; }
.badge-role-staff     { background-color: #ECFDF5; color: #065F46; border: 1px solid #A7F3D0; }
.badge-role-admin     { background-color: #F3E8FF; color: #6B21A8; border: 1px solid #DDD6FE; }

/* Status Badges */
.badge-status-new         { background-color: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE; }
.badge-status-open        { background-color: #ECFDF5; color: #047857; border: 1px solid #A7F3D0; }
.badge-status-inprogress  { background-color: #FEF3C7; color: #B45309; border: 1px solid #FDE68A; }
.badge-status-waiting     { background-color: #FFF7ED; color: #C2410C; border: 1px solid #FFEDD5; }
.badge-status-resolved    { background-color: #F0FDF4; color: #15803D; border: 1px solid #BBF7D0; }
.badge-status-closed      { background-color: #F3F4F6; color: #4B5563; border: 1px solid #E5E7EB; }
.badge-status-reopened    { background-color: #FEF2F2; color: #B91C1C; border: 1px solid #FECACA; }
.badge-status-cancelled   { background-color: #F3F4F6; color: #6B7280; border: 1px solid #D1D5DB; }

/* Priority Badges */
.badge-priority-low       { background-color: #F3F4F6; color: #4B5563; }
.badge-priority-medium    { background-color: #FEF3C7; color: #92400E; }
.badge-priority-high      { background-color: #FFEDD5; color: #C2410C; }
.badge-priority-urgent    { background-color: #FEE2E2; color: #991B1B; font-weight: 700; }
```

---

## 2. Application Shell & Role-Based Navigation

### 2.1 Navigation Bar Layout
- **Brand**: TokTickIT logo with green accent.
- **Role-Aware Links**:
  - `REQUESTER`: "My Tickets", "Create Ticket"
  - `IT_STAFF`: "Ticket Queue", "Create Ticket"
  - `ADMIN`: "User Management"
- **User Profile Area**:
  - Displays authenticated user's Name.
  - Role badge (`Requester`, `IT Staff`, or `Admin`).
  - Secure **Logout** button (`#006B3C` outline or ghost button) that triggers `/api/auth/logout`.
- **Collapse Toggle (hamburger)**:
  - Visible **only below the `lg` breakpoint** (`< 992px`), implemented with the Bootstrap utility classes `d-inline-flex d-lg-none` so that the visibility contract lives in CSS utilities rather than inline styles.
  - Must never be styled with an inline `display` declaration: an inline `display` value outranks the `d-none` utility, which silently hides the toggle at every breakpoint and leaves the Desktop navbar with no way to collapse.
  - Toggles the expanded/collapsed nav region and is reachable by keyboard with a visible focus ring (see §5.2).

```
+-------------------------------------------------------------------------------+
| [TokTickIT]   My Queue   Create Ticket            (Jane Doe) [IT Staff]  [Logout] |
+-------------------------------------------------------------------------------+
```

---

## 3. Screen Specifications

### 3.1 Login Screen (`/login`)
- **Container**: Centered card (`max-width: 420px`) on `--color-page-bg`.
- **Form Controls**:
  - `Email Address`: Email type input with autofocus, required validation.
  - `Password`: Password type input with show/hide password toggle eye icon.
  - Inline error feedback rendered directly beneath invalid fields.
  - Safe error banner for invalid credentials / inactive account (`--color-error-bg` / `--color-error-text`).
  - Primary button: "Sign In" with busy spinner indicator and disabled state during submission.

### 3.2 Mandatory Password Change Screen (`/change-password`)
- **Blocking Context**: If a user is authenticated with `requiresPasswordChange = true`, application navigation is restricted to this screen.
- **Controls**:
  - `Current (Temporary) Password`: Required password field.
  - `New Password`: Required password field with dynamic checklist:
    - At least 8 characters
    - Uppercase & lowercase letters
    - Number & special character
  - `Confirm New Password`: Required field; validates matching new password.
  - "Update Password" primary button.

### 3.3 Requester Ticket Detail & Public Comments (`/tickets/:id`)
- **Ticket Summary Header**: Ticket number, Category, Related System, Created Date, Status badge, and Requested Priority badge (all read-only).
- **"Problem Appears Resolved" Action**:
  - Secondary button available to the owning requester when ticket is not yet resolved.
  - Triggers a confirmation dialog and records the indication without changing formal status to `RESOLVED`.
- **Public Comments Feed**:
  - Reverse chronological or chronological list of public comments.
  - Card style: Pale green accent line (`--color-pale-green`), author name, role badge, timestamp, comment text.
  - "Add Public Comment" textarea with character counter (max 2,000 chars) and "Post Comment" button.

### 3.4 IT Staff Ticket Queue (`/staff/queue`)
- **Filter & Search Bar**:
  - Keyword search input (matching Ticket No or Summary).
  - Dropdown filters: Category, Status, Requested Priority, IT Priority, Owner (All / Unassigned / Mine).
  - "Clear Filters" button.
- **Desktop Table View ($\ge 992\text{px}$)**:
  - Columns: Ticket No, Created Date, Summary, Category, Req. Priority, IT Priority, Status, Owner, Action.
  - Sortable headers with sort order arrows ($\uparrow$, $\downarrow$).
  - Clickable row or "View" button to navigate to Ticket Detail.
- **Mobile Stacked Cards ($< 768\text{px}$)**:
  - Table collapses to stacked cards displaying Ticket No, badges for Status and Priorities, Summary snippet, Owner, and "Open Details" button.
- **Pagination Bar**:
  - Showing `X to Y of Z tickets`.
  - Page navigation controls (`Previous`, `1`, `2`, `3`, ..., `Next`).
  - Page size selector (`10`, `20`, `50`).

### 3.5 IT Staff Ticket Detail (`/staff/tickets/:id`)
- **Grouped Layout**:
  - **Requester Section (Read-Only)**: Requester name, email, created timestamp, requested priority, description, attachments.
  - **Operational Controls (Editable for Staff/Admin)**:
    - **Ticket Owner**: Dropdown of active IT Staff / Admins, with "Claim Ticket" quick action button if unassigned.
    - **IT Priority**: Dropdown selector (`LOW`, `MEDIUM`, `HIGH`, `URGENT`).
    - **Current Status**: Dropdown selector restricted strictly to transitions permitted by the state matrix.
- **Dual Tabbed Communication Section**:
  - **Tab 1: Public Comments**: Shared thread between Requester and Staff.
  - **Tab 2: Internal Notes**:
    - Clearly styled with amber/gold banner (`--color-note-bg`, `--color-note-gold`) and lock icon 🔒.
    - Prominent banner: *"Private Operational Notes — Strictly visible to IT Staff and Administrators"*.
    - Author name, role badge, timestamp, and note content.
    - "Add Internal Note" form.

### 3.6 Administrator User Management (`/admin/users`)
- **Header Action Bar**:
  - Title: "User Management".
  - Search input: Substring matching name or email.
  - Role Filter dropdown: "All Roles", "Requester", "IT Staff", "Administrator".
  - Primary button: "+ Create User".
- **User Directory Table**:
  - Columns: Name, Email, Role (colored badge), Status (Active: green badge, Inactive: gray badge), Actions ("Edit").
- **Create User Modal**:
  - Fields: Full Name, Email Address, Role dropdown (single role), Active toggle (default active), Initial Password field.
  - Save button with busy state and Cancel button.
- **Edit User Modal**:
  - Fields: Full Name, Email Address, Role dropdown, Active toggle.
  - Safety Guards:
    - If editing current Admin's own account: Active toggle is disabled with tooltip *"You cannot deactivate your own account"*.
    - If editing the last active Administrator: Active toggle and Role dropdown are disabled with tooltip *"Cannot deactivate or demote the last active Administrator"*.
  - "Reset Initial Password" button: Opens confirmation to set a temporary password and flag `requiresPasswordChange = true`.

---

## 4. Feedback, Empty, and Error States

1. **Busy / In-Flight State**: Submit buttons show a spinning indicator and set `disabled = true` to block double-submits.
2. **Empty Queue / No Results State**:
   - 0 total tickets: *"No tickets currently in queue."*
   - 0 matching search/filters: *"No tickets match your filter criteria."* with a *"Clear Filters"* button.
3. **Forbidden (HTTP 403) View**:
   - Professional Zen Green banner indicating: *"Access Restricted: You do not have permission to access this resource or operational action."*
4. **Conflict (HTTP 409) View**:
   - Inline alert on User Management modal: *"A user account with this email address already exists."*

---

## 5. Responsive Breakpoints & Accessibility Checklist

### 5.1 Responsive Breakpoints
- **Desktop ($\ge 992\text{px}$)**: Full multi-column grids, data tables with complete headers, side-by-side modal form controls. The collapse toggle is hidden (`d-lg-none`) and the full nav is inline.
- **Tablet ($768\text{--}991\text{px}$)**: Fluid table columns, 2-column forms collapsing to single column where necessary. The collapse toggle is visible.
- **Mobile ($< 768\text{px}$)**: Stacked cards replacing tables, full-width touch targets (minimum height 44px), zero horizontal overflow. The collapse toggle is visible.

### 5.2 Accessibility Checklist
- [x] Color contrast: Text `--color-text-primary` on background meets WCAG AA ($> 4.5:1$).
- [x] Focus states: Visible keyboard focus outline ring (`2px solid --color-secondary-green`) on all inputs and buttons.
- [x] Semantic HTML: Main content wrapped in `<main>`, headings strictly ordered (`h1` $\to$ `h2` $\to$ `h3`).
- [x] Accessible form labels: Every input explicitly linked with `<label htmlFor="...">`.
- [x] Touch targets: All buttons and dropdown controls measure at least $44 \times 44\text{px}$ on mobile screens.

---

## 6. UI Verification (Issue 8)

This section records how the screens above are proven by automated tests. Test identifiers cross-reference `docs/lab-03/tests.md` §2.

### 6.1 Screen-to-Test Coverage

| Screen | Component Tests | End-to-End Coverage |
|---|---|---|
| Login (`/login`) | `Login.test.tsx` (UI-01, 6 tests) | E2E-01.1 wrong password & inactive account; E2E-01.2 active login |
| Mandatory Password Change (`/change-password`) | `ChangePassword.test.tsx` (UI-02, 4 tests) | E2E-01.3 gate blocks the app shell until the change completes; E2E-03.3 reset forces a change at next login |
| App Shell / header | `AppShell.test.tsx` (UI-03, 5 tests) | E2E-01.2 name, initials and role badge; E2E-01.4 logout; E2E-02.0 staff land on the Queue |
| Requester Ticket Detail (`/tickets/:id`) | `RequesterTicketDetail.test.tsx` (UI-08, 4 tests) | E2E-04 create $\to$ upload $\to$ download $\to$ soft-remove journey |
| Staff Queue (`/staff/queue`) | `StaffTicketQueue.test.tsx` (UI-04, 5 tests) | E2E-02.1 queue columns, search and filters; E2E-02.2 claim & reassign |
| Staff Ticket Detail (`/staff/tickets/:id`) | `StaffTicketDetail.test.tsx` (UI-05/UI-06, 12 tests) | E2E-02.3 IT priority; E2E-02.4 green comment vs. gold 🔒 note; E2E-02.5 status matrix |
| User Management (`/admin/users`) | `UserManagement.test.tsx` (UI-07, 15 tests) | E2E-03.1–03.5 create, duplicate, reset, self-deactivation guard, non-admin 403 |
| Responsive behaviour | `Responsive.test.tsx` (RESP-01, 4 tests) | Desktop viewport asserted in the App Shell coverage |

### 6.2 Defects Found and Fixed
- **Collapse toggle hidden on every breakpoint (fixed).** `AppHeader.tsx` hard-coded `style={{ display: 'inline-flex' }}` on the hamburger button. Because an inline declaration beats any class-based utility, the `d-none` rule intended to hide it above `lg` was nullified, and the Desktop navbar rendered its links with no collapse trigger. The inline style was removed in favour of the `d-inline-flex d-lg-none` contract now specified in §2.1, and the class contract is asserted in `AppShell.test.tsx`.

### 6.3 Verification Gap
- The §5.2 accessibility checklist is currently verified **manually** against Desktop (1280px), Tablet (768px) and Mobile (375px) viewports. The planned automated audit `A11Y-01` (`client/tests/lab-03/Accessibility.test.tsx`) has not been written, so focus rings, contrast ratios and the $44 \times 44\text{px}$ touch targets are not yet machine-verified. This is recorded as **NOT IMPLEMENTED** in `tests.md` §2 and must be completed before AC-9.1 can be claimed as fully automated.
