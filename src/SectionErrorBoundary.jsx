import { Component } from 'react';

export default class SectionErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error) {
    console.error('[plant-tracker:section-error]', { section: this.props.section, name: error?.name || 'Error', message: error?.message || 'Unknown rendering error' });
  }
  render() {
    if (!this.state.error) return this.props.children;
    return <section className="empty-message" role="alert"><h2>{this.props.section} could not be displayed</h2><p>Your other Plant Tracker data is still available. Refresh after checking Sync diagnostics.</p></section>;
  }
}
