# Lab 4 Zen Green UI Specification
**TokTickIT Actions Taken, Dashboards, and Final Polish**

---

## 1. Design System & Zen Green Visual Language

TokTickIT preserves and extends the **Zen Green** design language established in Lab 2 and refined in Lab 3. The interface delivers an elevated, calm, accessible, and high-contrast aesthetic across desktop, tablet, and mobile displays.

### 1.1 Color Tokens Palette

| Token Name | Hex Code | Role & Usage |
|---|---|---|
| `--color-primary-green` | `#006B3C` | Top navigation header, primary action buttons, brand emphasis |
| `--color-secondary-green` | `#0B7A46` | Active tabs, hover states on primary actions, interactive links |
| `--color-pale-green` | `#EAF6EF` | Selected card outlines, table row hover highlights, metric card backgrounds |
| `--color-page-bg` | `#F5F7F6` | Off-white, soft background across all views to prevent eye strain |
| `--color-surface` | `#FFFFFF` | Metric cards, container panels, form modals, table bodies |
| `--color-surface-subtle` | `#F9FAFB` | Table header background, read-only field surfaces, subtle callouts |
| `--color-text-primary` | `#1A2820` | Dark charcoal-green high-contrast text for headers, metrics, and body |
| `--color-text-secondary` | `#4B5563` | Subtitles, metric captions, table column headers, helper labels |
| `--color-text-muted` | `#6B7280` | Placeholder text, secondary timestamps, disabled icon fills |
| `--color-border-neutral` | `#D1D5DB` | 1px neutral borders for inputs, table dividers, card boundaries |
| `--color-border-subtle` | `#E5E7EB` | Soft dividers between list items and table rows |
| `--color-field-readonly-bg` | `#EEF2EE` | Soft gray-green shading distinctly identifying non-editable fields |
| `--color-field-readonly-border` | `#CBD5E1` | Muted border surrounding read-only controls |
| `--color-error-text` | `#991B1B` | Validation error text, destructive action alerts |
| `--color-error-border` | `#DC2626` | 1px red border applied to invalid input controls |
| `--color-error-bg` | `#FEF2F2` | Background banner for validation errors and API failure alerts |
| `--color-warning-amber` | `#D97706` | Warning badges, conflict banners, attention callouts |
| `--color-warning-bg` | `#FFFBEB` | Warning banner and conflict notice background |
| `--color-success-green` | `#059669` | Success badges, completion indicators, confirmation toasts |
| `--color-success-bg` | `#ECFDF5` | Success confirmation banner background |
| `--color-focus-ring` | `#0B7A46` | High-contrast 2px outline for keyboard focus accessibility |

### 1.2 Status Badges (With Non-Color Cues)

Every status badge combines distinct background/border tokens with an explicit text label and semantic icon:

| Status | Badge CSS Class | Background / Border | Icon / Text Cue |
|---|---|---|---|
| **New** | `.badge-status-new` | Light Blue (`#EFF6FF` / `#BFDBFE`) | 🔵 Blue Circle `New` |
| **Open** | `.badge-status-open` | Soft Green (`#ECFDF5` / `#A7F3D0`) | 🟢 Green Dot `Open` |
| **In Progress** | `.badge-status-inprogress` | Light Amber (`#FEF3C7` / `#FDE68A`) | 🟡 Clock `In Progress` |
| **Waiting for Requester** | `.badge-status-waiting` | Light Orange (`#FFF7ED` / `#FFEDD5`) | 🟠 Hourglass `Waiting` |
| **Resolved** | `.badge-status-resolved` | Light Green (`#F0FDF4` / `#BBF7D0`) | 🟢 Checkmark `Resolved` |
| **Closed** | `.badge-status-closed` | Neutral Gray (`#F3F4F6` / `#E5E7EB`) | ⚪ Check Circle `Closed` |
| **Reopened** | `.badge-status-reopened` | Soft Red (`#FEF2F2` / `#FECACA`) | 🔴 Arrow Replay `Reopened` |
| **Cancelled** | `.badge-status-cancelled` | Slate Gray (`#F3F4F6` / `#D1D5DB`) | ✖️ Cross `Cancelled` |

---

## 2. IT Staff Dashboard UI Specification (`/dashboard`)

The IT Staff Dashboard serves as the operational triage starting point for service-desk engineers and administrators.

### 2.1 Screen Structure & Layout
1. **Header Area**:
   - Title: `Welcome back, {Staff Name}!`
   - Subtitle: `Here's what's happening with your queue today.`
   - Top-right Action: `Refresh` button with sync icon.
