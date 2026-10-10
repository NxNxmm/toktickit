import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useModalA11y } from '../hooks/useModalA11y';
import {
  ActionTaken,
  CreateActionTakenInput,
  UpdateActionTakenInput,
  getActionsTaken,
  createActionTaken,
  updateActionTaken,
} from '../api';

// ─── Helpers & Styles ─────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return iso;
  }
}

function toDatetimeLocalString(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

const BADGE_BASE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  borderRadius: '9999px',
  padding: '2px 8px',
  fontSize: '11px',
  fontWeight: 600,
  whiteSpace: 'nowrap',
};

const PerformerRoleBadge: React.FC<{ role?: string }> = ({ role }) => {
  if (role === 'IT_STAFF') {
    return (
      <span style={{ ...BADGE_BASE, backgroundColor: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' }}>
        IT Staff
      </span>
    );
  }
  if (role === 'ADMIN') {
    return (
      <span style={{ ...BADGE_BASE, backgroundColor: '#F3E8FF', color: '#6B21A8', border: '1px solid #DDD6FE' }}>
        Admin
      </span>
    );
  }
  return (
    <span style={{ ...BADGE_BASE, backgroundColor: '#E0F2FE', color: '#0369A1', border: '1px solid #BAE6FD' }}>
      Requester
    </span>
  );
};

// ─── Props ───────────────────────────────────────────────────────────────────

export interface ActionsTakenProps {
  ticketId: number;
  isStaff?: boolean;
  requesterId?: number | null;
  initialActions?: ActionTaken[];
  onActionsUpdated?: (actions: ActionTaken[]) => void;
}

interface FormState {
  actionDateTime: string;
  description: string;
  result: string;
  followUpRequired: boolean;
  followUpNote: string;
  attachmentNotes: string;
}

const initialFormState = (): FormState => ({
  actionDateTime: toDatetimeLocalString(),
  description: '',
  result: '',
  followUpRequired: false,
  followUpNote: '',
  attachmentNotes: '',
});

// ─── Component ───────────────────────────────────────────────────────────────

export const ActionsTaken: React.FC<ActionsTakenProps> = ({
  ticketId,
  isStaff: propIsStaff,
  requesterId,
  initialActions,
  onActionsUpdated,
}) => {
  const { user } = useAuth();

  // Role check: IT Staff or Admin can create/edit; Requester is read-only
  const isStaff = propIsStaff ?? (user?.role === 'IT_STAFF' || user?.role === 'ADMIN');

  const [actions, setActions] = useState<ActionTaken[]>(initialActions ?? []);
  const [loading, setLoading] = useState<boolean>(!initialActions);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<ActionTaken | null>(null);
  const [formData, setFormData] = useState<FormState>(initialFormState());
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch actions taken
  const fetchActions = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const res = await getActionsTaken(ticketId, requesterId);
      setActions(res.actionsTaken || []);
      onActionsUpdated?.(res.actionsTaken || []);
    } catch (err: any) {
      setFetchError(err.message || 'Failed to load actions taken work log.');
    } finally {
      setLoading(false);
    }
  }, [ticketId, requesterId, onActionsUpdated]);

  useEffect(() => {
    if (!initialActions) {
      fetchActions();
    }
  }, [fetchActions, initialActions]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingAction(null);
    setFormData(initialFormState());
    setFormErrors({});
    setServerError(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (action: ActionTaken) => {
    setEditingAction(action);
    setFormData({
      actionDateTime: toDatetimeLocalString(new Date(action.actionDateTime)),
      description: action.description,
      result: action.result,
      followUpRequired: action.followUpRequired,
      followUpNote: action.followUpNote ?? '',
      attachmentNotes: action.attachmentNotes ?? '',
    });
    setFormErrors({});
    setServerError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSubmitting) return; // Prevent closing while in flight
    setIsModalOpen(false);
    setEditingAction(null);
    setFormErrors({});
    setServerError(null);
  };

  const dialogRef = useRef<HTMLDivElement | null>(null);
  useModalA11y({ open: isModalOpen, onClose: handleCloseModal, dialogRef });

  // Handle Form Change
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({
        ...prev,
        [name]: checked,
        // Clear note if unchecking follow-up required
        followUpNote: checked ? prev.followUpNote : '',
      }));
      if (formErrors[name]) {
        setFormErrors((prev) => {
          const next = { ...prev };
          delete next[name];
          return next;
        });
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
      if (formErrors[name]) {
        setFormErrors((prev) => {
          const next = { ...prev };
          delete next[name];
          return next;
        });
      }
    }
  };

  // Validate Form
  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    // 1. actionDateTime
    if (!formData.actionDateTime) {
      errors.actionDateTime = 'Action date and time is required.';
    } else {
      const dt = new Date(formData.actionDateTime);
      if (isNaN(dt.getTime())) {
        errors.actionDateTime = 'Invalid date and time format.';
      } else {
        const fiveMinutesFuture = new Date(Date.now() + 5 * 60 * 1000);
        if (dt > fiveMinutesFuture) {
          errors.actionDateTime = 'Action date/time cannot be more than 5 minutes in the future.';
        }
      }
    }

    // 2. description
    const descTrimmed = formData.description.trim();
    if (!descTrimmed) {
      errors.description = 'Action description is required.';
    } else if (descTrimmed.length < 5) {
      errors.description = 'Action description must be at least 5 characters.';
    } else if (descTrimmed.length > 2000) {
      errors.description = 'Action description must not exceed 2000 characters.';
    }

    // 3. result
    const resTrimmed = formData.result.trim();
    if (!resTrimmed) {
      errors.result = 'Result is required.';
    } else if (resTrimmed.length < 3) {
      errors.result = 'Result must be at least 3 characters.';
    } else if (resTrimmed.length > 1000) {
      errors.result = 'Result must not exceed 1000 characters.';
    }

    // 4. followUpNote (Required if followUpRequired is true)
    if (formData.followUpRequired) {
      const noteTrimmed = formData.followUpNote.trim();
      if (!noteTrimmed) {
        errors.followUpNote = 'Follow-up note is required when follow-up is required.';
      } else if (noteTrimmed.length < 3) {
        errors.followUpNote = 'Follow-up note must be at least 3 characters.';
      } else if (noteTrimmed.length > 1000) {
        errors.followUpNote = 'Follow-up note must not exceed 1000 characters.';
      }
    }

    // 5. attachmentNotes
    if (formData.attachmentNotes && formData.attachmentNotes.trim().length > 500) {
      errors.attachmentNotes = 'Attachment notes must not exceed 500 characters.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: CreateActionTakenInput = {
        actionDateTime: new Date(formData.actionDateTime).toISOString(),
        description: formData.description.trim(),
        result: formData.result.trim(),
        followUpRequired: formData.followUpRequired,
        followUpNote: formData.followUpRequired ? formData.followUpNote.trim() : null,
        attachmentNotes: formData.attachmentNotes.trim() ? formData.attachmentNotes.trim() : null,
      };

      if (editingAction) {
        await updateActionTaken(ticketId, editingAction.id, payload as UpdateActionTakenInput);
      } else {
        await createActionTaken(ticketId, payload);
      }

      // Close modal on success and refresh list
      setIsModalOpen(false);
      setEditingAction(null);
      await fetchActions();
    } catch (err: any) {
      // Safe error handling (AC-17 / UI-04-11): Preserve form state and show inline error
      const msg = err.errorData?.error?.message || err.message || 'Submission failed. Please check your inputs and try again.';
      setServerError(msg);

      // If server returned detailed validation errors
      if (err.errorData?.error?.details && Array.isArray(err.errorData.error.details)) {
        const detailsMap: { [key: string]: string } = {};
        for (const item of err.errorData.error.details) {
          if (item.field && item.message) {
            detailsMap[item.field] = item.message;
          }
        }
        setFormErrors((prev) => ({ ...prev, ...detailsMap }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      data-testid="actions-taken-section"
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        marginTop: '20px',
        marginBottom: '20px',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#1A2820' }}>
            Actions Taken
          </h2>
          <span
            data-testid="actions-count-badge"
            style={{
              backgroundColor: '#EAF6EF',
              color: '#006B3C',
              borderRadius: '9999px',
              padding: '2px 8px',
              fontSize: '12px',
              fontWeight: 700,
            }}
          >
            {actions.length}
          </span>
        </div>

        {/* Add Action Taken button - IT Staff and Admin only (AC-03-01, AC-03-03) */}
        {isStaff && (
          <button
            type="button"
            id="add-action-btn"
            data-testid="add-action-btn"
            onClick={handleOpenCreateModal}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: '#006B3C',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            + Add Action Taken
          </button>
        )}
      </div>

      {/* ── Loading / Error States ── */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '24px 16px', color: '#6B7280', fontSize: '14px' }}>
          Loading actions taken work log...
        </div>
      )}

      {fetchError && !loading && (
        <div
          data-testid="actions-fetch-error"
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '8px',
            padding: '12px 16px',
            color: '#991B1B',
            fontSize: '14px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>⚠️ {fetchError}</span>
          <button
            type="button"
            onClick={fetchActions}
            style={{
              backgroundColor: 'transparent',
              border: '1px solid #DC2626',
              borderRadius: '6px',
              padding: '4px 8px',
              color: '#991B1B',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Empty State ── */}
      {!loading && !fetchError && actions.length === 0 && (
        <div
          data-testid="actions-empty-state"
          style={{
            textAlign: 'center',
            padding: '32px 16px',
            color: '#6B7280',
            fontSize: '14px',
            backgroundColor: '#F9FAFB',
            borderRadius: '8px',
          }}
        >
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🛠️</div>
          <div>No actions taken recorded yet.</div>
          {isStaff && (
            <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>
              Click "+ Add Action Taken" above to record diagnostic or repair activities.
            </div>
          )}
        </div>
      )}

      {/* ── Content: Desktop Table View (>= 768px) ── */}
      {!loading && actions.length > 0 && (
        <>
          <div className="d-none d-md-block" style={{ overflowX: 'auto' }}>
            <table
              data-testid="actions-taken-table"
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '13px',
              }}
            >
              <thead>
                <tr style={{ borderBottom: '2px solid #E5E7EB', color: '#4B5563' }}>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Date/Time</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Performer</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Description</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Result</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Follow-Up</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Attachment Notes</th>
                  {isStaff && <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {actions.map((act) => (
                  <tr
                    key={act.id}
                    data-testid="action-taken-row"
                    style={{
                      borderBottom: '1px solid #F3F4F6',
                      verticalAlign: 'top',
                    }}
                  >
                    <td style={{ padding: '12px', whiteSpace: 'nowrap', color: '#1A2820', fontWeight: 500 }}>
                      {formatDate(act.actionDateTime)}
                    </td>
                    <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600, color: '#1A2820' }}>
                        {act.performedBy?.name || 'System / Unassigned'}
                      </div>
                      {act.performedBy?.role && (
                        <div style={{ marginTop: '2px' }}>
                          <PerformerRoleBadge role={act.performedBy.role} />
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px', color: '#1A2820', minWidth: '200px', lineHeight: 1.5 }}>
                      {act.description}
                    </td>
                    <td style={{ padding: '12px', color: '#1A2820', minWidth: '150px', lineHeight: 1.5 }}>
                      {act.result}
                    </td>
                    <td style={{ padding: '12px', minWidth: '160px' }}>
                      {act.followUpRequired ? (
                        <div>
                          <span
                            data-testid="follow-up-badge"
                            style={{
                              ...BADGE_BASE,
                              backgroundColor: '#FEF3C7',
                              color: '#92400E',
                              border: '1px solid #FDE68A',
                              marginBottom: '4px',
                            }}
                          >
                            ⚠️ Follow-up Required
                          </span>
                          {act.followUpNote && (
                            <div style={{ fontSize: '12px', color: '#92400E', marginTop: '2px', lineHeight: 1.4 }}>
                              {act.followUpNote}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span
                          data-testid="follow-up-badge-none"
                          style={{
                            ...BADGE_BASE,
                            backgroundColor: '#F3F4F6',
                            color: '#6B7280',
                            border: '1px solid #E5E7EB',
                          }}
                        >
                          No follow-up needed
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px', color: '#4B5563', minWidth: '140px', fontSize: '12px' }}>
                      {act.attachmentNotes ? (
                        <span title={act.attachmentNotes}>📎 {act.attachmentNotes}</span>
                      ) : (
                        <span style={{ color: '#9CA3AF' }}>—</span>
                      )}
                    </td>
                    {isStaff && (
                      <td style={{ padding: '12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          data-testid="edit-action-btn"
                          onClick={() => handleOpenEditModal(act)}
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            backgroundColor: '#FFFFFF',
                            color: '#006B3C',
                            border: '1px solid #006B3C',
                            borderRadius: '6px',
                            cursor: 'pointer',
                          }}
                        >
                          Edit
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Content: Mobile Cards View (< 768px) ── */}
          <div className="d-block d-md-none" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {actions.map((act) => (
              <div
                key={act.id}
                data-testid="action-taken-card"
                style={{
                  backgroundColor: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  padding: '16px',
                }}
              >
                {/* Header: Date and Performer */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '6px',
                    marginBottom: '10px',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>
                    {formatDate(act.actionDateTime)}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#1A2820' }}>
                      {act.performedBy?.name || 'System'}
                    </span>
                    {act.performedBy?.role && <PerformerRoleBadge role={act.performedBy.role} />}
                  </div>
                </div>

                {/* Body: Description */}
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>
                    Description
                  </div>
                  <div style={{ fontSize: '14px', color: '#1A2820', lineHeight: 1.5 }}>{act.description}</div>
                </div>

                {/* Body: Result */}
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>
                    Result
                  </div>
                  <div style={{ fontSize: '14px', color: '#1A2820', lineHeight: 1.5 }}>{act.result}</div>
                </div>

                {/* Follow-Up */}
                <div style={{ marginBottom: '8px' }}>
                  {act.followUpRequired ? (
                    <div>
                      <span
                        data-testid="follow-up-badge"
                        style={{
                          ...BADGE_BASE,
                          backgroundColor: '#FEF3C7',
                          color: '#92400E',
                          border: '1px solid #FDE68A',
                        }}
                      >
                        ⚠️ Follow-up Required
                      </span>
                      {act.followUpNote && (
                        <div style={{ fontSize: '12px', color: '#92400E', marginTop: '4px', lineHeight: 1.4 }}>
                          {act.followUpNote}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span
                      data-testid="follow-up-badge-none"
                      style={{
                        ...BADGE_BASE,
                        backgroundColor: '#F3F4F6',
                        color: '#6B7280',
                        border: '1px solid #E5E7EB',
                      }}
                    >
                      No follow-up needed
                    </span>
                  )}
                </div>

                {/* Attachment Notes */}
                {act.attachmentNotes && (
                  <div style={{ fontSize: '12px', color: '#4B5563', marginBottom: '8px' }}>
                    📎 {act.attachmentNotes}
                  </div>
                )}

                {/* Footer: Edit Button (Staff / Admin Only) */}
                {isStaff && (
                  <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '10px', textAlign: 'right' }}>
                    <button
                      type="button"
                      data-testid="edit-action-btn"
                      onClick={() => handleOpenEditModal(act)}
                      style={{
                        padding: '6px 14px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: '#FFFFFF',
                        color: '#006B3C',
                        border: '1px solid #006B3C',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Create / Edit Modal (AC-6.3) ── */}
      {isModalOpen && (
        <div
          ref={dialogRef}
          data-testid="action-taken-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          tabIndex={-1}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1050,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseModal();
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '560px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid #E5E7EB',
              }}
            >
              <h3 id="modal-title" style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#1A2820' }}>
                {editingAction ? 'Edit Action Taken' : 'Add Action Taken'}
              </h3>
              <button
                type="button"
                aria-label="Close"
                onClick={handleCloseModal}
                disabled={isSubmitting}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '18px',
                  lineHeight: 1,
                  color: '#6B7280',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  padding: '4px',
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form
              onSubmit={handleSubmit}
              style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
            >
              <div
                style={{
                  padding: '20px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                {/* Server Error Alert */}
                {serverError && (
                  <div
                    data-testid="action-form-error"
                    role="alert"
                    style={{
                      backgroundColor: '#FEF2F2',
                      border: '1px solid #FECACA',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      color: '#991B1B',
                      fontSize: '13px',
                      lineHeight: 1.4,
                    }}
                  >
                    ⚠️ {serverError}
                  </div>
                )}

                {/* 1. Date/Time */}
                <div>
                  <label
                    htmlFor="actionDateTime"
                    style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}
                  >
                    Action Date/Time <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="datetime-local"
                    id="actionDateTime"
                    name="actionDateTime"
                    aria-label="Action Date/Time"
                    value={formData.actionDateTime}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: formErrors.actionDateTime ? '1px solid #DC2626' : '1px solid #D1D5DB',
                      fontSize: '14px',
                      minHeight: '44px',
                      backgroundColor: '#FFFFFF',
                      boxSizing: 'border-box',
                    }}
                  />
                  {formErrors.actionDateTime && (
                    <div style={{ color: '#DC2626', fontSize: '12px', marginTop: '4px' }}>
                      {formErrors.actionDateTime}
                    </div>
                  )}
                </div>

                {/* 2. Performer (Read-only / Auto-populated) */}
                <div>
                  <label
                    htmlFor="performedBy"
                    style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}
                  >
                    Performed By
                  </label>
                  <input
                    type="text"
                    id="performedBy"
                    name="performedBy"
                    aria-label="Performed By"
                    disabled
                    readOnly
                    value={
                      editingAction?.performedBy
                        ? `${editingAction.performedBy.name} (${editingAction.performedBy.role})`
                        : user
                        ? `${user.name} (${user.role})`
                        : 'Current User'
                    }
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      backgroundColor: '#EEF2EE',
                      color: '#4B5563',
                      fontSize: '14px',
                      minHeight: '44px',
                      boxSizing: 'border-box',
                      cursor: 'not-allowed',
                    }}
                  />
                  <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
                    Automatically recorded from your authenticated session.
                  </div>
                </div>

                {/* 3. Action Description */}
                <div>
                  <label
                    htmlFor="description"
                    style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}
                  >
                    Action Description <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    aria-label="Action Description"
                    rows={3}
                    placeholder="Describe diagnostic, repair, or configuration work performed (min 5 chars)..."
                    value={formData.description}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: formErrors.description ? '1px solid #DC2626' : '1px solid #D1D5DB',
                      fontSize: '14px',
                      backgroundColor: '#FFFFFF',
                      boxSizing: 'border-box',
                    }}
                  />
                  {formErrors.description && (
                    <div style={{ color: '#DC2626', fontSize: '12px', marginTop: '4px' }}>
                      {formErrors.description}
                    </div>
                  )}
                </div>

                {/* 4. Result */}
                <div>
                  <label
                    htmlFor="result"
                    style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}
                  >
                    Result <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    id="result"
                    name="result"
                    aria-label="Result"
                    placeholder="e.g., Re-crimped RJ45 connector, restored 1Gbps link (min 3 chars)"
                    value={formData.result}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: formErrors.result ? '1px solid #DC2626' : '1px solid #D1D5DB',
                      fontSize: '14px',
                      minHeight: '44px',
                      backgroundColor: '#FFFFFF',
                      boxSizing: 'border-box',
                    }}
                  />
                  {formErrors.result && (
                    <div style={{ color: '#DC2626', fontSize: '12px', marginTop: '4px' }}>
                      {formErrors.result}
                    </div>
                  )}
                </div>

                {/* 5. Follow-Up Required Checkbox */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="followUpRequired"
                    name="followUpRequired"
                    aria-label="Follow-Up Required?"
                    checked={formData.followUpRequired}
                    onChange={handleChange}
                    style={{ width: '18px', height: '18px', accentColor: '#006B3C', cursor: 'pointer' }}
                  />
                  <label
                    htmlFor="followUpRequired"
                    style={{ fontSize: '14px', fontWeight: 600, color: '#1A2820', cursor: 'pointer', margin: 0 }}
                  >
                    Follow-Up Required?
                  </label>
                </div>

                {/* 6. Follow-Up Note (Dynamically toggled & mandatory when checked: AC-03-02) */}
                <div>
                  <label
                    htmlFor="followUpNote"
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: formData.followUpRequired ? '#374151' : '#9CA3AF',
                      marginBottom: '4px',
                    }}
                  >
                    Follow-Up Note {formData.followUpRequired && <span style={{ color: '#DC2626' }}>*</span>}
                  </label>
                  <textarea
                    id="followUpNote"
                    name="followUpNote"
                    aria-label="Follow-Up Note"
                    rows={2}
                    disabled={!formData.followUpRequired}
                    placeholder={
                      formData.followUpRequired
                        ? 'Mandatory: Describe the required follow-up work (min 3 chars)...'
                        : "Enable 'Follow-Up Required?' above to enter a note."
                    }
                    value={formData.followUpNote}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: formErrors.followUpNote ? '1px solid #DC2626' : '1px solid #D1D5DB',
                      backgroundColor: formData.followUpRequired ? '#FFFFFF' : '#F3F4F6',
                      color: formData.followUpRequired ? '#1A2820' : '#9CA3AF',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      cursor: formData.followUpRequired ? 'text' : 'not-allowed',
                    }}
                  />
                  {formErrors.followUpNote && (
                    <div
                      data-testid="followup-note-error"
                      style={{ color: '#DC2626', fontSize: '12px', marginTop: '4px' }}
                    >
                      {formErrors.followUpNote}
                    </div>
                  )}
                </div>

                {/* 7. Attachment Notes */}
                <div>
                  <label
                    htmlFor="attachmentNotes"
                    style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}
                  >
                    Attachment Notes <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: 400 }}>(Optional)</span>
                  </label>
                  <input
                    type="text"
                    id="attachmentNotes"
                    name="attachmentNotes"
                    aria-label="Attachment Notes"
                    placeholder="e.g., Thermal test log thermal_run1.txt in share"
                    value={formData.attachmentNotes}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: formErrors.attachmentNotes ? '1px solid #DC2626' : '1px solid #D1D5DB',
                      fontSize: '14px',
                      minHeight: '44px',
                      backgroundColor: '#FFFFFF',
                      boxSizing: 'border-box',
                    }}
                  />
                  {formErrors.attachmentNotes && (
                    <div style={{ color: '#DC2626', fontSize: '12px', marginTop: '4px' }}>
                      {formErrors.attachmentNotes}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer / Action Buttons */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  padding: '16px 20px',
                  borderTop: '1px solid #E5E7EB',
                  backgroundColor: '#F9FAFB',
                }}
              >
                <button
                  type="button"
                  data-testid="cancel-action-btn"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    backgroundColor: '#FFFFFF',
                    color: '#374151',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  Cancel
                </button>

                {/* Double-submit prevention: disabled during isSubmitting (AC-03-04) */}
                <button
                  type="submit"
                  id="save-action-btn"
                  data-testid="save-action-btn"
                  disabled={isSubmitting}
                  style={{
                    padding: '8px 18px',
                    fontSize: '13px',
                    fontWeight: 600,
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: isSubmitting ? '#9CA3AF' : '#006B3C',
                    color: '#FFFFFF',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                      Saving...
                    </>
                  ) : (
                    'Save Action Taken'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
export default ActionsTaken;
