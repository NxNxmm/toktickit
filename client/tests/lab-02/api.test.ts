import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiFetch } from "../../src/api";

describe("apiFetch with X-Requester-Id header (Issue 3 - AC 3)", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("sends X-Requester-Id header from explicit parameter", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    globalThis.fetch = mockFetch;

    await apiFetch("/api/test", {}, 42);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, options] = mockFetch.mock.calls[0];
    const headers = options.headers as Headers;
    expect(headers.get("X-Requester-Id")).toBe("42");
  });

  it("sends X-Requester-Id header from persisted localStorage identity", async () => {
    localStorage.setItem(
      "toktickit_selected_requester",
      JSON.stringify({ id: 99, name: "Test User", email: "test@kmutt.ac.th", department: "IT" })
    );

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    globalThis.fetch = mockFetch;

    await apiFetch("/api/tickets");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, options] = mockFetch.mock.calls[0];
    const headers = options.headers as Headers;
    expect(headers.get("X-Requester-Id")).toBe("99");
  });

  it("does not send X-Requester-Id if no requester is selected", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    globalThis.fetch = mockFetch;

    await apiFetch("/api/health");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, options] = mockFetch.mock.calls[0];
    const headers = options.headers as Headers;
    expect(headers.get("X-Requester-Id")).toBeNull();
  });
});
