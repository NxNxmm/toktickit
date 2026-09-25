import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import * as api from '../api';

type RoleFilter = '' | api.Role;
type ModalMode = 'create' | 'edit' | null;

type UserFormState = {
  name: string;
  email: string;
  role: api.Role;
  isActive: boolean;
  initialPassword: string;
};

type FieldErrors = Partial<Record<keyof UserFormState, string>>;

const roleOptions: Array<{ value: api.Role; label: string }> = [
  { value: 'REQUESTER', label: 'Requester' },
  { value: 'IT_STAFF', label: 'IT Staff' },
  { value: 'ADMIN', label: 'Administrator' },
];

const initialForm: UserFormState = {
  name: '',
  email: '',
  role: 'REQUESTER',
  isActive: true,
  initialPassword: '',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '44px',
  padding: '0.6rem 0.75rem',
  border: '1px solid var(--color-border-neutral)',
  borderRadius: '8px',
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-text-primary)',
  fontSize: '0.9rem',
};

const tableHeaderStyle: React.CSSProperties = {
  padding: '0.8rem 1rem',
  textAlign: 'left',
  fontSize: '0.72rem',
  fontWeight: 700,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  color: 'var(--color-text-secondary)',
  backgroundColor: 'var(--color-surface-subtle)',
  borderBottom: '1px solid var(--color-border-subtle)',
  whiteSpace: 'nowrap',
};

const tableCellStyle: React.CSSProperties = {
  padding: '0.9rem 1rem',
  fontSize: '0.85rem',
  color: 'var(--color-text-primary)',
  borderBottom: '1px solid var(--color-border-subtle)',
  verticalAlign: 'middle',
};

function roleLabel(role: api.Role): string {
  return roleOptions.find((option) => option.value === role)?.label ?? role;
}

function roleBadgeClass(role: api.Role): string {
  if (role === 'ADMIN') return 'badge-role-admin';
  if (role === 'IT_STAFF') return 'badge-role-staff';
  return 'badge-role-requester';
}

