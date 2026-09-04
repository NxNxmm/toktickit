# Lab 2 Zen Green UI Specification

## 1. Design System & Color Tokens

TokTickIT adopts the **Zen Green** design language, establishing a calm, accessible, and professional aesthetic for enterprise IT support. All interface components must strictly consume the following design tokens:

### 1.1 Color Tokens Palette

| Token Name | Hex Code | Role & Usage |
|---|---|---|
| `--color-primary-green` | `#006B3C` | App header background, primary action buttons, strong brand emphasis |
| `--color-secondary-green` | `#0B7A46` | Active navigation tabs, links, interactive hover states, focus rings |
| `--color-pale-green` | `#EAF6EF` | Selected table row highlights, success message containers, soft section backdrops |
| `--color-page-bg` | `#F5F7F6` | Quiet, off-white background across all application views |
| `--color-surface` | `#FFFFFF` | Card backgrounds, dialog containers, form panels, dropdown menus |
| `--color-surface-subtle` | `#F9FAFB` | Table header background, secondary container backgrounds |
| `--color-text-primary` | `#1A2820` | High-contrast dark charcoal-green for headlines, body copy, and form labels |
| `--color-text-secondary` | `#4B5563` | Subtitles, helper captions, metadata timestamps, table column headers |
| `--color-text-muted` | `#6B7280` | Placeholder text, disabled icon fills, secondary timestamps |
| `--color-border-neutral` | `#D1D5DB` | 1px neutral borders for editable inputs, table dividers, card boundaries |
| `--color-border-subtle` | `#E5E7EB` | Dividers between table rows and list items |
| `--color-field-readonly-bg`| `#EEF2EE` | Soft gray-green shading distinctly identifying non-editable / system-generated fields |
| `--color-field-readonly-border`| `#CBD5E1`| Muted border surrounding read-only controls |
| `--color-error-text` | `#991B1B` | Validation error messages below inputs, destructive button hover text |
| `--color-error-border` | `#DC2626` | 1px red border applied to invalid input elements |
| `--color-error-bg` | `#FEF2F2` | Background banner for API submission errors and alerts |
| `--color-warning-amber` | `#D97706` | Warning badge fill, attention callouts (used only for actual warnings) |
| `--color-warning-bg` | `#FFFBEB` | Warning banner background |
| `--color-success-green` | `#059669` | Success confirmation badges, toast alerts, upload complete indicators |
| `--color-success-bg` | `#ECFDF5` | Success confirmation banner background |

---

## 2. Typography & Spacing Scale

### 2.1 Typography
- **Font Family**: Modern system UI stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`.
- **Scale**:
  - `Display / Page Title (H1)`: `24px` (`1.5rem`), font-weight `700`, line-height `1.25`, text color `--color-text-primary`.
  - `Section Header (H2)`: `18px` (`1.125rem`), font-weight `600`, line-height `1.35`.
  - `Card / Modal Title (H3)`: `16px` (`1.0rem`), font-weight `600`, line-height `1.4`.
  - `Body Regular`: `14px` (`0.875rem`), font-weight `400`, line-height `1.5`.
  - `Body Medium / Labels`: `14px` (`0.875rem`), font-weight `500`, line-height `1.4`.
  - `Caption / Metadata`: `12px` (`0.75rem`), font-weight `400`, line-height `1.4`, text color `--color-text-secondary`.
  - `Monospace (Ticket No)`: `13px` (`0.8125rem`), font-weight `600`, font-family: `"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace`.

### 2.2 Spacing & Layout Rhythm
- `space-xs`: `4px` (inline badge padding, icon gap)
- `space-sm`: `8px` (label-to-input gap, message spacing)
- `space-md`: `16px` (form group margin, card internal padding on mobile)
- `space-lg`: `24px` (grid column gap, card padding on desktop)
- `space-xl`: `32px` (section separators, page header margin)
- **Container Max-Width**: `1200px`, centered with auto margins and horizontal padding:
  - Desktop: `padding: 0 24px`
  - Mobile: `padding: 0 16px`

---

## 3. Component States & Form Controls

### 3.1 Input Fields (Text, Select, Textarea)
- **Height**: Standard single-line controls have a fixed height of `40px`. Textarea has min-height of `120px` with vertical-only resize.
- **Editable State**:
  - Background: `--color-surface` (`#FFFFFF`).
  - Border: `1px solid --color-border-neutral` (`#D1D5DB`).
  - Border radius: `6px`.
  - Text: `--color-text-primary` (`#1A2820`).
- **Read-Only / System-Generated State**:
  - Background: `--color-field-readonly-bg` (`#EEF2EE`).
  - Border: `1px solid --color-field-readonly-border` (`#CBD5E1`).
  - Text: `--color-text-primary` (`#1A2820`).
  - Cursor: `not-allowed` or `default`.
  - Content cannot be selected for keyboard input.
- **Focused State**:
  - Border: `1px solid --color-secondary-green` (`#0B7A46`).
  - Outline / Box Shadow: `0 0 0 3px rgba(11, 122, 70, 0.20)`.
- **Invalid State**:
  - Border: `1px solid --color-error-border` (`#DC2626`).
  - Focus Ring: `0 0 0 3px rgba(220, 38, 38, 0.20)`.
- **Disabled State**:
  - Background: `#E5E7EB`.
  - Opacity: `0.65`.
  - Cursor: `not-allowed`.

### 3.2 Labels & Validation Messages
- **Field Labels**: Rendered directly **above** the form control (`margin-bottom: 6px`), font-weight `500`.
- **Required Indicator**: A distinct red asterisk (`*`) follows the label text (`color: #DC2626; margin-left: 2px;`).
- **Validation Messages**:
  - Positioned directly **below** the associated field (`margin-top: 4px`).
  - Text style: `12px`, color `--color-error-text` (`#991B1B`), font-weight `500`.
  - Accompanied by an alert icon for non-color sensory indication.
  - Errors must **never** be presented solely as a generic banner at the top of the form.

### 3.3 Button Hierarchy & Busy State

| Button Type | Background | Text / Icon | Border | Hover State | Disabled / Busy State |
|---|---|---|---|---|---|
| **Primary** | `--color-primary-green` (`#006B3C`) | White (`#FFFFFF`) | None | Background `#085430` | Opacity `0.6`, cursor `not-allowed` |
| **Secondary** | White (`#FFFFFF`) | `--color-text-primary` | `1px solid #D1D5DB` | Background `#F9FAFB` | Opacity `0.5`, cursor `not-allowed` |
| **Destructive / Soft-Remove** | White (`#FFFFFF`) | `--color-error-text` (`#991B1B`) | `1px solid #FCA5A5` | Background `#FEF2F2` | Opacity `0.5`, cursor `not-allowed` |
| **Tertiary / Link** | Transparent | `--color-secondary-green` | None | Text underline | Opacity `0.5` |

- **Busy State (Submit Button)**:
  - While an API request is in-flight, the button renders an animated SVG spinner (`16px x 16px`) alongside loading text (e.g., "Submitting...").
  - The button is explicitly set to `disabled={true}` and `aria-busy="true"` to prevent duplicate click submissions.

---

## 4. Priority & Status Badges

Badges feature rounded pill styling (`border-radius: 9999px; padding: 2px 10px; font-size: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;`):

### 4.1 Status Badges
- **New**: Background `#DBEAFE`, Text `#1E40AF`, Border `1px solid #BFDBFE` (Blue).
- **In Progress**: Background `#FEF3C7`, Text `#92400E`, Border `1px solid #FDE68A` (Amber).
- **Resolved**: Background `#D1FAE5`, Text `#065F46`, Border `1px solid #A7F3D0` (Green).
- **Closed**: Background `#F3F4F6`, Text `#374151`, Border `1px solid #E5E7EB` (Gray).
- **Cancelled**: Background `#FEE2E2`, Text `#991B1B`, Border `1px solid #FECACA` (Red).

### 4.2 Priority Badges (Requested Priority & IT Priority)
- **Low**: Background `#F3F4F6`, Text `#4B5563`, Border `1px solid #E5E7EB` (Muted Gray).
- **Medium**: Background `#FEF3C7`, Text `#92400E`, Border `1px solid #FDE68A` (Amber/Yellow).
- **High**: Background `#FFEDD5`, Text `#9A3412`, Border `1px solid #FED7AA` (Orange).
- **Urgent**: Background `#FEE2E2`, Text `#991B1B`, Border `1px solid #FECACA` (Red).

