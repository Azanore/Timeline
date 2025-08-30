import { Toaster as SonnerToaster } from 'sonner';

export function Toaster(props) {
  return <SonnerToaster richColors theme="system" position="bottom-right" {...props} />;
}
