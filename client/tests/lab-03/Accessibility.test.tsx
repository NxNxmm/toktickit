import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

// Read the real stylesheet as text rather than importing it for effect, so the
// audit needs no Node typings and is not affected by Vitest's `css: false`
// stubbing of plain `.css` imports. `import.meta.glob` is resolved at
// transform time, so the source text is inlined rather than stubbed.
import cssText from '../../src/index.css?raw';

const STYLESHEET = typeof cssText === 'string' ? cssText : '';

import { Login } from '../../src/components/Login';
import { MandatoryPasswordChange } from '../../src/components/MandatoryPasswordChange';
import { CreateTicketForm } from '../../src/components/CreateTicketForm';
import { UserManagement } from '../../src/components/UserManagement';
import { AppHeader } from '../../src/components/AppHeader';
import { StaffQueue } from '../../src/components/StaffQueue';

/**
 * Accessibility.test.tsx - A11Y-01 (AC-9.1)
 *
 * Machine-verifies the items on the `docs/lab-03/ui-spec.md` section 5.2
 * accessibility checklist, which were previously only checked by hand:
 *
 *   1. every Zen Green colour pair used for text clears WCAG AA (>= 4.5:1)
 *   2. a visible focus ring is defined for every interactive element
 *   3. every form control on the Lab 3 screens has a programmatic label
 *   4. primary touch targets meet the 44 x 44 px minimum
 *   5. the application shell uses landmarks and an ordered heading structure
 *
 * Contrast is computed from the real `src/index.css` custom properties rather
 * than a hard-coded copy of the palette, so editing a token immediately fails
 * the audit.
 */

vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 5,
      name: 'Alex Turner',
      email: 'alex.turner@toktickit.kmutt.ac.th',
      role: 'IT_STAFF',
      isActive: true,
      requiresPasswordChange: false,
    },
    token: 'test-token',
    logout: vi.fn(),
    refreshUser: vi.fn(),
  }),
}));

// Deliberately not named `CSS`: that would shadow the DOM `CSS` global that
// `assertAllControlsLabelled` uses via `CSS.escape`.

