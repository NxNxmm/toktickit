import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import * as api from '../api';

interface StaffQueueProps {
  onViewTicket?: (ticketId: number) => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#16a34a',
  MEDIUM: '#d97706',
  HIGH: '#dc2626',
  URGENT: '#7c3aed',
};

const PRIORITY_BG: Record<string, string> = {
  LOW: '#dcfce7',
  MEDIUM: '#fef3c7',
  HIGH: '#fee2e2',
  URGENT: '#ede9fe',
};

const STATUS_COLORS: Record<string, string> = {
  NEW: '#2563eb',
  OPEN: '#0891b2',
  IN_PROGRESS: '#d97706',
  WAITING_FOR_REQUESTER: '#7c3aed',
  RESOLVED: '#16a34a',
  CLOSED: '#6b7280',
  REOPENED: '#dc2626',
  CANCELLED: '#9ca3af',
};

const STATUS_BG: Record<string, string> = {
  NEW: '#dbeafe',
  OPEN: '#cffafe',
  IN_PROGRESS: '#fef3c7',
  WAITING_FOR_REQUESTER: '#ede9fe',
  RESOLVED: '#dcfce7',
  CLOSED: '#f3f4f6',
  REOPENED: '#fee2e2',
  CANCELLED: '#f9fafb',
};

