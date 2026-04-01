import React, { useRef, useCallback } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  type TextInputProps,
  type NativeSyntheticEvent,
  type TextInputFocusEventData,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { Colors } from '@/constants/colors';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  containerClassName?: string;
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  secureTextEntry,
  containerClassName = '',
  className: _className,
  onFocus: onFocusProp,
  onBlur: onBlurProp,
  style: styleProp,
  ...rest
}: InputProps) {
  const [showPassword, setShowPassword] = React.useState(false);
  const rowRef = useRef<View>(null);
  const isPassword = secureTextEntry !== undefined;

  const handleFocus = useCallback(
    (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
      rowRef.current?.setNativeProps({
        style: error
          ? styles.borderError
          : { ...styles.borderFocused, ...styles.focusedShadow },
      });
      onFocusProp?.(e);
    },
    [onFocusProp, error],
  );

  const handleBlur = useCallback(
    (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
      rowRef.current?.setNativeProps({
        style: error ? styles.borderError : styles.borderDefault,
      });
      onBlurProp?.(e);
    },
    [onBlurProp, error],
  );

  return (
    <View style={styles.wrapper} className={containerClassName}>
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}
      <View
        ref={rowRef}
        style={[
          styles.inputRow,
          error ? styles.borderError : styles.borderDefault,
        ]}
      >
        {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
        <TextInput
          style={[styles.textInput, styleProp]}
          placeholderTextColor={Colors.neutral[400]}
          secureTextEntry={isPassword && !showPassword}
          autoCapitalize="none"
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...rest}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {showPassword ? (
              <EyeOff size={20} color={Colors.neutral[400]} />
            ) : (
              <Eye size={20} color={Colors.neutral[400]} />
            )}
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
      {hint && !error && <Text style={styles.hintText}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {},
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.neutral[700],
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  borderDefault: {
    borderColor: Colors.neutral[200],
  },
  borderFocused: {
    borderColor: Colors.primary[500],
  },
  borderError: {
    borderColor: '#F87171',
  },
  iconLeft: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.neutral[900],
    minHeight: 48,
  },
  focusedShadow: {
    shadowColor: Colors.primary[500],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
    marginLeft: 4,
  },
  hintText: {
    fontSize: 12,
    color: Colors.neutral[400],
    marginTop: 4,
    marginLeft: 4,
  },
});
