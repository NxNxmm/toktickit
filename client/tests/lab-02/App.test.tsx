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

// Note: Legacy Lab 2 test suite for the temporary Development Requester selector.
// Superseded in Lab 3 by AC-3.5 (Removal of Development Requester selector) and tested in client/tests/lab-03/AppShell.test.tsx.
describe.skip("App & Navigation Flow (Lab 2 legacy selector superseded by Lab 3 AC-3.5)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("redirects to RequesterSelector when no requester is selected (AC 5)", async () => {
    vi.spyOn(api, "apiFetch").mockResolvedValueOnce(mockRequesters);

    render(<App />);

    // Selector warning banner and dropdown should be present
    expect(
      screen.getByText(/Select a Development Requester to test requester-specific ticket behavior/i)
    ).toBeInTheDocument();
  });

  it("renders navigation shell and profile badge when requester is selected (AC 3, AC 4)", async () => {
    localStorage.setItem(
      "toktickit_selected_requester",
      JSON.stringify(mockRequesters[0])
    );

    render(<App />);

    // Brand and navigation tabs
    expect(screen.getByText("TokTickIT")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /my tickets/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /\+ create ticket/i })).toBeInTheDocument();

    // User profile badge with initials (JA) and department
    expect(screen.getByText("JA")).toBeInTheDocument();
    expect(screen.getAllByText("Jennifer Anderson").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Engineering")).toBeInTheDocument();

    // Warning banner across the top
    expect(
      screen.getByText(/Logged in as testing requester:/i)
    ).toBeInTheDocument();
  });

  it("clears requester context and returns to selector on 'Change Requester' (AC 4)", async () => {
    localStorage.setItem(
      "toktickit_selected_requester",
      JSON.stringify(mockRequesters[0])
    );
    vi.spyOn(api, "apiFetch").mockResolvedValueOnce(mockRequesters);

    render(<App />);

    const changeBtn = screen.getByRole("button", { name: /change requester/i });
    expect(changeBtn).toBeInTheDocument();

    fireEvent.click(changeBtn);

    // Context should be cleared
    expect(localStorage.getItem("toktickit_selected_requester")).toBeNull();

    // RequesterSelector should now be visible
    await waitFor(() => {
      expect(
        screen.getByText(/Select a Development Requester to test requester-specific ticket behavior/i)
      ).toBeInTheDocument();
    });
  });

  it("toggles mobile hamburger navigation menu", async () => {
    localStorage.setItem(
      "toktickit_selected_requester",
      JSON.stringify(mockRequesters[0])
    );

    render(<App />);

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
