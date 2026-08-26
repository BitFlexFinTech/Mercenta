import { type ReactNode } from 'react';
import { useApp } from '@/store';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { EnvironmentRouter } from '@/components/layout/EnvironmentRouter';

interface AppShellProps {
  children: ReactNode;
  navItems: { id: string; label: string; icon: ReactNode }[];
  activeView: string;
  setActiveView: (v: string) => void;
  breadcrumb: string;
  userName: string;
  themeAccent?: string;
}

export function AppShell({
  children,
  navItems,
  activeView,
  setActiveView,
  breadcrumb,
  userName,
  themeAccent,
}: AppShellProps) {
  useApp();
  return (
    <div className="h-screen flex bg-black overflow-hidden">
      <Sidebar
        items={navItems}
        activeView={activeView}
        setActiveView={setActiveView}
        userName={userName}
        themeAccent={themeAccent}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Header breadcrumb={breadcrumb} />
        <main className="flex-1 overflow-y-auto pb-16">{children}</main>
      </div>
      <EnvironmentRouter />
    </div>
  );
}
