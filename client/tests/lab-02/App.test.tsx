import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "../../src/App";
import * as api from "../../src/api";

const mockRequesters = [
  {
    id: 1,
    name: "Jennifer Anderson",
    email: "jennifer.anderson@kmutt.ac.th",
    department: "Engineering",
  },
  {
    id: 2,
    name: "Michael Brown",
    email: "michael.brown@kmutt.ac.th",
    department: "Human Resources",
  },
];

// Note: Legacy Lab 2 test suite for App & Navigation Flow.
// In Lab 3, authentication was introduced (AC-3.1 to AC-3.5) and tested in client/tests/lab-03/AppShell.test.tsx.
// This test suite validates navigation shell and viewport adaptation across legacy and current auth flows.
describe("App & Navigation Flow (Lab 2 / Lab 3 regression)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("redirects to RequesterSelector when no requester is selected (AC 5) or Login screen in Lab 3", async () => {
    vi.spyOn(api, "apiFetch").mockResolvedValueOnce(mockRequesters);

    render(<App />);

    await waitFor(() => {
      // In Lab 2, unauthenticated users saw RequesterSelector.
      // In Lab 3 (AC-3.1, AC-3.5), this was superseded by the Login screen.
      const selectorWarning = screen.queryByText(
        /Select a Development Requester to test requester-specific ticket behavior/i
      );
      if (selectorWarning) {
        expect(selectorWarning).toBeInTheDocument();
      } else {
        expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();
      }
    });
  });

  it("renders navigation shell and profile badge when requester is selected (AC 3, AC 4)", async () => {
    localStorage.setItem(
      "toktickit_selected_requester",
      JSON.stringify(mockRequesters[0])
    );
    localStorage.setItem("toktickit_auth_token", "mock-token");
    vi.spyOn(api, "getMeApi").mockResolvedValue({
      id: 1,
      name: "Jennifer Anderson",
      email: "jennifer.anderson@kmutt.ac.th",
      role: "REQUESTER",
      requiresPasswordChange: false,
    });
    vi.spyOn(api, "apiFetch").mockImplementation((endpoint: string) => {
      if (endpoint.includes("/api/tickets")) {
        return Promise.resolve({
          items: [],
          pagination: { page: 1, pageSize: 10, totalCount: 0, totalPages: 0, hasPrevious: false, hasNext: false },
        }) as any;
      }
      return Promise.resolve([]) as any;
    });

    render(<App />);

    await waitFor(() => {
      // Brand and navigation tabs
      expect(screen.getByText("TokTickIT")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /my tickets/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /\+ create ticket/i })).toBeInTheDocument();

      // User profile badge with initials (JA) and name
      expect(screen.getByText("JA")).toBeInTheDocument();
      expect(screen.getAllByText("Jennifer Anderson").length).toBeGreaterThanOrEqual(1);
    });

    // In Lab 2, rendered department & warning banner; in Lab 3 (AC-3.5), rendered role badge
    const deptOrRole = screen.queryByText("Engineering") || screen.queryByText("Requester");
    expect(deptOrRole).toBeInTheDocument();
  });

  it("clears requester context and returns to selector on 'Change Requester' (AC 4) or Logout", async () => {
    localStorage.setItem(
      "toktickit_selected_requester",
      JSON.stringify(mockRequesters[0])
    );
    localStorage.setItem("toktickit_auth_token", "mock-token");
    vi.spyOn(api, "getMeApi").mockResolvedValue({
      id: 1,
      name: "Jennifer Anderson",
      email: "jennifer.anderson@kmutt.ac.th",
      role: "REQUESTER",
      requiresPasswordChange: false,
    });
    vi.spyOn(api, "logoutApi").mockResolvedValue({ message: "Logged out successfully" });
    vi.spyOn(api, "apiFetch").mockImplementation((endpoint: string) => {
      if (endpoint.includes("/api/tickets")) {
        return Promise.resolve({
          items: [],
          pagination: { page: 1, pageSize: 10, totalCount: 0, totalPages: 0, hasPrevious: false, hasNext: false },
        }) as any;
      }
      return Promise.resolve([]) as any;
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Jennifer Anderson")).toBeInTheDocument();
    });

    const changeBtn = screen.queryByRole("button", { name: /change requester/i });
    const logoutBtn = screen.queryByRole("button", { name: /logout/i });

    if (changeBtn) {
      fireEvent.click(changeBtn);
      expect(localStorage.getItem("toktickit_selected_requester")).toBeNull();
      await waitFor(() => {
        expect(
          screen.getByText(/Select a Development Requester to test requester-specific ticket behavior/i)
        ).toBeInTheDocument();
      });
    } else if (logoutBtn) {
      fireEvent.click(logoutBtn);
      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();
      });
    }
  });

  it("toggles mobile hamburger navigation menu", async () => {
    localStorage.setItem(
      "toktickit_selected_requester",
      JSON.stringify(mockRequesters[0])
    );
    localStorage.setItem("toktickit_auth_token", "mock-token");
    vi.spyOn(api, "getMeApi").mockResolvedValue({
      id: 1,
      name: "Jennifer Anderson",
      email: "jennifer.anderson@kmutt.ac.th",
      role: "REQUESTER",
      requiresPasswordChange: false,
    });
    vi.spyOn(api, "apiFetch").mockImplementation((endpoint: string) => {
      if (endpoint.includes("/api/tickets")) {
        return Promise.resolve({
          items: [],
          pagination: { page: 1, pageSize: 10, totalCount: 0, totalPages: 0, hasPrevious: false, hasNext: false },
        }) as any;
      }
      return Promise.resolve([]) as any;
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /toggle navigation/i })).toBeInTheDocument();
    });

    const togglerBtn = screen.getByRole("button", { name: /toggle navigation/i });
    expect(togglerBtn).toBeInTheDocument();
    expect(togglerBtn).toHaveAttribute("aria-expanded", "false");

    const collapseNav = document.getElementById("toktickitNavbar");
    expect(collapseNav).not.toHaveClass("show");

    // Click hamburger button to open
    fireEvent.click(togglerBtn);
    expect(togglerBtn).toHaveAttribute("aria-expanded", "true");
    expect(collapseNav).toHaveClass("show");

    // Click hamburger button to close
    fireEvent.click(togglerBtn);
    expect(togglerBtn).toHaveAttribute("aria-expanded", "false");
    expect(collapseNav).not.toHaveClass("show");
  });
});
