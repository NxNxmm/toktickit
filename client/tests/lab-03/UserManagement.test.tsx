import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { UserManagement } from '../../src/components/UserManagement';
import * as api from '../../src/api';

const { authAdmin, authSetUser } = vi.hoisted(() => ({
  authAdmin: {
    id: 1,
    name: 'System Admin',
    email: 'admin@toktickit.kmutt.ac.th',
    role: 'ADMIN' as const,
    requiresPasswordChange: false,
  },
  authSetUser: vi.fn(),
}));

vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: { ...authAdmin },
    token: 'admin-token',
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    changePassword: vi.fn(),
    setUser: authSetUser,
  }),
}));

const baseUsers: api.AdminUser[] = [
  {
    id: 1,
    name: 'System Admin',
    email: 'admin@toktickit.kmutt.ac.th',
    role: 'ADMIN',
    isActive: true,
    requiresPasswordChange: false,
    createdAt: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 2,
    name: 'Alex Turner',
    email: 'alex.turner@toktickit.kmutt.ac.th',
    role: 'IT_STAFF',
    isActive: true,
    requiresPasswordChange: false,
    createdAt: '2026-09-02T00:00:00.000Z',
  },
  {
    id: 3,
    name: 'Jennifer Anderson',
    email: 'jennifer.anderson@kmutt.ac.th',
    role: 'REQUESTER',
    isActive: false,
    requiresPasswordChange: true,
    createdAt: '2026-09-03T00:00:00.000Z',
  },
];

const createdUser: api.AdminUser = {
  id: 4,
  name: 'Dana Wong',
  email: 'dana.wong@kmutt.ac.th',
  role: 'IT_STAFF',
  isActive: true,
  requiresPasswordChange: true,
  createdAt: '2026-09-04T00:00:00.000Z',
};

const updatedUser: api.AdminUser = {
  ...baseUsers[1],
  name: 'Alex T. Turner',
  email: 'alex.t.turner@toktickit.kmutt.ac.th',
  role: 'REQUESTER',
  isActive: false,
};

function apiError(message: string, statusCode: number, code?: string) {
  return Object.assign(new Error(message), {
    statusCode,
    errorData: { message, ...(code ? { code } : {}) },
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolver) => {
    resolve = resolver;
  });
  return { promise, resolve };
}

function getLayouts(container: HTMLElement) {
  return {
    desktop: container.querySelector<HTMLElement>('.d-none.d-md-block')!,
    mobile: container.querySelector<HTMLElement>('.d-md-none')!,
  };
}

async function renderLoadedDirectory() {
  const view = render(<UserManagement />);
  const { desktop, mobile } = getLayouts(view.container);
  await waitFor(() => {
    expect(within(desktop).getByText('System Admin')).toBeInTheDocument();
  });
  return { ...view, desktop, mobile };
}

function openCreateModal() {
  fireEvent.click(screen.getByRole('button', { name: '+ Create User' }));
  return screen.getByTestId('user-form-modal');
}

function openEditModal(desktop: HTMLElement, userName: string) {
  const row = within(desktop).getByText(userName).closest('tr') as HTMLTableRowElement;
  fireEvent.click(within(row).getByRole('button', { name: 'Edit' }));
  return screen.getByTestId('user-form-modal');
}

function fillCreateForm(modal: HTMLElement) {
  fireEvent.change(modal.querySelector('#create-user-name')!, { target: { value: '  Dana Wong  ' } });
  fireEvent.change(modal.querySelector('#create-user-email')!, { target: { value: '  dana.wong@kmutt.ac.th  ' } });
  fireEvent.change(modal.querySelector('#create-user-role')!, { target: { value: 'IT_STAFF' } });
  fireEvent.change(modal.querySelector('#create-user-password')!, { target: { value: 'Start123!' } });
}

