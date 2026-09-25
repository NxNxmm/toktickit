const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface Category {
  id: number;
  name: string;
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

export async function checkSystem(): Promise<SystemStatus> {
  // 1. Check health status
  const healthRes = await fetch(`${API_URL}/api/health`);
  if (!healthRes.ok) {
    throw new Error("Backend system is unavailable");
  }

  // 2. Fetch categories
  const categoriesRes = await fetch(`${API_URL}/api/categories`);
  if (!categoriesRes.ok) {
    throw new Error("Failed to fetch categories");
  }
  const categories: Category[] = await categoriesRes.json();

  // 3. Return online status alongside categories data
  return {
    online: true,
    categories,
  };
}

export type Role = 'REQUESTER' | 'IT_STAFF' | 'ADMIN';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  requiresPasswordChange: boolean;
}

// Add a reusable apiFetch helper
export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  requesterId?: number | null
): Promise<T> {
  const headers = new Headers(options.headers || {});

  // Auth Bearer token
  const token = localStorage.getItem('toktickit_auth_token');
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Backward compatibility with Lab 2 testing requester (only if not authenticated)
  const currentId = requesterId ?? (() => {
    const saved = localStorage.getItem('toktickit_selected_requester');
    return saved ? JSON.parse(saved).id : null;
  })();

  if (!token && currentId && !headers.has('X-Requester-Id')) {
    headers.set('X-Requester-Id', String(currentId));
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const err: any = new Error(errorData.message || `API error: ${res.statusText}`);
    err.statusCode = res.status;
    err.errorData = errorData;
    throw err;
  }

  return res.json();
}

