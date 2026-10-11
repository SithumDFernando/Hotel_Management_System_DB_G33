import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('UI crash:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <h1 className="font-serif text-3xl font-semibold">Something went wrong</h1>
        <p className="mt-2 max-w-md text-sm text-navy-500">An unexpected error occurred. Reloading usually fixes it.</p>
        <button
          className="mt-6 rounded-xl bg-gold-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gold-800"
          onClick={() => window.location.assign('/')}
        >
          Back to home
        </button>
      </div>
    );
  }
}
