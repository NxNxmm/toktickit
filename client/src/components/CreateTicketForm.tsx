import React, { useState, useEffect } from 'react';
import { useRequester } from '../context/RequesterContext';

interface ReferenceItem {
    id: number;
    name: string;
}

export const CreateTicketForm: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
    const { selectedRequester } = useRequester();

    // Data Options
    const [categories, setCategories] = useState<ReferenceItem[]>([]);
    const [relatedSystems, setRelatedSystems] = useState<ReferenceItem[]>([]);

    // Form Inputs
    const [categoryId, setCategoryId] = useState<number | string>('');
    const [relatedSystemId, setRelatedSystemId] = useState<number | string>('');
    const [priority, setPriority] = useState<string>('MEDIUM');
    const [summary, setSummary] = useState('');
    const [description, setDescription] = useState('');
    const [files, setFiles] = useState<File[]>([]);

    // UI States
    const [submitting, setSubmitting] = useState(false);
    const [errorBanner, setErrorBanner] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
    const [fileError, setFileError] = useState<string | null>(null);

    useEffect(() => {
        // Fetch Categories & Related Systems
        Promise.all([
            fetch('/api/categories').then((res) => res.json()),
            fetch('/api/related-systems').then((res) => res.json()),
        ]).then(([catData, sysData]) => {
            setCategories(catData);
            setRelatedSystems(sysData);
            if (catData.length > 0) setCategoryId(catData[0].id);
            if (sysData.length > 0) setRelatedSystemId(sysData[0].id);
        });
    }, []);

    // File Validation
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFileError(null);
        if (!e.target.files) return;

        const selectedFiles = Array.from(e.target.files);
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        const maxSize = 5 * 1024 * 1024; // 5 MB

        if (files.length + selectedFiles.length > 5) {
            setFileError('Maximum 5 files allowed per ticket.');
            return;
        }

        for (const file of selectedFiles) {
            if (!allowedTypes.includes(file.type)) {
                setFileError(`Invalid file type: ${file.name}. Only JPG, PNG, WEBP, and PDF are allowed.`);
                return;
            }
            if (file.size > maxSize) {
                setFileError(`File too large: ${file.name}. Max size is 5 MB.`);
                return;
            }
        }

        setFiles((prev) => [...prev, ...selectedFiles]);
    };

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    // Form Submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorBanner(null);
        setFieldErrors({});

        // Client Validation
        const errors: { [key: string]: string } = {};
        const trimmedSummary = summary.trim();
        const trimmedDesc = description.trim();

        if (trimmedSummary.length < 5 || trimmedSummary.length > 150) {
            errors.summary = 'Summary must be between 5 and 150 characters.';
        }
        if (trimmedDesc.length < 10 || trimmedDesc.length > 2000) {
            errors.description = 'Description must be between 10 and 2000 characters.';
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }

        setSubmitting(true);

        try {
            const formData = new FormData();
            formData.append('categoryId', String(categoryId));
            formData.append('relatedSystemId', String(relatedSystemId));
            formData.append('requestedPriority', priority);
            formData.append('summary', trimmedSummary);
            formData.append('description', trimmedDesc);
            files.forEach((file) => formData.append('files', file));

            const res = await fetch('/api/tickets', {
                method: 'POST',
                headers: {
                    'X-Requester-Id': String(selectedRequester?.id),
                },
                body: formData,
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Failed to submit ticket');
            }

            onSuccess();
        } catch (err: any) {
            // Preserves all entered form values on API failure!
            setErrorBanner(err.message || 'Unable to submit ticket. Please check connection and try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const todayStr = new Date().toLocaleString();

    return (
        <div className="card shadow-sm p-4" style={{ maxWidth: '800px', margin: '0 auto', backgroundColor: '#FFFFFF' }}>
            <h2 className="h4 fw-bold mb-4" style={{ color: '#006B3C' }}>Create New Support Ticket</h2>

            {/* API Error Banner */}
            {errorBanner && (
                <div className="alert alert-danger mb-4" role="alert">
                    {errorBanner}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                {/* System Generated Fields (Read-Only) */}
                <div className="p-3 mb-4 rounded border" style={{ backgroundColor: '#EEF2EE', borderColor: '#CBD5E1' }}>
                    <h6 className="fw-bold mb-3 text-secondary">System Generated Information</h6>
                    <div className="row g-3">
                        <div className="col-md-4">
                            <label className="form-label small text-muted mb-1">Ticket Number</label>
                            <input type="text" className="form-control form-control-sm" value="Auto-generated after submit" disabled readOnly />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label small text-muted mb-1">Requester</label>
                            <input type="text" className="form-control form-control-sm" value={selectedRequester?.name || ''} disabled readOnly />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label small text-muted mb-1">Date & Status</label>
                            <input type="text" className="form-control form-control-sm" value={`${todayStr} | Status: NEW`} disabled readOnly />
                        </div>
                    </div>
                </div>

                {/* Classification Fields */}
                <div className="row g-3 mb-3">
                    <div className="col-md-4">
                        <label className="form-label fw-medium">Category <span className="text-danger">*</span></label>
                        <select className="form-select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="col-md-4">
                        <label className="form-label fw-medium">Related System <span className="text-danger">*</span></label>
                        <select className="form-select" value={relatedSystemId} onChange={(e) => setRelatedSystemId(e.target.value)}>
                            {relatedSystems.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="col-md-4">
                        <label className="form-label fw-medium">Priority <span className="text-danger">*</span></label>
                        <select className="form-select" value={priority} onChange={(e) => setPriority(e.target.value)}>
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                            <option value="URGENT">Urgent</option>
                        </select>
                    </div>
                </div>

                {/* Summary Input */}
                <div className="mb-3">
                    <div className="d-flex justify-content-between">
                        <label className="form-label fw-medium">Summary <span className="text-danger">*</span></label>
                        <span className={`small ${summary.length > 150 ? 'text-danger fw-bold' : 'text-muted'}`}>
                            {summary.length} / 150
                        </span>
                    </div>
                    <input
                        type="text"
                        className={`form-control ${fieldErrors.summary ? 'is-invalid' : ''}`}
                        placeholder="Brief description of the problem..."
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                    />
                    {fieldErrors.summary && <div className="invalid-feedback">{fieldErrors.summary}</div>}
                </div>

                {/* Description Input */}
                <div className="mb-3">
                    <div className="d-flex justify-content-between">
                        <label className="form-label fw-medium">Description <span className="text-danger">*</span></label>
                        <span className={`small ${description.length > 2000 ? 'text-danger fw-bold' : 'text-muted'}`}>
                            {description.length} / 2000
                        </span>
                    </div>
                    <textarea
                        className={`form-control ${fieldErrors.description ? 'is-invalid' : ''}`}
                        rows={4}
                        placeholder="Provide details about the problem, steps to reproduce, error messages..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                    {fieldErrors.description && <div className="invalid-feedback">{fieldErrors.description}</div>}
                </div>

                {/* File Attachments Section */}
                <div className="mb-4">
                    <label className="form-label fw-medium">Attachments (Optional, max 5 files, &le; 5MB each)</label>
                    <input
                        type="file"
                        className="form-control"
                        multiple
                        accept=".jpg,.jpeg,.png,.webp,.pdf"
                        onChange={handleFileChange}
                        disabled={files.length >= 5}
                    />
                    {fileError && <div className="text-danger small mt-1">{fileError}</div>}

                    {/* Staged File List */}
                    {files.length > 0 && (
                        <ul className="list-group mt-2">
                            {files.map((file, idx) => (
                                <li key={idx} className="list-group-item d-flex justify-content-between align-items-center py-2">
                                    <span className="small text-truncate" style={{ maxWidth: '80%' }}>
                                        📄 {file.name} <span className="text-muted">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                                    </span>
                                    <button type="button" className="btn btn-outline-danger btn-sm py-0 px-2" onClick={() => removeFile(idx)}>
                                        Remove
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Form Actions */}
                <div className="d-flex gap-2">
                    <button
                        type="submit"
                        className="btn text-white fw-medium d-flex align-items-center gap-2"
                        style={{ backgroundColor: '#006B3C', borderColor: '#006B3C' }}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <>
                                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                Submitting...
                            </>
                        ) : (
                            'Submit Ticket'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};