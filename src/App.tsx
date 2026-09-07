import { lazy, Suspense } from 'react';
import { AppProvider, useApp } from '@/context/GlobalStateContext';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

const HomeShell = lazy(() => import('@/components/layout/HomeShell'));
const BrandShell = lazy(() => import('@/components/layout/BrandShell'));
const AdminShell = lazy(() => import('@/components/layout/AdminShell'));
const CarrierShell = lazy(() => import('@/components/layout/CarrierShell'));

const FALLBACK = (
  <div className="flex items-center justify-center min-h-screen bg-ink-900">
    <div className="text-zinc-500 text-sm">Loading...</div>
  </div>
);

function AppContent() {
  const { environment } = useApp();
  if (environment === 'home' || environment === 'login') return <Suspense fallback={FALLBACK}><HomeShell /></Suspense>;
  if (environment === 'brand') return <Suspense fallback={FALLBACK}><BrandShell /></Suspense>;
  if (environment === 'admin') return <Suspense fallback={FALLBACK}><AdminShell /></Suspense>;
  return <Suspense fallback={FALLBACK}><CarrierShell /></Suspense>;
}

function App() {
  return (
    <ErrorBoundary sectionLabel="App root">
      <AppProvider><AppContent /></AppProvider>
    </ErrorBoundary>
  );
}

export default App;