import { expect, type APIRequestContext, type Page } from '@playwright/test';

/**
 * Shared fixtures for the Lab 3 end-to-end suites (AC-8.1 - AC-8.4).
 *
 * The client talks to the API directly on port 3000 (see `VITE_API_URL` in
 * `client/src/api.ts`), so the API helpers below intentionally bypass the Vite
 * proxy and target the same origin the browser uses.
 *
 * This module is not a spec file, so Playwright's default `**\/*.spec.ts` test
 * match will not collect it as a suite.
 */

export const API_BASE = 'http://localhost:3000';

/** Development password for every account created by `server/prisma/seed.ts`. */
export const DEV_PASSWORD = 'Password123!';

/**
 * Temporary password used to force a first-login password change through the
 * admin reset endpoint, which always sets `requiresPasswordChange = true`.
 */
export const TEMP_PASSWORD = 'E2eTempPass2026!';

/** Compliant password (>= 8 chars, mixed case, digit, symbol) per BR-03. */
export const STRONG_PASSWORD = 'E2eStrongPass2026!';

export const ACCOUNTS = {
  requester: { email: 'jennifer.anderson@kmutt.ac.th', name: 'Jennifer Anderson' },
  secondRequester: { email: 'sarah.johnson@kmutt.ac.th', name: 'Sarah Johnson' },
  inactiveRequester: { email: 'robert.taylor@kmutt.ac.th', name: 'Robert Taylor' },
  /** Seeded with `requiresPasswordChange = true` for the UI password-change suite. */
  passwordChangeStaff: { email: 'alex.turner@toktickit.kmutt.ac.th', name: 'Alex Turner' },
  /** Used for the full staff ticket lifecycle journey. */
  lifecycleStaff: { email: 'kevin.patel@toktickit.kmutt.ac.th', name: 'Kevin Patel' },
  /** Second active IT Staff member, used as a reassignment target. */
  reassignmentStaff: { email: 'jessica.miller@toktickit.kmutt.ac.th', name: 'Jessica Miller' },
  admin: { email: 'admin@toktickit.kmutt.ac.th', name: 'System Admin' },
} as const;

export interface ApiUser {
  id: number;
  name: string;
  email: string;
  role: 'REQUESTER' | 'IT_STAFF' | 'ADMIN';
  isActive: boolean;
  requiresPasswordChange: boolean;
}

export interface ApiTicket {
  id: number;
  ticketNo: string;
  summary: string;
  currentStatus: string;
  requestedPriority: string;
  itPriority: string | null;
}

// ─── API helpers ─────────────────────────────────────────────────────────────

export async function apiLogin(
  request: APIRequestContext,
  email: string,
  password: string
): Promise<{ token: string; user: ApiUser }> {
  const response = await request.post(`${API_BASE}/api/auth/login`, {
    data: { email, password },
  });
  expect(response.status(), `Expected login to succeed for ${email}`).toBe(200);
  const body = await response.json();
  return { token: body.token as string, user: body.user as ApiUser };
}

export async function apiLoginExpectingStatus(
  request: APIRequestContext,
  email: string,
  password: string
): Promise<{ status: number; body: any }> {
  const response = await request.post(`${API_BASE}/api/auth/login`, {
    data: { email, password },
  });
  return { status: response.status(), body: await response.json().catch(() => ({})) };
}

export async function apiGet(
  request: APIRequestContext,
  token: string,
  path: string
): Promise<{ status: number; body: any }> {
  const response = await request.get(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return { status: response.status(), body: await response.json().catch(() => ({})) };
}

export async function apiPatch(
  request: APIRequestContext,
  token: string,
  path: string,
  data: unknown
): Promise<{ status: number; body: any }> {
  const response = await request.patch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data,
  });
  return { status: response.status(), body: await response.json().catch(() => ({})) };
}

export async function apiPost(
  request: APIRequestContext,
  token: string,
  path: string,
  data: unknown
): Promise<{ status: number; body: any }> {
  const response = await request.post(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data,
  });
  return { status: response.status(), body: await response.json().catch(() => ({})) };
}

/** Signs in as the seeded Administrator and returns a session token. */
export async function apiAdminToken(request: APIRequestContext): Promise<string> {
  const { token } = await apiLogin(request, ACCOUNTS.admin.email, DEV_PASSWORD);
  return token;
}

export async function apiFindUserId(
  request: APIRequestContext,
  adminToken: string,
  email: string
): Promise<number> {
  const { status, body } = await apiGet(
    request,
    adminToken,
    `/api/admin/users?search=${encodeURIComponent(email)}`
  );
  expect(status, 'User directory search should succeed').toBe(200);
  const match = (body as ApiUser[]).find(
    (user) => user.email.toLowerCase() === email.toLowerCase()
  );
  expect(match, `Seeded account ${email} should exist in the user directory`).toBeTruthy();
  return match!.id;
}

/**
 * Resolves the `categoryId` and `relatedSystemId` needed to open a ticket,
 * looked up by their seeded display names so the fixtures stay id-independent.
 */
