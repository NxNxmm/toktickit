import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ActionsTaken } from '../../src/components/ActionsTaken';
import * as api from '../../src/api';
import type { ActionTaken, User } from '../../src/api';

vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 5,
      name: 'Alex Turner',
      email: 'alex.turner@toktickit.kmutt.ac.th',
      role: 'IT_STAFF',
      requiresPasswordChange: false,
    } as User,
    token: 'mock-staff-token',
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    changePassword: vi.fn(),
    setUser: vi.fn(),
  }),
}));

const mockActions: ActionTaken[] = [
  {
    id: 101,
    ticketId: 1,
    actionDateTime: '2026-05-12T10:30:00.000Z',
    description: 'Replaced thermal paste and dusted internal heatsink.',
    result: 'Completed diagnostic stress test. CPU temperatures stabilized under 70C.',
    performedBy: {
      id: 5,
      name: 'Alex Turner',
      email: 'alex.turner@toktickit.kmutt.ac.th',
      role: 'IT_STAFF',
    },
    followUpRequired: true,
    followUpNote: 'Check battery discharge rates tomorrow morning.',
    attachmentNotes: 'Thermal benchmark log thermal_run1.txt in share',
    createdAt: '2026-05-12T10:35:00.000Z',
    updatedAt: '2026-05-12T10:35:00.000Z',
  },
  {
    id: 102,
    ticketId: 1,
    actionDateTime: '2026-05-12T09:00:00.000Z',
    description: 'Inspected network wall jack in building 3 floor 2.',
    result: 'Re-crimped RJ45 connector and restored link.',
    performedBy: {
      id: 6,
      name: 'Jessica Miller',
      email: 'jessica.miller@toktickit.kmutt.ac.th',
      role: 'IT_STAFF',
    },
    followUpRequired: false,
    followUpNote: null,
    attachmentNotes: null,
    createdAt: '2026-05-12T09:15:00.000Z',
    updatedAt: '2026-05-12T09:15:00.000Z',
  },
];