---

## 5. Screen Layouts & Workflows

### 5.1 Application Shell & Navigation
- **Top Navigation Bar**: Fixed/sticky top bar with background `--color-primary-green` (`#006B3C`), height `60px`.
  - **Left**: TokTickIT logo icon and brand title in white (`font-weight: 700`).
  - **Center Navigation**:
    - **My Tickets**: Tab with icon; active state features secondary green highlight (`#0B7A46`), bottom border accent, or pill container.
    - **Create Ticket**: Button or tab linking to `/tickets/new`.
  - **Right (Requester Profile Badge)**:
    - User avatar badge with initials (e.g., "JA" for Jennifer Anderson).
    - User display name and department caption.
    - **"Change Requester" action**: Triggers the Development Requester selection modal.
- **Mobile Navigation**: Hamburger menu toggle or bottom tab bar (< 768px) keeping all primary actions accessible.

---

### 5.2 Development Requester Selection Screen / Modal
- **Context Banner**: Clear callout stating: *"Select a Development Requester to test requester-specific ticket behavior. This is for Lab 2 testing only and is not a secure login screen. Full authentication arrives in Lab 3."*
- **Selector Dropdown**: Standard select input populated dynamically with active requesters loaded from `/api/requesters/active`.
- **States**:
  - **Loading**: Dropdown disabled with "Loading active requesters..." text and spinner.
  - **Populated**: Lists options formatted as `${name} (${email}) - ${department}`.
  - **Empty State**: If no active users exist, renders a warning box: *"No active development requesters found in database. Run seed script."*
  - **API Failure State**: If request fails, displays red banner with *"Failed to load requesters. Check server connection"* and a "Retry" button.
- **Actions**: "Continue" button (primary green) setting client context and redirecting to `/tickets`.

---

### 5.3 Create Ticket Screen (Create Mode)
- **Layout Flow**:
  1. **Header Block**: Title *"Create New Support Ticket"*, breadcrumb link *`My Tickets > Create Ticket`*.
  2. **System-Generated / Read-Only Section**:
     - Grid containing:
       - **Requester Name**: Pre-filled from active context, non-editable.
       - **Ticket Date**: Pre-filled with today's date and time, non-editable.
       - **Initial Status**: Badge showing `New`, non-editable.
  3. **Classification Section**: Two-column layout on desktop:
     - **Category** (Select input, required `*`): Fetched dynamically from `/api/categories`.
     - **Related System** (Select input, required `*`): Fetched dynamically from `/api/related-systems`.
     - **Requested Priority** (Select input, required `*`): Low, Medium (default), High, Urgent.
  4. **Content Section**:
     - **Summary** (Text input, required `*`): Single-line input, placeholder *"Brief description of the problem..."*, character counter showing `current / 150`.
     - **Description** (Textarea, required `*`): Multi-line input, placeholder *"Provide detailed steps to reproduce the issue, error messages, and context..."*, character counter `current / 2000`.
  5. **Attachment Section**:
     - Drag-and-drop file upload target with upload icon and allowed formats notice: *"JPG, PNG, WEBP, PDF up to 5 MB each (max 5 active files)"*.
     - Staged file list preview cards showing file name, formatted size (e.g. `2.4 MB`), extension badge, and a "Remove" trash icon.
     - Inline file error messages if a file exceeds 5 MB or uses an unsupported MIME type.
  6. **Action Footer**:
     - "Submit Ticket" button (Primary Green, busy spinner when submitting).
     - "Cancel" button (Secondary outline, prompts confirmation if form is dirty).
- **Form Error Recovery**: If submission fails (e.g. network timeout or 500 error), an error alert displays at the top of the form, but **all entered field data and staged attachments remain preserved**.

---

