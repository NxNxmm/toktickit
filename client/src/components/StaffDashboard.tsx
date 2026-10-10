/**
 * client/src/components/StaffDashboard.tsx
 *
 * IT Staff & Admin Dashboard — UI Spec §2 and §4 (ui-spec.md)
 *
 * Covers:
 *   UI-04-09 (AC-13, AC-14 / FR-15): 5 operational metric cards with drill-down links
 *   AC-05-02: Counts match backend DB queries
 *   AC-05-03: Clicking card navigates to filtered staff queue
 *   AC-05-04: Empty state when no recent tickets
 *   AC-05-05: 403 guard enforced at API level
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import * as api from '../api';
import { StatusIcon } from './statusIcons';

interface StaffDashboardProps {
  onNavigate: (view: string, filter?: string) => void;
  onViewTicket?: (ticketId: number) => void;
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
  const MAP: Record<string, { bg: string; color: string; border: string }> = {
    NEW: { bg: '#DBEAFE', color: '#1E40AF', border: '1px solid #BFDBFE' },
    OPEN: { bg: '#CFFAFE', color: '#155E75', border: '1px solid #A5F3FC' },
    IN_PROGRESS: { bg: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' },
    WAITING_FOR_REQUESTER: { bg: '#EDE9FE', color: '#5B21B6', border: '1px solid #DDD6FE' },
    RESOLVED: { bg: '#D1FAE5', color: '#065F46', border: '1px solid #A7F3D0' },
    CLOSED: { bg: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB' },
    REOPENED: { bg: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA' },
    CANCELLED: { bg: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB' },
  };
  const style = MAP[status] ?? { bg: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB' };
  return (
    <span
      style={{
        backgroundColor: style.bg,
        color: style.color,
        border: style.border,
        fontWeight: 600,
        fontSize: '0.72rem',
        padding: '0.2rem 0.55rem',
        borderRadius: '9999px',
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
        display: 'inline-block',
      }}
    >
      <StatusIcon status={status} />{status.replace(/_/g, ' ')}
    </span>
  );
}

// ─── Priority Badge ───────────────────────────────────────────────────────────
function PriorityBadge({ priority }: { priority: string | null | undefined }) {
  if (!priority) return <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>—</span>;
  const MAP: Record<string, { bg: string; color: string }> = {
    LOW: { bg: '#dcfce7', color: '#16a34a' },
    MEDIUM: { bg: '#fef3c7', color: '#d97706' },
    HIGH: { bg: '#fee2e2', color: '#dc2626' },
    URGENT: { bg: '#ede9fe', color: '#7c3aed' },
  };
  const s = MAP[priority] ?? { bg: '#f3f4f6', color: '#374151' };
  return (
    <span style={{
      backgroundColor: s.bg,
      color: s.color,
      border: `1px solid ${s.color}40`,
      fontWeight: 600,
      fontSize: '0.72rem',
      padding: '0.2rem 0.55rem',
      borderRadius: '9999px',
      whiteSpace: 'nowrap',
    }}>
      {priority}
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
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </span>
      </div>
      <div
        data-testid={`${testId}-count`}
        style={{ fontSize: '2.75rem', fontWeight: 800, color: accentColor, lineHeight: 1 }}
      >
        {count}
      </div>
      <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>
        {description}
      </div>
    </div>
  );
}

// ─── User Stats Card (Admin only) ─────────────────────────────────────────────
interface UserStatCardProps {
  label: string;
  count: number;
  icon: string;
  accentColor: string;
  testId: string;
  onClick?: () => void;
}

function UserStatCard({ label, count, icon, accentColor, testId, onClick }: UserStatCardProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      data-testid={testId}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: hovered && onClick ? '#EAF6EF' : '#fff',
        border: `1px solid ${hovered && onClick ? accentColor : '#E5E7EB'}`,
        borderRadius: '10px',
        padding: '20px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.18s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '1.1rem' }}>{icon}</span>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#4B5563' }}>{label}</span>
      </div>
      <div
        data-testid={`${testId}-count`}
        style={{ fontSize: '2rem', fontWeight: 800, color: accentColor }}
      >
        {count}
      </div>
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────
function EmptyRecentTickets() {
  return (
    <div
      data-testid="staff-dashboard-empty"
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
      <span style={{ fontSize: '3rem' }}>🎉</span>
      <p style={{ margin: 0, fontWeight: 600, color: '#1A2820', fontSize: '1rem' }}>
        No active tickets in your queue. Great job!
      </p>
      <p style={{ margin: 0, color: '#6B7280', fontSize: '0.875rem' }}>
        All tickets have been resolved or closed.
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export const StaffDashboard: React.FC<StaffDashboardProps> = ({ onNavigate, onViewTicket }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [staffData, setStaffData] = useState<api.StaffDashboardData | null>(null);
  const [adminData, setAdminData] = useState<api.AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isAdmin) {
        const [staffResult, adminResult] = await Promise.all([
          api.getStaffDashboard(),
          api.getAdminDashboard(),
        ]);
        setStaffData(staffResult);
        setAdminData(adminResult);
      } else {
        const staffResult = await api.getStaffDashboard();
        setStaffData(staffResult);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { load(); }, [load]);

  const metrics = staffData?.metrics;

  return (
    <div data-testid="staff-dashboard" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '28px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#1A2820' }}>
            Welcome back, {user?.name?.split(' ')[0]}! 👋
          </h1>
          <p style={{ margin: '4px 0 0', color: '#4B5563', fontSize: '0.95rem' }}>
            Here&apos;s what&apos;s happening with your queue today.
          </p>
        </div>

        {/* Right Header Area: Quick Actions Box + Refresh Button */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          {/* Rounded-rectangle box for Quick Actions */}
          <div
            data-testid="dashboard-quick-actions"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              padding: '6px 14px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            }}
          >
            <span
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color: '#1A2820',
                whiteSpace: 'nowrap',
              }}
            >
              Quick Actions:
            </span>
            <button
              data-testid="quick-action-search-tickets"
              onClick={() => onNavigate('staff-queue')}
              style={{
                padding: '6px 14px',
                backgroundColor: '#006B3C',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.85rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#005A33'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#006B3C'; }}
            >
              🔍 View Ticket Queue
            </button>
            <button
              data-testid="quick-action-my-queue"
              onClick={() => onNavigate('staff-queue', 'me')}
              style={{
                padding: '6px 14px',
                backgroundColor: '#EAF6EF',
                color: '#006B3C',
                border: '1px solid #A7F3D0',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.85rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#D1FAE5'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#EAF6EF'; }}
            >
              👤 My Queue
            </button>
            {isAdmin && (
              <button
                data-testid="quick-action-manage-users"
                onClick={() => onNavigate('admin-users')}
                style={{
                  padding: '6px 14px',
                  backgroundColor: '#EFF6FF',
                  color: '#1D4ED8',
                  border: '1px solid #BFDBFE',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#DBEAFE'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#EFF6FF'; }}
              >
                ⚙️ Manage Users
              </button>
            )}
          </div>

          <button
            data-testid="dashboard-refresh-btn"
            onClick={load}
            disabled={loading}
            style={{
              padding: '8px 16px',
              backgroundColor: loading ? '#D1D5DB' : '#fff',
              color: '#374151',
              border: '1px solid #D1D5DB',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'background-color 0.15s ease',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            }}
            onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#F9FAFB'; }}
            onMouseLeave={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#fff'; }}
          >
            {loading ? '⟳ Loading…' : '🔄 Refresh'}
          </button>
        </div>
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

      {/* Responsive layout style for 5 metric cards stretching full width */}
      <style>{`
        .staff-metric-cards-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 28px;
          width: 100%;
        }
        @media (max-width: 992px) {
          .staff-metric-cards-grid {
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)) !important;
          }
        }
      `}</style>

      {/* ── 5 Operational Metric Cards ── */}
      <div className="staff-metric-cards-grid">
        {loading ? (
          [1, 2, 3, 4, 5].map((i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <MetricCard
              label="New"
              count={metrics?.newTickets ?? 0}
              icon="🔵"
              accentColor="#1D4ED8"
              description="Awaiting triage"
              testId="metric-new-tickets"
              onClick={() => onNavigate('staff-queue', 'NEW')}
            />
            <MetricCard
              label="Open"
              count={metrics?.openTickets ?? 0}
              icon="🟢"
              accentColor="#065F46"
              description="In triage queue"
              testId="metric-open-tickets"
              onClick={() => onNavigate('staff-queue', 'OPEN')}
            />
            <MetricCard
              label="In Progress"
              count={metrics?.inProgressTickets ?? 0}
              icon="🟡"
              accentColor="#D97706"
              description="Actively worked"
              testId="metric-in-progress-tickets"
              onClick={() => onNavigate('staff-queue', 'IN_PROGRESS')}
            />
            <MetricCard
              label="Waiting for Requester"
              count={metrics?.waitingForRequesterTickets ?? 0}
              icon="🟠"
              accentColor="#9A3412"
              description="Pending user feedback"
              testId="metric-waiting-tickets"
              onClick={() => onNavigate('staff-queue', 'WAITING_FOR_REQUESTER')}
            />
            <MetricCard
              label="My Assigned"
              count={metrics?.myAssignedTickets ?? 0}
              icon="👤"
              accentColor="#006B3C"
              description="Assigned to me (active)"
              testId="metric-my-assigned"
              onClick={() => onNavigate('staff-queue', 'me')}
            />
          </>
        )}
      </div>

      {/* ── Recent Tickets ── */}
      <div
        style={{
          backgroundColor: '#fff',
          border: '1px solid #E5E7EB',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          marginBottom: isAdmin ? '24px' : 0,
        }}
      >
        <h2 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 700, color: '#1A2820' }}>
          My Recent Tickets
        </h2>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ height: '48px', borderRadius: '8px', backgroundColor: '#E5E7EB', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        ) : !staffData?.recentTickets?.length ? (
          <EmptyRecentTickets />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table data-testid="staff-recent-tickets-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#4B5563' }}>Ticket #</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#4B5563' }}>Title</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#4B5563' }}>Status</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#4B5563' }}>Priority</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#4B5563' }}>Updated</th>
                </tr>
              </thead>
              <tbody>
                {staffData.recentTickets.map((t) => (
                  <tr
                    key={t.id}
                    data-testid={`staff-recent-ticket-row-${t.id}`}
                    onClick={() => onViewTicket?.(t.id)}
                    style={{
                      borderBottom: '1px solid #F3F4F6',
                      transition: 'background-color 0.12s ease',
                      cursor: onViewTicket ? 'pointer' : 'default',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '#EAF6EF'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = ''; }}
                  >
                    <td style={{ padding: '12px', fontWeight: 600, color: '#006B3C', whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        style={{
                          background: 'none', border: 'none', padding: 0,
                          fontWeight: 600, color: '#006B3C',
                          fontFamily: '"SFMono-Regular", Consolas, monospace',
                          fontSize: '13px', cursor: 'pointer',
                          textDecoration: 'underline', textUnderlineOffset: '2px',
                        }}
                        onClick={(e) => { e.stopPropagation(); onViewTicket?.(t.id); }}
                      >
                        {t.ticketNumber}
                      </button>
                    </td>
                    <td style={{ padding: '12px', color: '#1A2820' }}>
                      {t.title}
                    </td>
                    <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                      <StatusBadge status={t.status} />
                    </td>
                    <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                      <PriorityBadge priority={t.itPriority} />
                    </td>
                    <td style={{ padding: '12px', color: '#6B7280', whiteSpace: 'nowrap' }}>
                      {new Date(t.updatedAt).toLocaleDateString('en-US', {
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

      {/* ── Admin User Directory Summary ── */}
      {isAdmin && adminData && (
        <div
          data-testid="admin-user-stats"
          style={{
            backgroundColor: '#fff',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}
        >
          <h2 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 700, color: '#1A2820' }}>
            👥 User Directory Summary
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
            <UserStatCard
              label="Active Requesters"
              count={adminData.userStats.activeRequesters}
              icon="👤"
              accentColor="#065F46"
              testId="admin-stat-requesters"
            />
            <UserStatCard
              label="Active IT Staff"
              count={adminData.userStats.activeStaff}
              icon="🛠️"
              accentColor="#1D4ED8"
              testId="admin-stat-staff"
            />
            <UserStatCard
              label="Active Admins"
              count={adminData.userStats.activeAdmins}
              icon="🔑"
              accentColor="#7C3AED"
              testId="admin-stat-admins"
            />
            <UserStatCard
              label="Total Users"
              count={adminData.userStats.totalUsers}
              icon="👥"
              accentColor="#374151"
              testId="admin-stat-total"
              onClick={() => onNavigate('admin-users')}
            />
          </div>
        </div>
      )}

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

export default StaffDashboard;
