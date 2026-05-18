import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import ForgotPasswordScreen from '../../app/(auth)/forgot-password';

// ── Module mocks ──────────────────────────────────────────────────────────────

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), replace: jest.fn() }),
}));

jest.mock('@/api/auth', () => ({
  authApi: {
    requestPasswordReset: jest.fn(),
  },
}));

jest.mock('@/components/ui', () => {
  const React = require('react');
  const { View, Text, TextInput, TouchableOpacity, ActivityIndicator } = require('react-native');

  return {
    Screen: ({ children }: any) => <View>{children}</View>,
    Input: ({ label, value, onChangeText, ...rest }: any) => (
      <View>
        <Text>{label}</Text>
        <TextInput
          testID={`input-${label}`}
          value={value}
          onChangeText={onChangeText}
          {...rest}
        />
      </View>
    ),
    Button: ({ children, onPress, loading, disabled }: any) => (
      <TouchableOpacity
        testID="submit-button"
        onPress={onPress}
        disabled={disabled || loading}
        accessibilityRole="button"
      >
        {loading ? <ActivityIndicator /> : <Text>{children}</Text>}
      </TouchableOpacity>
    ),
  };
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const { authApi } = require('@/api/auth');

function renderScreen() {
  return render(<ForgotPasswordScreen />);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ForgotPasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the email input and submit button', () => {
    renderScreen();
    expect(screen.getByText('¿Olvidaste tu contraseña?')).toBeTruthy();
    expect(screen.getByTestId('input-Correo electrónico')).toBeTruthy();
    expect(screen.getByTestId('submit-button')).toBeTruthy();
  });

  it('shows confirmation state after successful submission', async () => {
    authApi.requestPasswordReset.mockResolvedValueOnce({});

    renderScreen();

    fireEvent.changeText(
      screen.getByTestId('input-Correo electrónico'),
      'usuario@test.com',
    );
    fireEvent.press(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(screen.getByText('Revisa tu email')).toBeTruthy();
    });

    expect(authApi.requestPasswordReset).toHaveBeenCalledWith({
      email: 'usuario@test.com',
    });
  });

  it('shows Google account error message when backend returns Google error', async () => {
    authApi.requestPasswordReset.mockRejectedValueOnce({
      response: { data: { message: 'Cuenta vinculada con Google' } },
    });

    renderScreen();

    fireEvent.changeText(
      screen.getByTestId('input-Correo electrónico'),
      'google.user@gmail.com',
    );
    fireEvent.press(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(
        screen.getByText(
          'Esta cuenta usa Google Sign-In. Inicia sesión con el botón de Google.',
        ),
      ).toBeTruthy();
    });
  });

  it('still shows confirmation on non-Google errors (security: do not reveal if email exists)', async () => {
    authApi.requestPasswordReset.mockRejectedValueOnce({
      response: { data: { message: 'Email no registrado' } },
    });

    renderScreen();

    fireEvent.changeText(
      screen.getByTestId('input-Correo electrónico'),
      'noexiste@test.com',
    );
    fireEvent.press(screen.getByTestId('submit-button'));

    await waitFor(() => {
      expect(screen.getByText('Revisa tu email')).toBeTruthy();
    });
  });

  it('does not submit when email is invalid', () => {
    renderScreen();

    fireEvent.changeText(
      screen.getByTestId('input-Correo electrónico'),
      'not-an-email',
    );
    fireEvent.press(screen.getByTestId('submit-button'));

    expect(authApi.requestPasswordReset).not.toHaveBeenCalled();
  });
});
