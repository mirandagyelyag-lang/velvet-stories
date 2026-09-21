import "../styles/panel-error-boundary.css";
import { Component } from "react";

class PanelErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, retryKey: 0 };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    try {
      console.error("[Velvet panel boundary]", this.props.label || "Panel", error);
    } catch {}
  }

  reset = () => {
    this.setState((current) => ({ error: null, retryKey: current.retryKey + 1 }));
    this.props.onReset?.();
  };

  render() {
    if (!this.state.error) {
      return <div key={this.state.retryKey} style={{ display: "contents" }}>{this.props.children}</div>;
    }

    return (
      <div className="panel-error-boundary" role="alert">
        <strong>{this.props.label || "This panel"} tripped.</strong>
        <span>Your chat is still safe. Reopen only this panel.</span>
        <button type="button" onClick={this.reset}>Retry panel</button>
      </div>
    );
  }
}

export default PanelErrorBoundary;
