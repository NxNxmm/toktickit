/**
 * client/tests/lab-04/TicketWorkflow.test.tsx
 *
 * Vitest / React Testing Library unit tests for TicketWorkflowControls.
 * Covers UI-04-01 through UI-04-06 from tests.md:
 *   UI-04-01  Status dropdown only shows permitted transitions (BR-08)
 *   UI-04-02  409 Conflict → conflict banner with Refresh button
 *   UI-04-03  422 resolution gate → resolution gate banner
 *   UI-04-04  Successful transition → status updated in UI, button reset
 *   UI-04-05  Requester advisory button renders for eligible owner only
 *   UI-04-06  Requester advisory dialog confirms and submits (AC-08)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { TicketWorkflowControls } from '../../src/components/TicketWorkflowControls';
import * as api from '../../src/api';

// ─── Mock the api module ──────────────────────────────────────────────────────
vi.mock('../../src/api', async (importOriginal) => {
  const original = await importOriginal<typeof api>();
  return {
    ...original,
    updateTicketWorkflow: vi.fn(),
    submitRequesterAdvisory: vi.fn(),
  };
});

const mockUpdateWorkflow = api.updateTicketWorkflow as ReturnType<typeof vi.fn>;
const mockSubmitAdvisory = api.submitRequesterAdvisory as ReturnType<typeof vi.fn>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeWorkflowResult(status: string, version = 2) {
  return {
    id: 1,
    status: status as api.TicketStatus,
    version,
    updatedAt: new Date().toISOString(),
    message: 'Ticket status successfully updated.',
  };
}

function renderStaffControls(
  currentStatus: api.TicketStatus = 'OPEN',
  version = 1,
  onWorkflowUpdated?: (r: api.WorkflowUpdateResult) => void
) {
  return render(
    <TicketWorkflowControls
      ticketId={1}
      currentStatus={currentStatus}
      version={version}
      role="IT_STAFF"
      onWorkflowUpdated={onWorkflowUpdated}
    />
  );
}

function renderRequesterControls(
  currentStatus: api.TicketStatus = 'IN_PROGRESS',
  requesterId = 5,
  currentUserId = 5,
  onWorkflowUpdated?: (r: api.WorkflowUpdateResult) => void
) {
  return render(
    <TicketWorkflowControls
      ticketId={1}
      currentStatus={currentStatus}
      version={1}
      role="REQUESTER"
      requesterId={requesterId}
      currentUserId={currentUserId}
      onWorkflowUpdated={onWorkflowUpdated}
    />
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TicketWorkflowControls — Staff/Admin role', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // UI-04-01: Only permitted transitions shown in dropdown
  it('UI-04-01a: OPEN ticket shows IN_PROGRESS, WAITING_FOR_REQUESTER, CANCELLED as options', () => {
    renderStaffControls('OPEN');
    const select = screen.getByTestId('status-transition-select');
    const options = Array.from(select.querySelectorAll('option')).map((o) => o.value);
    expect(options).toContain('IN_PROGRESS');
    expect(options).toContain('WAITING_FOR_REQUESTER');
    expect(options).toContain('CANCELLED');
    // Must NOT contain disallowed states
    expect(options).not.toContain('RESOLVED');
    expect(options).not.toContain('CLOSED');
  });

  it('UI-04-01b: IN_PROGRESS ticket shows WAITING_FOR_REQUESTER, RESOLVED, CANCELLED', () => {
    renderStaffControls('IN_PROGRESS');
    const select = screen.getByTestId('status-transition-select');
    const options = Array.from(select.querySelectorAll('option')).map((o) => o.value);
    expect(options).toContain('WAITING_FOR_REQUESTER');
    expect(options).toContain('RESOLVED');
    expect(options).toContain('CANCELLED');
    expect(options).not.toContain('OPEN');
    expect(options).not.toContain('CLOSED');
  });

  it('UI-04-01c: NEW ticket shows OPEN and CANCELLED only', () => {
    renderStaffControls('NEW');
    const select = screen.getByTestId('status-transition-select');
    const options = Array.from(select.querySelectorAll('option')).map((o) => o.value);
    expect(options).toContain('OPEN');
    expect(options).toContain('CANCELLED');
    expect(options).not.toContain('RESOLVED');
    expect(options).not.toContain('CLOSED');
    expect(options).not.toContain('IN_PROGRESS');
  });

  it('UI-04-01d: CANCELLED ticket shows terminal state message, no dropdown', () => {
    renderStaffControls('CANCELLED');
    expect(screen.getByTestId('terminal-state-msg')).toBeInTheDocument();
    expect(screen.queryByTestId('status-transition-select')).not.toBeInTheDocument();
  });

  // UI-04-04: Successful transition updates UI
  it('UI-04-04: Successful workflow update calls onWorkflowUpdated with result', async () => {
    const result = makeWorkflowResult('IN_PROGRESS', 2);
    mockUpdateWorkflow.mockResolvedValueOnce(result);
    const onUpdated = vi.fn();

    renderStaffControls('OPEN', 1, onUpdated);

    const select = screen.getByTestId('status-transition-select');
    await userEvent.selectOptions(select, 'IN_PROGRESS');

    const submitBtn = screen.getByTestId('update-status-btn');
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockUpdateWorkflow).toHaveBeenCalledWith(1, {
        status: 'IN_PROGRESS',
        version: 1,
      });
      expect(onUpdated).toHaveBeenCalledWith(result);
    });
  });

  it('UI-04-04b: Submit button is disabled when no status selected', () => {
    renderStaffControls('OPEN');
    const submitBtn = screen.getByTestId('update-status-btn');
    expect(submitBtn).toBeDisabled();
  });

  // UI-04-02: 409 Conflict → conflict banner
  it('UI-04-02: 409 Conflict response shows conflict banner with Refresh button', async () => {
    const conflictError: any = new Error('Conflict');
    conflictError.statusCode = 409;
    conflictError.errorData = {
      error: { code: 'CONCURRENCY_CONFLICT', currentVersion: 5, submittedVersion: 1 },
    };
    mockUpdateWorkflow.mockRejectedValueOnce(conflictError);

    renderStaffControls('OPEN', 1);

    await userEvent.selectOptions(screen.getByTestId('status-transition-select'), 'IN_PROGRESS');
    await userEvent.click(screen.getByTestId('update-status-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('conflict-banner')).toBeInTheDocument();
      expect(screen.getByTestId('refresh-ticket-btn')).toBeInTheDocument();
    });

    // Should display version info
    expect(screen.getByTestId('conflict-banner').textContent).toContain('1');
    expect(screen.getByTestId('conflict-banner').textContent).toContain('5');
  });

  // UI-04-03: 422 resolution gate → resolution gate banner
  it('UI-04-03: 422 RESOLUTION_REQUIRES_ACTION_TAKEN shows resolution gate banner', async () => {
    const gateError: any = new Error('Resolution gate');
    gateError.statusCode = 422;
    gateError.errorData = {
      error: { code: 'RESOLUTION_REQUIRES_ACTION_TAKEN', message: 'Cannot resolve' },
    };
    mockUpdateWorkflow.mockRejectedValueOnce(gateError);

    renderStaffControls('IN_PROGRESS', 1);

    await userEvent.selectOptions(screen.getByTestId('status-transition-select'), 'RESOLVED');
    await userEvent.click(screen.getByTestId('update-status-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('resolution-gate-banner')).toBeInTheDocument();
    });

    expect(screen.getByTestId('resolution-gate-banner').textContent).toMatch(
      /Action Taken/i
    );
  });

  it('UI-04-03b: 422 with other code shows generic error (not resolution gate)', async () => {
    const transitionError: any = new Error('Invalid transition');
    transitionError.statusCode = 422;
    transitionError.errorData = {
      error: { code: 'INVALID_STATUS_TRANSITION', message: 'Not permitted' },
    };
    mockUpdateWorkflow.mockRejectedValueOnce(transitionError);

    renderStaffControls('IN_PROGRESS', 1);

    await userEvent.selectOptions(screen.getByTestId('status-transition-select'), 'RESOLVED');
    await userEvent.click(screen.getByTestId('update-status-btn'));

    await waitFor(() => {
      expect(screen.queryByTestId('resolution-gate-banner')).not.toBeInTheDocument();
      expect(screen.getByTestId('workflow-error')).toBeInTheDocument();
    });
  });
});

describe('TicketWorkflowControls — Requester role', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // UI-04-05: Advisory button visible for eligible owner
  it('UI-04-05a: Advisory button visible for ticket owner on IN_PROGRESS ticket', () => {
    renderRequesterControls('IN_PROGRESS', 5, 5);
    expect(screen.getByTestId('problem-appears-resolved-btn')).toBeInTheDocument();
  });

  it('UI-04-05b: Advisory button visible for OPEN and WAITING_FOR_REQUESTER status', () => {
    const { rerender } = renderRequesterControls('OPEN', 5, 5);
    expect(screen.getByTestId('problem-appears-resolved-btn')).toBeInTheDocument();

    rerender(
      <TicketWorkflowControls
        ticketId={1}
        currentStatus="WAITING_FOR_REQUESTER"
        version={1}
        role="REQUESTER"
        requesterId={5}
        currentUserId={5}
      />
    );
    expect(screen.getByTestId('problem-appears-resolved-btn')).toBeInTheDocument();
  });

  it('UI-04-05c: Advisory button NOT shown when user is not ticket owner', () => {
    renderRequesterControls('IN_PROGRESS', 5, 999); // different user id
    expect(screen.queryByTestId('problem-appears-resolved-btn')).not.toBeInTheDocument();
  });

  it('UI-04-05d: Advisory button NOT shown for RESOLVED or CLOSED tickets', () => {
    const { rerender } = renderRequesterControls('RESOLVED', 5, 5);
    expect(screen.queryByTestId('problem-appears-resolved-btn')).not.toBeInTheDocument();

    rerender(
      <TicketWorkflowControls
        ticketId={1}
        currentStatus="CLOSED"
        version={1}
        role="REQUESTER"
        requesterId={5}
        currentUserId={5}
      />
    );
    expect(screen.queryByTestId('problem-appears-resolved-btn')).not.toBeInTheDocument();
  });

  // UI-04-06: Advisory dialog flow
  it('UI-04-06a: Clicking advisory button opens confirmation dialog', async () => {
    renderRequesterControls('IN_PROGRESS', 5, 5);
    await userEvent.click(screen.getByTestId('problem-appears-resolved-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('advisory-dialog')).toBeInTheDocument();
    });
    // Dialog should mention it does NOT change the status
    expect(screen.getByTestId('advisory-dialog').textContent).toMatch(/does not change/i);
  });

  it('UI-04-06b: Cancel button closes dialog', async () => {
    renderRequesterControls('IN_PROGRESS', 5, 5);
    await userEvent.click(screen.getByTestId('problem-appears-resolved-btn'));
    await waitFor(() => screen.getByTestId('advisory-dialog'));

    await userEvent.click(screen.getByTestId('advisory-cancel-btn'));
    await waitFor(() => {
      expect(screen.queryByTestId('advisory-dialog')).not.toBeInTheDocument();
    });
  });

  it('UI-04-06c: Confirm button calls submitRequesterAdvisory and shows success notice', async () => {
    const result = {
      id: 1,
      status: 'IN_PROGRESS' as api.TicketStatus,
      version: 2,
      updatedAt: new Date().toISOString(),
      message: 'Advisory resolution indication recorded.',
      resolvedIndicated: true,
    };
    mockSubmitAdvisory.mockResolvedValueOnce(result);
    const onUpdated = vi.fn();

    renderRequesterControls('IN_PROGRESS', 5, 5, onUpdated);
    await userEvent.click(screen.getByTestId('problem-appears-resolved-btn'));
    await waitFor(() => screen.getByTestId('advisory-dialog'));

    await userEvent.click(screen.getByTestId('advisory-confirm-btn'));

    await waitFor(() => {
      expect(mockSubmitAdvisory).toHaveBeenCalledWith(1);
      expect(onUpdated).toHaveBeenCalledWith(result);
      expect(screen.getByTestId('advisory-submitted-notice')).toBeInTheDocument();
    });
  });

  it('UI-04-06d: Advisory confirm shows error message when API fails', async () => {
    const error: any = new Error('You do not own this ticket');
    error.statusCode = 403;
    mockSubmitAdvisory.mockRejectedValueOnce(error);

    renderRequesterControls('IN_PROGRESS', 5, 5);
    await userEvent.click(screen.getByTestId('problem-appears-resolved-btn'));
    await waitFor(() => screen.getByTestId('advisory-dialog'));

    await userEvent.click(screen.getByTestId('advisory-confirm-btn'));

    await waitFor(() => {
      // Dialog stays open and shows error
      expect(screen.getByTestId('advisory-dialog')).toBeInTheDocument();
      expect(screen.getByTestId('advisory-dialog').textContent).toMatch(
        /You do not own this ticket/i
      );
    });
  });
});
