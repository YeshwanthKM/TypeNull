import React, { useState } from 'react';
import { ShieldCheck, Menu, X, ArrowUpRight } from 'lucide-react';

interface NavbarProps {
  onGetStartedClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onGetStartedClick }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Overview', href: '#overview' },
    { label: 'Capabilities', href: '#features' },
    { label: 'Verification Flow', href: '#flow' },
    { label: 'Project Scope', href: '#scope' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <a href="#overview" className="flex items-center gap-2.5 group focus:outline-none focus:ring-2 focus:ring-teal-600 rounded-md">
            <div className="w-9 h-9 rounded-lg bg-teal-700 flex items-center justify-center text-white shadow-sm">
              <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg text-slate-900 tracking-tight leading-none group-hover:text-teal-700 transition-colors">
                TypeNull
              </span>
              <span className="text-[10px] font-medium tracking-wider text-slate-500 uppercase mt-0.5">
                SIH 2026 Project
              </span>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8" aria-label="Main Navigation">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-600 rounded px-1 py-0.5"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Desktop CTA Action */}
          <div className="hidden md:flex items-center space-x-4">
            <button
              type="button"
              onClick={onGetStartedClick}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-teal-700 hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-600 shadow-sm transition-colors"
            >
              Get Started
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-slate-700 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-6 space-y-3">
          <div className="flex flex-col space-y-2">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              >
                {item.label}
              </a>
            ))}
          </div>
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onGetStartedClick();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-base font-medium rounded-lg text-white bg-teal-700 hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-600 shadow-sm transition-colors"
            >
              Get Started
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
