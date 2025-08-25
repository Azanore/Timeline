// AppProviders placeholder composing providers.
import { ErrorBoundary } from './ErrorBoundary';
import { TimelineProvider } from '../context/TimelineContext.jsx';
import { ToastProvider } from '../context/ToastContext.jsx';
import { ThemeProvider } from './ThemeProvider.jsx';

export function AppProviders({ children }) {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <TimelineProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </TimelineProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
