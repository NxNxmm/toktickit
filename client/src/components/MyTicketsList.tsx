import React, { useState, useEffect, useCallback } from 'react';
import { useRequester } from '../context/RequesterContext';
import * as api from '../api';

interface MyTicketsListProps {
  onCreateTicket: () => void;
}

export const MyTicketsList: React.FC<MyTicketsListProps> = ({ onCreateTicket }) => {
  const { selectedRequester } = useRequester();

  // Reference data
  const [categories, setCategories] = useState<api.Category[]>([]);

  // Filter and Search states
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination states
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Data states
  const [tickets, setTickets] = useState<api.TicketListItem[]>([]);
  const [pagination, setPagination] = useState<api.TicketPagination>({
    page: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 0,
    hasPrevious: false,
    hasNext: false,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Initial fetch of categories
  useEffect(() => {
    fetch('/api/categories')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setCategories(data))
      .catch(() => setCategories([]));
  }, []);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchTerm(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Fetch tickets function
  const fetchTickets = useCallback(async () => {
    if (!selectedRequester) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getTickets(
        {
          search: searchTerm,
          categoryId: selectedCategory ? Number(selectedCategory) : undefined,
          requestedPriority: selectedPriority || undefined,
          status: selectedStatus || undefined,
          sortBy,
          sortOrder,
          page,
          pageSize,
        },
        selectedRequester.id
      );
      setTickets(data.items);
      setPagination(data.pagination);
    } catch (err: any) {
      console.error('Error loading tickets:', err);
      setError(err.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [
    selectedRequester,
    searchTerm,
    selectedCategory,
    selectedPriority,
    selectedStatus,
    sortBy,
    sortOrder,
    page,
    pageSize,
  ]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const hasActiveFilters = Boolean(
    searchInput.trim() || selectedCategory || selectedPriority || selectedStatus
  );

  const handleClearFilters = () => {
    setSearchInput('');
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedPriority('');
    setSelectedStatus('');
    setPage(1);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  const getStatusBadge = (status: api.TicketStatus) => {
    switch (status) {
      case 'NEW':
        return { bg: '#DBEAFE', color: '#1E40AF', border: '1px solid #BFDBFE', label: 'NEW' };
      case 'IN_PROGRESS':
        return { bg: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A', label: 'IN PROGRESS' };
      case 'RESOLVED':
        return { bg: '#D1FAE5', color: '#065F46', border: '1px solid #A7F3D0', label: 'RESOLVED' };
      case 'CLOSED':
        return { bg: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB', label: 'CLOSED' };
      case 'CANCELLED':
        return { bg: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA', label: 'CANCELLED' };
      default:
        return { bg: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB', label: status };
    }
  };

  const getPriorityBadge = (priority: api.Priority | null) => {
    if (!priority) return null;
    switch (priority) {
      case 'LOW':
        return { bg: '#F3F4F6', color: '#4B5563', border: '1px solid #E5E7EB', label: 'LOW' };
      case 'MEDIUM':
        return { bg: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A', label: 'MEDIUM' };
      case 'HIGH':
        return { bg: '#FFEDD5', color: '#9A3412', border: '1px solid #FED7AA', label: 'HIGH' };
      case 'URGENT':
        return { bg: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA', label: 'URGENT' };
      default:
        return { bg: '#F3F4F6', color: '#4B5563', border: '1px solid #E5E7EB', label: priority };
    }
  };

  // Range calculation for pagination
  const fromItem = pagination.totalCount === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const toItem = Math.min(pagination.page * pagination.pageSize, pagination.totalCount);

  return (
    <div className="d-flex flex-column gap-3">
      {/* 1. Header Section */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 pb-2 border-bottom">
        <div>
          <h1 className="h3 fw-bold mb-1" style={{ color: '#1A2820' }}>
            My Tickets
          </h1>
          <p className="text-secondary small mb-0">
            View and track all of your support requests
          </p>
        </div>
        <button
          className="btn text-white fw-medium d-inline-flex align-items-center gap-2 shadow-sm"
          style={{ backgroundColor: '#006B3C', minHeight: '40px' }}
          onClick={onCreateTicket}
        >
          <span>+</span> New Ticket
        </button>
      </div>

      {/* 2. Filter & Search Toolbar */}
      <div className="card border-0 shadow-sm p-3" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="row g-3 align-items-end">
          {/* Search Input */}
          <div className="col-12 col-md-4">
            <label htmlFor="search-input" className="form-label small fw-medium mb-1" style={{ color: '#1A2820' }}>
              Search Tickets
            </label>
            <div className="input-group">
              <input
                id="search-input"
                type="text"
                className="form-control border-start-0"
                style={{ borderColor: '#D1D5DB' }}
                placeholder="Search by ticket number or summary..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
          </div>

          {/* Category Dropdown */}
          <div className="col-6 col-md-2">
            <label htmlFor="filter-category" className="form-label small fw-medium mb-1" style={{ color: '#1A2820' }}>
              Category
            </label>
            <select
              id="filter-category"
              className="form-select"
              style={{ borderColor: '#D1D5DB' }}
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Dropdown */}
          <div className="col-6 col-md-2">
            <label htmlFor="filter-priority" className="form-label small fw-medium mb-1" style={{ color: '#1A2820' }}>
              Priority
            </label>
            <select
              id="filter-priority"
              className="form-select"
              style={{ borderColor: '#D1D5DB' }}
              value={selectedPriority}
              onChange={(e) => {
                setSelectedPriority(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="col-6 col-md-2">
            <label htmlFor="filter-status" className="form-label small fw-medium mb-1" style={{ color: '#1A2820' }}>
              Status
            </label>
            <select
              id="filter-status"
              className="form-select"
              style={{ borderColor: '#D1D5DB' }}
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Statuses</option>
              <option value="NEW">New</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          <div className="col-6 col-md-2">
            <button
              id="clear-filters-btn"
              className="btn btn-outline-secondary w-100"
              style={{ height: '38px' }}
              onClick={handleClearFilters}
              disabled={!hasActiveFilters}
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* 3. Error Banner */}
      {error && (
        <div className="alert alert-danger py-2" role="alert">
          {error}
        </div>
      )}

      {/* 4. Loading Spinner */}
      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Loading tickets...</span>
          </div>
          <div className="text-muted small mt-2">Loading tickets...</div>
        </div>
      )}

      {/* 5. Empty States */}
      {!loading && !error && tickets.length === 0 && (
        <div className="card border-0 shadow-sm p-5 text-center my-3" style={{ backgroundColor: '#FFFFFF' }}>
          {hasActiveFilters ? (
            <div>
              <div className="fs-1 mb-2">🔍</div>
              <h2 className="h5 fw-bold" style={{ color: '#1A2820' }}>
                No results found
              </h2>
              <p className="text-muted small mb-3">
                No tickets match your search filters.
              </p>
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={handleClearFilters}
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div>
              <div className="fs-1 mb-2">📋</div>
              <h2 className="h5 fw-bold" style={{ color: '#1A2820' }}>
                You haven't submitted any support tickets yet.
              </h2>
              <p className="text-muted small mb-4">
                Need help with your hardware, software, network, or account? Create your first ticket!
              </p>
              <button
                className="btn text-white fw-medium px-4 py-2 shadow-sm"
                style={{ backgroundColor: '#006B3C' }}
                onClick={onCreateTicket}
              >
                + Create your first ticket
              </button>
            </div>
          )}
        </div>
      )}

      {/* 6. Desktop Table View (>= 992px) */}
      {!loading && !error && tickets.length > 0 && (
        <div className="d-none d-lg-block">
          <div className="card border-0 shadow-sm overflow-hidden" style={{ backgroundColor: '#FFFFFF' }}>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" style={{ fontSize: '14px' }}>
                <thead style={{ backgroundColor: '#F9FAFB', color: '#4B5563' }}>
                  <tr>
                    <th
                      scope="col"
                      className="py-3 px-3 cursor-pointer user-select-none"
                      onClick={() => handleSort('ticketNo')}
                      style={{ width: '150px' }}
                    >
                      Ticket No. {sortBy === 'ticketNo' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                    </th>
                    <th
                      scope="col"
                      className="py-3 px-3 cursor-pointer user-select-none"
                      onClick={() => handleSort('createdAt')}
                      style={{ width: '160px' }}
                    >
                      Created Date {sortBy === 'createdAt' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                    </th>
                    <th scope="col" className="py-3 px-3">
                      Summary
                    </th>
                    <th scope="col" className="py-3 px-3" style={{ width: '140px' }}>
                      Category
                    </th>
                    <th
                      scope="col"
                      className="py-3 px-3 cursor-pointer user-select-none"
                      onClick={() => handleSort('requestedPriority')}
                      style={{ width: '110px' }}
                    >
                      Req. Priority {sortBy === 'requestedPriority' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                    </th>
                    <th scope="col" className="py-3 px-3" style={{ width: '110px' }}>
                      IT Priority
                    </th>
                    <th scope="col" className="py-3 px-3" style={{ width: '130px' }}>
                      Current Status
                    </th>
                    <th
                      scope="col"
                      className="py-3 px-3 cursor-pointer user-select-none"
                      onClick={() => handleSort('updatedAt')}
                      style={{ width: '160px' }}
                    >
                      Last Updated {sortBy === 'updatedAt' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => {
                    const statusBadge = getStatusBadge(t.currentStatus);
                    const reqBadge = getPriorityBadge(t.requestedPriority);
                    const itBadge = getPriorityBadge(t.itPriority);

                    return (
                      <tr key={t.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                        <td className="py-3 px-3">
                          <span
                            className="fw-bold"
                            style={{
                              fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
                              fontSize: '13px',
                              color: '#006B3C',
                            }}
                          >
                            {t.ticketNo}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-secondary" style={{ fontSize: '13px' }}>
                          {formatDate(t.createdAt)}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className="text-truncate d-inline-block fw-medium"
                            style={{ maxWidth: '280px', color: '#1A2820' }}
                            title={t.summary}
                          >
                            {t.summary}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-secondary">{t.category?.name}</td>
                        <td className="py-3 px-3">
                          {reqBadge && (
                            <span
                              style={{
                                backgroundColor: reqBadge.bg,
                                color: reqBadge.color,
                                border: reqBadge.border,
                                borderRadius: '9999px',
                                padding: '2px 8px',
                                fontSize: '11px',
                                fontWeight: 600,
                                display: 'inline-block',
                              }}
                            >
                              {reqBadge.label}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {itBadge ? (
                            <span
                              style={{
                                backgroundColor: itBadge.bg,
                                color: itBadge.color,
                                border: itBadge.border,
                                borderRadius: '9999px',
                                padding: '2px 8px',
                                fontSize: '11px',
                                fontWeight: 600,
                                display: 'inline-block',
                              }}
                            >
                              {itBadge.label}
                            </span>
                          ) : (
                            <span className="text-muted small">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            style={{
                              backgroundColor: statusBadge.bg,
                              color: statusBadge.color,
                              border: statusBadge.border,
                              borderRadius: '9999px',
                              padding: '3px 10px',
                              fontSize: '11px',
                              fontWeight: 600,
                              display: 'inline-block',
                            }}
                          >
                            {statusBadge.label}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-secondary" style={{ fontSize: '13px' }}>
                          {formatDate(t.updatedAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 7. Mobile & Tablet Card View (< 992px) */}
      {!loading && !error && tickets.length > 0 && (
        <div className="d-block d-lg-none d-flex flex-column gap-3">
          {tickets.map((t) => {
            const statusBadge = getStatusBadge(t.currentStatus);
            const reqBadge = getPriorityBadge(t.requestedPriority);

            return (
              <div
                key={t.id}
                className="card border-0 shadow-sm p-3"
                style={{ backgroundColor: '#FFFFFF', borderRadius: '8px' }}
              >
                {/* Card Header: Ticket No & Status */}
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span
                    className="fw-bold fs-6"
                    style={{
                      fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
                      color: '#006B3C',
                    }}
                  >
                    {t.ticketNo}
                  </span>
                  <span
                    style={{
                      backgroundColor: statusBadge.bg,
                      color: statusBadge.color,
                      border: statusBadge.border,
                      borderRadius: '9999px',
                      padding: '2px 8px',
                      fontSize: '11px',
                      fontWeight: 600,
                    }}
                  >
                    {statusBadge.label}
                  </span>
                </div>

                {/* Card Body: Summary and Tags */}
                <div className="fw-semibold mb-2" style={{ color: '#1A2820' }}>
                  {t.summary}
                </div>

                <div className="d-flex flex-wrap gap-2 mb-3">
                  <span className="badge bg-light text-secondary border px-2 py-1">
                    📁 {t.category?.name}
                  </span>
                  {t.relatedSystem?.name && (
                    <span className="badge bg-light text-secondary border px-2 py-1">
                      🖥️ {t.relatedSystem.name}
                    </span>
                  )}
                </div>

                {/* Card Footer: Priority & Created Date */}
                <div className="d-flex justify-content-between align-items-center pt-2 border-top text-secondary small">
                  <div>
                    {reqBadge && (
                      <span
                        style={{
                          backgroundColor: reqBadge.bg,
                          color: reqBadge.color,
                          border: reqBadge.border,
                          borderRadius: '9999px',
                          padding: '2px 8px',
                          fontSize: '11px',
                          fontWeight: 600,
                        }}
                      >
                        {reqBadge.label}
                      </span>
                    )}
                  </div>
                  <div>📅 {formatDate(t.createdAt)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 8. Pagination Controls */}
      {!loading && !error && pagination.totalCount > 0 && (
        <div className="card border-0 shadow-sm p-3" style={{ backgroundColor: '#FFFFFF' }}>
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
            {/* Range display */}
            <div className="text-secondary small">
              Showing <span className="fw-semibold text-dark">{fromItem}</span> to{' '}
              <span className="fw-semibold text-dark">{toItem}</span> of{' '}
              <span className="fw-semibold text-dark">{pagination.totalCount}</span> tickets
            </div>

            {/* Page navigation buttons */}
            <div className="d-flex align-items-center gap-1">
              <button
                className="btn btn-sm btn-outline-secondary"
                style={{ minHeight: '36px', minWidth: '40px' }}
                onClick={() => setPage(page - 1)}
                disabled={!pagination.hasPrevious}
                aria-label="Previous page"
              >
                &lt; Prev
              </button>

              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => {
                // Show first, last, and pages around current page
                if (
                  p === 1 ||
                  p === pagination.totalPages ||
                  (p >= page - 1 && p <= page + 1)
                ) {
                  return (
                    <button
                      key={p}
                      className={`btn btn-sm ${p === page ? 'btn-success text-white fw-bold' : 'btn-outline-secondary'
                        }`}
                      style={{
                        minHeight: '36px',
                        minWidth: '36px',
                        backgroundColor: p === page ? '#006B3C' : undefined,
                        borderColor: p === page ? '#006B3C' : undefined,
                      }}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </button>
                  );
                } else if (p === page - 2 || p === page + 2) {
                  return (
                    <span key={p} className="px-1 text-muted">
                      ...
                    </span>
                  );
                }
                return null;
              })}

              <button
                className="btn btn-sm btn-outline-secondary"
                style={{ minHeight: '36px', minWidth: '40px' }}
                onClick={() => setPage(page + 1)}
                disabled={!pagination.hasNext}
                aria-label="Next page"
              >
                Next &gt;
              </button>
            </div>

            {/* Page Size Selector */}
            <div className="d-flex align-items-center gap-2">
              <span className="text-secondary small">Per page:</span>
              <select
                id="page-size-select"
                className="form-select form-select-sm"
                style={{ width: '80px', borderColor: '#D1D5DB' }}
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