2. **Operational Metric Cards (5 Cards)**:
   - **New**: System-wide count of tickets with status `NEW`. Drill-down: `/staff/queue?status=NEW`.
   - **Open**: System-wide count of tickets with status `OPEN`. Drill-down: `/staff/queue?status=OPEN`.
   - **In Progress**: System-wide count of tickets with status `IN_PROGRESS`. Drill-down: `/staff/queue?status=IN_PROGRESS`.
   - **Waiting for Requester**: Count of tickets awaiting user feedback. Drill-down: `/staff/queue?status=WAITING_FOR_REQUESTER`.
   - **My Assigned**: Count of open/active tickets assigned to current user. Drill-down: `/staff/queue?assigned=me`.
   - *Card Behavior*:
     - Large numerical display (`text-3xl font-bold text-primary-green`).
     - Clear metric title (`text-sm font-semibold text-text-secondary`).
     - Subtext indication: `Click to view queue`.
     - Entire card is an accessible button (`role="button"`, `tabindex="0"`).
3. **Operational Work Area**:
   - **My Recent Tickets (Table)**: 5 most recent tickets assigned or urgent. Columns: `Ticket #`, `Title`, `Status`, `Updated`.
   - **Quick Actions Panel**: `Create Ticket` (`/tickets/new`), `Search Tickets` (`/staff/queue`), `My Queue` (`/staff/queue?assigned=me`).

### 2.2 Responsive Breakpoints for Staff Dashboard
- **Desktop ($\ge 1024$px)**: Exactly 5 columns in a single row for metric cards. Split layout below (65% Recent Tickets, 35% Quick Actions).
- **Tablet ($768$px–$1023$px)**: Exactly 2 columns for metric cards (with the 5th card spanning full-width). Vertical stack below.
- **Mobile ($< 768$px)**: Exactly 1 column for metric cards (full-width stacked cards). Recent tickets table transforms into vertical card stack.

---

## 3. Requester Dashboard UI Specification (`/dashboard`)

The Requester Dashboard provides end users with a transparent summary of their personal service requests.

### 3.1 Screen Structure & Layout
1. **Header Area**:
   - Title: `Welcome, {Requester Name}!`
   - Subtitle: `Here's the latest on your requests.`
2. **Personal Metric Cards (4 Cards)**:
   - **My Open Tickets**: Total tickets owned by user with status `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`. Drill-down: `/tickets?filter=open`.
   - **Waiting for Me**: Count of owned tickets with status `WAITING_FOR_REQUESTER`. Drill-down: `/tickets?status=WAITING_FOR_REQUESTER`.
   - **Recently Updated**: Count of owned tickets updated in last 7 rolling days. Drill-down: `/tickets?filter=recent`.
   - **Recently Resolved**: Count of owned tickets where status == `RESOLVED` in last 30 rolling days (excluding `CLOSED`). Drill-down: `/tickets?status=RESOLVED`.
   - *Card Behavior*: Clicking any card navigates to `/tickets` with corresponding filter applied.
3. **Personal Work Area**:
   - **My Recent Tickets**: 5 most recently active tickets owned by user.
   - **Quick Actions**: `+ Create Ticket` and `📂 View My Tickets`.

### 3.2 Responsive Breakpoints for Requester Dashboard
- **Desktop ($\ge 1024$px)**: Exactly 4 columns in a single row for metric cards.
- **Tablet ($768$px–$1023$px)**: Exactly 2 columns for metric cards (2x2 grid).
- **Mobile ($< 768$px)**: Exactly 1 column for metric cards (full-width stack).

---

## 4. Administrator Dashboard UI Specification

Administrators accessing `/dashboard` receive the full IT Staff operational dashboard plus an additional **User Directory Summary** panel:
- Card 1: `Active Requesters`
- Card 2: `Active IT Staff`
- Card 3: `Active Admins`
- Card 4: `Total Users`
- Quick Action: `Manage Users` button navigating directly to `/admin/users`.
- Responsive Grid: 4 columns on desktop, 2 columns on tablet, 1 column on mobile.

---

## 5. Dashboard States & Safe Failure Feedback

1. **Loading State**:
   - Displays gentle Zen Green pulsing skeleton cards (`animate-pulse bg-gray-200 rounded-lg h-28`) for metric cards and skeleton rows for tables.
2. **Empty State**:
   - When metric counts or recent lists are 0:
     - Requester: Clean card with an empty-inbox icon: *"You have no open tickets. Need help? Click 'Create Ticket' to get started."*
     - IT Staff: *"No active tickets in your queue. Great job!"*
3. **Forbidden State (403)**:
   - If an unauthorized user navigates to an admin or staff dashboard, renders a clean Zen Green notice: *"Access Restricted: You do not have permission to view this operational dashboard. [Return to Dashboard]"*.
4. **Safe-Failure State**:
   - If a backend API error occurs during dashboard loading, a non-crashing banner displays: *"⚠️ Unable to load dashboard metrics. [🔄 Retry]"* without white-screening.

---

## 6. Actions Taken UI on Ticket Detail

The Actions Taken work log is embedded within the Ticket Detail screen (`/staff/tickets/:id` and `/tickets/:id`).

