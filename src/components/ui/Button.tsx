import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  type TouchableOpacityProps,
} from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-primary-500 active:bg-primary-700',
  secondary: 'bg-accent-500 active:bg-accent-700',
  outline: 'bg-transparent border-2 border-primary-500 active:bg-primary-50',
  ghost: 'bg-transparent active:bg-neutral-100',
  danger: 'bg-red-500 active:bg-red-700',
};

const variantTextStyles: Record<ButtonVariant, string> = {
  primary: 'text-white',
  secondary: 'text-white',
  outline: 'text-primary-700',
  ghost: 'text-primary-700',
  danger: 'text-white',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 rounded-lg',
  md: 'px-6 py-3.5 rounded-2xl',
  lg: 'px-8 py-4 rounded-2xl',
};

const sizeTextStyles: Record<ButtonSize, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  icon,
  className = '',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      className={`flex-row items-center justify-center ${variantStyles[variant]} ${sizeStyles[size]} ${isDisabled ? 'opacity-50' : ''} ${className}`}
      disabled={isDisabled}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' || variant === 'ghost' ? '#007380' : '#FFFFFF'}
          size="small"
        />
      ) : (
        <>
          {icon && <>{icon}</>}
          <Text
            className={`font-semibold ${variantTextStyles[variant]} ${sizeTextStyles[size]} ${icon ? 'ml-2' : ''}`}
          >
            {children}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}