describe('Lab 4 Issue #3: Actions Taken UI Component Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ─── UI-04-01 / AC-03-01 / AC-03-04: IT Staff renders panel and adds new action ────
  it('UI-04-01 & AC-03-01: IT Staff renders Actions Taken panel, opens create modal, and verifies fields', async () => {
    vi.spyOn(api, 'getActionsTaken').mockResolvedValue({
      ticketId: 1,
      actionsTaken: mockActions,
    });

    render(<ActionsTaken ticketId={1} isStaff={true} />);

    // Wait for actions to load
    await waitFor(() => {
      expect(screen.getByTestId('actions-taken-section')).toBeInTheDocument();
    });

    // Check header and count badge
    expect(screen.getByRole('heading', { name: /Actions Taken/i })).toBeInTheDocument();
    expect(screen.getByTestId('actions-count-badge')).toHaveTextContent('2');

    // AC-03-01: IT Staff sees "+ Add Action Taken" button (containing "Add Action")
    const addBtn = screen.getByTestId('add-action-btn');
    expect(addBtn).toBeInTheDocument();
    expect(addBtn.textContent).toMatch(/Add Action/i);

    // Open modal
    fireEvent.click(addBtn);

    // Modal dialog is open
    expect(screen.getByTestId('action-taken-modal')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Add Action Taken/i })).toBeInTheDocument();

    // Check form fields
    const performedByInput = screen.getByLabelText(/Performed By/i);
    expect(performedByInput).toBeInTheDocument();
    expect(performedByInput).toBeDisabled();
    expect(performedByInput).toHaveValue('Alex Turner (IT_STAFF)');

    expect(screen.getByLabelText(/Action Date\/Time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Action Description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Result/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Follow-Up Required\?/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Follow-Up Note/i)).toBeDisabled();
    expect(screen.getByLabelText(/Attachment Notes/i)).toBeInTheDocument();
  });

  it('UI-04-01 & AC-03-04: Form submission disables submit button during API transit and adds action', async () => {
    vi.spyOn(api, 'getActionsTaken').mockResolvedValue({
      ticketId: 1,
      actionsTaken: mockActions,
    });

    let resolveCreate: (val: any) => void;
    const createPromise = new Promise((resolve) => {
      resolveCreate = resolve;
    });
    const createSpy = vi.spyOn(api, 'createActionTaken').mockReturnValue(createPromise as any);

    render(<ActionsTaken ticketId={1} isStaff={true} />);
    await waitFor(() => expect(screen.getByTestId('actions-taken-section')).toBeInTheDocument());

    // Open modal
    fireEvent.click(screen.getByTestId('add-action-btn'));

    // Fill form
    fireEvent.change(screen.getByLabelText(/Action Description/i), {
      target: { value: 'Inspected power supply and replaced blown fuse.' },
    });
    fireEvent.change(screen.getByLabelText(/Result/i), {
      target: { value: 'Voltage output normalized at 12.1V.' },
    });
    fireEvent.change(screen.getByLabelText(/Attachment Notes/i), {
      target: { value: 'fuse_replacement.jpg' },
    });

    const submitBtn = screen.getByTestId('save-action-btn');
    expect(submitBtn).not.toBeDisabled();

    // Submit form
    fireEvent.click(submitBtn);

    // AC-03-04: Submit button is disabled during API transit
    expect(submitBtn).toBeDisabled();
    expect(submitBtn.textContent).toMatch(/Saving/i);
    expect(createSpy).toHaveBeenCalledTimes(1);

    // Resolve the API call
    resolveCreate!({
      id: 103,
      ticketId: 1,
      actionDateTime: new Date().toISOString(),
      description: 'Inspected power supply and replaced blown fuse.',
      result: 'Voltage output normalized at 12.1V.',
      performedBy: { id: 5, name: 'Alex Turner', email: 'alex.turner@toktickit.kmutt.ac.th', role: 'IT_STAFF' },
      followUpRequired: false,
      followUpNote: null,
      attachmentNotes: 'fuse_replacement.jpg',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await waitFor(() => {
      expect(screen.queryByTestId('action-taken-modal')).not.toBeInTheDocument();
    });
  });

  // ─── UI-04-02 / AC-03-02: Follow-Up Required toggle validation ───────────────
  it('UI-04-02 & AC-03-02: Submitting an action with "Follow-Up Required" checked without a note shows inline validation error and prevents submission', async () => {
    vi.spyOn(api, 'getActionsTaken').mockResolvedValue({
      ticketId: 1,
      actionsTaken: [],
    });
    const createSpy = vi.spyOn(api, 'createActionTaken');

    render(<ActionsTaken ticketId={1} isStaff={true} />);
    await waitFor(() => expect(screen.getByTestId('actions-taken-section')).toBeInTheDocument());

    // Open create modal
    fireEvent.click(screen.getByTestId('add-action-btn'));

    // Fill valid description & result
    const descInput = screen.getByLabelText(/Action Description/i);
    fireEvent.change(descInput, { target: { value: 'Upgraded router firmware to v3.2.0.' } });

    const resultInput = screen.getByLabelText(/Result/i);
    fireEvent.change(resultInput, { target: { value: 'Rebooted cleanly without error logs.' } });

    // Check "Follow-Up Required?" checkbox
    const followUpCheckbox = screen.getByLabelText(/Follow-Up Required\?/i);
    fireEvent.click(followUpCheckbox);
    expect(followUpCheckbox).toBeChecked();

    // Follow-up note is now enabled
    const followUpNoteInput = screen.getByLabelText(/Follow-Up Note/i);
    expect(followUpNoteInput).not.toBeDisabled();

    // Leave follow-up note empty and submit
    fireEvent.click(screen.getByTestId('save-action-btn'));

    // Validation prevents submission
    expect(createSpy).not.toHaveBeenCalled();

    // Inline validation error is displayed
    const errorEl = screen.getByTestId('followup-note-error');
    expect(errorEl).toBeInTheDocument();
    expect(errorEl.textContent).toMatch(/Follow-up note is required/i);

    // Form values are preserved
    expect(descInput).toHaveValue('Upgraded router firmware to v3.2.0.');
    expect(resultInput).toHaveValue('Rebooted cleanly without error logs.');

    // Now fill the follow-up note and submit successfully
    fireEvent.change(followUpNoteInput, { target: { value: 'Verify ping latency tomorrow at peak hours.' } });
    createSpy.mockResolvedValueOnce({
      id: 104,
      ticketId: 1,
      actionDateTime: new Date().toISOString(),
      description: 'Upgraded router firmware to v3.2.0.',
      result: 'Rebooted cleanly without error logs.',
      performedBy: { id: 5, name: 'Alex Turner', email: 'alex.turner@toktickit.kmutt.ac.th', role: 'IT_STAFF' },
      followUpRequired: true,
      followUpNote: 'Verify ping latency tomorrow at peak hours.',
      attachmentNotes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    fireEvent.click(screen.getByTestId('save-action-btn'));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ─── UI-04-03 / AC-03-03: Requester view is strictly read-only ───────────────
  it('UI-04-03 & AC-03-03: Requesters viewing their own ticket detail see all Actions Taken items in read-only mode without create/edit buttons', async () => {
    vi.spyOn(api, 'getActionsTaken').mockResolvedValue({
      ticketId: 1,
      actionsTaken: mockActions,
    });

    render(<ActionsTaken ticketId={1} isStaff={false} requesterId={1} />);

    await waitFor(() => {
      expect(screen.getByTestId('actions-taken-section')).toBeInTheDocument();
    });

    // Check that actions table/cards render
    expect(screen.getAllByText('Replaced thermal paste and dusted internal heatsink.').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Inspected network wall jack in building 3 floor 2.').length).toBeGreaterThan(0);

    // AC-03-03: Add button is completely hidden
    expect(screen.queryByTestId('add-action-btn')).not.toBeInTheDocument();

    // AC-03-03: Edit buttons are completely hidden
    expect(screen.queryByTestId('edit-action-btn')).not.toBeInTheDocument();
  });

  // ─── UI-04-11: Form values preserved upon server error ───────────────────────
  it('UI-04-11: Form values preserved upon server 400/422 failure and error banner displays', async () => {
    vi.spyOn(api, 'getActionsTaken').mockResolvedValue({
      ticketId: 1,
      actionsTaken: [],
    });

    const error = new Error('Validation failed on one or more fields.') as any;
    error.statusCode = 400;
    error.errorData = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Server rejected action description.',
        details: [{ field: 'description', message: 'Description contains disallowed keywords.' }],
      },
    };
    vi.spyOn(api, 'createActionTaken').mockRejectedValue(error);

    render(<ActionsTaken ticketId={1} isStaff={true} />);
    await waitFor(() => expect(screen.getByTestId('actions-taken-section')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('add-action-btn'));

    const descInput = screen.getByLabelText(/Action Description/i);
    const resultInput = screen.getByLabelText(/Result/i);
    fireEvent.change(descInput, { target: { value: 'Testing rejected description.' } });
    fireEvent.change(resultInput, { target: { value: 'Done testing.' } });

    fireEvent.click(screen.getByTestId('save-action-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('action-form-error')).toBeInTheDocument();
    });

    // Modal remains open
    expect(screen.getByTestId('action-taken-modal')).toBeInTheDocument();

    // Server error message displayed
    expect(screen.getByTestId('action-form-error').textContent).toMatch(/Server rejected action description/i);

    // Form inputs preserve typed values
    expect(descInput).toHaveValue('Testing rejected description.');
    expect(resultInput).toHaveValue('Done testing.');

    // Submit button re-enabled
    expect(screen.getByTestId('save-action-btn')).not.toBeDisabled();
  });

  // ─── Edit Action Taken capability ───────────────────────────────────────────
  it('Edit Action: IT Staff can click Edit on existing action and update it via PATCH', async () => {
    vi.spyOn(api, 'getActionsTaken').mockResolvedValue({
      ticketId: 1,
      actionsTaken: [mockActions[0]],
    });

    const updateSpy = vi.spyOn(api, 'updateActionTaken').mockResolvedValue({
      ...mockActions[0],
      description: 'Updated thermal paste replacement description.',
    });

    render(<ActionsTaken ticketId={1} isStaff={true} />);
    await waitFor(() => expect(screen.getByTestId('actions-taken-section')).toBeInTheDocument());

    // Click Edit button
    const editBtns = screen.getAllByTestId('edit-action-btn');
    fireEvent.click(editBtns[0]);

    // Modal opens in Edit mode with prefilled values
    expect(screen.getByRole('heading', { name: /Edit Action Taken/i })).toBeInTheDocument();
    const descInput = screen.getByLabelText(/Action Description/i);
    expect(descInput).toHaveValue('Replaced thermal paste and dusted internal heatsink.');

    // Modify description and save
    fireEvent.change(descInput, { target: { value: 'Updated thermal paste replacement description.' } });
    fireEvent.click(screen.getByTestId('save-action-btn'));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        1,
        101,
        expect.objectContaining({
          description: 'Updated thermal paste replacement description.',
        })
      );
    });
  });

  // ─── AC-03-05: Responsive desktop table and mobile cards ────────────────────
  it('AC-03-05: Layout renders both responsive table for desktop and cards for mobile without crashing', async () => {
    vi.spyOn(api, 'getActionsTaken').mockResolvedValue({
      ticketId: 1,
      actionsTaken: mockActions,
    });

    render(<ActionsTaken ticketId={1} isStaff={true} />);

    await waitFor(() => {
      expect(screen.getByTestId('actions-taken-section')).toBeInTheDocument();
    });

    // Desktop table exists
    expect(screen.getByTestId('actions-taken-table')).toBeInTheDocument();

    // Mobile cards exist
    const cards = screen.getAllByTestId('action-taken-card');
    expect(cards).toHaveLength(2);
  });
});
