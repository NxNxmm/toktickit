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

type AppView = 'my-tickets' | 'create-ticket' | 'ticket-detail' | 'staff-queue' | 'admin-users';

/** Returns the appropriate default landing view for a given user role. */
function defaultViewForRole(role: string | undefined): AppView {
  if (role === 'IT_STAFF' || role === 'ADMIN') return 'staff-queue';
  return 'my-tickets';
}

const MainApp: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState<AppView>('my-tickets');
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

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
  const handleViewTicket = (id: number) => {
    setSelectedTicketId(id);
    setCurrentView('ticket-detail');
  };

  const handleBackToTickets = () => {
    setSelectedTicketId(null);
    // Return to the role-appropriate queue view
    setCurrentView(defaultViewForRole(user.role));
  };

  return (
    <div className="min-vh-100" style={{ backgroundColor: 'var(--color-page-bg)' }}>
      {/* Zen Green Navigation Header */}
      <AppHeader
        currentView={currentView}
        onNavigate={(view) => {
          setSelectedTicketId(null);
          setCurrentView(view as AppView);
        }}
      />

      {/* Main Content Area */}
      <main className="container py-4" style={{ maxWidth: '1200px' }}>
        {/* REQUESTER: My Tickets list */}
        {currentView === 'my-tickets' && user.role === 'REQUESTER' && (
          <MyTicketsList
            onCreateTicket={() => setCurrentView('create-ticket')}
            onViewTicket={handleViewTicket}
          />
        )}

        {/* Create Ticket (REQUESTER) */}
        {currentView === 'create-ticket' && user.role === 'REQUESTER' && (
          <CreateTicketForm onSuccess={() => setCurrentView('my-tickets')} />
        )}

        {/* Ticket Detail */}
        {currentView === 'ticket-detail' && selectedTicketId !== null && (
          <TicketDetail
            ticketId={selectedTicketId}
            onBack={handleBackToTickets}
          />
        )}

        {/* IT Staff / Admin: Staff Queue (AC-5.1, AC-5.4) */}
        {currentView === 'staff-queue' && (user.role === 'IT_STAFF' || user.role === 'ADMIN') && (
          <StaffQueue onViewTicket={handleViewTicket} />
        )}

        {/* Admin: User Management placeholder (Issue 7) */}
        {currentView === 'admin-users' && user.role === 'ADMIN' && (
          <div className="card shadow-sm border-0 p-4 rounded-3 text-center">
            <h3 className="h5 fw-bold text-primary mb-2">Administrator User Management</h3>
            <p className="text-muted small mb-3">
              User administration console will be fully wired in Sprint Issue 7.
            </p>
            <div>
              <button
                className="btn btn-sm btn-outline-primary"
                onClick={() => setCurrentView('staff-queue')}
              >
                Return to Ticket Queue
              </button>
            </div>
          </div>
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