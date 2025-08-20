// AppProviders placeholder composing providers.
import { ErrorBoundary } from './ErrorBoundary';
import { TimelineProvider } from '../context/TimelineContext.jsx';

export function AppProviders({ children }) {
  return (
    <ErrorBoundary>
      <TimelineProvider>
        {children}
      </TimelineProvider>
    </ErrorBoundary>
  );
}