export async function loginApi(email: string, password: string): Promise<{ user: User; token: string }> {
  return apiFetch<{ user: User; token: string }>('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

export async function getMeApi(): Promise<User> {
  return apiFetch<User>('/api/auth/me', {
    method: 'GET',
  });
}

export async function logoutApi(): Promise<{ message: string }> {
  return apiFetch<{ message: string }>('/api/auth/logout', {
    method: 'POST',
  });
}

export async function changePasswordApi(
  currentPassword: string,
  newPassword: string
): Promise<{ message: string; requiresPasswordChange: boolean }> {
  return apiFetch<{ message: string; requiresPasswordChange: boolean }>('/api/auth/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TicketStatus = 'NEW' | 'OPEN' | 'IN_PROGRESS' | 'WAITING_FOR_REQUESTER' | 'RESOLVED' | 'CLOSED' | 'REOPENED' | 'CANCELLED';

export interface TicketListItem {
  id: number;
  ticketNo: string;
  summary: string;
  category: { id: number; name: string };
  relatedSystem: { id: number; name: string };
  requestedPriority: Priority;
  itPriority: Priority | null;
  currentStatus: TicketStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TicketPagination {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export interface GetTicketsResponse {
  items: TicketListItem[];
  pagination: TicketPagination;
}

export interface GetTicketsParams {
  search?: string;
  categoryId?: number | string;
  requestedPriority?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export async function getTickets(
  params: GetTicketsParams = {},
  requesterId?: number | null
): Promise<GetTicketsResponse> {
  const query = new URLSearchParams();
  if (params.search && params.search.trim()) query.set('search', params.search.trim());
  if (params.categoryId) query.set('categoryId', String(params.categoryId));
  if (params.requestedPriority) query.set('requestedPriority', params.requestedPriority);
  if (params.status) query.set('status', params.status);
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.sortOrder) query.set('sortOrder', params.sortOrder);
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));

  const queryString = query.toString();
  const endpoint = `/api/tickets${queryString ? `?${queryString}` : ''}`;
  return apiFetch<GetTicketsResponse>(endpoint, {}, requesterId);
}

// ─── Issue 6 Types ────────────────────────────────────────────────────────────

export interface Attachment {
  id: number;
  originalName: string;
  fileSize: number;
  mimeType: string;
  isRemoved: boolean;
  removedAt: string | null;
  removalReason: string | null;
  createdAt: string;
}

export interface PublicComment {
  id: number;
  ticketId: number;
  author: {
    id: number;
    name: string;
    role: string;
  };
  content: string;
  createdAt: string;
}

export interface TicketDetail {
  id: number;
  ticketNo: string;
  requesterId: number;
  requester: { id: number; name: string; email: string };
  ownerId?: number | null;
  owner?: { id: number; name: string; email: string } | null;
  categoryId: number;
  category: { id: number; name: string };
  relatedSystemId: number;
  relatedSystem: { id: number; name: string };
  summary: string;
  description: string;
  requestedPriority: Priority;
  itPriority: Priority | null;
  currentStatus: TicketStatus;
  resolvedIndicated?: boolean;
  resolvedIndicatedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  attachments: Attachment[];
  publicComments?: PublicComment[];
}

export async function getTicketById(
  id: number,
  requesterId?: number | null
): Promise<TicketDetail> {
  return apiFetch<TicketDetail>(`/api/tickets/${id}`, {}, requesterId);
}

export async function getPublicComments(
  ticketId: number,
  requesterId?: number | null
): Promise<PublicComment[]> {
  return apiFetch<PublicComment[]>(`/api/tickets/${ticketId}/comments`, {}, requesterId);
}

export async function postPublicComment(
  ticketId: number,
  content: string,
  requesterId?: number | null
): Promise<PublicComment> {
  return apiFetch<PublicComment>(
    `/api/tickets/${ticketId}/comments`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    },
    requesterId
  );
}

export async function postResolveIndication(
  ticketId: number,
  requesterId?: number | null
): Promise<{ message: string; resolvedIndicated: boolean; resolvedIndicatedAt: string }> {
  return apiFetch<{ message: string; resolvedIndicated: boolean; resolvedIndicatedAt: string }>(
    `/api/tickets/${ticketId}/resolve-indication`,
    {
      method: 'POST',
    },
    requesterId
  );
}

export async function uploadAttachment(
  ticketId: number,
  file: File,
  requesterId?: number | null
): Promise<Attachment & { ticketId: number }> {
  const token = localStorage.getItem('toktickit_auth_token');
  const saved = localStorage.getItem('toktickit_selected_requester');
  const currentId = requesterId ?? (saved ? JSON.parse(saved).id : null);

  const formData = new FormData();
  formData.append('file', file);

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (currentId) {
    headers['X-Requester-Id'] = String(currentId);
  }

  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const err: any = new Error(errorData.message || `Upload failed: ${res.statusText}`);
    err.statusCode = res.status;
    throw err;
  }

  return res.json();
}

export async function downloadAttachmentBlob(
  attachmentId: number,
  requesterId?: number | null
): Promise<{ blob: Blob; filename: string; mimeType: string }> {
  const token = localStorage.getItem('toktickit_auth_token');
  const saved = localStorage.getItem('toktickit_selected_requester');
  const currentId = requesterId ?? (saved ? JSON.parse(saved).id : null);

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (currentId) {
    headers['X-Requester-Id'] = String(currentId);
  }

  const res = await fetch(`${API_URL}/api/attachments/${attachmentId}/download`, {
    credentials: 'include',
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const err: any = new Error(errorData.message || `Download failed: ${res.statusText}`);
    err.statusCode = res.status;
    err.errorData = errorData;
    throw err;
  }

  const blob = await res.blob();
  const contentDisposition = res.headers.get('content-disposition') ?? '';
  const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
  const filename = filenameMatch ? filenameMatch[1] : 'download';
  const mimeType = res.headers.get('content-type') ?? blob.type;

  return { blob, filename, mimeType };
}

export async function softRemoveAttachment(
  attachmentId: number,
  reason: string,
  requesterId?: number | null
): Promise<{ id: number; ticketId: number; originalName: string; isRemoved: boolean; removedAt: string; removalReason: string }> {
  return apiFetch(
    `/api/attachments/${attachmentId}/remove`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) },
    requesterId
  );
}

// ─── Issue 5: IT Staff Ticket Queue Types & API ───────────────────────────────

export interface StaffTicketListItem {
  id: number;
  ticketNo: string;
  summary: string;
  category: { id: number; name: string };
  relatedSystem: { id: number; name: string };
  requester: { id: number; name: string; email: string };
  owner: { id: number; name: string; email: string } | null;
  requestedPriority: Priority;
  itPriority: Priority | null;
  currentStatus: TicketStatus;
  resolvedIndicated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StaffTicketQueueResponse {
  tickets: StaffTicketListItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasPrevious: boolean;
    hasNext: boolean;
  };
}

export interface GetStaffTicketsParams {
  search?: string;
  categoryId?: number | string;
  status?: string;
  requestedPriority?: string;
  itPriority?: string;
  ownerId?: number | string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export async function getStaffTickets(
  params: GetStaffTicketsParams = {}
): Promise<StaffTicketQueueResponse> {
  const query = new URLSearchParams();
  if (params.search && params.search.trim()) query.set('search', params.search.trim());
  if (params.categoryId) query.set('categoryId', String(params.categoryId));
  if (params.status) query.set('status', params.status);
  if (params.requestedPriority) query.set('requestedPriority', params.requestedPriority);
  if (params.itPriority) query.set('itPriority', params.itPriority);
  if (params.ownerId !== undefined && params.ownerId !== '') query.set('ownerId', String(params.ownerId));
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.sortOrder) query.set('sortOrder', params.sortOrder);
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));

  const queryString = query.toString();
  const endpoint = `/api/staff/tickets${queryString ? `?${queryString}` : ''}`;
  return apiFetch<StaffTicketQueueResponse>(endpoint);
}

