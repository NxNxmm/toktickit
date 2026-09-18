import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export interface AppHeaderProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ currentView, onNavigate }) => {
  const { user, logout } = useAuth();
  const [isNavCollapsed, setIsNavCollapsed] = useState(true);

  if (!user) return null;

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'REQUESTER':
        return 'badge-role-requester';
      case 'IT_STAFF':
        return 'badge-role-staff';
      case 'ADMIN':
        return 'badge-role-admin';
      default:
        return 'badge-role-requester';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'REQUESTER':
        return 'Requester';
      case 'IT_STAFF':
        return 'IT Staff';
      case 'ADMIN':
        return 'Admin';
      default:
        return role;
    }
  };

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
    <header>
      <nav
        className="navbar navbar-expand-lg navbar-dark sticky-top shadow-sm"
        style={{ backgroundColor: 'var(--color-primary-green)' }}
      >
        <div className="container">
          {/* Brand */}
          <span
            className="navbar-brand text-white fw-bold fs-4 me-3 cursor-pointer"
            onClick={() => onNavigate('my-tickets')}
            style={{ cursor: 'pointer' }}
          >
            TokTickIT
          </span>

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

          {/* Navigation Items & User Profile Area */}
          <div className={`collapse navbar-collapse ${!isNavCollapsed ? 'show' : ''}`} id="toktickitNavbar">
            <div className="d-flex flex-column flex-lg-row align-items-stretch align-items-lg-center justify-content-between w-100 py-2 py-lg-0 gap-3">
              {/* Role-Aware Navigation Links */}
              <div className="d-flex align-items-center gap-2">
                {user.role === 'REQUESTER' && (
                  <>
                    <button
                      className={`btn btn-sm ${
                        currentView === 'my-tickets' || currentView === 'ticket-detail'
                          ? 'btn-light text-success fw-bold'
                          : 'btn-outline-light'
                      }`}
                      onClick={() => {
                        onNavigate('my-tickets');
                        setIsNavCollapsed(true);
                      }}
                    >
                      My Tickets
                    </button>
                    <button
                      className={`btn btn-sm ${
                        currentView === 'create-ticket'
                          ? 'btn-light text-success fw-bold'
                          : 'btn-outline-light'
                      }`}
                      onClick={() => {
                        onNavigate('create-ticket');
                        setIsNavCollapsed(true);
                      }}
                    >
                      + Create Ticket
                    </button>
                  </>
                )}

                {user.role === 'IT_STAFF' && (
                  <>
                    <button
                      className={`btn btn-sm ${
                        currentView === 'staff-queue' || currentView === 'ticket-detail'
                          ? 'btn-light text-success fw-bold'
                          : 'btn-outline-light'
                      }`}
                      onClick={() => {
                        onNavigate('staff-queue');
                        setIsNavCollapsed(true);
                      }}
                    >
                      Ticket Queue
                    </button>
                    <button
                      className={`btn btn-sm ${
                        currentView === 'create-ticket'
                          ? 'btn-light text-success fw-bold'
                          : 'btn-outline-light'
                      }`}
                      onClick={() => {
                        onNavigate('create-ticket');
                        setIsNavCollapsed(true);
                      }}
                    >
                      + Create Ticket
                    </button>
                  </>
                )}

                {user.role === 'ADMIN' && (
                  <button
                    className={`btn btn-sm ${
                      currentView === 'admin-users'
                        ? 'btn-light text-success fw-bold'
                        : 'btn-outline-light'
                    }`}
                    onClick={() => {
                      onNavigate('admin-users');
                      setIsNavCollapsed(true);
                    }}
                  >
                    User Management
                  </button>
                )}
              </div>

              {/* Desktop vertical divider */}
              <div className="vr d-none d-lg-block text-white opacity-25 my-1" style={{ height: '28px' }}></div>

              {/* Mobile horizontal divider */}
              <div className="d-lg-none border-top border-white-50 opacity-25 my-1"></div>

              {/* User Profile Area (§2.1 & AC-3.5) */}
              <div className="d-flex flex-wrap align-items-center justify-content-between justify-content-lg-end gap-3">
                <div className="d-flex align-items-center gap-2">
                  {/* Avatar Initials Badge */}
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white flex-shrink-0"
                    style={{
                      width: '36px',
                      height: '36px',
                      backgroundColor: 'var(--color-secondary-green)',
                      fontSize: '0.85rem',
                      border: '1px solid rgba(255, 255, 255, 0.4)',
                    }}
                    title={user.name}
                  >
                    {getInitials(user.name)}
                  </div>

                  {/* User Name & Role Badge */}
                  <div className="text-white text-start">
                    <div className="fw-medium small text-truncate" style={{ maxWidth: '180px' }}>
                      {user.name}
                    </div>
                    <div className="mt-1">
                      <span className={getRoleBadgeClass(user.role)}>
                        {getRoleLabel(user.role)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Secure Logout Action Button */}
                <button
                  className="btn btn-outline-light btn-sm flex-shrink-0 ms-auto ms-lg-2"
                  onClick={() => {
                    logout();
                    setIsNavCollapsed(true);
                  }}
                  title="Sign out of TokTickIT"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};
