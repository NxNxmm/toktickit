import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RequesterProvider } from './context/RequesterContext';
import { Login } from './components/Login';
import { MandatoryPasswordChange } from './components/MandatoryPasswordChange';
import { AppHeader } from './components/AppHeader';
import { CreateTicketForm } from './components/CreateTicketForm';
import { MyTicketsList } from './components/MyTicketsList';
import { TicketDetail } from './components/TicketDetail';

type AppView = 'my-tickets' | 'create-ticket' | 'ticket-detail' | 'staff-queue' | 'admin-users';

const MainApp: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState<AppView>('my-tickets');
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

  // Reset selected ticket and view when user changes
  React.useEffect(() => {
    setSelectedTicketId(null);
    setCurrentView('my-tickets');
  }, [user?.id]);

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
    setCurrentView('my-tickets');
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
        {currentView === 'my-tickets' && (
          <MyTicketsList
            onCreateTicket={() => setCurrentView('create-ticket')}
            onViewTicket={handleViewTicket}
          />
        )}

        {currentView === 'create-ticket' && (
          <CreateTicketForm onSuccess={() => setCurrentView('my-tickets')} />
        )}

        {currentView === 'ticket-detail' && selectedTicketId !== null && (
          <TicketDetail
            ticketId={selectedTicketId}
            onBack={handleBackToTickets}
          />
        )}

        {currentView === 'staff-queue' && (
          <div className="card shadow-sm border-0 p-4 rounded-3 text-center">
            <h3 className="h5 fw-bold text-success mb-2">IT Staff Ticket Queue</h3>
            <p className="text-muted small mb-3">
              Staff queue operational views will be fully wired in Sprint Issue 5.
            </p>
            <div>
              <button
                className="btn btn-sm btn-outline-success"
                onClick={() => setCurrentView('my-tickets')}
              >
                Return to My Tickets
              </button>
            </div>
          </div>
        )}

        {currentView === 'admin-users' && (
          <div className="card shadow-sm border-0 p-4 rounded-3 text-center">
            <h3 className="h5 fw-bold text-primary mb-2">Administrator User Management</h3>
            <p className="text-muted small mb-3">
              User administration console will be fully wired in Sprint Issue 7.
            </p>
            <div>
              <button
                className="btn btn-sm btn-outline-primary"
                onClick={() => setCurrentView('my-tickets')}
              >
                Return to My Tickets
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