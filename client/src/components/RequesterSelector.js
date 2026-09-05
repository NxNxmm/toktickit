import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState, useCallback } from 'react';
import { useRequester } from '../context/RequesterContext';
import { apiFetch } from '../api';
export const RequesterSelector = () => {
    const [requesters, setRequesters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedId, setSelectedId] = useState('');
    const { selectRequester } = useRequester();
    const loadRequesters = useCallback(() => {
        setLoading(true);
        setError(null);
        apiFetch('/api/requesters/active')
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
    return (_jsx("div", { className: "container d-flex justify-content-center align-items-center vh-100", children: _jsxs("div", { className: "card p-4 shadow-sm", style: { maxWidth: '520px', width: '100%' }, children: [_jsx("h2", { className: "text-center fw-bold mb-3", style: { color: '#006B3C' }, children: "TokTickIT" }), _jsxs("div", { className: "alert alert-warning text-center small mb-4", role: "alert", children: ["\u26A0\uFE0F ", _jsx("strong", { children: "DEVELOPMENT MODE" }), " \u2014 Select a Development Requester to test requester-specific ticket behavior. This is for Lab 2 testing only and is not a secure login screen. Full authentication arrives in Lab 3."] }), loading && (_jsxs("div", { className: "text-center py-4", children: [_jsx("div", { className: "spinner-border spinner-border-sm text-success me-2", role: "status" }), _jsx("span", { children: "Loading active requesters..." })] })), error && !loading && (_jsxs("div", { className: "alert alert-danger d-flex flex-column gap-2", role: "alert", children: [_jsx("div", { children: error }), _jsx("button", { type: "button", className: "btn btn-outline-danger btn-sm align-self-start", onClick: loadRequesters, children: "Retry" })] })), !loading && !error && requesters.length === 0 && (_jsx("div", { className: "alert alert-warning text-center", role: "alert", children: "No active development requesters found in database. Run seed script." })), !loading && !error && requesters.length > 0 && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "mb-3", children: [_jsxs("label", { htmlFor: "requesterSelect", className: "form-label fw-medium", children: ["Select Development Requester ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx("select", { id: "requesterSelect", className: "form-select", value: selectedId, onChange: (e) => setSelectedId(e.target.value), children: requesters.map((r) => (_jsxs("option", { value: r.id, children: [r.name, " (", r.email, ") - ", r.department] }, r.id))) })] }), _jsx("button", { className: "btn btn-success w-100 fw-medium", style: { backgroundColor: '#006B3C', borderColor: '#006B3C' }, onClick: handleContinue, disabled: !selectedId, children: "Continue \u2192" })] }))] }) }));
};
