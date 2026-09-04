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

// Add a reusable apiFetch helper
export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  requesterId?: number | null
): Promise<T> {
  const headers = new Headers(options.headers || {});

  // If no requesterId is passed, try retrieving from localStorage
  const currentId = requesterId ?? (() => {
    const saved = localStorage.getItem('toktickit_selected_requester');
    return saved ? JSON.parse(saved).id : null;
  })();

  if (currentId) {
    headers.set('X-Requester-Id', String(currentId));
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `API error: ${res.statusText}`);
  }

  return res.json();
}

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TicketStatus = 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'CANCELLED';

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

