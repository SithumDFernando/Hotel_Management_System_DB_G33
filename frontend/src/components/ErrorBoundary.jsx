import { Component } from 'react';
import Button from '@/components/ui/Button';

// `page`: used inside Layout around the routed page, so a crash keeps the
// navbar. Without it (main.jsx) it is the last resort and fills the screen.
// Plain links (not router Links) because the router may be what crashed.
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(prev) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) console.error('UI crash:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div
        role="alert"
        className={`mx-auto flex max-w-md flex-col items-center px-4 text-center ${this.props.page ? 'py-20' : 'min-h-screen justify-center'}`}
      >
        <h1 className="text-xl font-semibold text-ink-900">This page couldn’t be shown.</h1>
        <p className="mt-2 text-sm text-ink-600">Reload the page. If it keeps happening, tell the system admin.</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button onClick={() => window.location.reload()}>Reload page</Button>
          <a href="/" className="rounded-sm text-sm font-medium text-tea-700 underline-offset-2 hover:underline">Go to home page</a>
        </div>
      </div>
    );
  }
}
