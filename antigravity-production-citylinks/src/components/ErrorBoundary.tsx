import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen mesh-gradient flex items-center justify-center p-4">
          <Card className="glass max-w-md w-full p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-display font-bold text-foreground">Something went wrong</h2>
              <p className="text-muted-foreground text-sm">
                The application encountered an unexpected error. We've been notified and are looking into it.
              </p>
            </div>
            {process.env.NODE_ENV === "development" && (
              <pre className="text-left text-xs bg-muted p-4 rounded-lg overflow-auto max-h-40">
                {this.state.error?.message}
              </pre>
            )}
            <Button 
              className="w-full"
              onClick={() => window.location.reload()}
            >
              Reload Application
            </Button>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
