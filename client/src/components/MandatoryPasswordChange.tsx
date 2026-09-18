import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const MandatoryPasswordChange: React.FC = () => {
  const { user, changePassword, logout } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [currentError, setCurrentError] = useState('');
  const [newError, setNewError] = useState('');
  const [confirmError, setConfirmError] = useState('');

  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic password complexity evaluation
  const minLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasCase = hasUppercase && hasLowercase;
  const hasDigit = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(newPassword);
  const hasNumberAndSpecial = hasDigit && hasSpecial;

  const isPasswordValid = minLength && hasCase && hasNumberAndSpecial;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    let valid = true;

    if (!currentPassword) {
      setCurrentError('Current temporary password is required');
      valid = false;
    } else {
      setCurrentError('');
    }

    if (!newPassword) {
      setNewError('New password is required');
      valid = false;
    } else if (!isPasswordValid) {
      setNewError('Password does not meet the complexity requirements');
      valid = false;
    } else if (currentPassword === newPassword) {
      setNewError('New password must differ from the current password');
      valid = false;
    } else {
      setNewError('');
    }

    if (!confirmPassword) {
      setConfirmError('Please confirm your new password');
      valid = false;
    } else if (confirmPassword !== newPassword) {
      setConfirmError('Passwords do not match');
      valid = false;
    } else {
      setConfirmError('');
    }

    if (!valid) return;

    try {
      setIsSubmitting(true);
      await changePassword(currentPassword, newPassword);
    } catch (err: any) {
      const msg = err.errorData?.message || err.message || 'Failed to update password';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-vh-100 d-flex flex-column align-items-center justify-content-center p-3"
      style={{ backgroundColor: 'var(--color-page-bg)' }}
    >
      <div className="text-center mb-4">
        <h1 className="h2 fw-bold" style={{ color: 'var(--color-primary-green)' }}>
          TokTickIT
        </h1>
        <div className="badge-role-staff px-3 py-1 mb-2">Security Notice</div>
        <p className="text-muted small mb-0">
          Welcome, <strong>{user?.name || 'User'}</strong>! You must change your temporary password before proceeding.
        </p>
      </div>

      <div
        className="card shadow-sm border-0 w-100 p-4"
        style={{
          maxWidth: '460px',
          borderRadius: '12px',
          backgroundColor: 'var(--color-surface)',
        }}
      >
        <h2 className="h4 fw-bold mb-3 text-center" style={{ color: 'var(--color-text-primary)' }}>
          Mandatory Password Change
        </h2>

        {submitError && (
          <div
            role="alert"
            className="alert p-3 mb-3 small d-flex align-items-center gap-2 border-0"
            style={{
              backgroundColor: 'var(--color-error-bg)',
              color: 'var(--color-error-text)',
              borderRadius: '8px',
            }}
          >
            <span>⚠️</span>
            <div>{submitError}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Current Temporary Password */}
          <div className="mb-3 text-start">
            <label
              htmlFor="currentPassword"
              className="form-label fw-medium small mb-1"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Current (Temporary) Password <span className="text-danger">*</span>
            </label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              required
              autoFocus
              className={`form-control ${currentError ? 'is-invalid' : ''}`}
              placeholder="Enter current temporary password"
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                if (currentError) setCurrentError('');
              }}
              disabled={isSubmitting}
              style={{ borderRadius: '8px', padding: '0.6rem 0.8rem' }}
            />
            {currentError && (
              <div role="alert" className="invalid-feedback d-block small mt-1">
                {currentError}
              </div>
            )}
          </div>

          {/* New Password */}
          <div className="mb-3 text-start">
            <label
              htmlFor="newPassword"
              className="form-label fw-medium small mb-1"
              style={{ color: 'var(--color-text-primary)' }}
            >
              New Password <span className="text-danger">*</span>
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              required
              className={`form-control ${newError ? 'is-invalid' : ''}`}
              placeholder="Enter new strong password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (newError) setNewError('');
              }}
              disabled={isSubmitting}
              style={{ borderRadius: '8px', padding: '0.6rem 0.8rem' }}
            />
            {newError && (
              <div role="alert" className="invalid-feedback d-block small mt-1">
                {newError}
              </div>
            )}

            {/* Dynamic Checklist per ui-spec.md §3.2 */}
            <div
              className="p-3 mt-2 rounded border small"
              style={{
                backgroundColor: 'var(--color-surface-subtle)',
                borderColor: 'var(--color-border-subtle)',
              }}
            >
              <div className="fw-semibold mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                Password Requirements:
              </div>
              <ul className="list-unstyled mb-0 d-flex flex-column gap-1">
                <li className={`d-flex align-items-center gap-2 ${minLength ? 'text-success' : 'text-muted'}`}>
                  <span>{minLength ? '✓' : '○'}</span>
                  <span>At least 8 characters</span>
                </li>
                <li className={`d-flex align-items-center gap-2 ${hasCase ? 'text-success' : 'text-muted'}`}>
                  <span>{hasCase ? '✓' : '○'}</span>
                  <span>Uppercase &amp; lowercase letters</span>
                </li>
                <li className={`d-flex align-items-center gap-2 ${hasNumberAndSpecial ? 'text-success' : 'text-muted'}`}>
                  <span>{hasNumberAndSpecial ? '✓' : '○'}</span>
                  <span>Number &amp; special character</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Confirm New Password */}
          <div className="mb-4 text-start">
            <label
              htmlFor="confirmPassword"
              className="form-label fw-medium small mb-1"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Confirm New Password <span className="text-danger">*</span>
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              className={`form-control ${confirmError ? 'is-invalid' : ''}`}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (confirmError) setConfirmError('');
              }}
              disabled={isSubmitting}
              style={{ borderRadius: '8px', padding: '0.6rem 0.8rem' }}
            />
            {confirmError && (
              <div role="alert" className="invalid-feedback d-block small mt-1">
                {confirmError}
              </div>
            )}
          </div>

          {/* Primary Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn w-100 fw-semibold text-white d-flex align-items-center justify-content-center gap-2 mb-3"
            style={{
              backgroundColor: 'var(--color-primary-green)',
              borderRadius: '8px',
              padding: '0.65rem 1rem',
              minHeight: '44px',
            }}
          >
            {isSubmitting ? (
              <>
                <span className="spinner-border spinner-border-sm text-white" role="status" aria-hidden="true"></span>
                <span>Updating Password...</span>
              </>
            ) : (
              'Update Password'
            )}
          </button>

          {/* Sign Out Option */}
          <div className="text-center">
            <button
              type="button"
              className="btn btn-link text-muted small p-0 text-decoration-none"
              onClick={logout}
            >
              Cancel and Sign Out
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