// ─── Issue 6: IT Staff Ticket Detail & Operational Controls ───────────────────

/**
 * Permitted status transitions per the Section 6 state matrix (BR-12, AC-6.2).
 * Mirrors server/src/utils/statusTransitions.ts so the Staff Detail UI only
 * offers transitions allowed by the backend.
 */
export const TICKET_STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  NEW: ['OPEN', 'CANCELLED'],
  OPEN: ['IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'CANCELLED'],
  IN_PROGRESS: ['WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED'],
  WAITING_FOR_REQUESTER: ['IN_PROGRESS', 'RESOLVED', 'CANCELLED'],
  RESOLVED: ['CLOSED', 'REOPENED'],
  CLOSED: ['REOPENED'],
  REOPENED: ['IN_PROGRESS', 'RESOLVED', 'CANCELLED'],
  CANCELLED: [],
};

export interface InternalNote {
  id: number;
  ticketId: number;
  author: {
    id: number;
    name: string;
    role: string;
  };
  content: string;
  createdAt: string;
}

export interface StaffAssignee {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export interface StaffTicketDetail {
  id: number;
  ticketNo: string;
  summary: string;
  description: string;
  requestedPriority: Priority;
  itPriority: Priority;
  currentStatus: TicketStatus;
  resolvedIndicated: boolean;
  resolvedIndicatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  category: { id: number; name: string };
  relatedSystem: { id: number; name: string };
  requester: { id: number; name: string; email: string };
  owner: { id: number; name: string; email: string } | null;
  attachments: Attachment[];
  publicComments: PublicComment[];
  internalNotes: InternalNote[];
}

export async function getStaffTicketDetail(ticketId: number): Promise<StaffTicketDetail> {
  return apiFetch<StaffTicketDetail>(`/api/staff/tickets/${ticketId}`);
}

export async function updateTicketOwnership(
  ticketId: number,
  ownerId: number | null
): Promise<StaffTicketDetail> {
  return apiFetch<StaffTicketDetail>(`/api/staff/tickets/${ticketId}/ownership`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerId }),
  });
}

export async function updateTicketItPriority(
  ticketId: number,
  itPriority: Priority
): Promise<StaffTicketDetail> {
  return apiFetch<StaffTicketDetail>(`/api/staff/tickets/${ticketId}/priority`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itPriority }),
  });
}

export async function updateTicketStatus(
  ticketId: number,
  status: TicketStatus
): Promise<StaffTicketDetail> {
  return apiFetch<StaffTicketDetail>(`/api/staff/tickets/${ticketId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}

export async function getStaffAssignees(): Promise<StaffAssignee[]> {
  return apiFetch<StaffAssignee[]>('/api/staff/assignees');
}

export async function getInternalNotes(ticketId: number): Promise<InternalNote[]> {
  return apiFetch<InternalNote[]>(`/api/tickets/${ticketId}/notes`);
}

export async function postInternalNote(ticketId: number, content: string): Promise<InternalNote> {
  return apiFetch<InternalNote>(`/api/tickets/${ticketId}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
}

