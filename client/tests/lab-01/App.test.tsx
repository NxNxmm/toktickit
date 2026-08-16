import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

describe("App", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // WORKED EXAMPLE — provided for you.
  it("renders the TokTickIT heading", () => {
    render(<App />);
    expect(screen.getByText(/TokTickIT/i)).toBeInTheDocument();
  });

  // Issue 4 — Case 1: Success State
  it("shows Online and the seeded categories on success", async () => {
    const mockCategories = [
      { id: 1, name: "Hardware" },
      { id: 2, name: "Software" },
    ];

    vi.spyOn(api, "checkSystem").mockResolvedValueOnce({
      online: true,
      categories: mockCategories,
    });

    render(<App />);

    const button = screen.getByRole("button", { name: /check system/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Online/i)).toBeInTheDocument();
      expect(screen.getByText("Hardware")).toBeInTheDocument();
      expect(screen.getByText("Software")).toBeInTheDocument();
    });
  });

  // Issue 4 — Case 2: Error State
  it("shows an Offline error message when the API is unavailable", async () => {
    vi.spyOn(api, "checkSystem").mockRejectedValueOnce(
      new Error("Backend system is unavailable")
    );

    render(<App />);

    const button = screen.getByRole("button", { name: /check system/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Offline/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Unable to connect to TokTickIT API/i)
      ).toBeInTheDocument();
    });
  });
});