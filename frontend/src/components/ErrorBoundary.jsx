import { Component } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('CivicSolve AI Component Crash Caught by ErrorBoundary:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="section" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center' }}>
          <div className="container narrow">
            <div className="card" style={{ border: '1.5px solid var(--danger)', padding: 32, textAlign: 'center' }}>
              <div style={{ color: 'var(--danger)', marginBottom: 16 }}>
                <AlertCircle size={44} style={{ margin: '0 auto' }} />
              </div>
              <h2 style={{ fontSize: '1.4rem', marginBottom: 8 }}>Interface Display Issue Detected</h2>
              <p className="muted" style={{ maxWidth: 480, margin: '0 auto 20px' }}>
                A component encountered a rendering issue. CivicSolve AI automatically isolated this error to protect your active session.
              </p>
              {this.state.error?.message && (
                <div className="mono small" style={{ background: '#fef2f2', color: '#991b1b', padding: 12, borderRadius: 8, marginBottom: 20, textAlign: 'left', overflowX: 'auto' }}>
                  {this.state.error.message}
                </div>
              )}
              <button type="button" className="btn btn-primary" onClick={this.handleReload} style={{ gap: 8 }}>
                <RotateCcw size={16} /> Reload Civic Portal
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
