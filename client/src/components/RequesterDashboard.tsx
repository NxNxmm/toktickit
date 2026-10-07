/**
 * client/src/components/RequesterDashboard.tsx
 *
 * Requester Dashboard — UI Spec §3 (ui-spec.md)
 *
 * Covers:
 *   UI-04-08 (AC-12, AC-15 / FR-14): 4 metric cards, recent tickets, empty state
 *   AC-05-01: Scoped strictly to authenticated requester's own tickets
 *   AC-05-03: Metric card click navigates to pre-filtered ticket queue
 *   AC-05-04: Clean Zen Green empty state when no tickets
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import * as api from '../api';

interface RequesterDashboardProps {
  /** Navigate to a filtered tickets view */
  onNavigate: (view: string, filter?: string) => void;
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div
      style={{
        backgroundColor: '#fff',
        border: '1px solid #E5E7EB',
        borderRadius: '12px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        animation: 'pulse 1.5s ease-in-out infinite',
      }}
    >
      <div style={{ height: '14px', borderRadius: '6px', backgroundColor: '#E5E7EB', width: '60%' }} />
      <div style={{ height: '40px', borderRadius: '8px', backgroundColor: '#E5E7EB', width: '40%' }} />
      <div style={{ height: '12px', borderRadius: '6px', backgroundColor: '#E5E7EB', width: '80%' }} />
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const MAP: Record<string, { bg: string; color: string; icon: string }> = {
    NEW: { bg: '#EFF6FF', color: '#1D4ED8', icon: '🔵' },
    OPEN: { bg: '#ECFDF5', color: '#065F46', icon: '🟢' },
    IN_PROGRESS: { bg: '#FEF3C7', color: '#92400E', icon: '🟡' },
    WAITING_FOR_REQUESTER: { bg: '#FFF7ED', color: '#9A3412', icon: '🟠' },
    RESOLVED: { bg: '#F0FDF4', color: '#166534', icon: '✅' },
    CLOSED: { bg: '#F3F4F6', color: '#374151', icon: '⚪' },
    REOPENED: { bg: '#FEF2F2', color: '#991B1B', icon: '🔴' },
    CANCELLED: { bg: '#F3F4F6', color: '#6B7280', icon: '✖️' },
  };
  const style = MAP[status] ?? { bg: '#F3F4F6', color: '#374151', icon: '•' };
  return (
    <span
      style={{
        backgroundColor: style.bg,
        color: style.color,
        border: `1px solid ${style.color}30`,
        fontWeight: 600,
        fontSize: '0.72rem',
        padding: '0.2rem 0.55rem',
        borderRadius: '9999px',
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
      }}
    >
      {style.icon} {status.replace(/_/g, ' ')}
    </span>
  );
}

// ─── Metric Card ─────────────────────────────────────────────────────────────
interface MetricCardProps {
  label: string;
  count: number;
  icon: string;
  accentColor: string;
  description: string;
  testId: string;
  onClick: () => void;
}

