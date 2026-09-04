import React, { useState } from 'react';
import { RequesterProvider, useRequester } from './context/RequesterContext';
import { RequesterSelector } from './components/RequesterSelector';
import { CreateTicketForm } from './components/CreateTicketForm';
import { MyTicketsList } from './components/MyTicketsList';

const MainApp: React.FC = () => {
  const { selectedRequester, clearRequester } = useRequester();
  const [currentView, setCurrentView] = useState<'my-tickets' | 'create-ticket'>('my-tickets');

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

  return (
    <div key={selectedRequester.id} className="min-vh-100" style={{ backgroundColor: '#F5F7F6' }}>
      {/* 1. App Header / Navbar per Zen Green Theme */}
      <nav className="navbar navbar-expand-lg sticky-top" style={{ backgroundColor: '#006B3C' }}>
        <div className="container">
          <span className="navbar-brand text-white fw-bold fs-4">TokTickIT</span>

          <div className="d-flex align-items-center gap-3">
            {/* Navigation Tabs */}
            <button
              className={`btn btn-sm ${currentView === 'my-tickets' ? 'btn-light text-success fw-bold' : 'btn-outline-light'}`}
              onClick={() => setCurrentView('my-tickets')}
            >
              My Tickets
            </button>
            <button
              className={`btn btn-sm ${currentView === 'create-ticket' ? 'btn-light text-success fw-bold' : 'btn-outline-light'}`}
              onClick={() => setCurrentView('create-ticket')}
            >
              + Create Ticket
            </button>

            {/* Profile Info & Change Requester Action per ui-spec.md Section 5.1 */}
            <div className="d-flex align-items-center gap-2 border-start ps-3 ms-2 border-light-subtle">
              {/* User avatar badge with initials */}
              <div
                className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white"
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

              <div className="text-white text-end d-none d-sm-block">
                <div className="fw-medium small">{selectedRequester.name}</div>
                <div className="text-white-50" style={{ fontSize: '0.75rem' }}>{selectedRequester.department}</div>
              </div>
              <button
                className="btn btn-outline-light btn-sm"
                onClick={clearRequester}
                title="Switch Development Requester"
              >
                Change Requester
              </button>
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
          <MyTicketsList onCreateTicket={() => setCurrentView('create-ticket')} />
        )}

        {currentView === 'create-ticket' && (
          <CreateTicketForm onSuccess={() => setCurrentView('my-tickets')} />
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