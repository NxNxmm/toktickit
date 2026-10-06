import React, { useState } from 'react';
import {
  TicketStatus,
  TICKET_STATUS_TRANSITIONS,
  updateTicketWorkflow,
  submitRequesterAdvisory,
  WorkflowUpdateResult,
} from '../api';

// ─── Shared badge helpers ─────────────────────────────────────────────────────

const STATUS_LABEL: Record<TicketStatus, string> = {
  NEW: 'New',
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  WAITING_FOR_REQUESTER: 'Waiting for Requester',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
  REOPENED: 'Reopened',
  CANCELLED: 'Cancelled',
};

const STATUS_STYLES: Record<string, React.CSSProperties> = {
  NEW: { backgroundColor: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE' },
  OPEN: { backgroundColor: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' },
  IN_PROGRESS: { backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' },
  WAITING_FOR_REQUESTER: { backgroundColor: '#FFF7ED', color: '#9A3412', border: '1px solid #FFEDD5' },
  RESOLVED: { backgroundColor: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0' },
  CLOSED: { backgroundColor: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB' },
  REOPENED: { backgroundColor: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA' },
  CANCELLED: { backgroundColor: '#F3F4F6', color: '#6B7280', border: '1px solid #D1D5DB' },
};

const BADGE_BASE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  borderRadius: '9999px',
  padding: '3px 12px',
  fontSize: '13px',
  fontWeight: 600,
  whiteSpace: 'nowrap',
};

// ─── Types ───────────────────────────────────────────────────────────────────

export type WorkflowRole = 'IT_STAFF' | 'ADMIN' | 'REQUESTER';

export interface TicketWorkflowControlsProps {
  ticketId: number;
  currentStatus: TicketStatus;
  version: number;
  role: WorkflowRole;
  /** Owner (requester) id — used to show advisory button only to ticket owner */
  requesterId?: number;
  currentUserId?: number;
  /** Called after a successful transition so parent can reload */
  onWorkflowUpdated?: (result: WorkflowUpdateResult) => void;
}

// ─── IT Staff / Admin Status Transition Controls ─────────────────────────────

const StaffWorkflowControls: React.FC<{
  ticketId: number;
  currentStatus: TicketStatus;
  version: number;
  onWorkflowUpdated?: (result: WorkflowUpdateResult) => void;
}> = ({ ticketId, currentStatus, version, onWorkflowUpdated }) => {
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [conflictInfo, setConflictInfo] = useState<{ currentVersion: number; submittedVersion: number } | null>(null);
  const [resolutionGateError, setResolutionGateError] = useState(false);
  const [generalError, setGeneralError] = useState('');

  const permittedTransitions = TICKET_STATUS_TRANSITIONS[currentStatus] ?? [];
  const isTerminal = permittedTransitions.length === 0;

  const clearErrors = () => {
    setConflictInfo(null);
    setResolutionGateError(false);
    setGeneralError('');
  };

  const handleRefreshTicket = () => {
    window.location.reload();
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStatus(e.target.value as TicketStatus | '');
    clearErrors();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStatus || submitting) return;

    clearErrors();
    setSubmitting(true);

    try {
      const result = await updateTicketWorkflow(ticketId, {
        status: selectedStatus as TicketStatus,
        version,
      });
      setSelectedStatus('');
      onWorkflowUpdated?.(result);
    } catch (err: any) {
      const statusCode = err.statusCode;
      const errorData = err.errorData?.error ?? err.errorData;

      if (statusCode === 409) {
        setConflictInfo({
          currentVersion: errorData?.currentVersion ?? 0,
          submittedVersion: errorData?.submittedVersion ?? version,
        });
      } else if (
        statusCode === 422 &&
        errorData?.code === 'RESOLUTION_REQUIRES_ACTION_TAKEN'
      ) {
        setResolutionGateError(true);
      } else {
        setGeneralError(err.message || 'Failed to update ticket status.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div data-testid="staff-workflow-controls">
      {/* ── 409 Conflict Banner ─────────────────────────────────────────────── */}
      {conflictInfo && (
        <div
          data-testid="conflict-banner"
          role="alert"
          style={{
            backgroundColor: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: '8px',
            padding: '14px 18px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}
        >
          <span style={{ fontSize: '20px', flexShrink: 0 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: '#92400E', fontSize: '14px', marginBottom: '4px' }}>
              Conflict Detected
            </div>
            <div style={{ fontSize: '13px', color: '#78350F' }}>
              This ticket has been updated by another team member since you loaded it.
              Please refresh the page to view the latest status before making changes.
            </div>
            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
              Your version: {conflictInfo.submittedVersion} · Current version: {conflictInfo.currentVersion}
            </div>
          </div>
          <button
            data-testid="refresh-ticket-btn"
            onClick={handleRefreshTicket}
            style={{
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 700,
              backgroundColor: '#D97706',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            🔄 Refresh Ticket
          </button>
        </div>
      )}

      {/* ── 422 Resolution Gate Banner ──────────────────────────────────────── */}
      {resolutionGateError && (
        <div
          data-testid="resolution-gate-banner"
          role="alert"
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '8px',
            padding: '14px 18px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}
        >
          <span style={{ fontSize: '20px', flexShrink: 0 }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 700, color: '#991B1B', fontSize: '14px', marginBottom: '4px' }}>
              Work Verification Required
            </div>
            <div style={{ fontSize: '13px', color: '#7F1D1D' }}>
              This ticket cannot be resolved or closed until at least one Action Taken has been
              recorded. Please log your work in the Actions Taken section below before updating status.
            </div>
          </div>
        </div>
      )}

      {/* ── General Error ───────────────────────────────────────────────────── */}
      {generalError && (
        <div
          data-testid="workflow-error"
          role="alert"
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '8px',
            padding: '10px 14px',
            marginBottom: '16px',
            color: '#991B1B',
            fontSize: '13px',
          }}
        >
          {generalError}
        </div>
      )}

      {/* ── Status Badge & Transition Form ─────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontSize: '12px', fontWeight: 500, color: '#4B5563' }}>Current Status</div>
        <div style={{ marginBottom: '4px' }}>
          <span style={{ ...BADGE_BASE, ...(STATUS_STYLES[currentStatus] ?? STATUS_STYLES.NEW) }}>
            {STATUS_LABEL[currentStatus] ?? currentStatus.replace(/_/g, ' ')}
          </span>
        </div>

        {isTerminal ? (
          <div
            data-testid="terminal-state-msg"
            style={{ fontSize: '12px', color: '#6B7280', fontStyle: 'italic' }}
          >
            Ticket is in a terminal state ({STATUS_LABEL[currentStatus]}) — no further transitions.
          </div>
        ) : (
          <form
            data-testid="workflow-form"
            onSubmit={handleSubmit}
            style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flexWrap: 'wrap' }}
          >
            <select
              data-testid="status-transition-select"
              id={`status-transition-${ticketId}`}
              value={selectedStatus}
              onChange={handleStatusChange}
              disabled={submitting}
              aria-label="Transition ticket status"
              style={{
                flex: '1 1 160px',
                padding: '8px 12px',
                fontSize: '14px',
                border: '1px solid #D1D5DB',
                borderRadius: '8px',
                backgroundColor: '#fff',
                color: selectedStatus ? '#1A2820' : '#6B7280',
              }}
            >
              <option value="">Select transition…</option>
              {permittedTransitions.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s] ?? s.replace(/_/g, ' ')}
                </option>
              ))}
            </select>

            <button
              data-testid="update-status-btn"
              type="submit"
              disabled={!selectedStatus || submitting}
              aria-disabled={!selectedStatus || submitting}
              style={{
                padding: '8px 18px',
                fontSize: '14px',
                fontWeight: 700,
                backgroundColor: selectedStatus && !submitting ? '#006B3C' : '#D1FAE5',
                color: selectedStatus && !submitting ? '#fff' : '#6B7280',
                border: 'none',
                borderRadius: '8px',
                cursor: !selectedStatus || submitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                transition: 'background-color 0.15s',
              }}
            >
              {submitting ? (
                <>
                  <span
                    style={{
                      width: '14px',
                      height: '14px',
                      border: '2px solid #065F46',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      display: 'inline-block',
                      animation: 'spin 0.7s linear infinite',
                    }}
                  />
                  Updating…
                </>
              ) : (
                'Update Status'
              )}
            </button>
          </form>
        )}

        {!isTerminal && (
          <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>
            Only permitted transitions per the status matrix are shown (BR-08).
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Requester Advisory "Problem Appears Resolved" button ─────────────────────

const ADVISORY_ELIGIBLE_STATUSES: TicketStatus[] = [
  'OPEN',
  'IN_PROGRESS',
  'WAITING_FOR_REQUESTER',
];

const RequesterAdvisoryButton: React.FC<{
  ticketId: number;
  currentStatus: TicketStatus;
  requesterId: number;
  currentUserId: number;
  onWorkflowUpdated?: (result: WorkflowUpdateResult) => void;
}> = ({ ticketId, currentStatus, requesterId, currentUserId, onWorkflowUpdated }) => {
  const [showDialog, setShowDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const isOwner = currentUserId === requesterId;
  const isEligible = ADVISORY_ELIGIBLE_STATUSES.includes(currentStatus);

  if (!isOwner || !isEligible) return null;

  const handleConfirm = async () => {
    setError('');
    setSubmitting(true);
    try {
      const result = await submitRequesterAdvisory(ticketId);
      setShowDialog(false);
      setSubmitted(true);
      onWorkflowUpdated?.(result);
    } catch (err: any) {
      setError(err.message || 'Failed to submit advisory indication.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div
        data-testid="advisory-submitted-notice"
        style={{
          backgroundColor: '#ECFDF5',
          border: '1px solid #A7F3D0',
          borderRadius: '8px',
          padding: '12px 16px',
          fontSize: '13px',
          color: '#065F46',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        ✅ Your advisory feedback has been submitted. IT Staff will review and formally close the ticket.
      </div>
    );
  }

  return (
    <div data-testid="requester-advisory-section">
      <button
        data-testid="problem-appears-resolved-btn"
        onClick={() => setShowDialog(true)}
        style={{
          padding: '10px 20px',
          fontSize: '14px',
          fontWeight: 700,
          backgroundColor: '#ECFDF5',
          color: '#065F46',
          border: '2px solid #A7F3D0',
          borderRadius: '8px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'background-color 0.15s',
        }}
      >
        ✅ Problem Appears Resolved
      </button>

      {/* ── Confirmation Dialog ──────────────────────────────────────────────── */}
      {showDialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="advisory-dialog-title"
          data-testid="advisory-dialog"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '28px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            }}
          >
            <h2
              id="advisory-dialog-title"
              style={{ fontSize: '18px', fontWeight: 700, color: '#1A2820', marginBottom: '12px' }}
            >
              Confirm Advisory Feedback
            </h2>
            <p style={{ fontSize: '14px', color: '#4B5563', marginBottom: '8px', lineHeight: 1.6 }}>
              You are submitting an <strong>advisory indication</strong> that the problem appears resolved.
            </p>
            <p style={{ fontSize: '14px', color: '#4B5563', marginBottom: '20px', lineHeight: 1.6 }}>
              ℹ️ This <strong>does not change the ticket status</strong>. IT Staff will review your
              feedback and formally update the ticket when verified.
            </p>

            {error && (
              <div
                style={{
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '6px',
                  padding: '10px 14px',
                  color: '#991B1B',
                  fontSize: '13px',
                  marginBottom: '16px',
                }}
              >
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                data-testid="advisory-cancel-btn"
                onClick={() => { setShowDialog(false); setError(''); }}
                disabled={submitting}
                style={{
                  padding: '9px 18px',
                  fontSize: '14px',
                  fontWeight: 600,
                  backgroundColor: '#F3F4F6',
                  color: '#374151',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                data-testid="advisory-confirm-btn"
                onClick={handleConfirm}
                disabled={submitting}
                style={{
                  padding: '9px 20px',
                  fontSize: '14px',
                  fontWeight: 700,
                  backgroundColor: submitting ? '#D1FAE5' : '#006B3C',
                  color: submitting ? '#6B7280' : '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {submitting ? (
                  <>
                    <span
                      style={{
                        width: '13px',
                        height: '13px',
                        border: '2px solid #065F46',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        display: 'inline-block',
                        animation: 'spin 0.7s linear infinite',
                      }}
                    />
                    Submitting…
                  </>
                ) : (
                  '✅ Submit Advisory Feedback'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Public Export: Unified Workflow Controls ─────────────────────────────────

export const TicketWorkflowControls: React.FC<TicketWorkflowControlsProps> = ({
  ticketId,
  currentStatus,
  version,
  role,
  requesterId,
  currentUserId,
  onWorkflowUpdated,
}) => {
  if (role === 'IT_STAFF' || role === 'ADMIN') {
    return (
      <StaffWorkflowControls
        ticketId={ticketId}
        currentStatus={currentStatus}
        version={version}
        onWorkflowUpdated={onWorkflowUpdated}
      />
    );
  }

  if (role === 'REQUESTER' && requesterId !== undefined && currentUserId !== undefined) {
    return (
      <RequesterAdvisoryButton
        ticketId={ticketId}
        currentStatus={currentStatus}
        requesterId={requesterId}
        currentUserId={currentUserId}
        onWorkflowUpdated={onWorkflowUpdated}
      />
    );
  }

  return null;
};

export default TicketWorkflowControls;
