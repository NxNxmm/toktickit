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
