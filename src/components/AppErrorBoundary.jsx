import { Component, useEffect, useState } from "react";

function ErrorPanel({ error }) {
  if (!error) return null;

  return (
    <section className="runtime-error-panel">
      <div className="container">
        <p className="eyebrow">Runtime error</p>
        <h1>The app hit a browser error.</h1>
        <pre>{error.message || String(error)}</pre>
      </div>
    </section>
  );
}

export class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error("App render error:", error);
  }

  render() {
    if (this.state.error) {
      return <ErrorPanel error={this.state.error} />;
    }

    return this.props.children;
  }
}

export function RuntimeErrorWatcher({ children }) {
  const [error, setError] = useState(null);

  useEffect(() => {
    function handleError(event) {
      setError(event.error || new Error(event.message));
    }

    function handleRejection(event) {
      setError(event.reason instanceof Error ? event.reason : new Error(String(event.reason)));
    }

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  if (error) {
    return <ErrorPanel error={error} />;
  }

  return children;
}

