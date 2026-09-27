import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MandatoryPasswordChange } from '../../src/components/MandatoryPasswordChange';
import * as api from '../../src/api';
import { AuthProvider } from '../../src/context/AuthContext';

describe('UI-02: Mandatory Password Change Form Checks (FR-02, AC-3.3, AC-3.4)', () => {
  const mockUser: api.User = {
    id: 5,
    name: 'Alex Turner',
    email: 'alex.turner@toktickit.kmutt.ac.th',
    role: 'IT_STAFF',
    requiresPasswordChange: true,
  };

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('toktickit_auth_token', 'test-token');
    vi.restoreAllMocks();
    vi.spyOn(api, 'getMeApi').mockResolvedValue(mockUser);
  });

  const renderComponent = () => {
    return render(
      <AuthProvider>
        <MandatoryPasswordChange />
      </AuthProvider>
    );
  };

  it('renders mandatory password change form and user greeting', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /mandatory password change/i })).toBeInTheDocument();
      expect(screen.getByText(/Alex Turner/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/current \(temporary\) password \*/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^new password \*/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^confirm new password \*/i)).toBeInTheDocument();
    });
  });

  it('dynamically updates checklist criteria as user types new password', async () => {
    renderComponent();

    const newPassInput = await screen.findByLabelText(/^new password \*/i);

    // Initial state: all criteria unfulfilled (○)
    const lengthItem = screen.getByText(/at least 8 characters/i).closest('li')!;
    const caseItem = screen.getByText(/uppercase & lowercase letters/i).closest('li')!;
    const numberSpecialItem = screen.getByText(/number & special character/i).closest('li')!;

    expect(lengthItem).toHaveClass('text-muted');
    expect(caseItem).toHaveClass('text-muted');
    expect(numberSpecialItem).toHaveClass('text-muted');

    // Type 8 lowercase letters
    fireEvent.change(newPassInput, { target: { value: 'abcdefgh' } });
    expect(lengthItem).toHaveClass('text-success');
    expect(caseItem).toHaveClass('text-muted');

    // Add uppercase
    fireEvent.change(newPassInput, { target: { value: 'Abcdefgh' } });
    expect(lengthItem).toHaveClass('text-success');
    expect(caseItem).toHaveClass('text-success');
    expect(numberSpecialItem).toHaveClass('text-muted');

    // Add number and special character -> all green
    fireEvent.change(newPassInput, { target: { value: 'Abcdefgh1!' } });
    expect(lengthItem).toHaveClass('text-success');
    expect(caseItem).toHaveClass('text-success');
    expect(numberSpecialItem).toHaveClass('text-success');
  });

  it('validates matching confirm password before submission', async () => {
    renderComponent();

    const currentInput = await screen.findByLabelText(/current \(temporary\) password \*/i);
    const newInput = screen.getByLabelText(/^new password \*/i);
    const confirmInput = screen.getByLabelText(/^confirm new password \*/i);

    fireEvent.change(currentInput, { target: { value: 'Password123!' } });
    fireEvent.change(newInput, { target: { value: 'BrandNewSecurePass123!' } });
    fireEvent.change(confirmInput, { target: { value: 'MismatchedPass123!' } });

    const submitBtn = screen.getByRole('button', { name: /update password/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  it('submits valid password change and invokes changePasswordApi', async () => {
    const changeSpy = vi.spyOn(api, 'changePasswordApi').mockResolvedValueOnce({
      message: 'Password updated successfully',
      requiresPasswordChange: false,
    });

    renderComponent();

    const currentInput = await screen.findByLabelText(/current \(temporary\) password \*/i);
    const newInput = screen.getByLabelText(/^new password \*/i);
    const confirmInput = screen.getByLabelText(/^confirm new password \*/i);

    fireEvent.change(currentInput, { target: { value: 'Password123!' } });
    fireEvent.change(newInput, { target: { value: 'BrandNewSecurePass123!' } });
    fireEvent.change(confirmInput, { target: { value: 'BrandNewSecurePass123!' } });

    const submitBtn = screen.getByRole('button', { name: /update password/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(changeSpy).toHaveBeenCalledWith('Password123!', 'BrandNewSecurePass123!');
    });
  });
});
