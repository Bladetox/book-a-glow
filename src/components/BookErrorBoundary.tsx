import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
}

/**
 * Catches a crash anywhere in the public booking app and shows a message with a
 * reload button, instead of leaving a blank screen. The error is logged to the
 * console so it can be traced.
 */
export class BookErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Booking app crashed:", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <div
        role="alert"
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "2rem",
          textAlign: "center",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
          background: "#F5F0E7",
          color: "#000000",
        }}
      >
        <p style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>
          This page could not load.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            minHeight: 44,
            padding: "0.5rem 1.25rem",
            borderRadius: 12,
            border: "1px solid #000000",
            background: "#000000",
            color: "#ffffff",
            fontWeight: 600,
          }}
        >
          Reload
        </button>
      </div>
    );
  }
}

export default BookErrorBoundary;