### 6.1 Presentation Layout
- Located directly below the core Ticket Metadata card and above/alongside the Comments panel.
- Header: `Actions Taken` with counter badge (e.g. `Actions Taken (3)`).
- Action Button: `+ Add Action Taken` (rendered **only** for IT Staff and Administrators).

### 6.2 Desktop Table vs. Mobile Card Transformation
- **Desktop ($\ge 768$px)**: HTML table with clean dividers:
  - Columns: `Date/Time`, `Performed By`, `Action Description`, `Result`, `Follow-Up`, `Attachment Notes`, `Actions`.
- **Mobile (< 768px)**: Stacked responsive cards. Each card explicitly displays:
  - Header: Action Date/Time and Performer badge.
  - Body: Description and Result.
  - Follow-up: Amber badge `⚠️ Follow-up Required: [note]` or muted badge `No follow-up needed`.
  - Attachment Notes: Paperclip icon with note text.
  - Footer: `Edit` button (for IT Staff/Admin).

### 6.3 Create / Edit Action Taken Modal Behavior
- **Desktop/Tablet**: Centered modal with semi-transparent backdrop.
- **Mobile (< 768px)**: Full-screen bottom-sheet modal:
  - Sticky header with modal title and `✕` close button.
  - Scrollable body with full touch targets ($\ge 44$px input height).
  - Sticky bottom action bar with `Cancel` and `Save Action Taken` buttons.
- **Form Controls & Validation**:
  - `Action Date/Time` (datetime-local, defaults to now; future dates blocked).
  - `Performed By` (Read-only; prefilled with active user session).
  - `Action Description` (Textarea, required, min 5 chars).
  - `Result` (Text input, required, min 3 chars).
  - `Follow-Up Required?` (Checkbox toggle).
  - `Follow-Up Note` (Textarea: **Mandatory** when toggle is checked; cleared and disabled when unchecked).
  - `Attachment Notes` (Text input, optional).
- **Double-Submit Prevention**: Submit button displays loading spinner and is disabled while the mutation request is in flight.
- **Error Preservation**: If a 400 validation error returns, the modal remains open with an inline alert and form values intact.

### 6.4 Requester View (Read-Only Mode)
- Requesters viewing their ticket detail see all Actions Taken cards/table entries.
- The `+ Add Action Taken` button and row `Edit` buttons are completely hidden.

---

## 7. Ticket Workflow & Resolution Feedback UI

### 7.1 Status Controls on Ticket Detail
- **Header Status Badge**: Clearly displays current status with assigned color and icon token.
- **IT Staff / Admin Status Transition Dropdown**:
  - Displays **only permitted next statuses** according to the transition matrix.
  - Selecting a target status enables the `Update Status` button.
- **Requester "Problem Appears Resolved" Button**:
  - Visible only to the Ticket Owner when the ticket is `OPEN`, `IN_PROGRESS`, or `WAITING_FOR_REQUESTER`.
  - Confirmation dialog explains that an advisory confirmation will be posted for IT Staff review. Does not change formal status.

### 7.2 Resolution Gate Warning (`422 RESOLUTION_REQUIRES_ACTION_TAKEN`)
- If an IT Staff member attempts to transition a ticket to `RESOLVED` or `CLOSED` when zero Actions Taken are logged:
  - The UI catches the 422 response and displays a prominent amber/red alert banner above the status controls:
    > **⚠️ Work Verification Required**: This ticket cannot be resolved or closed until at least one Action Taken has been recorded. Please log your work in the Actions Taken section below before updating status.

### 7.3 Concurrency Conflict Alert (`409 Conflict`)
- If another user modifies the ticket status while open:
  - Warning banner displays:
    > **⚠️ Conflict Detected**: This ticket has been updated by another team member since you loaded it. Please refresh the page to view the latest status before making changes.
  - Primary button: `🔄 Refresh Ticket`.

---

## 8. Accessibility & Visual Polish Checklist (WCAG 2.1 AA)

- [ ] **Contrast Ratio**: All body copy and headings maintain $\ge 4.5:1$ contrast against backgrounds.
- [ ] **Visible Focus Rings**: Every button, input, link, and interactive card displays an unambiguous 2px focus ring (`--color-focus-ring`) during keyboard navigation.
- [ ] **Keyboard Navigability**: Modals trap focus during open state and close on `Escape`; forms submit on `Enter`.
- [ ] **Non-Color Cues**: Statuses and roles include explicit icons or textual badges alongside color shading.
- [ ] **Semantic Headings**: Strict hierarchy (`<h1>` followed by `<h2>`, `<h3>`).
- [ ] **Zero Horizontal Overflow**: `overflow-x: hidden` enforced on page wrapper at 375px mobile breakpoint.
- [ ] **Clean Developer Console**: Zero React hydration warnings, zero missing `key` prop warnings, zero unhandled promise rejections.
