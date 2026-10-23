import React, { useState } from 'react';
import { AppHeader } from '../components/layout/AppHeader';
import { AppSidebar } from '../components/layout/AppSidebar';
import { MobileNavigation } from '../components/layout/MobileNavigation';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      <AppHeader onToggleMobileMenu={() => setMobileMenuOpen(true)} />

      <div className="flex flex-1 w-full max-w-full overflow-x-hidden">
        {/* Desktop Sidebar */}
        <AppSidebar />

        {/* Mobile Navigation (Drawer + Bottom Bar) */}
        <MobileNavigation
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-12 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};
