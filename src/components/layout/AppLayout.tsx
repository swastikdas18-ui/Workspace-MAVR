import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { RoleSwitcherBar } from '../common/RoleSwitcherBar';
import { ToastContainer } from '../common/ToastContainer';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans text-slate-100 selection:bg-blue-600 selection:text-white">
      {/* Top Floating Master Role & Sandbox Bar */}
      <RoleSwitcherBar />

      <div className="flex flex-1 overflow-hidden">
        {/* Role-Specific Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <Header />
          <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>

      {/* Global Toast Notifications */}
      <ToastContainer />
    </div>
  );
};