describe('UI-07: Administrator user management (FR-14, FR-15, AC-7.1, AC-7.4)', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    authSetUser.mockClear();
    localStorage.clear();
    vi.spyOn(api, 'getAdminUsers').mockResolvedValue(baseUsers);
    vi.spyOn(api, 'createAdminUser').mockResolvedValue(createdUser);
    vi.spyOn(api, 'updateAdminUser').mockResolvedValue(updatedUser);
    vi.spyOn(api, 'resetAdminUserPassword').mockResolvedValue({
      message: 'Initial password reset successfully',
      requiresPasswordChange: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('requests the unfiltered directory and renders desktop and mobile user views', async () => {
    const { desktop, mobile } = await renderLoadedDirectory();

    expect(api.getAdminUsers).toHaveBeenCalledTimes(1);
    expect(api.getAdminUsers).toHaveBeenCalledWith({ search: undefined, role: undefined });
    expect(within(desktop).getByRole('table')).toBeInTheDocument();
    expect(within(desktop).getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(within(desktop).getByRole('columnheader', { name: 'Email' })).toBeInTheDocument();
    expect(within(desktop).getByRole('columnheader', { name: 'Role' })).toBeInTheDocument();
    expect(within(desktop).getByRole('columnheader', { name: 'Status' })).toBeInTheDocument();
    expect(within(desktop).getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument();
    expect(within(desktop).getByText('alex.turner@toktickit.kmutt.ac.th')).toBeInTheDocument();
    expect(within(desktop).getByText('IT Staff')).toBeInTheDocument();
    expect(within(desktop).getAllByText('Active')).toHaveLength(2);
    expect(within(desktop).getByText('Inactive')).toBeInTheDocument();
    expect(within(mobile).queryByRole('table')).not.toBeInTheDocument();
    expect(within(mobile).getByText('Jennifer Anderson')).toBeInTheDocument();
    expect(within(mobile).getByText('jennifer.anderson@kmutt.ac.th')).toBeInTheDocument();
    expect(within(mobile).getByText('Requester')).toBeInTheDocument();
  });

  it('renders the forbidden state and disables directory controls after a 403', async () => {
    vi.mocked(api.getAdminUsers).mockRejectedValueOnce(
      apiError('Administrator access is required to manage user accounts', 403),
    );

    render(<UserManagement />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Access Restricted: You do not have permission to access this resource or operational action.',
    );
    expect(screen.getByRole('button', { name: '+ Create User' })).toBeDisabled();
    expect(screen.getByLabelText('Search users')).toBeDisabled();
    expect(screen.getByLabelText('Role')).toBeDisabled();
  });

  it('requires a password change when an edit mutation returns PASSWORD_CHANGE_REQUIRED', async () => {
    vi.mocked(api.updateAdminUser).mockRejectedValueOnce(
      apiError('Password change required', 403, 'PASSWORD_CHANGE_REQUIRED'),
    );
    const { desktop } = await renderLoadedDirectory();
    const modal = openEditModal(desktop, 'Alex Turner');

    fireEvent.submit(modal.querySelector('form')!);

    await waitFor(() => {
      expect(api.updateAdminUser).toHaveBeenCalledWith(2, {
        name: 'Alex Turner',
        email: 'alex.turner@toktickit.kmutt.ac.th',
        role: 'IT_STAFF',
        isActive: true,
      });
      expect(authSetUser).toHaveBeenCalledTimes(1);
    });
    const updateUser = authSetUser.mock.calls[0][0] as (user: api.AdminUser | null) => api.AdminUser | null;
    expect(updateUser({ ...authAdmin, isActive: true, createdAt: '2026-09-01T00:00:00.000Z' })).toMatchObject({
      requiresPasswordChange: true,
    });
  });

  it('closes the reset flow and renders the forbidden state after a mutation 403', async () => {
    vi.mocked(api.resetAdminUserPassword).mockRejectedValueOnce(
      apiError('Administrator access is required', 403),
    );
    const { desktop } = await renderLoadedDirectory();
    const editModal = openEditModal(desktop, 'Alex Turner');
    fireEvent.click(within(editModal).getByRole('button', { name: 'Reset Initial Password' }));
    const resetModal = screen.getByTestId('reset-password-modal');
    fireEvent.change(within(resetModal).getByLabelText('New Initial Password'), {
      target: { value: 'Reset123!' },
    });

    fireEvent.submit(within(resetModal).getByRole('button', { name: 'Reset Password' }));

    await waitFor(() => {
      expect(api.resetAdminUserPassword).toHaveBeenCalledWith(2, 'Reset123!');
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Access Restricted: You do not have permission to access this resource or operational action.',
      );
    });
    expect(screen.queryByTestId('user-form-modal')).not.toBeInTheDocument();
    expect(screen.queryByTestId('reset-password-modal')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Edit' }).every((button) => button.hasAttribute('disabled'))).toBe(true);
  });

  it('passes the selected role to the directory API', async () => {
    const { container } = await renderLoadedDirectory();
    const getUsersSpy = vi.mocked(api.getAdminUsers);
    const roleFilter = container.querySelector('#admin-role-filter') as HTMLSelectElement;

    fireEvent.change(roleFilter, { target: { value: 'IT_STAFF' } });

    await waitFor(() => {
      expect(getUsersSpy).toHaveBeenCalledTimes(2);
    });
    expect(getUsersSpy).toHaveBeenNthCalledWith(2, { search: undefined, role: 'IT_STAFF' });
  });

  it('ignores an older directory response after filters change again', async () => {
    const staffRequest = deferred<api.AdminUser[]>();
    const requesterRequest = deferred<api.AdminUser[]>();
    vi.mocked(api.getAdminUsers)
      .mockResolvedValueOnce(baseUsers)
      .mockReturnValueOnce(staffRequest.promise)
      .mockReturnValueOnce(requesterRequest.promise);
    const { container, desktop } = await renderLoadedDirectory();
    const roleFilter = container.querySelector('#admin-role-filter') as HTMLSelectElement;

    fireEvent.change(roleFilter, { target: { value: 'IT_STAFF' } });
    await waitFor(() => {
      expect(api.getAdminUsers).toHaveBeenCalledTimes(2);
    });
    fireEvent.change(roleFilter, { target: { value: 'REQUESTER' } });
    await waitFor(() => {
      expect(api.getAdminUsers).toHaveBeenCalledTimes(3);
    });

    await act(async () => {
      requesterRequest.resolve([baseUsers[2]]);
      await requesterRequest.promise;
    });
    expect(within(desktop).getByText('Jennifer Anderson')).toBeInTheDocument();

    await act(async () => {
      staffRequest.resolve([baseUsers[1]]);
      await staffRequest.promise;
    });
    expect(within(desktop).getByText('Jennifer Anderson')).toBeInTheDocument();
    expect(within(desktop).queryByText('Alex Turner')).not.toBeInTheDocument();
  });

  it('debounces search and sends the trimmed search term', async () => {
    vi.useFakeTimers();
    const getUsersSpy = vi.mocked(api.getAdminUsers);
    const { container } = render(<UserManagement />);
    await act(async () => {
      await Promise.resolve();
    });
    const searchInput = container.querySelector('#admin-user-search') as HTMLInputElement;

    expect(getUsersSpy).toHaveBeenCalledTimes(1);
    fireEvent.change(searchInput, { target: { value: '  alex  ' } });
    act(() => {
      vi.advanceTimersByTime(249);
    });
    expect(getUsersSpy).toHaveBeenCalledTimes(1);
    await act(async () => {
      vi.advanceTimersByTime(1);
      await Promise.resolve();
    });

    expect(getUsersSpy).toHaveBeenCalledTimes(2);
    expect(getUsersSpy).toHaveBeenNthCalledWith(2, { search: 'alex', role: undefined });
  });

  it('validates required create fields and password strength without calling the API', async () => {
    await renderLoadedDirectory();
    const modal = openCreateModal();

    fireEvent.click(within(modal).getByRole('button', { name: 'Create User' }));

    expect(api.createAdminUser).not.toHaveBeenCalled();
    expect(within(modal).getByText('Full name is required')).toBeInTheDocument();
    expect(within(modal).getByText('Email address is required')).toBeInTheDocument();
    expect(within(modal).getByText('At least 8 characters, One uppercase letter, One lowercase letter, One number, One special character')).toBeInTheDocument();
    expect(modal.querySelector('#create-user-name')).toHaveAttribute('aria-invalid', 'true');
    expect(modal.querySelector('#create-user-email')).toHaveAttribute('aria-invalid', 'true');
    expect(modal.querySelector('#create-user-password')).toHaveAttribute('aria-invalid', 'true');
  });

  it('creates a user with trimmed fields and renders the success result', async () => {
    const initialView = await renderLoadedDirectory();
    const modal = openCreateModal();
    fillCreateForm(modal);

    fireEvent.click(within(modal).getByRole('button', { name: 'Create User' }));

    await waitFor(() => {
      expect(api.createAdminUser).toHaveBeenCalledWith({
        name: 'Dana Wong',
        email: 'dana.wong@kmutt.ac.th',
        role: 'IT_STAFF',
        isActive: true,
        initialPassword: 'Start123!',
      });
      expect(screen.queryByTestId('user-form-modal')).not.toBeInTheDocument();
    });
    expect(screen.getByText('User created successfully. The initial password must be changed at first login.')).toBeInTheDocument();
    expect(within(initialView.desktop).getByText('Dana Wong')).toBeInTheDocument();
    expect(within(initialView.mobile).getByText('dana.wong@kmutt.ac.th')).toBeInTheDocument();
  });

  it('shows the inline duplicate-email message for a create 409', async () => {
    await renderLoadedDirectory();
    vi.mocked(api.createAdminUser).mockRejectedValueOnce(
      apiError('A user account with this email address already exists.', 409),
    );
    const modal = openCreateModal();
    fillCreateForm(modal);

    fireEvent.click(within(modal).getByRole('button', { name: 'Create User' }));

    const alert = await within(modal).findByRole('alert');
    expect(alert).toHaveTextContent('A user account with this email address already exists.');
    expect(screen.getByTestId('user-form-modal')).toBeInTheDocument();
  });

  it('edits a user with the exact payload and replaces the local directory entry', async () => {
    const { desktop, mobile } = await renderLoadedDirectory();
    vi.mocked(api.updateAdminUser).mockResolvedValueOnce(updatedUser);
    const modal = openEditModal(desktop, 'Alex Turner');

    fireEvent.change(modal.querySelector('#edit-user-name')!, { target: { value: '  Alex T. Turner  ' } });
    fireEvent.change(modal.querySelector('#edit-user-email')!, { target: { value: '  alex.t.turner@toktickit.kmutt.ac.th  ' } });
    fireEvent.change(modal.querySelector('#edit-user-role')!, { target: { value: 'REQUESTER' } });
    fireEvent.click(modal.querySelector('#edit-user-active')!);
    fireEvent.click(within(modal).getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(api.updateAdminUser).toHaveBeenCalledWith(2, {
        name: 'Alex T. Turner',
        email: 'alex.t.turner@toktickit.kmutt.ac.th',
        role: 'REQUESTER',
        isActive: false,
      });
      expect(screen.queryByTestId('user-form-modal')).not.toBeInTheDocument();
    });
    expect(screen.getByText('User details updated successfully.')).toBeInTheDocument();
    expect(within(desktop).queryByText('Alex Turner')).not.toBeInTheDocument();
    expect(within(desktop).getByText('Alex T. Turner')).toBeInTheDocument();
    expect(within(desktop).getByText('alex.t.turner@toktickit.kmutt.ac.th')).toBeInTheDocument();
    expect(within(mobile).getByText('Alex T. Turner')).toBeInTheDocument();
  });

  it('disables self-deactivation with a tooltip when another active Administrator exists', async () => {
    const usersWithSecondAdmin: api.AdminUser[] = [
      ...baseUsers,
      {
        id: 4,
        name: 'Backup Admin',
        email: 'backup.admin@toktickit.kmutt.ac.th',
        role: 'ADMIN',
        isActive: true,
        requiresPasswordChange: false,
        createdAt: '2026-09-04T00:00:00.000Z',
      },
    ];
    vi.mocked(api.getAdminUsers).mockResolvedValueOnce(usersWithSecondAdmin);
    const { desktop } = await renderLoadedDirectory();
    const modal = openEditModal(desktop, 'System Admin');
    const activeToggle = modal.querySelector('#edit-user-active')!;
    const roleSelect = modal.querySelector('#edit-user-role')!;
    const ownTooltip = within(modal).getByText('You cannot deactivate your own account');

    expect(activeToggle).toBeDisabled();
    expect(roleSelect).toBeEnabled();
    expect(ownTooltip).toHaveAttribute('title', 'You cannot deactivate your own account');
    expect(within(modal).queryByText('Cannot deactivate or demote the last active Administrator')).not.toBeInTheDocument();
  });

  it('disables role and status controls for the sole active Administrator', async () => {
    const { desktop } = await renderLoadedDirectory();
    const modal = openEditModal(desktop, 'System Admin');
    const activeToggle = modal.querySelector('#edit-user-active')!;
    const roleSelect = modal.querySelector('#edit-user-role')!;
    const lastAdminTooltip = within(modal).getByText('Cannot deactivate or demote the last active Administrator');

    expect(activeToggle).toBeDisabled();
    expect(roleSelect).toBeDisabled();
    expect(lastAdminTooltip).toHaveAttribute('title', 'Cannot deactivate or demote the last active Administrator');
    expect(within(modal).getByText('You cannot deactivate your own account')).toBeInTheDocument();
  });

  it('requires the current Administrator to change their password after a self reset', async () => {
    const { desktop } = await renderLoadedDirectory();
    const editModal = openEditModal(desktop, 'System Admin');
    fireEvent.click(within(editModal).getByRole('button', { name: 'Reset Initial Password' }));
    const resetModal = screen.getByTestId('reset-password-modal');

    fireEvent.change(resetModal.querySelector('#reset-initial-password')!, { target: { value: 'AdminTemp123!' } });
    fireEvent.click(within(resetModal).getByRole('button', { name: 'Reset Password' }));

    await waitFor(() => {
      expect(api.resetAdminUserPassword).toHaveBeenCalledWith(1, 'AdminTemp123!');
      expect(authSetUser).toHaveBeenCalledTimes(1);
      const updateUser = authSetUser.mock.calls[0][0] as (user: api.User | null) => api.User | null;
      expect(updateUser(authAdmin)).toEqual({
        ...authAdmin,
        requiresPasswordChange: true,
      });
      expect(screen.queryByTestId('reset-password-modal')).not.toBeInTheDocument();
      expect(screen.queryByTestId('user-form-modal')).not.toBeInTheDocument();
    });
  });

  it('validates and resets an initial password while keeping one active dialog', async () => {
    const { desktop } = await renderLoadedDirectory();
    const editModal = openEditModal(desktop, 'Alex Turner');
    fireEvent.click(within(editModal).getByRole('button', { name: 'Reset Initial Password' }));
    const resetModal = screen.getByTestId('reset-password-modal');

    expect(screen.queryByTestId('user-form-modal')).not.toBeInTheDocument();
    expect(resetModal).toBeInTheDocument();
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    fireEvent.click(within(resetModal).getByRole('button', { name: 'Reset Password' }));

    expect(api.resetAdminUserPassword).not.toHaveBeenCalled();
    expect(within(resetModal).getByRole('alert')).toHaveTextContent('Password must include: At least 8 characters, One uppercase letter, One lowercase letter, One number, One special character');
    fireEvent.change(resetModal.querySelector('#reset-initial-password')!, { target: { value: 'TempPass123!' } });
    fireEvent.click(within(resetModal).getByRole('button', { name: 'Reset Password' }));

    await waitFor(() => {
      expect(api.resetAdminUserPassword).toHaveBeenCalledWith(2, 'TempPass123!');
      expect(screen.queryByTestId('reset-password-modal')).not.toBeInTheDocument();
    });
    expect(screen.queryByTestId('user-form-modal')).not.toBeInTheDocument();
    expect(screen.getByText('Initial password reset for Alex Turner. Password change is required at next login.')).toBeInTheDocument();
  });
});
