/**
 * HomeShell — lazy-loaded homepage + login environment.
 * Keeps ~50 component imports out of the critical path.
 */
import { useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { Home } from '@/components/marketing/Home';
import { Login } from '@/components/auth/Login';

export default function HomeShell() {
  const { environment } = useApp();
  if (environment === 'home') return <Home />;
  if (environment === 'login') return <Login />;
  return null;
}