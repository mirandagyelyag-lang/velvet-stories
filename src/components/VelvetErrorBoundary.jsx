import { Component } from "react";
import { repairVelvetRuntime, recordVelvetRuntimeError } from "../utils/runtimeRecovery";
import "../styles/runtime-recovery.css";

class VelvetErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, repairing: false };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    recordVelvetRuntimeError(
      `${error?.message || error}\n${info?.componentStack || ""}`,
      "react-boundary"
    );
  }

  async repair() {
    if (this.state.repairing) return;
    this.setState({ repairing: true });
    await repairVelvetRuntime("react-boundary");
  }

  render() {
    if (!this.state.error) return this.props.children;

    const native = Boolean(window.__VELVET_IS_NATIVE__?.());
    const message = this.state.error?.message || String(this.state.error || "Unknown startup error");

    return (
      <main className="velvet-runtime-recovery" role="alert">
        <div className="velvet-runtime-recovery__card">
          <span className="velvet-runtime-recovery__mark">✦</span>
          <p className="velvet-runtime-recovery__eyebrow">VELVET RECOVERY</p>
          <h1>Velvet tripped while opening.</h1>
          <p>
            {native
              ? `Android startup error: ${message}`
              : "Your stories and account are still safe. Repair the app cache and reopen the newest build."}
          </p>
          {!native && (
            <details className="velvet-runtime-recovery__details">
              <summary>Technical error</summary>
              <code>{message}</code>
            </details>
          )}
          {native ? (
            <button type="button" onClick={() => window.location.reload()}>Reopen Velvet</button>
          ) : (
            <button type="button" onClick={() => this.repair()} disabled={this.state.repairing}>
              {this.state.repairing ? "Repairing…" : "Repair & reopen Velvet"}
            </button>
          )}
          <button
            type="button"
            className="velvet-runtime-recovery__secondary"
            onClick={() => window.location.reload()}
          >
            Try reload
          </button>
        </div>
      </main>
    );
  }
}

export default VelvetErrorBoundary;
