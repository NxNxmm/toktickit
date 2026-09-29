# Lab 4 Zen Green UI Specification
**TokTickIT Actions Taken, Dashboards, and Final Polish**

---

## 1. Design System & Zen Green Visual Language

TokTickIT preserves and extends the **Zen Green** design language established in Lab 2 and refined in Lab 3. The interface delivers an elevated, calm, accessible, and high-contrast aesthetic across desktop, tablet, and mobile displays.

### 1.1 Color Tokens Palette

| Token Name | Hex Code | Role & Usage |
|---|---|---|
| `--color-primary-green` | `#006B3C` | Top navigation header, primary action buttons, active brand emphasis |
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

The IT Staff Dashboard serves as the operational starting point for service-desk engineers and administrators.

### 2.1 Screen Structure & Layout
1. **Header Area**:
   - Title: `Welcome back, {Staff Name}!`
   - Subtitle: `Here's what's happening with your queue today.`
   - Top-right Action: `Refresh` button with sync icon.
2. **Operational Metric Cards (5 Cards in Horizontal Grid)**:
   - **New**: System-wide count of tickets with status `NEW`.
   - **Open**: System-wide count of tickets with status `OPEN`.
   - **In Progress**: System-wide count of tickets with status `IN_PROGRESS`.
   - **Waiting for Requester**: Count of tickets awaiting user feedback.
   - **My Assigned**: Count of open tickets assigned to the logged-in staff member.
   - *Card Behavior*:
     - Large numerical display (`text-3xl font-bold text-primary-green`).
     - Clear metric title (`text-sm font-semibold text-text-secondary`).
     - Subtext indication (e.g. `Click to view queue`).
     - Entire card is an accessible button (`role="button"`, `tabindex="0"`) that navigates to `/staff/queue` with the corresponding filter pre-selected.
3. **Operational Work Area (2-Column Grid on Desktop)**:
   - **Left Column (65% width) - My Recent Tickets**:
     - Card container with title `My Recent Tickets` and `View all` link.
     - Table listing the 5 most recent tickets assigned to the user (or urgent open tickets if none assigned).
     - Columns: `Ticket #`, `Title`, `Status`, `Updated`.
     - Clicking a row opens the Ticket Detail view (`/staff/tickets/:id`).
   - **Right Column (35% width) - Quick Actions**:
     - Action Card 1: `Create Ticket` (opens `/tickets/new`).
     - Action Card 2: `Search Tickets` (opens `/staff/queue` with search focus).
     - Action Card 3: `My Queue` (opens `/staff/queue?assigned=me`).
4. **Empty State**:
   - If no tickets match recent lists, render a clean card with an empty inbox icon: `No active tickets in your queue. Great job!`

---

## 3. Requester Dashboard UI Specification (`/dashboard`)

The Requester Dashboard provides end users with a transparent summary of their personal service requests.

### 3.1 Screen Structure & Layout
1. **Header Area**:
   - Title: `Welcome, {Requester Name}!`
   - Subtitle: `Here's the latest on your requests.`
2. **Personal Metric Cards (4 Cards in Horizontal Grid)**:
   - **My Open Tickets**: Total tickets owned by user with status `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`.
   - **In Progress**: Count of owned tickets currently being worked on.
   - **Resolved**: Count of owned tickets resolved within the last 30 days.
   - **Closed**: Count of owned tickets historically closed.
   - *Card Behavior*: Clicking "View all" links under each card filters `/tickets` by the respective status.
3. **Personal Work Area (2-Column Grid on Desktop)**:
   - **Left Column (65% width) - My Recent Tickets**:
     - Card container with title `My Recent Tickets` and `View all` link.
     - Table listing the user's 5 most recently active tickets.
     - Columns: `Ticket #`, `Subject`, `Status`, `Last Update`.
     - Clicking any row navigates directly to `/tickets/:id`.
   - **Right Column (35% width) - Quick Actions**:
     - Action Card 1: `+ Create Ticket` (`Submit a new request`).
     - Action Card 2: `📂 View My Tickets` (`Track existing requests`).
4. **Empty State**:
   - If the requester has 0 tickets, display a friendly welcome card: `You haven't submitted any tickets yet. Need help? Click 'Create Ticket' above to get started.`

---

## 4. Administrator Dashboard UI Specification

Administrators accessing `/dashboard` receive the full IT Staff operational dashboard plus an additional **User Directory Summary** panel:
- Card 1: `Active Requesters` (Count of active requester accounts).
- Card 2: `Active IT Staff` (Count of active support engineers).
- Card 3: `Active Admins` (Count of active system administrators).
- Quick Action: `Manage Users` button navigating directly to `/admin/users`.

---

## 5. Actions Taken UI on Ticket Detail

The Actions Taken work log is embedded within the Ticket Detail screen (`/staff/tickets/:id` and `/tickets/:id`).

### 5.1 Presentation Layout
- Located directly below the core Ticket Metadata card and above/alongside the Comments panel.
- Header: `Actions Taken` with counter badge (e.g. `Actions Taken (3)`).
- Action Button: `+ Add Action Taken` (rendered **only** for IT Staff and Administrators).

### 5.2 Actions Taken List / Table
Displays chronological work history entries with the following fields:
1. **Action Date/Time**: Formatted as `MMM DD, YYYY hh:mm A` (e.g. `May 12, 2026 10:15 AM`).
2. **Performed By**: Name and role badge of the staff member who executed the work.
3. **Action Description**: Complete text description of work performed.
4. **Result**: Outcome badge or text (e.g. `Success`, `Partial`, `Diagnostic Complete`).
5. **Follow-Up Flag & Note**:
   - If `followUpRequired == true`: Displays an amber warning badge `⚠️ Follow-up Required` accompanied by the indented follow-up note text.
   - If `followUpRequired == false`: Displays a muted gray badge `No follow-up needed`.
