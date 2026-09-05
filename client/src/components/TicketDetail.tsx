import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRequester } from '../context/RequesterContext';
import {
  getTicketById,
  uploadAttachment,
  downloadAttachmentBlob,
  softRemoveAttachment,
  TicketDetail as ITicketDetail,
  Attachment,
} from '../api';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileExtBadgeColor(mimeType: string): string {
  if (mimeType === 'application/pdf') return '#dc2626';
  if (mimeType.startsWith('image/')) return '#0B7A46';
  return '#6B7280';
}

function fileExt(mimeType: string): string {
  const map: Record<string, string> = {
    'application/pdf': 'PDF',
    'image/jpeg': 'JPG',
    'image/png': 'PNG',
    'image/webp': 'WEBP',
  };
  return map[mimeType] ?? 'FILE';
}

// ─── Status / Priority Badges ────────────────────────────────────────────────

const STATUS_STYLES: Record<string, React.CSSProperties> = {
  NEW:         { backgroundColor: '#DBEAFE', color: '#1E40AF', border: '1px solid #BFDBFE' },
  IN_PROGRESS: { backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' },
  RESOLVED:    { backgroundColor: '#D1FAE5', color: '#065F46', border: '1px solid #A7F3D0' },
  CLOSED:      { backgroundColor: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB' },
  CANCELLED:   { backgroundColor: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA' },
};

const PRIORITY_STYLES: Record<string, React.CSSProperties> = {
  LOW:    { backgroundColor: '#F3F4F6', color: '#4B5563', border: '1px solid #E5E7EB' },
  MEDIUM: { backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' },
  HIGH:   { backgroundColor: '#FFEDD5', color: '#9A3412', border: '1px solid #FED7AA' },
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
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <span style={{ ...BADGE_BASE, ...(STATUS_STYLES[status] ?? STATUS_STYLES.NEW) }}>
    {status.replace('_', ' ')}
  </span>
);

const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => (
  <span style={{ ...BADGE_BASE, ...(PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.MEDIUM) }}>
    {priority}
  </span>
);

// ─── Read-only field ─────────────────────────────────────────────────────────

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
        cursor: 'default',
        minHeight: '38px',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {value}
    </div>
  </div>
);

// ─── Soft-Removal Modal ──────────────────────────────────────────────────────

interface RemoveModalProps {
  attachment: Attachment;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}

const RemoveModal: React.FC<RemoveModalProps> = ({ attachment, onConfirm, onCancel, isLoading }) => {
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const reasonError =
    touched && (reason.trim().length < 3 || reason.trim().length > 250)
      ? reason.trim().length === 0
        ? 'A removal reason is required.'
        : reason.trim().length < 3
        ? 'Reason must be at least 3 characters.'
        : 'Reason must be 250 characters or fewer.'
      : '';

  const handleSubmit = () => {
    setTouched(true);
    if (reason.trim().length >= 3 && reason.trim().length <= 250) {
      onConfirm(reason.trim());
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="remove-modal-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        backgroundColor: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF', borderRadius: '12px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          maxWidth: '480px', width: '100%',
          padding: '28px 24px',
        }}
      >
        <h3 id="remove-modal-title" style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700, color: '#1A2820' }}>
          🗑️ Remove Attachment
        </h3>
        <p style={{ margin: '0 0 16px', fontSize: '14px', color: '#4B5563', lineHeight: 1.55 }}>
          <strong>"{attachment.originalName}"</strong> will be soft-removed. The file record and your
          removal reason will remain visible for auditing, but the file will no longer be downloadable.
        </p>

        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="removal-reason" style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1A2820', marginBottom: '6px' }}>
            Removal Reason <span style={{ color: '#DC2626' }}>*</span>
          </label>
          <textarea
            ref={inputRef}
            id="removal-reason"
            value={reason}
            onChange={(e) => { setReason(e.target.value); setTouched(true); }}
            placeholder="Explain why this attachment is being removed..."
            rows={3}
            maxLength={250}
            aria-required="true"
            aria-describedby={reasonError ? 'reason-error' : undefined}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '10px 12px',
              border: `1px solid ${reasonError ? '#DC2626' : '#D1D5DB'}`,
              borderRadius: '6px', fontSize: '14px',
              color: '#1A2820', resize: 'vertical',
              fontFamily: 'inherit',
              outline: 'none',
              boxShadow: reasonError ? '0 0 0 3px rgba(220,38,38,0.2)' : 'none',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
            {reasonError ? (
              <span id="reason-error" style={{ fontSize: '12px', color: '#991B1B', fontWeight: 500 }}>
                ⚠ {reasonError}
              </span>
            ) : <span />}
            <span style={{ fontSize: '12px', color: '#6B7280' }}>{reason.length} / 250</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            disabled={isLoading}
            style={{
              padding: '10px 20px', fontSize: '14px', fontWeight: 600,
              border: '1px solid #D1D5DB', borderRadius: '8px',
              backgroundColor: '#FFFFFF', color: '#374151',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            aria-busy={isLoading}
            style={{
              padding: '10px 20px', fontSize: '14px', fontWeight: 600,
              border: '1px solid #FCA5A5', borderRadius: '8px',
              backgroundColor: isLoading ? '#FEE2E2' : '#FEF2F2', color: '#991B1B',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.65 : 1,
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            {isLoading && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
                  <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/>
                </path>
              </svg>
            )}
            Confirm Removal
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Upload Modal ─────────────────────────────────────────────────────────────

interface UploadModalProps {
  onUpload: (file: File) => void;
  onCancel: () => void;
  isLoading: boolean;
  error?: string;
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const UploadModal: React.FC<UploadModalProps> = ({ onUpload, onCancel, isLoading, error }) => {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const dropRef = useRef<HTMLDivElement>(null);

  const validateAndSet = (f: File) => {
    if (!ALLOWED_MIME_TYPES.includes(f.type)) {
      setFileError('Invalid file type. Allowed: JPG, PNG, WEBP, PDF.');
      setFile(null);
    } else if (f.size > MAX_FILE_SIZE) {
      setFileError('File exceeds the 5 MB limit.');
      setFile(null);
    } else {
      setFileError('');
      setFile(f);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        backgroundColor: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{
        backgroundColor: '#FFFFFF', borderRadius: '12px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        maxWidth: '440px', width: '100%', padding: '28px 24px',
      }}>
        <h3 id="upload-modal-title" style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 700, color: '#1A2820' }}>
          📎 Add Attachment
        </h3>

        <div
          ref={dropRef}
          onDragOver={(e) => { e.preventDefault(); }}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f) validateAndSet(f);
          }}
          style={{
            border: '2px dashed #D1D5DB', borderRadius: '8px',
            padding: '28px 16px', textAlign: 'center',
            backgroundColor: '#F9FAFB', marginBottom: '16px',
            cursor: 'pointer',
          }}
          onClick={() => document.getElementById('att-file-input')?.click()}
        >
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📁</div>
          <p style={{ margin: '0 0 4px', fontSize: '14px', color: '#1A2820', fontWeight: 500 }}>
            Drag & drop or click to select
          </p>
          <p style={{ margin: 0, fontSize: '12px', color: '#6B7280' }}>
            JPG, PNG, WEBP, PDF · Max 5 MB
          </p>
        </div>

        <input
          id="att-file-input"
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.pdf"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) validateAndSet(f);
            e.target.value = '';
          }}
        />

        {file && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 12px', backgroundColor: '#EAF6EF',
            borderRadius: '8px', marginBottom: '12px',
          }}>
            <span style={{
              backgroundColor: fileExtBadgeColor(file.type), color: '#fff',
              borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 700,
            }}>
              {fileExt(file.type)}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#1A2820', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>{formatFileSize(file.size)}</div>
            </div>
            <button onClick={() => setFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#6B7280' }}>✕</button>
          </div>
        )}

        {fileError && (
          <p style={{ fontSize: '12px', color: '#991B1B', fontWeight: 500, margin: '0 0 12px' }}>⚠ {fileError}</p>
        )}

        {error && (
          <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', padding: '10px 12px', marginBottom: '12px', fontSize: '13px', color: '#991B1B' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onCancel} disabled={isLoading} style={{ padding: '10px 20px', fontSize: '14px', fontWeight: 600, border: '1px solid #D1D5DB', borderRadius: '8px', backgroundColor: '#fff', color: '#374151', cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={() => file && onUpload(file)}
            disabled={!file || isLoading}
            aria-busy={isLoading}
            style={{
              padding: '10px 20px', fontSize: '14px', fontWeight: 600,
              border: 'none', borderRadius: '8px',
              backgroundColor: !file || isLoading ? '#6B9B82' : '#006B3C', color: '#fff',
              cursor: !file || isLoading ? 'not-allowed' : 'pointer',
              opacity: !file || isLoading ? 0.65 : 1,
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            {isLoading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main TicketDetail Component ──────────────────────────────────────────────

interface TicketDetailProps {
  ticketId: number;
  onBack: () => void;
}

export const TicketDetail: React.FC<TicketDetailProps> = ({ ticketId, onBack }) => {
  const { selectedRequester } = useRequester();
  const [ticket, setTicket] = useState<ITicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | null>(null);

  // Modals
  const [removeTarget, setRemoveTarget] = useState<Attachment | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);
  const [removeError, setRemoveError] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Download
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const fetchTicket = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTicketById(ticketId, selectedRequester?.id);
      setTicket(data);
    } catch (err: any) {
      setErrorCode(err.statusCode ?? null);
      setError(err.message || 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  }, [ticketId, selectedRequester?.id]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  // ── Handle download ──
  const handleDownload = async (att: Attachment) => {
    try {
      setDownloadingId(att.id);
      const { blob, filename } = await downloadAttachmentBlob(att.id, selectedRequester?.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
    } catch (err: any) {
      alert(err.message || 'Download failed');
    } finally {
      setDownloadingId(null);
    }
  };

  // ── Handle soft-remove ──
  const handleConfirmRemove = async (reason: string) => {
    if (!removeTarget) return;
    try {
      setRemoveLoading(true);
      setRemoveError('');
      await softRemoveAttachment(removeTarget.id, reason, selectedRequester?.id);
      setRemoveTarget(null);
      await fetchTicket(); // Refresh
    } catch (err: any) {
      setRemoveError(err.message || 'Failed to remove attachment');
    } finally {
      setRemoveLoading(false);
    }
  };

  // ── Handle upload ──
  const handleUpload = async (file: File) => {
    if (!ticket) return;
    try {
      setUploadLoading(true);
      setUploadError('');
      await uploadAttachment(ticket.id, file, selectedRequester?.id);
      setShowUploadModal(false);
      await fetchTicket();
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploadLoading(false);
    }
  };

  // ── Loading state ──
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '16px' }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#006B3C" strokeWidth="2.5">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
            <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/>
          </path>
        </svg>
        <p style={{ color: '#4B5563', fontSize: '14px' }}>Loading ticket details...</p>
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0B7A46', fontSize: '14px', fontWeight: 600, marginBottom: '24px', padding: 0, display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          ← Back to My Tickets
        </button>
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>{errorCode === 403 ? '🔒' : '⚠️'}</div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#991B1B', marginBottom: '8px' }}>
            {errorCode === 403 ? 'Access Denied' : errorCode === 404 ? 'Ticket Not Found' : 'Error Loading Ticket'}
          </h2>
          <p style={{ fontSize: '14px', color: '#4B5563', margin: '0 0 20px' }}>{error}</p>
          <button
            onClick={onBack}
            style={{ padding: '10px 24px', backgroundColor: '#006B3C', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
          >
            Back to My Tickets
          </button>
        </div>
      </div>
    );
  }

  if (!ticket) return null;

  const activeAttachments = ticket.attachments.filter((a) => !a.isRemoved);
  const removedAttachments = ticket.attachments.filter((a) => a.isRemoved);
  const canAddAttachment = activeAttachments.length < 5;

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', color: '#1A2820', maxWidth: '900px', margin: '0 auto' }}>
      {/* ── Breadcrumb ── */}
      <button
        onClick={onBack}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0B7A46', fontSize: '14px', fontWeight: 600, marginBottom: '24px', padding: 0, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
      >
        ← Back to My Tickets
      </button>

      {/* ── Header Summary Card ── */}
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '24px', marginBottom: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 500, color: '#4B5563', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Ticket Number
            </div>
            <div style={{ fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace', fontSize: '20px', fontWeight: 700, color: '#1A2820' }}>
              {ticket.ticketNo}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <StatusBadge status={ticket.currentStatus} />
            <PriorityBadge priority={ticket.requestedPriority} />
            {ticket.itPriority && (
              <span style={{ ...BADGE_BASE, backgroundColor: '#F3F4F6', color: '#4B5563', border: '1px solid #E5E7EB', fontSize: '11px' }}>
                IT: <PriorityBadge priority={ticket.itPriority} />
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <ReadOnlyField label="Requester" value={`${ticket.requester.name}`} />
          <ReadOnlyField label="Email" value={ticket.requester.email} />
          <ReadOnlyField label="Category" value={ticket.category.name} />
          <ReadOnlyField label="Related System" value={ticket.relatedSystem.name} />
          <ReadOnlyField label="Created" value={formatDate(ticket.createdAt)} />
          <ReadOnlyField label="Last Updated" value={formatDate(ticket.updatedAt)} />
        </div>
      </div>

      {/* ── Problem Statement Card ── */}
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '24px', marginBottom: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 12px', color: '#1A2820' }}>
          Problem Statement
        </h2>
        <div style={{ fontSize: '16px', fontWeight: 600, color: '#1A2820', marginBottom: '12px' }}>
          {ticket.summary}
        </div>
        <div style={{ fontSize: '14px', color: '#1A2820', lineHeight: 1.7, whiteSpace: 'pre-wrap', backgroundColor: '#F9FAFB', borderRadius: '8px', padding: '16px' }}>
          {ticket.description}
        </div>
      </div>

      {/* ── Attachments Manager Card ── */}
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#1A2820' }}>
            Supporting Attachments ({activeAttachments.length} / 5 Active)
          </h2>
          <button
            id="add-attachment-btn"
            onClick={() => { setUploadError(''); setShowUploadModal(true); }}
            disabled={!canAddAttachment}
            title={!canAddAttachment ? 'Maximum 5 active attachments reached' : 'Add a file attachment'}
            style={{
              padding: '8px 16px', fontSize: '13px', fontWeight: 600,
              backgroundColor: canAddAttachment ? '#006B3C' : '#E5E7EB',
              color: canAddAttachment ? '#fff' : '#9CA3AF',
              border: 'none', borderRadius: '8px',
              cursor: canAddAttachment ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            + Add Attachment
          </button>
        </div>

        {/* Active Attachments */}
        {activeAttachments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: '#6B7280', fontSize: '14px', backgroundColor: '#F9FAFB', borderRadius: '8px', marginBottom: '16px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📎</div>
            No active attachments. Click "+ Add Attachment" to upload a file.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            {activeAttachments.map((att) => (
              <div key={att.id} style={{
                display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
                padding: '12px 16px',
                backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '8px',
              }}>
                <span style={{
                  backgroundColor: fileExtBadgeColor(att.mimeType), color: '#fff',
                  borderRadius: '4px', padding: '3px 7px', fontSize: '11px', fontWeight: 700, flexShrink: 0,
                }}>
                  {fileExt(att.mimeType)}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#1A2820', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {att.originalName}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>
                    {formatFileSize(att.fileSize)} · Uploaded {formatDate(att.createdAt)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button
                    onClick={() => handleDownload(att)}
                    disabled={downloadingId === att.id}
                    style={{
                      padding: '7px 14px', fontSize: '13px', fontWeight: 600,
                      border: '1px solid #D1D5DB', borderRadius: '6px',
                      backgroundColor: '#fff', color: '#1A2820',
                      cursor: downloadingId === att.id ? 'wait' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: '4px',
                    }}
                  >
                    {downloadingId === att.id ? '⏳' : '⬇️'} Download
                  </button>
                  <button
                    onClick={() => { setRemoveError(''); setRemoveTarget(att); }}
                    style={{
                      padding: '7px 14px', fontSize: '13px', fontWeight: 600,
                      border: '1px solid #FCA5A5', borderRadius: '6px',
                      backgroundColor: '#FEF2F2', color: '#991B1B',
                      cursor: 'pointer',
                    }}
                  >
                    🗑️ Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Removed Attachments (Audit Log) */}
        {removedAttachments.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <hr style={{ flex: 1, border: 'none', borderTop: '1px solid #E5E7EB' }} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', whiteSpace: 'nowrap', padding: '0 8px' }}>
                Removed Attachments — Audit Log
              </span>
              <hr style={{ flex: 1, border: 'none', borderTop: '1px solid #E5E7EB' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {removedAttachments.map((att) => (
                <div key={att.id} style={{
                  display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
                  padding: '12px 16px',
                  backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '8px',
                  opacity: 0.75,
                }}>
                  <span style={{
                    backgroundColor: '#9CA3AF', color: '#fff',
                    borderRadius: '4px', padding: '3px 7px', fontSize: '11px', fontWeight: 700, flexShrink: 0,
                  }}>
                    {fileExt(att.mimeType)}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#6B7280', textDecoration: 'line-through', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {att.originalName}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                      {att.removedAt ? `Removed on ${formatDate(att.removedAt)}` : 'Removed'} · Reason: <em>"{att.removalReason}"</em>
                    </div>
                  </div>
                  <span style={{ ...BADGE_BASE, backgroundColor: '#F3F4F6', color: '#6B7280', border: '1px solid #E5E7EB', flexShrink: 0 }}>
                    🚫 Removed
                  </span>
                  <button
                    disabled
                    title="Download is disabled for removed attachments"
                    style={{
                      padding: '7px 14px', fontSize: '13px', fontWeight: 600,
                      border: '1px solid #E5E7EB', borderRadius: '6px',
                      backgroundColor: '#E5E7EB', color: '#9CA3AF',
                      cursor: 'not-allowed', display: 'flex', alignItems: 'center', gap: '4px',
                    }}
                  >
                    🔒 Download
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {removeTarget && (
        <RemoveModal
          attachment={removeTarget}
          onConfirm={handleConfirmRemove}
          onCancel={() => { setRemoveTarget(null); setRemoveError(''); }}
          isLoading={removeLoading}
        />
      )}

      {showUploadModal && (
        <UploadModal
          onUpload={handleUpload}
          onCancel={() => { setShowUploadModal(false); setUploadError(''); }}
          isLoading={uploadLoading}
          error={uploadError}
        />
      )}
    </div>
  );
};

export default TicketDetail;