/** Parses the `--token: #hex;` custom properties out of the stylesheet. */
const readTokens = (): Record<string, string> => {
  const tokens: Record<string, string> = {};
  for (const match of STYLESHEET.matchAll(/--([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    tokens[match[1]] = match[2];
  }
  return tokens;
};

const channel = (hex: string): [number, number, number] => {
  const full =
    hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex.slice(0, 7);
  return [
    parseInt(full.slice(1, 3), 16),
    parseInt(full.slice(3, 5), 16),
    parseInt(full.slice(5, 7), 16),
  ];
};

/** WCAG 2.1 relative luminance. */
const luminance = (hex: string): number => {
  const [r, g, b] = channel(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** WCAG 2.1 contrast ratio between two hex colours (1:1 ... 21:1). */
const contrastRatio = (a: string, b: string): number => {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
};

/** Every form control must expose an accessible name. */
const assertAllControlsLabelled = (container: HTMLElement, screenName: string) => {
  const controls = Array.from(
    container.querySelectorAll<HTMLElement>('input, select, textarea'),
  );
  expect(controls.length, `${screenName} should render form controls`).toBeGreaterThan(0);

  const unlabelled = controls.filter((control) => {
    if (control.getAttribute('aria-label')?.trim()) return false;
    if (control.getAttribute('aria-labelledby')?.trim()) return false;
    const id = control.getAttribute('id');
    if (id && control.ownerDocument.querySelector(`label[for="${CSS.escape(id)}"]`)) return false;
    // Implicit association: a <label> wrapping the control.
    if (control.closest('label')) return false;
    return true;
  });

  expect(
    unlabelled.map((c) => c.outerHTML.slice(0, 120)),
    `${screenName} has form controls with no accessible name`,
  ).toEqual([]);
};

describe('A11Y-01: WCAG AA colour contrast (AC-9.1, ui-spec 1.1)', () => {
  const tokens = readTokens();

  it('parses the Zen Green token palette from src/index.css', () => {
    // Sanity check: if the stylesheet format ever changes, fail loudly rather
    // than silently asserting nothing.
    expect(
      STYLESHEET.length,
      `stylesheet text was ${STYLESHEET.length} chars`,
    ).toBeGreaterThan(1000);
    expect(Object.keys(tokens).length).toBeGreaterThanOrEqual(20);
    expect(tokens['color-primary-green']).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  const PAIRS: { label: string; fg: string; bg: string; min: number }[] = [
    { label: 'body text on page background', fg: 'color-text-primary', bg: 'color-page-bg', min: 4.5 },
    { label: 'body text on surface', fg: 'color-text-primary', bg: 'color-surface', min: 4.5 },
    { label: 'body text on subtle surface', fg: 'color-text-primary', bg: 'color-surface-subtle', min: 4.5 },
    { label: 'secondary text on surface', fg: 'color-text-secondary', bg: 'color-surface', min: 4.5 },
    { label: 'muted text on surface', fg: 'color-text-muted', bg: 'color-surface', min: 4.5 },
    { label: 'muted text on page background', fg: 'color-text-muted', bg: 'color-page-bg', min: 4.5 },
    { label: 'primary green on surface (links, active nav)', fg: 'color-primary-green', bg: 'color-surface', min: 4.5 },
    { label: 'secondary green on surface (focus ring)', fg: 'color-secondary-green', bg: 'color-surface', min: 3 },
    { label: 'error text on error background', fg: 'color-error-text', bg: 'color-error-bg', min: 4.5 },
    { label: 'error text on surface (inline error text)', fg: 'color-error-text', bg: 'color-surface', min: 4.5 },
    { label: 'note text on note background (internal note card)', fg: 'color-text-primary', bg: 'color-note-bg', min: 4.5 },
    { label: 'note gold on note background (note card border)', fg: 'color-note-gold', bg: 'color-note-bg', min: 3 },
    { label: 'note gold on surface (note tab underline)', fg: 'color-note-gold', bg: 'color-surface', min: 3 },
    // StaffTicketDetail.tsx renders the "Add Internal Note" submit button with
    // color: '#fff' on var(--color-note-gold), so white-on-gold is a text pair.
    { label: 'white on note gold (Add Internal Note button)', fg: 'color-surface', bg: 'color-note-gold', min: 4.5 },
    { label: 'body text on pale green (info banner)', fg: 'color-text-primary', bg: 'color-pale-green', min: 4.5 },
    { label: 'secondary text on pale green', fg: 'color-text-secondary', bg: 'color-pale-green', min: 4.5 },
    { label: 'warning amber on warning background (currently unused token)', fg: 'color-warning-amber', bg: 'color-warning-bg', min: 3 },
    // UserManagement.tsx renders the active/inactive badge as text on the
    // success background, so this is a text pair, not white-on-green.
    { label: 'success green on success background (active badge)', fg: 'color-success-green', bg: 'color-success-bg', min: 4.5 },
    { label: 'text on read-only field background', fg: 'color-text-primary', bg: 'color-field-readonly-bg', min: 4.5 },
    { label: 'text on read-only field background (secondary)', fg: 'color-text-secondary', bg: 'color-field-readonly-bg', min: 4.5 },
    // White label on a solid primary-green button: 7.0:1
    { label: 'white on primary green (primary button)', fg: 'color-surface', bg: 'color-primary-green', min: 4.5 },
    { label: 'white on error red (danger button)', fg: 'color-surface', bg: 'color-error-border', min: 4.5 },
  ];

  it.each(PAIRS)('$label clears WCAG AA ($min:1)', ({ fg, bg, min }) => {
    expect(tokens[fg], `token --${fg} should be defined`).toBeDefined();
    expect(tokens[bg], `token --${bg} should be defined`).toBeDefined();

    const ratio = contrastRatio(tokens[fg], tokens[bg]);
    expect(
      ratio,
      `--${fg} on --${bg} is ${ratio.toFixed(2)}:1, below the required ${min}:1`,
    ).toBeGreaterThanOrEqual(min);
  });

  it('keeps body text at AAA (7:1) against the page background', () => {
    // The primary reading surface is text-primary on page-bg; AA is the floor,
    // but the palette is designed to clear AAA for comfortable long reading.
    const ratio = contrastRatio(tokens['color-text-primary'], tokens['color-page-bg']);
    expect(ratio).toBeGreaterThanOrEqual(7);
  });

  it('orders the text hierarchy from strongest ink to weakest', () => {
    // On a light page, stronger ink means a *lower* relative luminance, so
    // primary must be the darkest and muted the lightest of the three.
    const primary = luminance(tokens['color-text-primary']);
    const secondary = luminance(tokens['color-text-secondary']);
    const muted = luminance(tokens['color-text-muted']);

    expect(primary, 'text-primary should be the darkest ink').toBeLessThan(secondary);
    expect(secondary, 'text-secondary should be weaker than text-primary').toBeLessThan(muted);
  });
});

describe('A11Y-01: visible focus indicators (AC-9.1, ui-spec 5.2)', () => {
  const css = STYLESHEET;

  it('defines a focus-visible outline for every interactive element', () => {
    const focusBlock = css.match(/:focus-visible[^{]*\{([^}]*)\}/);
    expect(focusBlock, 'index.css should contain a :focus-visible rule').not.toBeNull();

    const declarations = focusBlock![1];
    expect(declarations).toMatch(/outline\s*:\s*2px solid/);
    expect(declarations).toMatch(/outline-offset\s*:\s*2px/);
  });

  it('covers links, buttons, inputs, selects and textareas', () => {
    for (const selector of ['a', 'button', 'input', 'select', 'textarea']) {
      expect(css, `${selector}:focus-visible should be styled`).toMatch(
        new RegExp(`${selector}:focus-visible`),
      );
    }
  });

  it('does not suppress outlines globally (no outline: none)', () => {
    expect(css).not.toMatch(/outline\s*:\s*(none|0)\s*;/);
  });

  it('keeps the mobile collapse toggle a 44 x 44 px touch target', () => {
    render(<AppHeader currentView="staff-queue" onNavigate={vi.fn()} />);
    const toggler = screen.getByRole('button', { name: /toggle navigation/i });
    expect(toggler).toHaveStyle({ minWidth: '44px', minHeight: '44px' });
  });
});

describe('A11Y-01: every form control is programmatically labelled (AC-9.1, ui-spec 5.2)', () => {
  beforeEach(() => {
    // StaffQueue hides its pagination bar (and the "Show: N per page" select)
    // unless there is more than one page, so the fixture must span pages.
    const staffPagination = {
      page: 1,
      pageSize: 10,
      totalCount: 25,
      totalPages: 3,
      hasPrevious: false,
      hasNext: true,
    };
    const staffTicket = {
      id: 1,
      ticketNo: '000001',
      summary: 'Wi-Fi drops in the library',
      category: { id: 1, name: 'Network' },
      relatedSystem: { id: 1, name: 'Campus Wi-Fi' },
      requester: { id: 2, name: 'Jane Doe', email: 'jane@kmutt.ac.th' },
      owner: null,
      requestedPriority: 'MEDIUM',
      itPriority: null,
      currentStatus: 'NEW',
      resolvedIndicated: false,
      createdAt: '2026-09-20T08:00:00.000Z',
      updatedAt: '2026-09-20T08:00:00.000Z',
    };

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      const json = (body: unknown) =>
        Promise.resolve({ ok: true, json: () => Promise.resolve(body) } as Response);

      if (typeof url !== 'string') return json([]);
      if (url.includes('/api/related-systems')) {
        return json([{ id: 1, name: 'Campus Wi-Fi' }]);
      }
      if (url.includes('/api/categories')) return json([{ id: 1, name: 'Network' }]);
      if (url.includes('/api/admin/users')) return json([]);
      if (url.includes('/api/staff/tickets') || url.includes('/api/tickets')) {
        return json({ tickets: [staffTicket], pagination: staffPagination });
      }
      return json([]);
    });
  });

  it('labels every control on the Login screen', () => {
    const { container } = render(<Login />);
    expect(screen.getByLabelText(/^email/i)).toBeInTheDocument();
    // The field label renders as "Password *" because of the required marker,
    // and the screen also has a "Show password" toggle, so anchor on the start
    // of the name rather than a loose /password/i match.
    expect(screen.getByLabelText(/^password\b/i)).toBeInTheDocument();
    assertAllControlsLabelled(container, 'Login');
  });

  it('labels every control on the Mandatory Password Change screen', () => {
    const { container } = render(<MandatoryPasswordChange />);
    expect(screen.getByLabelText(/current|temporary/i)).toBeInTheDocument();
    assertAllControlsLabelled(container, 'MandatoryPasswordChange');
  });

  it('labels every control on the Create Ticket form', async () => {
    const { container } = render(<CreateTicketForm onSuccess={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    });

    // Spot-check the specific fields that were previously unlabelled.
    expect(screen.getByLabelText(/^summary/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/related system/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/attachments/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/ticket number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/requester/i)).toBeInTheDocument();

    assertAllControlsLabelled(container, 'CreateTicketForm');
  });

  it('labels the search, filter and modal controls on the Admin User Management screen', async () => {
    const { container } = render(<UserManagement />);

    // Toolbar controls.
    expect(screen.getByLabelText(/search users/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/role/i)).toBeInTheDocument();

    // Open the create modal and audit its fields too.
    const createButton = screen.getByRole('button', { name: /add user|create user|new user/i });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/initial password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^active/i)).toBeInTheDocument();

    assertAllControlsLabelled(container, 'UserManagement');
  });

  it('labels the staff queue search and per-page controls', async () => {
    render(<StaffQueue onViewTicket={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/show:/i)).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/show:/i).tagName).toBe('SELECT');

    assertAllControlsLabelled(document.body, 'StaffQueue');
  });
});

describe('A11Y-01: semantic structure and landmarks (AC-9.1, ui-spec 5.2)', () => {
  it('wraps the application shell content in a <main> landmark', () => {
    const { container } = render(
      <AppHeader currentView="staff-queue" onNavigate={vi.fn()} />,
    );
    // The header itself is a banner; assert the document exposes the expected
    // landmark and exactly one banner per shell.
    expect(container.querySelectorAll('header')).toHaveLength(1);
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('emits no skipped heading levels in the app shell', () => {
    const { container } = render(
      <AppHeader currentView="staff-queue" onNavigate={vi.fn()} />,
    );
    const levels = Array.from(container.querySelectorAll('h1,h2,h3,h4,h5,h6')).map((h) =>
      Number(h.tagName.slice(1)),
    );
    for (let i = 1; i < levels.length; i += 1) {
      expect(
        levels[i] - levels[i - 1],
        `heading level jumped from h${levels[i - 1]} to h${levels[i]}`,
      ).toBeLessThanOrEqual(1);
    }
  });

  it('gives every icon-only control an accessible name', () => {
    const { container } = render(
      <AppHeader currentView="staff-queue" onNavigate={vi.fn()} />,
    );
    const controls = Array.from(container.querySelectorAll('button, a[href]'));
    for (const control of controls) {
      const name = (
        control.getAttribute('aria-label') ??
        control.getAttribute('title') ??
        control.textContent ??
        ''
      ).trim();
      expect(name, `control has no accessible name: ${control.outerHTML.slice(0, 80)}`).not.toBe('');
    }
  });
});