### 5.4 My Tickets Screen
- **Header**: Title *"My Tickets"*, subtitle *"View and track all of your support requests"*, and a prominent "+ Create Ticket" button.
- **Filter & Search Toolbar**:
  - Search input with search icon: placeholder *"Search by ticket number or summary..."*.
  - Category dropdown filter (*All Categories*, *Account and Access*, etc.).
  - Priority dropdown filter (*All Priorities*, *Low*, *Medium*, *High*, *Urgent*).
  - Status dropdown filter (*All Statuses*, *New*, *In Progress*, *Resolved*, *Closed*).
  - "Clear Filters" button: Visible whenever search query or filters are active.
- **Desktop Table View ($\ge 992\text{px}$)**:
  - Columns:
    1. **Ticket No.** (Monospace bold, clickable link to `/tickets/:id`, sortable $\updownarrow$).
    2. **Created Date** (Formatted: `MMM DD, YYYY hh:mm A`, sortable $\updownarrow$).
    3. **Summary** (Truncated with ellipsis at 50 chars with full tooltip).
    4. **Category** (Text label).
    5. **Requested Priority** (Colored priority badge).
    6. **IT Priority** (Colored priority badge or *"Unassigned"* muted text).
    7. **Current Status** (Colored status pill badge).
    8. **Last Updated** (Formatted timestamp, sortable $\updownarrow$).
- **Mobile Card View ($< 768\text{px}$)**:
  - Table converts to vertically stacked cards.
  - Card Header: Ticket No (bold link) on left, Status badge on right.
  - Card Body: Summary (bold), Category and Related System tags.
  - Card Footer: Requested Priority badge, formatted Date, and arrow icon to view detail.
- **Pagination Controls**:
  - Left: *"Showing X to Y of Z tickets"*.
  - Center/Right: Page navigation (`< Previous`, `1`, `2`, `3`, ..., `Next >`) and Page Size selector (`10`, `20`, `50` per page).
- **Empty States**:
  - **Zero Tickets Owned**: Icon with clean message: *"You haven't submitted any support tickets yet."* with primary button *"Create Your First Ticket"*.
  - **Zero Search / Filter Matches**: Search icon with message: *"No tickets match your search filters."* with secondary button *"Clear All Filters"*.

---

### 5.5 Requester Ticket Detail Screen (View Mode) & Attachments
- **Navigation Bar**: Breadcrumb link *`< Back to My Tickets`*.
- **Header Summary Card**:
  - Ticket Number in large bold monospace font (`20px`).
  - Current Status Badge (`New`, etc.) and Requested Priority Badge prominently displayed.
  - Metadata Grid (all read-only with soft gray-green background):
    - Requester Name & Email
    - Category & Related System
    - Created Date & Last Updated Date
- **Problem Statement Card**:
  - **Summary**: Displayed in large semi-bold text.
  - **Description**: Formatted paragraph view retaining line breaks.
- **Attachments Manager Card**:
  - Section Header: *"Supporting Attachments (X / 5 Active)"* and "+ Add Attachment" button (disabled if 5 active attachments exist).
  - **Active Attachments List**:
    - File icon (PDF icon or image thumbnail preview).
    - Original file name and formatted file size (e.g. `1.8 MB`).
    - Upload timestamp.
    - Actions:
      - **"Download"** button (Secondary style with download icon, initiates direct file save).
      - **"Remove"** button (Destructive outline style).
  - **Soft-Removed Attachments List**:
    - Distinct grayed-out section with header *"Removed Attachments (Audit Log)"*.
    - File name displayed with strikethrough or muted text.
    - Badge: `"Removed"` (Gray/Amber).
    - Metadata display: *"Removed on [Date] by [Requester]. Reason: '[User-entered reason]'"*.
    - **Download button is disabled / replaced with padlock icon** indicating binary is no longer accessible.
- **Soft Removal Confirmation Modal**:
  - Dialog Title: *"Remove Attachment"*.
  - Warning copy: *"This file will be soft-removed from the ticket. The file record and your removal reason will remain visible for auditing purposes, but the file will no longer be downloadable."*
  - **Reason Input** (Required `*`): Textarea for removal reason (`min 3 characters`), placeholder *"Explain why this attachment is being removed..."*.
  - Inline error if submitted empty: *"A removal reason is required."*
  - Actions: "Cancel" (neutral) and "Confirm Removal" (Destructive red button).

---

## 6. Responsive Layout Breakpoints

| Viewport | Width Range | Layout Rules |
|---|---|---|
| **Desktop** | $\ge 992\text{px}$ | Multi-column grid, max-width `1200px` centered, full 8-column data table in My Tickets, side-by-side classification fields in Create Ticket. |
| **Tablet** | $768\text{px} - 991\text{px}$ | 2-column stacked form layout, search filter toolbar wraps into 2 rows, table shows primary columns with horizontal scroll or collapsed metadata. |
| **Mobile** | $< 768\text{px}$ | Single column vertical stack, touch-friendly buttons ($\ge 44\text{px}$ touch target height), table collapses into responsive ticket cards, zero horizontal scrolling. |

---

## 7. Accessibility & Keyboard Interaction Standards

- **Keyboard Navigation**:
  - All form controls, buttons, links, and modal elements must be reachable via `Tab` key in logical reading order.
  - Modals trap keyboard focus until dismissed with `Escape` or action buttons.
  - Custom dropdowns and menus operable via `Enter`, `Space`, and `Arrow` keys.
- **Focus Indicators**: Every interactive control displays a visible `2px` or `3px` focus ring using `--color-secondary-green` (`#0B7A46`) with high contrast against the background.
- **Non-Color Indicators**: Information is never conveyed through color alone:
  - Error states combine red borders with text error messages and warning icons.
  - Status badges include explicit text labels (e.g. "NEW", "IN PROGRESS") alongside colors.
  - Required fields use an asterisk `*` with an `aria-required="true"` attribute.
- **ARIA Attributes**:
  - In-flight submit buttons feature `aria-busy="true"`.
  - Modals use `role="dialog"`, `aria-modal="true"`, and `aria-labelledby`.
  - Screen reader announcements for validation failures via `aria-live="polite"`.

---

## 8. Visual Inspection Checklist & Screenshot Deliverables

Before finalizing Lab 2, the following automated Playwright screenshot suite must be executed and verified against the criteria:

### 8.1 Screenshot Deliverable Paths
- **Create Ticket**:
  - `artifacts/lab-02/screenshots/create-ticket/desktop-initial.png`
  - `artifacts/lab-02/screenshots/create-ticket/desktop-validation-error.png`
  - `artifacts/lab-02/screenshots/create-ticket/desktop-submitting-busy.png`
  - `artifacts/lab-02/screenshots/create-ticket/desktop-success.png`
  - `artifacts/lab-02/screenshots/create-ticket/mobile-view.png`
- **My Tickets**:
  - `artifacts/lab-02/screenshots/my-tickets/desktop-populated-table.png`
  - `artifacts/lab-02/screenshots/my-tickets/desktop-filtered-search.png`
  - `artifacts/lab-02/screenshots/my-tickets/desktop-empty-state.png`
  - `artifacts/lab-02/screenshots/my-tickets/mobile-cards-view.png`
- **Ticket Detail & Attachments**:
  - `artifacts/lab-02/screenshots/ticket-detail/desktop-detail-view.png`
  - `artifacts/lab-02/screenshots/ticket-detail/desktop-attachment-soft-removed.png`
  - `artifacts/lab-02/screenshots/ticket-detail/desktop-remove-modal.png`
  - `artifacts/lab-02/screenshots/ticket-detail/mobile-detail-view.png`

### 8.2 Visual Inspection Checklist
- [ ] Primary Green `#006B3C` and Secondary Green `#0B7A46` applied accurately to headers, buttons, and tabs.
- [ ] Clear visual differentiation between editable white inputs and soft gray-green `#EEF2EE` read-only inputs.
- [ ] Required asterisks displayed in red (`#DC2626`) directly following field labels.
- [ ] Field-level error messages appear directly below the erroneous input, never as a detached generic list.
- [ ] Submit button displays animated spinner and disabled styling while processing.
- [ ] No text clipping, overlapping boxes, or awkward wrapping on any viewport.
- [ ] Zero horizontal scrollbars at 375px (iPhone), 768px (iPad), and 1200px (Desktop).
- [ ] Removed attachments display soft-deletion reason, removal date, and non-clickable download links.
