import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RequesterProvider } from './context/RequesterContext';
import { Login } from './components/Login';
import { MandatoryPasswordChange } from './components/MandatoryPasswordChange';
import { AppHeader } from './components/AppHeader';
import { CreateTicketForm } from './components/CreateTicketForm';
import { MyTicketsList } from './components/MyTicketsList';
import { TicketDetail } from './components/TicketDetail';
import { StaffQueue } from './components/StaffQueue';
import { StaffTicketDetail } from './components/StaffTicketDetail';
import { UserManagement } from './components/UserManagement';
import { RequesterDashboard } from './components/RequesterDashboard';
import { StaffDashboard } from './components/StaffDashboard';

type AppView =
  | 'dashboard'
  | 'my-tickets'
  | 'create-ticket'
  | 'ticket-detail'
  | 'staff-queue'
  | 'staff-ticket-detail'
  | 'admin-users';

/** Returns the appropriate default landing view for a given user role. */
function defaultViewForRole(role: string | undefined): AppView {
  if (role === 'ADMIN') return 'admin-users';
  if (role === 'IT_STAFF') return 'staff-queue';
  return 'my-tickets';
}

const MainApp: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [queueFilter, setQueueFilter] = useState<string | undefined>(undefined);

  // Reset selected ticket and view when user changes (e.g. login/logout/switch)
  React.useEffect(() => {
    setSelectedTicketId(null);
    setCurrentView(defaultViewForRole(user?.role));
  }, [user?.id, user?.role]);

  // 1. Loading state while checking active session
  if (isLoading) {
    return (
      <div
        className="min-vh-100 d-flex flex-column align-items-center justify-content-center"
        style={{ backgroundColor: 'var(--color-page-bg)' }}
      >
        <div className="spinner-border text-success mb-3" role="status">
          <span className="visually-hidden">Loading TokTickIT...</span>
        </div>
        <div className="text-muted small">Loading session...</div>
      </div>
    );
  }

  // 2. Unauthenticated user -> Login Screen (AC-3.1, UI-01)
  if (!isAuthenticated || !user) {
    return <Login />;
  }

  // 3. User with requiresPasswordChange = true -> Mandatory Password Change (AC-3.3, UI-02)
  if (user.requiresPasswordChange) {
    return <MandatoryPasswordChange />;
  }

  // 4. Authenticated application shell with App Header (AC-3.5, UI-03)
  const isStaff = user.role === 'IT_STAFF' || user.role === 'ADMIN';

  const handleViewTicket = (id: number) => {
    setSelectedTicketId(id);
    setCurrentView(isStaff ? 'staff-ticket-detail' : 'ticket-detail');
  };

  const handleBackToTickets = () => {
    setSelectedTicketId(null);
    setCurrentView(defaultViewForRole(user.role));
  };

  /** Navigate from Dashboard cards — supports filter param for staff-queue & my-tickets */
  const handleDashboardNavigate = (view: string, filter?: string) => {
    setSelectedTicketId(null);
    setQueueFilter(filter);
    setCurrentView(view as AppView);
  };

  return (
    <div className="min-vh-100" style={{ backgroundColor: 'var(--color-page-bg)' }}>
      {/* Zen Green Navigation Header */}
      <AppHeader
        currentView={currentView}
        onNavigate={(view) => {
          setSelectedTicketId(null);
          setQueueFilter(undefined);
          setCurrentView(view as AppView);
        }}
      />

      {/* Main Content Area */}
      <main className="container py-4" style={{ maxWidth: '1200px' }}>
        {/* Dashboard — role-aware (AC-05-01, AC-05-02, FR-14, FR-15) */}
        {currentView === 'dashboard' && user.role === 'REQUESTER' && (
          <RequesterDashboard
            onNavigate={handleDashboardNavigate}
            onViewTicket={handleViewTicket}
          />
        )}
        {currentView === 'dashboard' && isStaff && (
          <StaffDashboard
            onNavigate={handleDashboardNavigate}
            onViewTicket={handleViewTicket}
          />
        )}

        {/* REQUESTER: My Tickets list */}
        {currentView === 'my-tickets' && user.role === 'REQUESTER' && (
          <MyTicketsList
            key={queueFilter ?? 'all'}
            onCreateTicket={() => setCurrentView('create-ticket')}
            onViewTicket={handleViewTicket}
            initialFilter={queueFilter}
          />
        )}

        {/* Create Ticket (REQUESTER) */}
        {currentView === 'create-ticket' && user.role === 'REQUESTER' && (
          <CreateTicketForm onSuccess={() => setCurrentView('my-tickets')} />
        )}

        {/* Create Ticket (Staff/Admin can also submit tickets) */}
        {currentView === 'create-ticket' && isStaff && (
          <CreateTicketForm onSuccess={() => setCurrentView('staff-queue')} />
        )}

        {/* Ticket Detail */}
        {currentView === 'ticket-detail' && selectedTicketId !== null && (
          <TicketDetail
            ticketId={selectedTicketId}
            onBack={handleBackToTickets}
          />
        )}

        {/* IT Staff / Admin: Staff Queue (AC-5.1, AC-5.4) */}
        {currentView === 'staff-queue' && isStaff && (
          <StaffQueue
            key={queueFilter ?? 'all'}
            onViewTicket={handleViewTicket}
            initialFilter={queueFilter}
          />
        )}

        {/* IT Staff / Admin: Staff Ticket Operational Detail (AC-6.x) */}
        {currentView === 'staff-ticket-detail' && isStaff && selectedTicketId !== null && (
          <StaffTicketDetail
            ticketId={selectedTicketId}
            onBack={handleBackToTickets}
          />
        )}

        {currentView === 'admin-users' && user.role === 'ADMIN' && (
          <UserManagement />
        )}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <RequesterProvider>
        <MainApp />
      </RequesterProvider>
    </AuthProvider>
  );
}