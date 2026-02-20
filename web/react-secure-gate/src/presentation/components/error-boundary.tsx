import type { ReactNode } from "react";
import { Component } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/presentation/components/ui/button";

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen items-center justify-center bg-muted/30 px-6">
          <div className="w-full max-w-md space-y-4 rounded-lg border bg-card p-6 text-center">
            <div className="text-xl font-semibold">Something went wrong</div>
            <div className="text-sm text-muted-foreground">
              An unexpected error occurred. Please reload or return to dashboard.
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button onClick={() => window.location.reload()}>Reload</Button>
              <Button variant="outline" asChild>
                <Link to="/dashboard">Back to dashboard</Link>
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
