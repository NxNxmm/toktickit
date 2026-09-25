import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getStaffTicketDetail,
  getStaffAssignees,
  updateTicketOwnership,
  updateTicketItPriority,
  updateTicketStatus,
  postPublicComment,
  postInternalNote,
  TICKET_STATUS_TRANSITIONS,
  StaffTicketDetail as IStaffTicketDetail,
  StaffAssignee,
  InternalNote,
  PublicComment,
} from '../api';

// ─── Helpers & Badges ─────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

const STATUS_STYLES: Record<string, React.CSSProperties> = {
  NEW: { backgroundColor: '#DBEAFE', color: '#1E40AF', border: '1px solid #BFDBFE' },
  OPEN: { backgroundColor: '#CFFAFE', color: '#155E75', border: '1px solid #A5F3FC' },
  IN_PROGRESS: { backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' },
  WAITING_FOR_REQUESTER: { backgroundColor: '#EDE9FE', color: '#5B21B6', border: '1px solid #DDD6FE' },
  RESOLVED: { backgroundColor: '#D1FAE5', color: '#065F46', border: '1px solid #A7F3D0' },
  CLOSED: { backgroundColor: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB' },
  REOPENED: { backgroundColor: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA' },
  CANCELLED: { backgroundColor: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB' },
};

const PRIORITY_STYLES: Record<string, React.CSSProperties> = {
  LOW: { backgroundColor: '#F3F4F6', color: '#4B5563', border: '1px solid #E5E7EB' },
  MEDIUM: { backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' },
  HIGH: { backgroundColor: '#FFEDD5', color: '#9A3412', border: '1px solid #FED7AA' },
  URGENT: { backgroundColor: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA' },
};

const BADGE_BASE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  borderRadius: '9999px',
  padding: '2px 10px',
  fontSize: '12px',
  fontWeight: 600,
  whiteSpace: 'nowrap',
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <span style={{ ...BADGE_BASE, ...(STATUS_STYLES[status] ?? STATUS_STYLES.NEW) }}>
    {status.replace(/_/g, ' ')}
  </span>
);

const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => (
  <span style={{ ...BADGE_BASE, ...(PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.MEDIUM) }}>
    {priority}
  </span>
);

const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
  if (role === 'IT_STAFF') {
    return <span style={{ ...BADGE_BASE, backgroundColor: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0', fontSize: '11px' }}>IT Staff</span>;
  }
  if (role === 'ADMIN') {
    return <span style={{ ...BADGE_BASE, backgroundColor: '#F3E8FF', color: '#6B21A8', border: '1px solid #DDD6FE', fontSize: '11px' }}>Administrator</span>;
  }
  return <span style={{ ...BADGE_BASE, backgroundColor: '#E0F2FE', color: '#0369A1', border: '1px solid #BAE6FD', fontSize: '11px' }}>Requester</span>;
};

const ReadOnlyField: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div>
    <div style={{ fontSize: '12px', fontWeight: 500, color: '#4B5563', marginBottom: '4px' }}>
      {label}
    </div>
    <div
      style={{
        backgroundColor: '#EEF2EE',
        border: '1px solid #CBD5E1',
        borderRadius: '6px',
        padding: '8px 12px',
        fontSize: '14px',
        color: '#1A2820',
        minHeight: '38px',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {value}
    </div>
  </div>
);

// ─── Main Component ──────────────────────────────────────────────────────────

interface StaffTicketDetailProps {
  ticketId: number;
  onBack: () => void;
}

interface SectionCardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}

const SectionCard: React.FC<SectionCardProps> = ({ title, subtitle, children }) => (
  <div
    style={{
      backgroundColor: '#FFFFFF',
      border: '1px solid #E5E7EB',
      borderRadius: '12px',
      padding: '24px',
      marginBottom: '20px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    }}
  >
    {(title || subtitle) && (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
        {title && <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#1A2820' }}>{title}</h2>}
        {subtitle && <span style={{ fontSize: '12px', color: '#6B7280' }}>{subtitle}</span>}
      </div>
    )}
    {children}
  </div>
);

export const StaffTicketDetail: React.FC<StaffTicketDetailProps> = ({ ticketId, onBack }) => {
  const { user } = useAuth();

  const [ticket, setTicket] = useState<IStaffTicketDetail | null>(null);
  const [assignees, setAssignees] = useState<StaffAssignee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | null>(null);

  // Operational action states
  const [updatingOwnerId, setUpdatingOwnerId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');

  // Tabs: 'comments' | 'notes'
  const [activeTab, setActiveTab] = useState<'comments' | 'notes'>('comments');

  // Public comment form
  const [commentContent, setCommentContent] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState('');

  // Internal note form
  const [noteContent, setNoteContent] = useState('');
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const [noteError, setNoteError] = useState('');

  const fetchTicket = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getStaffTicketDetail(ticketId);
      setTicket(data);
    } catch (err: any) {
      setErrorCode(err.statusCode ?? null);
      setError(err.message || 'Failed to load staff ticket detail');
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  useEffect(() => {
    getStaffAssignees()
      .then(setAssignees)
      .catch(() => setAssignees([]));
  }, []);

  const runOp = async (op: () => Promise<IStaffTicketDetail>) => {
    try {
      setSaving(true);
      setActionError('');
      const updated = await op();
      setTicket(updated);
    } catch (err: any) {
      setActionError(err.message || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  // ── Ownership (AC-6.1) ──
  const handleOwnerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const ownerId = value === '' ? null : Number(value);
    setUpdatingOwnerId(ownerId);
  };

  const applyOwnership = async () => {
    if (updatingOwnerId === null) return;
    await runOp(() => updateTicketOwnership(ticketId, updatingOwnerId));
  };

  const claimTicket = async () => {
    if (!user) return;
    setActionError('');
    await runOp(() => updateTicketOwnership(ticketId, user.id));
  };

  // ── IT Priority (AC-6.2) ──
  const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as IStaffTicketDetail['itPriority'];
    runOp(() => updateTicketItPriority(ticketId, value));
  };

  // ── Status transitions (AC-6.2 / BR-12) ──
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (!value) return;
    runOp(() => updateTicketStatus(ticketId, value as IStaffTicketDetail['currentStatus']));
  };

  // ── Public comment (AC-4.2) ──
  const handlePostComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = commentContent.trim();
    if (trimmed.length < 2 || trimmed.length > 2000) return;
    try {
      setCommentSubmitting(true);
      setCommentError('');
      const newComment = await postPublicComment(ticketId, trimmed);
      setTicket((prev) => prev ? { ...prev, publicComments: [...prev.publicComments, newComment] } : prev);
      setCommentContent('');
    } catch (err: any) {
      setCommentError(err.message || 'Failed to post comment');
    } finally {
      setCommentSubmitting(false);
    }
  };

  // ── Internal note (AC-6.3) ──
  const handlePostNote = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = noteContent.trim();
    if (trimmed.length < 2 || trimmed.length > 2000) return;
    try {
      setNoteSubmitting(true);
      setNoteError('');
      const newNote = await postInternalNote(ticketId, trimmed);
      setTicket((prev) => prev ? { ...prev, internalNotes: [...prev.internalNotes, newNote] } : prev);
      setNoteContent('');
    } catch (err: any) {
      setNoteError(err.message || 'Failed to post internal note');
    } finally {
      setNoteSubmitting(false);
    }
  };

  // ── Loading / Error states ──
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '16px' }}>
        <div className="spinner-border" style={{ width: '2rem', height: '2rem', borderWidth: '2px', color: 'var(--color-primary-green)' }} role="status" />
        <p style={{ color: '#4B5563', fontSize: '14px' }}>Loading ticket operational detail...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0B7A46', fontSize: '14px', fontWeight: 600, marginBottom: '24px', padding: 0 }}>
          ← Back to Ticket Queue
        </button>
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>{errorCode === 403 ? '🔒' : '⚠️'}</div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#991B1B', marginBottom: '8px' }}>
            {errorCode === 403 ? 'Access Denied' : errorCode === 404 ? 'Ticket Not Found' : 'Error Loading Ticket'}
          </h2>
          <p style={{ fontSize: '14px', color: '#4B5563', margin: '0 0 20px' }}>{error}</p>
          <button onClick={onBack} style={{ padding: '10px 24px', backgroundColor: '#006B3C', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
            Back to Ticket Queue
          </button>
        </div>
      </div>
    );
  }

  if (!ticket) return null;

  const permittedTransitions = TICKET_STATUS_TRANSITIONS[ticket.currentStatus] ?? [];
  const currentAssigneeId = ticket.owner ? String(ticket.owner.id) : '';

  return (
    <div data-testid="staff-ticket-detail" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', color: '#1A2820', maxWidth: '960px', margin: '0 auto' }}>
      {/* Breadcrumb */}
      <button
        onClick={onBack}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0B7A46', fontSize: '14px', fontWeight: 600, marginBottom: '24px', padding: 0, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
      >
        ← Back to Ticket Queue
      </button>

      {/* ── Header Summary Card ── */}
      <SectionCard>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 500, color: '#4B5563', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ticket Number</div>
            <div style={{ fontFamily: 'monospace', fontSize: '20px', fontWeight: 700, color: '#1A2820' }}>{ticket.ticketNo}</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <StatusBadge status={ticket.currentStatus} />
            <PriorityBadge priority={ticket.requestedPriority} />
            <span style={{ fontSize: '11px', color: '#6B7280' }}>IT:</span>
            <PriorityBadge priority={ticket.itPriority} />
            {ticket.resolvedIndicated && (
              <span style={{ ...BADGE_BASE, backgroundColor: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' }}>✓ Resolution Indicated</span>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <ReadOnlyField label="Requester" value={ticket.requester.name} />
          <ReadOnlyField label="Email" value={ticket.requester.email} />
          <ReadOnlyField label="Category" value={ticket.category.name} />
          <ReadOnlyField label="Related System" value={ticket.relatedSystem.name} />
          <ReadOnlyField label="Created" value={formatDate(ticket.createdAt)} />
          <ReadOnlyField label="Last Updated" value={formatDate(ticket.updatedAt)} />
        </div>
      </SectionCard>

      {/* ── Problem Statement (Requester read-only section) ── */}
      <SectionCard title="Problem Statement" subtitle={`Requested priority: ${ticket.requestedPriority}`}>
        <div style={{ fontSize: '16px', fontWeight: 600, color: '#1A2820', marginBottom: '12px' }}>
          {ticket.summary}
        </div>
        <div style={{ fontSize: '14px', color: '#1A2820', lineHeight: 1.7, whiteSpace: 'pre-wrap', backgroundColor: '#F9FAFB', borderRadius: '8px', padding: '16px' }}>
          {ticket.description}
        </div>
      </SectionCard>

      {/* ── Operational Controls (AC-6.1, AC-6.2) ── */}
      <SectionCard title="Operational Controls" subtitle="Editable by IT Staff & Administrators">
        {actionError && (
          <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', padding: '10px 14px', color: '#991B1B', fontSize: '13px', marginBottom: '16px' }}>
            {actionError}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
          {/* Ticket Owner */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 500, color: '#4B5563', marginBottom: '4px' }}>
              Ticket Owner <span style={{ color: '#6B7280', fontWeight: 400 }}>— active IT Staff / Admins</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                data-testid="ticket-owner-select"
                value={currentAssigneeId}
                onChange={handleOwnerChange}
                disabled={saving}
                aria-label="Ticket owner"
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: '8px 12px',
                  fontSize: '14px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  backgroundColor: '#fff',
                  color: '#1A2820',
                }}
              >
                <option value="">Unassigned</option>
                {assignees.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.role === 'ADMIN' ? 'Admin' : 'IT Staff'})
                  </option>
                ))}
              </select>

              {!ticket.owner && user && (
                <button
                  data-testid="claim-ticket-btn"
                  onClick={claimTicket}
                  disabled={saving}
                  style={{
                    padding: '8px 14px',
                    fontSize: '13px',
                    fontWeight: 700,
                    backgroundColor: '#006B3C',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  {saving ? 'Saving...' : '🎯 Claim Ticket'}
                </button>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button
                data-testid="apply-owner-btn"
                onClick={applyOwnership}
                disabled={saving || updatingOwnerId === null}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  backgroundColor: updatingOwnerId === null ? '#F3F4F6' : '#fff',
                  color: updatingOwnerId === null ? '#9CA3AF' : '#1A2820',
                  cursor: saving || updatingOwnerId === null ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'Saving...' : 'Apply Owner'}
              </button>
            </div>
          </div>

          {/* IT Priority */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 500, color: '#4B5563', marginBottom: '4px' }}>
              IT Priority
            </div>
            <select
              data-testid="ticket-it-priority-select"
              value={ticket.itPriority}
              onChange={handlePriorityChange}
              disabled={saving}
              aria-label="IT priority"
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '14px',
                border: '1px solid #D1D5DB',
                borderRadius: '8px',
                backgroundColor: '#fff',
                color: '#1A2820',
              }}
            >
              {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const).map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Status transition */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 500, color: '#4B5563', marginBottom: '4px' }}>
              Current Status
            </div>
            <div style={{ marginBottom: '4px' }}>
              <StatusBadge status={ticket.currentStatus} />
            </div>
            {permittedTransitions.length > 0 ? (
              <>
                <select
                  data-testid="ticket-status-select"
                  value=""
                  onChange={handleStatusChange}
                  disabled={saving}
                  aria-label="Transition ticket status"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '14px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    backgroundColor: '#fff',
                    color: '#1A2820',
                  }}
                >
                  <option value="">Select transition…</option>
                  {permittedTransitions.map((s) => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                  ))}
                </select>
                <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
                  Only permitted by the state matrix (BR-12).
                </div>
              </>
            ) : (
              <div style={{ fontSize: '12px', color: '#6B7280', fontStyle: 'italic' }}>
                Ticket is in a terminal state ({ticket.currentStatus.replace(/_/g, ' ')}) — no further transitions.
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      {/* ── Dual Tabbed Communication (AC-6.4) ── */}
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        {/* Tabs */}
        <div role="tablist" aria-label="Ticket communication" style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #E5E7EB', marginBottom: '20px', paddingBottom: '0' }}>
          <button
            data-testid="tab-public-comments"
            role="tab"
            aria-selected={activeTab === 'comments'}
            onClick={() => setActiveTab('comments')}
            style={{
              padding: '10px 18px',
              fontSize: '14px',
              fontWeight: 700,
              border: 'none',
              borderBottom: activeTab === 'comments' ? '3px solid #0B7A46' : '3px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === 'comments' ? '#0B7A46' : '#6B7280',
              cursor: 'pointer',
            }}
          >
            💬 Public Comments ({ticket.publicComments.length})
          </button>
          <button
            data-testid="tab-internal-notes"
            role="tab"
            aria-selected={activeTab === 'notes'}
            onClick={() => setActiveTab('notes')}
            style={{
              padding: '10px 18px',
              fontSize: '14px',
              fontWeight: 700,
              border: 'none',
              borderBottom: activeTab === 'notes' ? '3px solid var(--color-note-gold)' : '3px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === 'notes' ? 'var(--color-note-gold)' : '#6B7280',
              cursor: 'pointer',
            }}
          >
            🔒 Internal Notes ({ticket.internalNotes.length})
          </button>
        </div>

        {/* Tab: Public Comments (soft green) */}
        {activeTab === 'comments' && (
          <div>
            <div className="d-none d-md-flex align-items-center gap-2" style={{ marginBottom: '16px' }}>
              <span style={{ fontSize: '12px', color: '#6B7280' }}>
                Shared thread between Requester & Support Staff
              </span>
            </div>

            {ticket.publicComments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '28px 16px', color: '#6B7280', fontSize: '14px', backgroundColor: '#F9FAFB', borderRadius: '8px', marginBottom: '20px' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>💬</div>
                No public comments yet. Post one below to communicate with the requester.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                {ticket.publicComments.map((comment) => (
                  <div
                    key={comment.id}
                    data-testid="public-comment-card"
                    style={{
                      backgroundColor: 'var(--color-pale-green)',
                      border: '1px solid #BDE3D1',
                      borderLeft: '4px solid #0B7A46',
                      borderRadius: '8px',
                      padding: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#1A2820' }}>{comment.author?.name || 'User'}</span>
                        <RoleBadge role={comment.author?.role || 'REQUESTER'} />
                      </div>
                      <span style={{ fontSize: '12px', color: '#4B5563' }}>{formatDate(comment.createdAt)}</span>
                    </div>
                    <div style={{ fontSize: '14px', color: '#1A2820', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {comment.content}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handlePostComment} style={{ borderTop: '1px solid #E5E7EB', paddingTop: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1A2820', margin: '0 0 8px' }}>Add Public Comment</h3>
              {commentError && (
                <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', padding: '10px 14px', color: '#991B1B', fontSize: '13px', marginBottom: '12px' }}>
                  {commentError}
                </div>
              )}
              <textarea
                id="staff-comment-content-input"
                data-testid="staff-comment-content-input"
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder="Type your comment here (2 - 2,000 characters)... this is visible to the requester"
                rows={4}
                maxLength={2000}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '12px',
                  fontSize: '14px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  outline: 'none',
                  fontFamily: 'inherit',
                  lineHeight: 1.5,
                  resize: 'vertical',
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: commentContent.length > 2000 ? '#DC2626' : '#6B7280' }}>
                  {commentContent.length} / 2,000 characters
                </span>
                <button
                  id="staff-post-comment-btn"
                  data-testid="staff-post-comment-btn"
                  type="submit"
                  disabled={commentContent.trim().length < 2 || commentContent.length > 2000 || commentSubmitting}
                  style={{
                    padding: '8px 20px',
                    fontSize: '14px',
                    fontWeight: 600,
                    backgroundColor: commentContent.trim().length >= 2 && commentContent.length <= 2000 && !commentSubmitting ? '#006B3C' : '#9CA3AF',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: commentContent.trim().length >= 2 && commentContent.length <= 2000 && !commentSubmitting ? 'pointer' : 'not-allowed',
                  }}
                >
                  {commentSubmitting ? 'Posting...' : 'Post Comment'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab: Internal Notes (soft gold + lock icon) */}
        {activeTab === 'notes' && (
          <div>
            {/* Confidentiality banner (ui-spec §3.5) */}
            <div
              data-testid="internal-notes-banner"
              style={{
                backgroundColor: 'var(--color-note-bg)',
                border: '1px solid var(--color-note-gold)',
                borderRadius: '8px',
                padding: '12px 16px',
                color: '#92400E',
                fontSize: '13px',
                fontWeight: 600,
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              🔒 Private Operational Notes — Strictly visible to IT Staff and Administrators
            </div>

            {ticket.internalNotes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '28px 16px', color: '#6B7280', fontSize: '14px', backgroundColor: '#FCF6E8', borderRadius: '8px', marginBottom: '20px' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔒</div>
                No internal notes yet. Add one to record confidential operational context.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                {ticket.internalNotes.map((note) => (
                  <div
                    key={note.id}
                    data-testid="internal-note-card"
                    style={{
                      backgroundColor: 'var(--color-note-bg)',
                      border: '1px solid var(--color-note-gold)',
                      borderLeft: '4px solid var(--color-note-gold)',
                      borderRadius: '8px',
                      padding: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#92400E' }}>🔒 {note.author?.name || 'IT Staff'}</span>
                        <RoleBadge role={note.author?.role || 'IT_STAFF'} />
                      </div>
                      <span style={{ fontSize: '12px', color: '#92400E', opacity: 0.8 }}>{formatDate(note.createdAt)}</span>
                    </div>
                    <div style={{ fontSize: '14px', color: '#1F2937', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {note.content}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handlePostNote} style={{ borderTop: '1px solid #E7D8B0', paddingTop: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#92400E', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🔒 Add Internal Note
              </h3>
              {noteError && (
                <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', padding: '10px 14px', color: '#991B1B', fontSize: '13px', marginBottom: '12px' }}>
                  {noteError}
                </div>
              )}
              <textarea
                id="staff-note-content-input"
                data-testid="staff-note-content-input"
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Type a confidential note (2 - 2,000 characters)... hidden from the requester"
                rows={4}
                maxLength={2000}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '12px',
                  fontSize: '14px',
                  border: '1px solid var(--color-note-gold)',
                  borderRadius: '8px',
                  outline: 'none',
                  fontFamily: 'inherit',
                  lineHeight: 1.5,
                  resize: 'vertical',
                  backgroundColor: '#FFFBEB',
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: noteContent.length > 2000 ? '#DC2626' : '#92400E' }}>
                  {noteContent.length} / 2,000 characters
                </span>
                <button
                  id="staff-post-note-btn"
                  data-testid="staff-post-note-btn"
                  type="submit"
                  disabled={noteContent.trim().length < 2 || noteContent.length > 2000 || noteSubmitting}
                  style={{
                    padding: '8px 20px',
                    fontSize: '14px',
                    fontWeight: 600,
                    backgroundColor: noteContent.trim().length >= 2 && noteContent.length <= 2000 && !noteSubmitting ? 'var(--color-note-gold)' : '#D6B98A',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: noteContent.trim().length >= 2 && noteContent.length <= 2000 && !noteSubmitting ? 'pointer' : 'not-allowed',
                  }}
                >
                  {noteSubmitting ? 'Posting...' : 'Add Internal Note'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffTicketDetail;