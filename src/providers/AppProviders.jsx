// AppProviders placeholder composing providers.
import { ErrorBoundary } from './ErrorBoundary';
import { TimelineProvider } from '../context/TimelineContext.jsx';
import { ToastProvider } from '../context/ToastContext.jsx';

export function AppProviders({ children }) {
  return (
    <ErrorBoundary>
      <TimelineProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </TimelineProvider>
    </ErrorBoundary>
  );
}