6. **Attachment Notes**: Displays a paperclip icon with note text referencing file evidence (e.g. `See network_trace.pcap in lab shared drive`).
7. **Action Controls**: An `Edit` button (pencil icon) visible only to IT Staff and Admins.

### 5.3 Create / Edit Action Taken Form (Modal or Inline Panel)
The form contains:
- **Action Date/Time** (Input: datetime-local, defaults to current time; cannot be in the future).
- **Performed By** (Read-only input pre-filled with logged-in user's name: `System-generated from your active session`).
- **Action Description** (Textarea, required, minimum 5 characters).
- **Result** (Input/Select, required, e.g. `Success`, `Pending Vendor`, `Resolved Issue`).
- **Follow-Up Required?** (Checkbox toggle, default `false`).
- **Follow-Up Note** (Textarea):
  - *Dynamic State*: If "Follow-Up Required?" is checked, this field becomes mandatory with a red asterisk and helper text `* Please specify the required follow-up action`.
  - If unchecked, the field is disabled or hidden and cleared.
- **Attachment Notes** (Text input, optional, placeholder: `e.g. Log file attached or screenshot reference`).
- **Form Actions**:
  - `Cancel` button (resets form and closes modal).
  - `Save Action Taken` primary button (Zen Green background).
  - *Double-Submit Protection*: Button shows a loading spinner and is disabled while the mutation is in flight.
  - *Recoverable Failure Handling*: If submission returns a validation error (HTTP 400), an inline alert banner displays the error and form inputs remain populated.

### 5.4 Requester View (Read-Only Mode)
- Requesters viewing their ticket detail see all Actions Taken cards/table entries.
- The `+ Add Action Taken` button and row `Edit` buttons are completely hidden.
- Tooltip/Header helper text clarifies: `Work log recorded by IT Staff for your request.`

---

## 6. Ticket Workflow & Resolution Gate UI

### 6.1 Status Controls on Ticket Detail
- **Header Status Badge**: Clearly displays the current status with the assigned color and icon token.
- **IT Staff / Admin Status Transition Dropdown**:
  - A stylized select control or button group displaying **only permitted next statuses** according to the transition matrix.
  - Selecting a target status enables the `Update Status` button.
  - If transitioning to `RESOLVED`, an optional prompt for resolution summary is displayed.
- **Requester "Problem Appears Resolved" Button**:
  - Visible only to the Ticket Owner when the ticket is `OPEN`, `IN_PROGRESS`, or `WAITING_FOR_REQUESTER`.
  - Clicking opens a confirmation dialog:
    > *"Let the IT team know your problem is resolved? This will add an advisory confirmation to the ticket. IT Staff will verify and complete the formal ticket resolution."*
  - Confirming appends an advisory public note to the ticket history without changing the status dropdown or badge.

### 6.2 Concurrency Conflict Alert (HTTP 409)
- If another user modifies the ticket status while the current user has the page open, saving triggers a prominent warning banner:
  > **⚠️ Conflict Detected**: This ticket has been updated by another team member since you loaded it. Please refresh the page to view the latest status before making changes.
- Contains a single primary action: `🔄 Refresh Ticket`.

---

## 7. Responsive Design Breakpoints

### 7.1 Desktop ($\ge 1024$px)
- Top Navigation: Full horizontal links (`Dashboard`, `My Tickets` / `Ticket Queue`, `Create Ticket`, User Profile dropdown).
- Dashboards: 5 metric cards in a single row; 2-column split (65% recent tickets table, 35% quick actions).
- Actions Taken: Full-width data table with all columns aligned and clear dividers.

### 7.2 Tablet ($768$px to $1023$px)
- Metric Cards: 2-column or 3-column auto-wrapping grid with 16px gap.
- Dashboard Work Area: Stacks vertically (Recent Tickets on top, Quick Actions below).
- Actions Taken: Condensed table format with word-wrapping on descriptions.

### 7.3 Mobile ($< 768$px, down to $375$px)
- Top Navigation: Collapsible hamburger menu with accessible expand/collapse toggle.
- Metric Cards: 2-column compact grid with bold count and stacked title.
- Tables $\rightarrow$ Card Transformation: Recent Tickets and Actions Taken switch from HTML `<table>` to responsive card stacks. Each card contains key-value pairs (`Date`, `Performer`, `Result`, `Description`).
- Zero horizontal overflow: `overflow-x: hidden` enforced on page wrapper; form inputs use `width: 100%`.

---

## 8. Accessibility & Visual Polish Checklist (WCAG 2.1 AA)

- [ ] **Contrast Ratio**: All body copy and headings maintain $\ge 4.5:1$ contrast against `--color-surface` and `--color-page-bg`.
- [ ] **Visible Focus Rings**: Every button, input, link, and interactive card displays an unambiguous 2px focus ring (`--color-focus-ring`) when navigated via keyboard.
- [ ] **Keyboard Navigability**: Modals trap focus during open state and close on `Escape`; all forms submit on `Enter` from appropriate inputs.
- [ ] **Non-Color Cues**: Statuses and roles include explicit icons or textual badges alongside color shading.
- [ ] **Semantic Headings**: Strict hierarchy with a single `<h1>` per page, followed by logical `<h2>` and `<h3>` tags.
- [ ] **No Content Clipping**: Labels, badges, and long descriptions wrap cleanly without horizontal scrollbars or truncated text without tooltips.
- [ ] **Clean Developer Console**: Zero React hydration warnings, zero missing `key` prop warnings, zero unhandled promise rejections.
