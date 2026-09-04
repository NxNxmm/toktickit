import React, { useState } from 'react';
import { RequesterProvider, useRequester } from './context/RequesterContext';
import { RequesterSelector } from './components/RequesterSelector';
import { CreateTicketForm } from './components/CreateTicketForm';
import { MyTicketsList } from './components/MyTicketsList';
import { TicketDetail } from './components/TicketDetail';

type AppView = 'my-tickets' | 'create-ticket' | 'ticket-detail';

const MainApp: React.FC = () => {
  const { selectedRequester, clearRequester } = useRequester();
  const [currentView, setCurrentView] = useState<AppView>('my-tickets');
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

  const [isNavCollapsed, setIsNavCollapsed] = useState(true);

  // ถ้ายังไม่ได้เลือก Requester ให้แสดงหน้า RequesterSelector ทันที
  if (!selectedRequester) {
    return <RequesterSelector />;
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const handleViewTicket = (id: number) => {
    setSelectedTicketId(id);
    setCurrentView('ticket-detail');
    setIsNavCollapsed(true);
  };

  const handleBackToTickets = () => {
    setSelectedTicketId(null);
    setCurrentView('my-tickets');
  };

  return (
    <div key={selectedRequester.id} className="min-vh-100" style={{ backgroundColor: '#F5F7F6' }}>
      {/* 1. App Header / Navbar per Zen Green Theme */}
      <nav className="navbar navbar-expand-lg navbar-dark sticky-top shadow-sm" style={{ backgroundColor: '#006B3C' }}>
        <div className="container">
          <span className="navbar-brand text-white fw-bold fs-4 me-3">TokTickIT</span>

          {/* Hamburger toggle button for smaller screens */}
          <button
            className="navbar-toggler border-white-50"
            type="button"
            aria-controls="toktickitNavbar"
            aria-expanded={!isNavCollapsed}
            aria-label="Toggle navigation"
            onClick={() => setIsNavCollapsed(!isNavCollapsed)}
            style={{ padding: '0.35rem 0.6rem' }}
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          {/* Collapsible content for responsive navigation */}
          <div className={`collapse navbar-collapse ${!isNavCollapsed ? 'show' : ''}`} id="toktickitNavbar">
            <div className="d-flex flex-column flex-lg-row align-items-stretch align-items-lg-center justify-content-between w-100 py-2 py-lg-0 gap-3">
              {/* Navigation Tabs */}
              <div className="d-flex align-items-center gap-2">
                <button
                  className={`btn btn-sm ${currentView === 'my-tickets' || currentView === 'ticket-detail' ? 'btn-light text-success fw-bold' : 'btn-outline-light'}`}
                  onClick={() => {
                    handleBackToTickets();
                    setIsNavCollapsed(true);
                  }}
                >
                  My Tickets
                </button>
                <button
                  className={`btn btn-sm ${currentView === 'create-ticket' ? 'btn-light text-success fw-bold' : 'btn-outline-light'}`}
                  onClick={() => {
                    setCurrentView('create-ticket');
                    setIsNavCollapsed(true);
                  }}
                >
                  + Create Ticket
                </button>
              </div>

              {/* Desktop vertical divider */}
              <div className="vr d-none d-lg-block text-white opacity-25 my-1" style={{ height: '28px' }}></div>

              {/* Mobile horizontal divider */}
              <div className="d-lg-none border-top border-white-50 opacity-25 my-1"></div>

              {/* Profile Info & Change Requester Action per ui-spec.md */}
              <div className="d-flex flex-wrap align-items-center justify-content-between justify-content-lg-end gap-2">
                <div className="d-flex align-items-center gap-2">
                  {/* User avatar badge with initials */}
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white flex-shrink-0"
                    style={{
                      width: '36px',
                      height: '36px',
                      backgroundColor: '#0B7A46',
                      fontSize: '0.85rem',
                      border: '1px solid rgba(255, 255, 255, 0.4)',
                    }}
                    title={selectedRequester.name}
                  >
                    {getInitials(selectedRequester.name)}
                  </div>

                  <div className="text-white text-start">
                    <div className="fw-medium small text-truncate" style={{ maxWidth: '160px' }}>
                      {selectedRequester.name}
                    </div>
                    <div className="text-white-50" style={{ fontSize: '0.75rem' }}>
                      {selectedRequester.department}
                    </div>
                  </div>
                </div>

                <button
                  className="btn btn-outline-light btn-sm flex-shrink-0 ms-auto ms-lg-2"
                  onClick={() => {
                    clearRequester();
                    setIsNavCollapsed(true);
                  }}
                  title="Switch Development Requester"
                >
                  Change Requester
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* 2. Development Mode Banner Warning */}
      <div className="bg-warning-subtle text-warning-emphasis border-bottom border-warning py-1 text-center small fw-medium">
        DEVELOPMENT MODE — Logged in as testing requester: <strong>{selectedRequester.name}</strong> ({selectedRequester.email})
      </div>

      {/* 3. Dynamic Page View Content */}
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
      </main>
    </div>
  );
};

// Component ระดับบนสุด ทำหน้าที่ห่อด้วย Provider
export default function App() {
  return (
    <RequesterProvider>
      <MainApp />
    </RequesterProvider>
  );
}