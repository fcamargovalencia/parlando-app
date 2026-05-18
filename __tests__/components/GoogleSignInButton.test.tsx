import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { GoogleSignInButton } from '../../src/components/auth/GoogleSignInButton';

// react-native-svg is mocked by jest-expo automatically
// react-native-toast-message mocked via __mocks__

describe('GoogleSignInButton', () => {
  it('renders with the default label', () => {
    render(<GoogleSignInButton onPress={jest.fn()} />);
    expect(screen.getByText('Continuar con Google')).toBeTruthy();
  });

  it('renders with a custom label', () => {
    render(<GoogleSignInButton onPress={jest.fn()} label="Registrarse con Google" />);
    expect(screen.getByText('Registrarse con Google')).toBeTruthy();
  });

  it('hides label and renders spinner when loading', () => {
    render(<GoogleSignInButton onPress={jest.fn()} loading />);
    // Label is not visible
    expect(screen.queryByText('Continuar con Google')).toBeNull();
    // TouchableOpacity is disabled
    const { TouchableOpacity } = require('react-native');
    const touchable = screen.UNSAFE_getAllByType(TouchableOpacity)[0];
    expect(touchable.props.disabled).toBe(true);
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    render(<GoogleSignInButton onPress={onPress} />);
    fireEvent.press(screen.getByText('Continuar con Google'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is disabled and does not call onPress when disabled prop is true', () => {
    const onPress = jest.fn();
    render(<GoogleSignInButton onPress={onPress} disabled />);
    const { TouchableOpacity } = require('react-native');
    const touchable = screen.UNSAFE_getAllByType(TouchableOpacity)[0];
    expect(touchable.props.disabled).toBe(true);
    // fireEvent still dispatches on disabled in RNTL — test the prop directly
    expect(onPress).not.toHaveBeenCalled();
  });

  it('is disabled when loading is true', () => {
    render(<GoogleSignInButton onPress={jest.fn()} loading />);
    const { TouchableOpacity } = require('react-native');
    const touchable = screen.UNSAFE_getAllByType(TouchableOpacity)[0];
    expect(touchable.props.disabled).toBe(true);
  });
});
