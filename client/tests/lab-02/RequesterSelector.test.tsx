import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RequesterSelector } from "../../src/components/RequesterSelector";
import { RequesterProvider, useRequester } from "../../src/context/RequesterContext";
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

describe("RequesterSelector (Issue 3 - AC 2, AC 3, UI-01)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("prominently displays the development mode warning banner", async () => {
    vi.spyOn(api, "apiFetch").mockResolvedValueOnce(mockRequesters);

    render(
      <RequesterProvider>
        <RequesterSelector />
      </RequesterProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        /DEVELOPMENT MODE.*Lab 2 testing only.*not a secure login screen/i
      );
    });
  });

  it("populates active requesters in dropdown matching formatting specs", async () => {
    vi.spyOn(api, "apiFetch").mockResolvedValueOnce(mockRequesters);

    render(
      <RequesterProvider>
        <RequesterSelector />
      </RequesterProvider>
    );

    await waitFor(() => {
      expect(
        screen.getByText("Jennifer Anderson (jennifer.anderson@kmutt.ac.th) - Engineering")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Michael Brown (michael.brown@kmutt.ac.th) - Human Resources")
      ).toBeInTheDocument();
    });
  });

  it("shows an error message and Retry button on API failure", async () => {
    vi.spyOn(api, "apiFetch")
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce(mockRequesters);

    render(
      <RequesterProvider>
        <RequesterSelector />
      </RequesterProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });

    const retryButton = screen.getByRole("button", { name: /retry/i });
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(
        screen.getByText("Jennifer Anderson (jennifer.anderson@kmutt.ac.th) - Engineering")
      ).toBeInTheDocument();
    });
  });

  it("shows an empty state warning if no active requesters exist", async () => {
    vi.spyOn(api, "apiFetch").mockResolvedValueOnce([]);

    render(
      <RequesterProvider>
        <RequesterSelector />
      </RequesterProvider>
    );

    await waitFor(() => {
      expect(
        screen.getByText(/No active development requesters found in database/i)
      ).toBeInTheDocument();
    });
  });

  it("persists chosen requester in context and localStorage on Continue", async () => {
    vi.spyOn(api, "apiFetch").mockResolvedValueOnce(mockRequesters);

    const TestConsumer = () => {
      const { selectedRequester } = useRequester();
      return (
        <div>
          <RequesterSelector />
          <div data-testid="selected-user">{selectedRequester?.name ?? "none"}</div>
        </div>
      );
    };

    render(
      <RequesterProvider>
        <TestConsumer />
      </RequesterProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    // Select second user
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "2" } });

    // Click Continue
    const continueBtn = screen.getByRole("button", { name: /continue/i });
    fireEvent.click(continueBtn);

    expect(screen.getByTestId("selected-user")).toHaveTextContent("Michael Brown");
    expect(localStorage.getItem("toktickit_selected_requester")).toContain("Michael Brown");
  });
});
