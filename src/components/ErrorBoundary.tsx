'use client';

import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8 gradient-rose-pink">
          <div className="max-w-md w-full text-center">
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-8 shadow-soft-rose">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-rose-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              
              <h2 className="text-2xl font-light text-gray-800 mb-4">
                Something went wrong
              </h2>
              
              <p className="text-gray-600 font-light mb-6 leading-relaxed">
                I'm sorry, but I've encountered an unexpected error. Please try refreshing the page or check your browser's console for more details.
              </p>
              
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white font-medium py-3 px-6 rounded-xl hover:from-rose-600 hover:to-pink-600 transition-all duration-200 shadow-soft-rose"
              >
                Refresh Page
              </button>
              
              <div className="mt-4 text-xs text-gray-400">
                {this.state.error?.message && (
                  <p className="font-mono bg-gray-100 p-2 rounded text-left">
                    {this.state.error.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 