function passwordErrors(password: string): string[] {
  const errors: string[] = [];
  if (password.length < 8) errors.push('At least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('One uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('One lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('One number');
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password)) errors.push('One special character');
  return errors;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function getErrorMessage(error: any, fallback: string): string {
  if (error?.statusCode === 409) {
    return 'A user account with this email address already exists.';
  }
  return error?.errorData?.message || error?.message || fallback;
}

function sortUsers(users: api.AdminUser[]): api.AdminUser[] {
  return [...users].sort((left, right) => left.name.localeCompare(right.name) || left.id - right.id);
}

function matchesFilters(user: api.AdminUser, search: string, role: RoleFilter): boolean {
  const normalizedSearch = search.trim().toLowerCase();
  const matchesSearch = !normalizedSearch || user.name.toLowerCase().includes(normalizedSearch) || user.email.toLowerCase().includes(normalizedSearch);
  const matchesRole = !role || user.role === role;
  return matchesSearch && matchesRole;
}

function RoleBadge({ role }: { role: api.Role }) {
  return <span className={roleBadgeClass(role)}>{roleLabel(role)}</span>;
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className="d-inline-flex align-items-center"
      style={{
        borderRadius: '9999px',
        padding: '0.25rem 0.65rem',
        fontSize: '0.75rem',
        fontWeight: 600,
        backgroundColor: isActive ? 'var(--color-success-bg)' : '#F3F4F6',
        color: isActive ? 'var(--color-success-green)' : 'var(--color-text-secondary)',
        border: `1px solid ${isActive ? '#A7F3D0' : 'var(--color-border-neutral)'}`,
      }}
    >
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

function FieldError({ message, id }: { message?: string; id: string }) {
  if (!message) return null;
  return <div id={id} role="alert" className="small mt-1" style={{ color: 'var(--color-error-text)' }}>{message}</div>;
}

export const UserManagement: React.FC = () => {
  const { user: currentAdmin, setUser } = useAuth();
  const [users, setUsers] = useState<api.AdminUser[]>([]);
  const [allUsers, setAllUsers] = useState<api.AdminUser[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('');
  const [loading, setLoading] = useState(true);
  const [directoryError, setDirectoryError] = useState('');
  const [directoryAccessDenied, setDirectoryAccessDenied] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingUser, setEditingUser] = useState<api.AdminUser | null>(null);
  const [form, setForm] = useState<UserFormState>(initialForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [resetTarget, setResetTarget] = useState<api.AdminUser | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSaving, setResetSaving] = useState(false);
  const requestSequence = useRef(0);

  const reconcileAccessError = useCallback((error: any) => {
    if (error?.statusCode === 403 && error?.errorData?.code === 'PASSWORD_CHANGE_REQUIRED') {
      setUser((currentUser) => currentUser ? { ...currentUser, requiresPasswordChange: true } : currentUser);
      return true;
    }
    if (error?.statusCode === 403) {
      setDirectoryAccessDenied(true);
      setDirectoryError('');
      setModalMode(null);
      setEditingUser(null);
      setResetTarget(null);
      return true;
    }
    return false;
  }, [setUser]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchTerm(searchInput.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const loadUsers = useCallback(async () => {
    const requestId = ++requestSequence.current;
    setLoading(true);
    setDirectoryError('');
    setDirectoryAccessDenied(false);
    try {
      const data = await api.getAdminUsers({
        search: searchTerm || undefined,
        role: roleFilter || undefined,
      });
      if (requestId !== requestSequence.current) return;
      setUsers(data);
      if (!searchTerm && !roleFilter) {
        setAllUsers(data);
      }
    } catch (error: any) {
      if (requestId !== requestSequence.current) return;
      if (reconcileAccessError(error)) return;
      setDirectoryError(getErrorMessage(error, 'Failed to load users'));
    } finally {
      if (requestId === requestSequence.current) {
        setLoading(false);
      }
    }
  }, [reconcileAccessError, roleFilter, searchTerm]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const activeAdminCount = allUsers.filter((user) => user.role === 'ADMIN' && user.isActive).length;
  const editingOwnAccount = editingUser?.id === currentAdmin?.id;
  const editingLastAdmin = Boolean(editingUser && editingUser.role === 'ADMIN' && editingUser.isActive && activeAdminCount === 1);
  const activeToggleDisabled = editingOwnAccount || editingLastAdmin;
  const roleSelectDisabled = editingLastAdmin;

  const openCreateModal = () => {
    setForm({ ...initialForm });
    setFieldErrors({});
    setFormError('');
    setEditingUser(null);
    setModalMode('create');
    setSuccessMessage('');
  };

  const openEditModal = (user: api.AdminUser) => {
    setForm({
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      initialPassword: '',
    });
    setFieldErrors({});
    setFormError('');
    setEditingUser(user);
    setModalMode('edit');
    setSuccessMessage('');
  };

  const closeModal = () => {
    if (saving) return;
    setModalMode(null);
    setEditingUser(null);
    setFieldErrors({});
    setFormError('');
  };

  const validateForm = (): boolean => {
    const errors: FieldErrors = {};
    if (!form.name.trim()) errors.name = 'Full name is required';
    if (!form.email.trim()) errors.email = 'Email address is required';
    else if (!isValidEmail(form.email)) errors.email = 'Please enter a valid email address';
    if (modalMode === 'create') {
      const errorsForPassword = passwordErrors(form.initialPassword);
      if (errorsForPassword.length > 0) errors.initialPassword = errorsForPassword.join(', ');
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const replaceUser = (updated: api.AdminUser) => {
    setAllUsers((current) => sortUsers(current.map((user) => (user.id === updated.id ? updated : user))));
    setUsers((current) => sortUsers(current.map((user) => (user.id === updated.id ? updated : user)).filter((user) => matchesFilters(user, searchTerm, roleFilter))));
  };

  const addUser = (created: api.AdminUser) => {
    setAllUsers((current) => sortUsers([...current, created]));
    setUsers((current) => sortUsers([...current, created].filter((user) => matchesFilters(user, searchTerm, roleFilter))));
  };

  const handleFormSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;
    setSaving(true);
    setFormError('');

    try {
      if (modalMode === 'create') {
        const created = await api.createAdminUser({
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
          isActive: form.isActive,
          initialPassword: form.initialPassword,
        });
        addUser(created);
        setModalMode(null);
        setSuccessMessage('User created successfully. The initial password must be changed at first login.');
      } else if (editingUser) {
        const updated = await api.updateAdminUser(editingUser.id, {
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
          isActive: form.isActive,
        });
        replaceUser(updated);
        setModalMode(null);
        setSuccessMessage('User details updated successfully.');
      }
    } catch (error: any) {
      if (!reconcileAccessError(error)) {
        setFormError(getErrorMessage(error, 'Failed to save user'));
      }
    } finally {
      setSaving(false);
    }
  };

  const openResetModal = (user: api.AdminUser) => {
    setResetTarget(user);
    setResetPassword('');
    setResetError('');
    setSuccessMessage('');
  };

  const closeResetModal = () => {
    if (resetSaving) return;
    setResetTarget(null);
    setResetPassword('');
    setResetError('');
  };

  const handleResetSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!resetTarget) return;
    const errors = passwordErrors(resetPassword);
    if (errors.length > 0) {
      setResetError(`Password must include: ${errors.join(', ')}`);
      return;
    }

    setResetSaving(true);
    setResetError('');
    try {
      const target = resetTarget;
      await api.resetAdminUserPassword(target.id, resetPassword);
      replaceUser({ ...target, requiresPasswordChange: true });
      if (target.id === currentAdmin?.id) {
        setUser((currentUser) => currentUser ? { ...currentUser, requiresPasswordChange: true } : currentUser);
      }
      setModalMode(null);
      setEditingUser(null);
      setResetTarget(null);
      setResetPassword('');
      setSuccessMessage(`Initial password reset for ${target.name}. Password change is required at next login.`);
    } catch (error: any) {
      if (!reconcileAccessError(error)) {
        setResetError(getErrorMessage(error, 'Failed to reset password'));
      }
    } finally {
      setResetSaving(false);
    }
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearchTerm('');
    setRoleFilter('');
  };

  const hasActiveFilters = Boolean(searchInput.trim() || roleFilter);

  return (
    <div data-testid="user-management" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h1 className="mb-1" style={{ color: 'var(--color-text-primary)', fontSize: '1.5rem', fontWeight: 800 }}>User Management</h1>
          <p className="mb-0" style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
            Manage user accounts, roles, and access status
          </p>
        </div>
        <button
          type="button"
          className="btn fw-semibold text-white"
          style={{ backgroundColor: 'var(--color-primary-green)', minHeight: '44px', borderRadius: '8px' }}
          onClick={openCreateModal}
          disabled={directoryAccessDenied}
        >
          + Create User
        </button>
      </div>

      {successMessage && (
        <div role="status" className="mb-3" style={{ backgroundColor: 'var(--color-success-bg)', border: '1px solid #A7F3D0', borderRadius: '8px', padding: '0.8rem 1rem', color: '#065F46', fontSize: '0.85rem' }}>
          {successMessage}
        </div>
      )}

      <div className="mb-3" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border-subtle)', borderRadius: '12px', padding: '1rem' }}>
        <div className="row g-2 align-items-end">
          <div className="col-12 col-md-8">
            <label htmlFor="admin-user-search" className="form-label mb-1" style={{ color: 'var(--color-text-primary)', fontSize: '0.8rem', fontWeight: 600 }}>Search users</label>
            <input
              id="admin-user-search"
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by name or email..."
              style={inputStyle}
              disabled={directoryAccessDenied}
            />
          </div>
          <div className="col-12 col-md-4">
            <label htmlFor="admin-role-filter" className="form-label mb-1" style={{ color: 'var(--color-text-primary)', fontSize: '0.8rem', fontWeight: 600 }}>Role</label>
            <select id="admin-role-filter" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as RoleFilter)} style={inputStyle} disabled={directoryAccessDenied}>
              <option value="">All Roles</option>
              {roleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          {hasActiveFilters && (
            <div className="col-12">
              <button type="button" className="btn btn-sm btn-outline-secondary" style={{ minHeight: '44px' }} onClick={clearFilters} disabled={directoryAccessDenied}>Clear Filters</button>
            </div>
          )}
        </div>
      </div>

      {directoryAccessDenied && (
        <div role="alert" className="mb-3" style={{ backgroundColor: 'var(--color-error-bg)', border: '1px solid var(--color-error-border)', borderRadius: '8px', padding: '0.8rem 1rem', color: 'var(--color-error-text)', fontSize: '0.85rem' }}>
          Access Restricted: You do not have permission to access this resource or operational action.
        </div>
      )}

      {directoryError && !directoryAccessDenied && (
        <div role="alert" className="mb-3" style={{ backgroundColor: 'var(--color-error-bg)', border: '1px solid var(--color-error-border)', borderRadius: '8px', padding: '0.8rem 1rem', color: 'var(--color-error-text)', fontSize: '0.85rem' }}>
          {directoryError}
        </div>
      )}

      <div className="d-none d-md-block" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border-subtle)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={tableHeaderStyle}>Name</th>
                <th style={tableHeaderStyle}>Email</th>
                <th style={tableHeaderStyle}>Role</th>
                <th style={tableHeaderStyle}>Status</th>
                <th style={tableHeaderStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ ...tableCellStyle, textAlign: 'center', padding: '3rem' }}><span className="spinner-border" style={{ color: 'var(--color-primary-green)' }} role="status" /><div className="mt-2" style={{ color: 'var(--color-text-muted)' }}>Loading users...</div></td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} style={{ ...tableCellStyle, textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>No users found{hasActiveFilters && <button type="button" className="btn btn-link d-block mx-auto mt-2" style={{ minHeight: '44px' }} onClick={clearFilters} disabled={directoryAccessDenied}>Clear Filters</button>}</td></tr>
              ) : users.map((user) => (
                <tr key={user.id} style={{ backgroundColor: user.id % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-subtle)' }}>
                  <td style={tableCellStyle}><span style={{ fontWeight: 600 }}>{user.name}</span></td>
                  <td style={tableCellStyle}><span style={{ color: 'var(--color-text-secondary)' }}>{user.email}</span></td>
                  <td style={tableCellStyle}><RoleBadge role={user.role} /></td>
                  <td style={tableCellStyle}><StatusBadge isActive={user.isActive} /></td>
                  <td style={tableCellStyle}><button type="button" className="btn btn-sm btn-outline-success" style={{ minHeight: '44px' }} onClick={() => openEditModal(user)} disabled={directoryAccessDenied}>Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="d-md-none" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {loading ? (
          <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border-subtle)', borderRadius: '12px', padding: '3rem', textAlign: 'center' }}><span className="spinner-border" style={{ color: 'var(--color-primary-green)' }} role="status" /><div className="mt-2" style={{ color: 'var(--color-text-muted)' }}>Loading users...</div></div>
        ) : users.length === 0 ? (
          <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border-subtle)', borderRadius: '12px', padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No users found{hasActiveFilters && <button type="button" className="btn btn-link d-block mx-auto mt-2" style={{ minHeight: '44px' }} onClick={clearFilters} disabled={directoryAccessDenied}>Clear Filters</button>}</div>
        ) : users.map((user) => (
          <div key={user.id} style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border-subtle)', borderRadius: '12px', padding: '1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div className="d-flex justify-content-between align-items-start gap-2 mb-2"><strong style={{ overflowWrap: 'anywhere' }}>{user.name}</strong><StatusBadge isActive={user.isActive} /></div>
            <div className="mb-2" style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', overflowWrap: 'anywhere' }}>{user.email}</div>
            <div className="d-flex justify-content-between align-items-center gap-2"><RoleBadge role={user.role} /><button type="button" className="btn btn-sm btn-outline-success" style={{ minHeight: '44px' }} onClick={() => openEditModal(user)} disabled={directoryAccessDenied}>Edit</button></div>
          </div>
        ))}
      </div>

      {modalMode && !resetTarget && (
        <div className="modal d-block" role="presentation" style={{ backgroundColor: 'rgba(26,40,32,0.45)' }} onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="user-form-title" data-testid="user-form-modal" style={{ border: 'none', borderRadius: '12px' }}>
              <div className="modal-header" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                <h2 id="user-form-title" className="modal-title h5 mb-0" style={{ color: 'var(--color-text-primary)', fontWeight: 700 }}>{modalMode === 'create' ? 'Create User' : 'Edit User'}</h2>
                <button type="button" className="btn-close" aria-label="Close" onClick={closeModal} disabled={saving} style={{ minWidth: '44px', minHeight: '44px' }} />
              </div>
              <form onSubmit={handleFormSubmit} noValidate>
                <div className="modal-body">
                  {formError && <div role="alert" className="mb-3" style={{ backgroundColor: 'var(--color-error-bg)', border: '1px solid var(--color-error-border)', borderRadius: '8px', padding: '0.75rem', color: 'var(--color-error-text)', fontSize: '0.85rem' }}>{formError}</div>}
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <label htmlFor={modalMode === 'create' ? 'create-user-name' : 'edit-user-name'} className="form-label" style={{ color: 'var(--color-text-primary)', fontSize: '0.82rem', fontWeight: 600 }}>Full Name</label>
                      <input id={modalMode === 'create' ? 'create-user-name' : 'edit-user-name'} type="text" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className={`form-control ${fieldErrors.name ? 'is-invalid' : ''}`} style={inputStyle} aria-invalid={Boolean(fieldErrors.name)} />
                      <FieldError id="user-name-error" message={fieldErrors.name} />
                    </div>
                    <div className="col-12 col-md-6">
                      <label htmlFor={modalMode === 'create' ? 'create-user-email' : 'edit-user-email'} className="form-label" style={{ color: 'var(--color-text-primary)', fontSize: '0.82rem', fontWeight: 600 }}>Email Address</label>
                      <input id={modalMode === 'create' ? 'create-user-email' : 'edit-user-email'} type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className={`form-control ${fieldErrors.email ? 'is-invalid' : ''}`} style={inputStyle} aria-invalid={Boolean(fieldErrors.email)} />
                      <FieldError id="user-email-error" message={fieldErrors.email} />
                    </div>
                    <div className="col-12 col-md-6">
                      <label htmlFor={modalMode === 'create' ? 'create-user-role' : 'edit-user-role'} className="form-label" style={{ color: 'var(--color-text-primary)', fontSize: '0.82rem', fontWeight: 600 }}>Role</label>
                      <select id={modalMode === 'create' ? 'create-user-role' : 'edit-user-role'} value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as api.Role }))} className="form-select" style={inputStyle} disabled={roleSelectDisabled && modalMode === 'edit'}>
                        {roleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                      {editingLastAdmin && modalMode === 'edit' && <div className="form-text" title="Cannot deactivate or demote the last active Administrator">Cannot deactivate or demote the last active Administrator</div>}
                    </div>
                    <div className="col-12 col-md-6 d-flex align-items-end">
                      <div className="form-check form-switch mb-2" style={{ minHeight: '44px' }}>
                        <input id={modalMode === 'create' ? 'create-user-active' : 'edit-user-active'} className="form-check-input" type="checkbox" role="switch" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} disabled={activeToggleDisabled && modalMode === 'edit'} />
                        <label className="form-check-label" htmlFor={modalMode === 'create' ? 'create-user-active' : 'edit-user-active'} style={{ color: 'var(--color-text-primary)', fontSize: '0.85rem' }}>Active</label>
                        {editingOwnAccount && modalMode === 'edit' && <div className="form-text" title="You cannot deactivate your own account">You cannot deactivate your own account</div>}
                      </div>
                    </div>
                    {modalMode === 'create' && (
                      <div className="col-12">
                        <label htmlFor="create-user-password" className="form-label" style={{ color: 'var(--color-text-primary)', fontSize: '0.82rem', fontWeight: 600 }}>Initial Password</label>
                        <input id="create-user-password" type="password" value={form.initialPassword} onChange={(event) => setForm((current) => ({ ...current, initialPassword: event.target.value }))} className={`form-control ${fieldErrors.initialPassword ? 'is-invalid' : ''}`} style={inputStyle} aria-invalid={Boolean(fieldErrors.initialPassword)} />
                        <FieldError id="user-password-error" message={fieldErrors.initialPassword} />
                        <div className="form-text">At least 8 characters with uppercase, lowercase, number, and special character.</div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="modal-footer" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
                  <button type="button" className="btn btn-outline-secondary" style={{ minHeight: '44px' }} onClick={closeModal} disabled={saving}>Cancel</button>
                  <button type="submit" className="btn text-white" style={{ backgroundColor: 'var(--color-primary-green)', minHeight: '44px' }} disabled={saving}>
                    {saving && <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />}
                    {saving ? 'Saving...' : modalMode === 'create' ? 'Create User' : 'Save Changes'}
                  </button>
                </div>
              </form>
              {modalMode === 'edit' && editingUser && (
                <div className="px-3 pb-3">
                  <button type="button" className="btn btn-outline-warning w-100" style={{ minHeight: '44px' }} onClick={() => openResetModal(editingUser)}>Reset Initial Password</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {resetTarget && (
        <div className="modal d-block" role="presentation" style={{ backgroundColor: 'rgba(26,40,32,0.45)' }} onMouseDown={(event) => { if (event.target === event.currentTarget) closeResetModal(); }}>
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="reset-password-title" data-testid="reset-password-modal" style={{ border: 'none', borderRadius: '12px' }}>
              <div className="modal-header" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                <h2 id="reset-password-title" className="modal-title h5 mb-0" style={{ color: 'var(--color-text-primary)', fontWeight: 700 }}>Reset Initial Password</h2>
                <button type="button" className="btn-close" aria-label="Close" onClick={closeResetModal} disabled={resetSaving} style={{ minWidth: '44px', minHeight: '44px' }} />
              </div>
              <form onSubmit={handleResetSubmit} noValidate>
                <div className="modal-body">
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.88rem' }}>Set a temporary password for <strong>{resetTarget.name}</strong>. The user will be required to change it at the next login.</p>
                  {resetError && <div role="alert" className="mb-3" style={{ backgroundColor: 'var(--color-error-bg)', border: '1px solid var(--color-error-border)', borderRadius: '8px', padding: '0.75rem', color: 'var(--color-error-text)', fontSize: '0.85rem' }}>{resetError}</div>}
                  <label htmlFor="reset-initial-password" className="form-label" style={{ color: 'var(--color-text-primary)', fontSize: '0.82rem', fontWeight: 600 }}>New Initial Password</label>
                  <input id="reset-initial-password" type="password" value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} className="form-control" style={inputStyle} autoFocus />
                </div>
                <div className="modal-footer" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
                  <button type="button" className="btn btn-outline-secondary" style={{ minHeight: '44px' }} onClick={closeResetModal} disabled={resetSaving}>Cancel</button>
                  <button type="submit" className="btn text-white" style={{ backgroundColor: 'var(--color-primary-green)', minHeight: '44px' }} disabled={resetSaving}>
                    {resetSaving && <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />}
                    {resetSaving ? 'Resetting...' : 'Reset Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
