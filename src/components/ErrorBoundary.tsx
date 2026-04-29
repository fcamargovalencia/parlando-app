import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 items-center justify-center p-8 bg-neutral-50">
          <Text className="text-lg font-bold text-neutral-900 mb-2">Algo salió mal</Text>
          <Text className="text-xs text-neutral-500 text-center mb-8">
            {this.state.error?.message ?? 'Error inesperado'}
          </Text>
          <TouchableOpacity
            className="bg-primary-700 px-6 py-3 rounded-xl"
            onPress={this.handleRetry}
            activeOpacity={0.8}
          >
            <Text className="text-white text-sm font-semibold">Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}


