import * as React from "react";

interface Props {
  children: React.ReactNode;
  onError?: (error: Error) => void;
  fallback: (error: Error, reset: () => void) => React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Isolates runtime crashes thrown by the remote MFE's render so a broken
 * micro-frontend can never take down the whole model-driven / canvas app.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error("[MfeHostControl] Remote MFE threw during render:", error, info.componentStack);
    this.props.onError?.(error);
  }

  private reset = (): void => this.setState({ error: null });

  render(): React.ReactNode {
    if (this.state.error) {
      return this.props.fallback(this.state.error, this.reset);
    }
    return this.props.children;
  }
}
