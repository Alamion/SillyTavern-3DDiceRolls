import { Component, type ErrorInfo, type ReactNode } from 'react';
import { error } from '../utils/logging';

interface ErrorBoundaryProps {
    /** What failed, shown to the user ("dice panel", "settings"). */
    area: string;
    children: ReactNode;
}

interface ErrorBoundaryState {
    failure: Error | null;
}

/** Keeps a crash in one surface (e.g. the 3D engine) from blanking it; offers a retry. */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = { failure: null };

    static getDerivedStateFromError(failure: Error): ErrorBoundaryState {
        return { failure };
    }

    componentDidCatch(failure: Error, info: ErrorInfo): void {
        error(`The ${this.props.area} hit an error: ${failure.message}`, 'Dice Roller', [info.componentStack]);
    }

    private retry = (): void => {
        this.setState({ failure: null });
    };

    render(): ReactNode {
        if (!this.state.failure) return this.props.children;
        return (
            <div className="ddr-error-boundary" role="alert">
                <span>
                    The {this.props.area} hit an error: {this.state.failure.message}
                </span>
                <button className="menu_button" onClick={this.retry} type="button">
                    Try again
                </button>
            </div>
        );
    }
}