export async function apiResolveReferenceIds(
  request: APIRequestContext,
  token: string,
  categoryName: string,
  systemName: string
): Promise<{ categoryId: number; relatedSystemId: number }> {
  const categoriesResponse = await request.get(`${API_BASE}/api/categories`);
  expect(categoriesResponse.status(), 'Categories should be readable').toBe(200);
  const categories = (await categoriesResponse.json()) as Array<{ id: number; name: string }>;
  const category = categories.find((entry) => entry.name === categoryName);
  expect(category, `Seeded category "${categoryName}" should exist`).toBeTruthy();

  // NB: the collection lives at `/api/related-systems` (as CreateTicketForm
  // calls it). `/api/tickets/related-systems` is captured by the `/tickets/:id`
  // route and answers 400 "Invalid ticket ID".
  const { status, body } = await apiGet(request, token, '/api/related-systems');
  expect(status, 'Related systems should be readable').toBe(200);
  const system = (body as Array<{ id: number; name: string }>).find(
    (entry) => entry.name === systemName
  );
  expect(system, `Seeded related system "${systemName}" should exist`).toBeTruthy();

  return { categoryId: category!.id, relatedSystemId: system!.id };
}

/** Opens a fresh `NEW` ticket owned by nobody, as the given Requester. */
export async function apiCreateTicket(
  request: APIRequestContext,
  requesterToken: string,
  input: {
    summary: string;
    description: string;
    categoryId: number;
    relatedSystemId: number;
    requestedPriority?: 'LOW' | 'MEDIUM' | 'HIGH';
  }
): Promise<ApiTicket> {
  const response = await request.post(`${API_BASE}/api/tickets`, {
    headers: {
      Authorization: `Bearer ${requesterToken}`,
      'Content-Type': 'application/json',
    },
    data: {
      categoryId: input.categoryId,
      relatedSystemId: input.relatedSystemId,
      requestedPriority: input.requestedPriority ?? 'MEDIUM',
      summary: input.summary,
      description: input.description,
    },
  });
  expect(response.status(), 'Requester should be able to open a ticket').toBe(201);
  return (await response.json()) as ApiTicket;
}

/**
 * Admin password reset (AC-7.3 / BR-22).
 *
 * The server always sets `requiresPasswordChange = true` and clears any failed
 * login counter, which makes this the deterministic way to place a seeded
 * account back into the "must change password at next login" state.
 */
export async function apiResetPasswordForUser(
  request: APIRequestContext,
  adminToken: string,
  userId: number,
  newInitialPassword: string
): Promise<{ status: number; body: any }> {
  return apiPost(request, adminToken, `/api/admin/users/${userId}/reset-password`, {
    newInitialPassword,
  });
}

/**
 * Provisions a seeded staff account that can sign straight into the IT Staff
 * application shell.
 *
 * `apiResetPasswordForUser` always flags `requiresPasswordChange = true`, so
 * the flag is cleared here by driving the documented first-login
 * `POST /api/auth/change-password` endpoint. Doing both steps through the API
 * keeps every spec's sign-in deterministic and lets the suite be re-run any
 * number of times without re-seeding the database.
 */
export async function provisionLoginReadyStaff(
  request: APIRequestContext,
  email: string,
  strongPassword: string
): Promise<number> {
  const adminToken = await apiAdminToken(request);
  const userId = await apiFindUserId(request, adminToken, email);

  const reset = await apiResetPasswordForUser(request, adminToken, userId, TEMP_PASSWORD);
  expect(reset.status, 'Admin password reset should succeed').toBe(200);
  expect(reset.body.requiresPasswordChange, 'Reset must flag a first-login change').toBe(true);

  const { token } = await apiLogin(request, email, TEMP_PASSWORD);
  const change = await apiPost(request, token, '/api/auth/change-password', {
    currentPassword: TEMP_PASSWORD,
    newPassword: strongPassword,
  });
  expect(change.status, 'First-login password change should succeed').toBe(200);
  expect(change.body.requiresPasswordChange, 'Flag should clear after the change').toBe(false);

  await apiPost(request, token, '/api/auth/logout', {});
  return userId;
}

// ─── UI helpers ──────────────────────────────────────────────────────────────

/**
 * Signs in through the real Login form from a clean client state.
 *
 * Both storage channels are cleared. `POST /api/auth/login` also sets an
 * httpOnly `toktickit_session` cookie, and `page.request` shares the browser
 * context's cookie jar, so an API-driven login earlier in a test would
 * otherwise re-authenticate the page and skip the Sign In screen entirely.
 *
 * `exact: true` on the submit button matters: the label flips to
 * "Signing In..." while the request is in flight, which a loose regex would
 * also match.
 */
export async function uiSignIn(page: Page, email: string, password: string): Promise<void> {
  await page.context().clearCookies();
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Sign In', exact: true })).toBeVisible();
  await page.getByLabel(/email address/i).fill(email);
  await page.getByLabel(/password \*/i).fill(password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
}

export async function uiReadStoredToken(page: Page): Promise<string | null> {
  return page.evaluate(() => localStorage.getItem('toktickit_auth_token'));
}

/**
 * Completes the mandatory first-login password change form.
 * Used by the suite that intentionally signs in with a freshly reset account.
 */
export async function uiCompleteMandatoryPasswordChange(
  page: Page,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  await page.getByLabel(/current \(temporary\) password \*/i).fill(currentPassword);
  await page.getByLabel('New Password *', { exact: true }).fill(newPassword);
  await page.getByLabel(/confirm new password \*/i).fill(newPassword);
  await page.getByRole('button', { name: 'Update Password', exact: true }).click();
}
