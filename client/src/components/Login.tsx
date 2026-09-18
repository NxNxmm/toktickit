import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Field validation errors
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Top alert error message
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    let valid = true;

    if (!email.trim()) {
      setEmailError('Email address is required');
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError('Please enter a valid email address');
      valid = false;
    } else {
      setEmailError('');
    }

    if (!password) {
      setPasswordError('Password is required');
      valid = false;
    } else {
      setPasswordError('');
    }

    if (!valid) return;

    try {
      setIsSubmitting(true);
      await login(email.trim(), password);
    } catch (err: any) {
      const msg = err.errorData?.message || err.message || 'Invalid email or password';
      setAuthError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-vh-100 d-flex flex-column align-items-center justify-content-center p-3"
      style={{ backgroundColor: 'var(--color-page-bg)' }}
    >
      {/* Brand Heading */}
      <div className="text-center mb-4">
        <h1 className="h2 fw-bold" style={{ color: 'var(--color-primary-green)' }}>
          TokTickIT
        </h1>
        <p className="text-muted small">Sign in to manage your tickets and services</p>
      </div>

      {/* Login Card Container per ui-spec.md §3.1 */}
      <div
        className="card shadow-sm border-0 w-100 p-4"
        style={{
          maxWidth: '420px',
          borderRadius: '12px',
          backgroundColor: 'var(--color-surface)',
        }}
      >
        <h2 className="h4 fw-bold mb-3 text-center" style={{ color: 'var(--color-text-primary)' }}>
          Sign In
        </h2>

        {/* Safe Error Banner */}
        {authError && (
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
            <div>{authError}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Email Address */}
          <div className="mb-3 text-start">
            <label
              htmlFor="email"
              className="form-label fw-medium small mb-1"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Email Address <span className="text-danger">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoFocus
              required
              className={`form-control ${emailError ? 'is-invalid' : ''}`}
              placeholder="name@kmutt.ac.th"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError('');
              }}
              disabled={isSubmitting}
              style={{
                borderRadius: '8px',
                padding: '0.6rem 0.8rem',
              }}
            />
            {emailError && (
              <div role="alert" className="invalid-feedback d-block small mt-1">
                {emailError}
              </div>
            )}
          </div>

          {/* Password */}
          <div className="mb-4 text-start">
            <label
              htmlFor="password"
              className="form-label fw-medium small mb-1"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Password <span className="text-danger">*</span>
            </label>
            <div className="input-group">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                className={`form-control ${passwordError ? 'is-invalid' : ''}`}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError('');
                }}
                disabled={isSubmitting}
                style={{
                  borderTopLeftRadius: '8px',
                  borderBottomLeftRadius: '8px',
                  padding: '0.6rem 0.8rem',
                }}
              />
              <button
                type="button"
                className="btn btn-outline-secondary border-start-0"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  borderTopRightRadius: '8px',
                  borderBottomRightRadius: '8px',
                  borderColor: 'var(--color-border-neutral)',
                }}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {passwordError && (
              <div role="alert" className="invalid-feedback d-block small mt-1">
                {passwordError}
              </div>
            )}
          </div>

          {/* Primary Action Button with Busy Spinner Indicator */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn w-100 fw-semibold text-white d-flex align-items-center justify-content-center gap-2"
            style={{
              backgroundColor: 'var(--color-primary-green)',
              borderRadius: '8px',
              padding: '0.65rem 1rem',
              minHeight: '44px',
            }}
          >
            {isSubmitting ? (
              <>
                <span
                  className="spinner-border spinner-border-sm text-white"
                  role="status"
                  aria-hidden="true"
                ></span>
                <span>Signing In...</span>
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
