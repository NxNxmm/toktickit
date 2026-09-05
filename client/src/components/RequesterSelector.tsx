import React, { useEffect, useState, useCallback } from 'react';
import { useRequester, Requester } from '../context/RequesterContext';
import { apiFetch } from '../api';

export const RequesterSelector: React.FC = () => {
    const [requesters, setRequesters] = useState<Requester[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedId, setSelectedId] = useState<number | string>('');

    const { selectRequester } = useRequester();

    const loadRequesters = useCallback(() => {
        setLoading(true);
        setError(null);
        apiFetch<Requester[]>('/api/requesters/active')
            .then((data) => {
                setRequesters(data);
                if (data.length > 0) {
                    setSelectedId(data[0].id);
                }
                setLoading(false);
            })
            .catch((err) => {
                setError(err.message || 'Failed to load active requesters');
                setLoading(false);
            });
    }, []);

    useEffect(() => {
        loadRequesters();
    }, [loadRequesters]);

    const handleContinue = () => {
        const target = requesters.find((r) => r.id === Number(selectedId));
        if (target) {
            selectRequester(target);
        }
    };

    return (
        <div className="container d-flex justify-content-center align-items-center vh-100">
            <div className="card p-4 shadow-sm" style={{ maxWidth: '520px', width: '100%' }}>
                <h2 className="text-center fw-bold mb-3" style={{ color: '#006B3C' }}>TokTickIT</h2>

                {/* Prominent Warning Banner per ui-spec.md Section 5.2 & BR-03 */}
                <div className="alert alert-warning text-center small mb-4" role="alert">
                    ⚠️ <strong>DEVELOPMENT MODE</strong> — Select a Development Requester to test requester-specific ticket behavior. This is for Lab 2 testing only and is not a secure login screen. Full authentication arrives in Lab 3.
                </div>

                {loading && (
                    <div className="text-center py-4">
                        <div className="spinner-border spinner-border-sm text-success me-2" role="status" />
                        <span>Loading active requesters...</span>
                    </div>
                )}

                {error && !loading && (
                    <div className="alert alert-danger d-flex flex-column gap-2" role="alert">
                        <div>{error}</div>
                        <button
                            type="button"
                            className="btn btn-outline-danger btn-sm align-self-start"
                            onClick={loadRequesters}
                        >
                            Retry
                        </button>
                    </div>
                )}

                {!loading && !error && requesters.length === 0 && (
                    <div className="alert alert-warning text-center" role="alert">
                        No active development requesters found in database. Run seed script.
                    </div>
                )}

                {!loading && !error && requesters.length > 0 && (
                    <>
                        <div className="mb-3">
                            <label htmlFor="requesterSelect" className="form-label fw-medium">
                                Select Development Requester <span className="text-danger">*</span>
                            </label>
                            <select
                                id="requesterSelect"
                                className="form-select"
                                value={selectedId}
                                onChange={(e) => setSelectedId(e.target.value)}
                            >
                                {requesters.map((r) => (
                                    <option key={r.id} value={r.id}>
                                        {r.name} ({r.email}) - {r.department}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button
                            className="btn btn-success w-100 fw-medium"
                            style={{ backgroundColor: '#006B3C', borderColor: '#006B3C' }}
                            onClick={handleContinue}
                            disabled={!selectedId}
                        >
                            Continue &rarr;
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};