function PriorityBadge({ priority }: { priority: string | null }) {
  if (!priority) return <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>—</span>;
  return (
    <span style={{
      backgroundColor: PRIORITY_BG[priority] ?? '#f3f4f6',
      color: PRIORITY_COLORS[priority] ?? '#374151',
      border: `1px solid ${PRIORITY_COLORS[priority] ?? '#d1d5db'}40`,
      fontWeight: 600,
      fontSize: '0.72rem',
      padding: '0.2rem 0.55rem',
      borderRadius: '9999px',
      letterSpacing: '0.02em',
      whiteSpace: 'nowrap',
    }}>
      {priority}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, ' ');
  return (
    <span style={{
      backgroundColor: STATUS_BG[status] ?? '#f3f4f6',
      color: STATUS_COLORS[status] ?? '#374151',
      border: `1px solid ${STATUS_COLORS[status] ?? '#d1d5db'}40`,
      fontWeight: 600,
      fontSize: '0.72rem',
      padding: '0.2rem 0.55rem',
      borderRadius: '9999px',
      letterSpacing: '0.02em',
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

type SortField = 'ticketNo' | 'createdAt' | 'updatedAt' | 'requestedPriority' | 'itPriority' | 'currentStatus';

export const StaffQueue: React.FC<StaffQueueProps> = ({ onViewTicket }) => {
  const { user } = useAuth();

  // Filter & search state
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterReqPriority, setFilterReqPriority] = useState('');
  const [filterItPriority, setFilterItPriority] = useState('');
  const [filterOwner, setFilterOwner] = useState('');

  // Sort state
  const [sortBy, setSortBy] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Data
  const [tickets, setTickets] = useState<api.StaffTicketListItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, totalCount: 0, totalPages: 0, hasPrevious: false, hasNext: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reference data
  const [categories, setCategories] = useState<api.Category[]>([]);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchTerm(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Load categories
  useEffect(() => {
    fetch('/api/categories')
      .then((r) => (r.ok ? r.json() : []))
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  // Fetch queue
  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getStaffTickets({
        search: searchTerm,
        categoryId: filterCategory || undefined,
        status: filterStatus || undefined,
        requestedPriority: filterReqPriority || undefined,
        itPriority: filterItPriority || undefined,
        ownerId: filterOwner || undefined,
        sortBy,
        sortOrder,
        page,
        pageSize,
      });
      setTickets(data.tickets);
      setPagination(data.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to load ticket queue');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterCategory, filterStatus, filterReqPriority, filterItPriority, filterOwner, sortBy, sortOrder, page, pageSize]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) return <span style={{ opacity: 0.3, marginLeft: '4px' }}>↕</span>;
    return <span style={{ color: 'var(--color-primary-green)', marginLeft: '4px' }}>{sortOrder === 'asc' ? '↑' : '↓'}</span>;
  };

  const resetFilters = () => {
    setSearchInput('');
    setFilterCategory('');
    setFilterStatus('');
    setFilterReqPriority('');
    setFilterItPriority('');
    setFilterOwner('');
    setPage(1);
  };

  const hasActiveFilters = searchInput || filterCategory || filterStatus || filterReqPriority || filterItPriority || filterOwner;

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const inputStyle: React.CSSProperties = {
    border: '1px solid var(--color-border-neutral)',
    borderRadius: '8px',
    padding: '0.45rem 0.75rem',
    fontSize: '0.85rem',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text-primary)',
    outline: 'none',
    transition: 'border-color 0.15s',
    width: '100%',
  };

  const thStyle: React.CSSProperties = {
    padding: '0.75rem 1rem',
    textAlign: 'left',
    fontWeight: 700,
    fontSize: '0.75rem',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'var(--color-text-secondary)',
    borderBottom: '2px solid var(--color-border-subtle)',
    backgroundColor: 'var(--color-surface-subtle)',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    userSelect: 'none',
  };

  const tdStyle: React.CSSProperties = {
    padding: '0.85rem 1rem',
    fontSize: '0.85rem',
    color: 'var(--color-text-primary)',
    borderBottom: '1px solid var(--color-border-subtle)',
    verticalAlign: 'middle',
  };

  return (
    <div>
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
            IT Staff Ticket Queue
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '4px 0 0' }}>
            All submitted tickets across all requesters
            {!loading && (
              <span style={{ marginLeft: '8px', fontWeight: 600, color: 'var(--color-primary-green)' }}>
                ({pagination.totalCount} total)
              </span>
            )}
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <label htmlFor="staff-queue-page-size" style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>Show:</label>
          <select
            id="staff-queue-page-size"
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            style={{ ...inputStyle, width: 'auto', padding: '0.35rem 0.6rem' }}
          >
            {[10, 20, 50].map((n) => <option key={n} value={n}>{n} per page</option>)}
          </select>
        </div>
      </div>

      {/* Filters Panel */}
      <div style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: '12px',
        padding: '1rem 1.25rem',
        marginBottom: '1.25rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      }}>
        {/* Search */}
        <div className="mb-3">
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none', fontSize: '0.95rem' }}>🔍</span>
            <input
              id="staff-queue-search"
              type="text"
              aria-label="Search tickets by ticket number or summary"
              placeholder="Search by Ticket No or Summary..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{ ...inputStyle, paddingLeft: '2.25rem' }}
            />
          </div>
        </div>

        {/* Filter row */}
        <div className="row g-2">
          <div className="col-6 col-md-4 col-lg-2">
            <select id="filter-category" aria-label="Filter by category" value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }} style={inputStyle}>
              <option value="">All Categories</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="col-6 col-md-4 col-lg-2">
            <select id="filter-status" aria-label="Filter by status" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }} style={inputStyle}>
              <option value="">All Statuses</option>
              {['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED'].map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div className="col-6 col-md-4 col-lg-2">
            <select id="filter-req-priority" aria-label="Filter by requester priority" value={filterReqPriority} onChange={(e) => { setFilterReqPriority(e.target.value); setPage(1); }} style={inputStyle}>
              <option value="">Req. Priority</option>
              {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="col-6 col-md-4 col-lg-2">
            <select id="filter-it-priority" aria-label="Filter by IT priority" value={filterItPriority} onChange={(e) => { setFilterItPriority(e.target.value); setPage(1); }} style={inputStyle}>
              <option value="">IT Priority</option>
              {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="col-6 col-md-4 col-lg-2">
            <select id="filter-owner" aria-label="Filter by owner" value={filterOwner} onChange={(e) => { setFilterOwner(e.target.value); setPage(1); }} style={inputStyle}>
              <option value="">All Owners</option>
              <option value="unassigned">Unassigned</option>
              {user && <option value={user.id}>{user.name} (me)</option>}
            </select>
          </div>
          {hasActiveFilters && (
            <div className="col-6 col-md-4 col-lg-2 d-flex align-items-center">
              <button
                onClick={resetFilters}
                style={{
                  background: 'none',
                  border: '1px solid var(--color-border-neutral)',
                  borderRadius: '8px',
                  padding: '0.45rem 0.75rem',
                  fontSize: '0.8rem',
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  width: '100%',
                  transition: 'all 0.15s',
                }}
                onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary-green)')}
                onMouseOut={(e) => (e.currentTarget.style.borderColor = 'var(--color-border-neutral)')}
              >
                ✕ Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div style={{ backgroundColor: 'var(--color-error-bg)', border: '1px solid var(--color-error-border)', color: 'var(--color-error-text)', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '1rem' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Desktop Table — shown at ≥992px */}
      <div className="d-none d-lg-block">
        <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border-subtle)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
              <thead>
                <tr>
                  <th style={thStyle} onClick={() => handleSort('ticketNo')}>Ticket No <SortIcon field="ticketNo" /></th>
                  <th style={{ ...thStyle, minWidth: '200px' }}>Summary</th>
                  <th style={thStyle}>Category</th>
                  <th style={thStyle}>Requester</th>
                  <th style={thStyle}>Owner</th>
                  <th style={thStyle} onClick={() => handleSort('requestedPriority')}>Req. Pri <SortIcon field="requestedPriority" /></th>
                  <th style={thStyle} onClick={() => handleSort('itPriority')}>IT Pri <SortIcon field="itPriority" /></th>
                  <th style={thStyle} onClick={() => handleSort('currentStatus')}>Status <SortIcon field="currentStatus" /></th>
                  <th style={thStyle} onClick={() => handleSort('createdAt')}>Created <SortIcon field="createdAt" /></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} style={{ ...tdStyle, textAlign: 'center', padding: '3rem' }}>
                      <div className="spinner-border" style={{ width: '1.5rem', height: '1.5rem', borderWidth: '2px', color: 'var(--color-primary-green)' }} role="status" />
                      <div style={{ marginTop: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Loading tickets…</div>
                    </td>
                  </tr>
                ) : tickets.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ ...tdStyle, textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                      No tickets found
                      {hasActiveFilters && (
                        <button onClick={resetFilters} style={{ display: 'block', margin: '0.75rem auto 0', background: 'none', border: 'none', color: 'var(--color-primary-green)', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}>
                          Clear filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : tickets.map((ticket, idx) => (
                  <tr
                    key={ticket.id}
                    onClick={() => onViewTicket?.(ticket.id)}
                    style={{
                      cursor: onViewTicket ? 'pointer' : 'default',
                      backgroundColor: idx % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-subtle)',
                      transition: 'background-color 0.1s',
                    }}
                    onMouseOver={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'var(--color-pale-green)'; }}
                    onMouseOut={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = idx % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-subtle)'; }}
                  >
                    <td style={tdStyle}>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-primary-green)' }}>
                        {ticket.ticketNo}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, maxWidth: '280px' }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ticket.summary}>
                        {ticket.summary}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{ticket.category.name}</span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: '0.8rem' }}>{ticket.requester?.name ?? '—'}</span>
                    </td>
                    <td style={tdStyle}>
                      {ticket.owner ? (
                        <span style={{ fontSize: '0.8rem' }}>{ticket.owner.name}</span>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Unassigned</span>
                      )}
                    </td>
                    <td style={tdStyle}><PriorityBadge priority={ticket.requestedPriority} /></td>
                    <td style={tdStyle}><PriorityBadge priority={ticket.itPriority} /></td>
                    <td style={tdStyle}><StatusBadge status={ticket.currentStatus} /></td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{formatDate(ticket.createdAt)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Mobile Cards — shown below 992px */}
      <div className="d-lg-none">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
            <div className="spinner-border" style={{ width: '1.5rem', height: '1.5rem', borderWidth: '2px', color: 'var(--color-primary-green)' }} role="status" />
            <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>Loading tickets…</div>
          </div>
        ) : tickets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)', backgroundColor: 'var(--color-surface)', borderRadius: '12px', border: '1px solid var(--color-border-subtle)' }}>
            No tickets found
            {hasActiveFilters && (
              <button onClick={resetFilters} style={{ display: 'block', margin: '0.75rem auto 0', background: 'none', border: 'none', color: 'var(--color-primary-green)', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}>
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => onViewTicket?.(ticket.id)}
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: '12px',
                  padding: '1rem 1.25rem',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                  cursor: onViewTicket ? 'pointer' : 'default',
                  transition: 'box-shadow 0.15s, border-color 0.15s',
                }}
                onMouseOver={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-primary-green)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 10px rgba(0,107,60,0.12)';
                }}
                onMouseOut={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-border-subtle)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)';
                }}
              >
                {/* Card header */}
                <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
                  <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-primary-green)', overflowWrap: 'anywhere' }}>
                    {ticket.ticketNo}
                  </span>
                  <StatusBadge status={ticket.currentStatus} />
                </div>

                {/* Summary */}
                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--color-text-primary)', overflowWrap: 'anywhere' }}>
                  {ticket.summary}
                </div>

                {/* Meta rows */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.4rem 1rem', marginBottom: '0.6rem' }}>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Category</span>
                    <div style={{ fontSize: '0.82rem', overflowWrap: 'anywhere' }}>{ticket.category.name}</div>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Requester</span>
                    <div style={{ fontSize: '0.82rem', overflowWrap: 'anywhere' }}>{ticket.requester?.name ?? '—'}</div>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Owner</span>
                    <div style={{ fontSize: '0.82rem', overflowWrap: 'anywhere' }}>
                      {ticket.owner ? ticket.owner.name : <em style={{ color: 'var(--color-text-muted)' }}>Unassigned</em>}
                    </div>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Created</span>
                    <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>{formatDate(ticket.createdAt)}</div>
                  </div>
                </div>

                {/* Priority badges */}
                <div className="d-flex gap-2 flex-wrap">
                  <div>
                    <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginRight: '4px' }}>Req:</span>
                    <PriorityBadge priority={ticket.requestedPriority} />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginRight: '4px' }}>IT:</span>
                    <PriorityBadge priority={ticket.itPriority} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && pagination.totalPages > 1 && (
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-4">
          <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
            Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, pagination.totalCount)} of {pagination.totalCount} tickets
          </div>
          <div className="d-flex gap-1 flex-wrap">
            <button
              onClick={() => setPage(1)}
              disabled={!pagination.hasPrevious}
              style={paginationBtnStyle(!pagination.hasPrevious)}
            >«</button>
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={!pagination.hasPrevious}
              style={paginationBtnStyle(!pagination.hasPrevious)}
            >‹</button>
            {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, pagination.totalPages - 4));
              const p = start + i;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{
                    ...paginationBtnStyle(false),
                    backgroundColor: p === page ? 'var(--color-primary-green)' : undefined,
                    color: p === page ? '#fff' : undefined,
                    borderColor: p === page ? 'var(--color-primary-green)' : undefined,
                    fontWeight: p === page ? 700 : 500,
                  }}
                >{p}</button>
              );
            })}
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!pagination.hasNext}
              style={paginationBtnStyle(!pagination.hasNext)}
            >›</button>
            <button
              onClick={() => setPage(pagination.totalPages)}
              disabled={!pagination.hasNext}
              style={paginationBtnStyle(!pagination.hasNext)}
            >»</button>
          </div>
        </div>
      )}
    </div>
  );
};

function paginationBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: '0.35rem 0.65rem',
    border: '1px solid var(--color-border-neutral)',
    borderRadius: '7px',
    backgroundColor: 'var(--color-surface)',
    color: disabled ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '0.85rem',
    opacity: disabled ? 0.45 : 1,
    transition: 'all 0.15s',
    minWidth: '44px',
    minHeight: '44px',
    textAlign: 'center',
  };
}