function MetricCard({ label, count, icon, accentColor, description, testId, onClick }: MetricCardProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      data-testid={testId}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: hovered ? '#EAF6EF' : '#fff',
        border: `1px solid ${hovered ? accentColor : '#E5E7EB'}`,
        borderRadius: '12px',
        padding: '24px',
        cursor: 'pointer',
        transition: 'all 0.18s ease',
        outline: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        boxShadow: hovered ? `0 4px 16px ${accentColor}20` : '0 1px 4px rgba(0,0,0,0.06)',
        transform: hovered ? 'translateY(-2px)' : 'none',
      }}
      onFocus={(e) => { (e.currentTarget as HTMLElement).style.outline = '2px solid #0B7A46'; }}
      onBlur={(e) => { (e.currentTarget as HTMLElement).style.outline = 'none'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '1.25rem' }}>{icon}</span>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </span>
      </div>
      <div
        data-testid={`${testId}-count`}
        style={{ fontSize: '2.5rem', fontWeight: 800, color: accentColor, lineHeight: 1 }}
      >
        {count}
      </div>
      <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
        {description}
      </div>
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────
function EmptyRecentTickets({ onCreateTicket }: { onCreateTicket: () => void }) {
  return (
    <div
      data-testid="requester-dashboard-empty"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        padding: '48px 24px',
        backgroundColor: '#F9FAFB',
        borderRadius: '10px',
        border: '1px dashed #D1D5DB',
        textAlign: 'center',
      }}
    >
      <span style={{ fontSize: '3rem' }}>📬</span>
      <p style={{ margin: 0, fontWeight: 600, color: '#1A2820', fontSize: '1rem' }}>
        You have no open tickets.
      </p>
      <p style={{ margin: 0, color: '#6B7280', fontSize: '0.875rem' }}>
        Need help? Click &ldquo;Create Ticket&rdquo; to get started.
      </p>
      <button
        onClick={onCreateTicket}
        data-testid="empty-create-ticket-btn"
        aria-label="Create a new ticket request"
        style={{
          marginTop: '8px',
          padding: '10px 24px',
          backgroundColor: '#006B3C',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          fontWeight: 600,
          cursor: 'pointer',
          fontSize: '0.9rem',
        }}
      >
        + Create Ticket
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export const RequesterDashboard: React.FC<RequesterDashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();

  const [data, setData] = useState<api.RequesterDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getRequesterDashboard();
      setData(result);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const metrics = data?.metrics;

  // ── Grid layout — 4 cols desktop, 2 tablet, 1 mobile
  const cardGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '16px',
    marginBottom: '28px',
  };

  return (
    <div data-testid="requester-dashboard" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '28px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#1A2820' }}>
            Welcome, {user?.name?.split(' ')[0]}! 👋
          </h1>
          <p style={{ margin: '4px 0 0', color: '#4B5563', fontSize: '0.95rem' }}>
            Here&apos;s the latest on your requests.
          </p>
        </div>
        <button
          data-testid="dashboard-refresh-btn"
          onClick={load}
          disabled={loading}
          style={{
            padding: '8px 18px',
            backgroundColor: loading ? '#D1D5DB' : '#006B3C',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          {loading ? '⟳ Loading…' : '🔄 Refresh'}
        </button>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div
          data-testid="dashboard-error-banner"
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '8px',
            padding: '14px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}
        >
          <span style={{ color: '#991B1B', fontWeight: 500 }}>
            ⚠️ Unable to load dashboard metrics.
          </span>
          <button
            onClick={load}
            style={{ background: 'none', border: 'none', color: '#991B1B', fontWeight: 600, cursor: 'pointer' }}
          >
            🔄 Retry
          </button>
        </div>
      )}

      {/* ── Metric Cards ── */}
      <div style={cardGridStyle}>
        {loading ? (
          <>
            <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
          </>
        ) : (
          <>
            <MetricCard
              label="My Open Tickets"
              count={metrics?.totalOpen ?? 0}
              icon="📂"
              accentColor="#006B3C"
              description="Click to view open tickets"
              testId="metric-total-open"
              onClick={() => onNavigate('my-tickets', 'open')}
            />
            <MetricCard
              label="Waiting for Me"
              count={metrics?.waitingForRequester ?? 0}
              icon="⏳"
              accentColor="#D97706"
              description="Tickets awaiting your response"
              testId="metric-waiting-for-requester"
              onClick={() => onNavigate('my-tickets', 'WAITING_FOR_REQUESTER')}
            />
            <MetricCard
              label="Recently Updated"
              count={metrics?.recentlyUpdated ?? 0}
              icon="🔔"
              accentColor="#0B7A46"
              description="Updated in the last 7 days"
              testId="metric-recently-updated"
              onClick={() => onNavigate('my-tickets', 'recent')}
            />
            <MetricCard
              label="Recently Resolved"
              count={metrics?.recentlyResolved ?? 0}
              icon="✅"
              accentColor="#059669"
              description="Resolved in the last 30 days"
              testId="metric-recently-resolved"
              onClick={() => onNavigate('my-tickets', 'RESOLVED')}
            />
          </>
        )}
      </div>

      {/* ── Lower Grid: Recent Tickets + Quick Actions ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)',
          gap: '20px',
          alignItems: 'start',
        }}
      >
        {/* Recent Tickets */}
        <div
          style={{
            backgroundColor: '#fff',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}
        >
          <h2
            data-testid="recent-tickets-heading"
            style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 700, color: '#1A2820' }}
          >
            My Recent Tickets
          </h2>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{ height: '48px', borderRadius: '8px', backgroundColor: '#E5E7EB', animation: 'pulse 1.5s ease-in-out infinite' }}
                />
              ))}
            </div>
          ) : !data?.recentTickets?.length ? (
            <EmptyRecentTickets onCreateTicket={() => onNavigate('create-ticket')} />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table data-testid="recent-tickets-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#4B5563' }}>Ticket #</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#4B5563' }}>Title</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#4B5563' }}>Status</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#4B5563' }}>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentTickets.map((t) => (
                    <tr
                      key={t.id}
                      data-testid={`recent-ticket-row-${t.id}`}
                      style={{
                        borderBottom: '1px solid #F3F4F6',
                        transition: 'background-color 0.12s ease',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '#F9FAFB'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = ''; }}
                    >
                      <td style={{ padding: '12px', fontWeight: 600, color: '#006B3C', whiteSpace: 'nowrap' }}>
                        {t.ticketNumber}
                      </td>
                      <td style={{ padding: '12px', color: '#1A2820', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.title}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <StatusBadge status={t.status} />
                      </td>
                      <td style={{ padding: '12px', color: '#6B7280', whiteSpace: 'nowrap' }}>
                        {new Date(t.updatedAt).toLocaleDateString('th-TH', {
                          year: 'numeric', month: 'short', day: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div
          style={{
            backgroundColor: '#fff',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}
        >
          <h2 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 700, color: '#1A2820' }}>
            Quick Actions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              data-testid="quick-action-create-ticket"
              aria-label="Create new ticket"
              onClick={() => onNavigate('create-ticket')}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: '#006B3C',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.9rem',
                textAlign: 'left',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#005A33'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#006B3C'; }}
            >
              ➕ Create Ticket
            </button>
            <button
              data-testid="quick-action-view-my-tickets"
              aria-label="View submitted ticket list"
              onClick={() => onNavigate('my-tickets')}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: '#EAF6EF',
                color: '#006B3C',
                border: '1px solid #A7F3D0',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.9rem',
                textAlign: 'left',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#D1FAE5'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#EAF6EF'; }}
            >
              📂 View My Tickets
            </button>
          </div>
        </div>
      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
};

export default RequesterDashboard;
