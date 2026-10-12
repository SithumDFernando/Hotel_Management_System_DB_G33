import { Component } from 'react';

// `page`: used inside Layout around the routed page, so a crash keeps the
// navbar and offers a way back. Without it (main.jsx) it is the last resort.
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(prev) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  componentDidCatch(error, info) {
    console.error('UI crash:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.page) {
      return (
        <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center" role="alert">
          <h1 className="font-serif text-3xl font-semibold">This page couldn’t be displayed</h1>
          <p className="mt-2 text-sm text-navy-500">An error stopped this page from loading. Go back, or try loading it again.</p>
          <div className="mt-6 flex gap-2">
            <button
              className="rounded-xl border border-navy-200 bg-white px-5 py-2.5 text-sm font-semibold text-navy-900 hover:bg-navy-50"
              onClick={() => window.history.back()}
            >
              Go back
            </button>
            <button
              className="rounded-xl bg-gold-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gold-800"
              onClick={() => this.setState({ error: null })}
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
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
