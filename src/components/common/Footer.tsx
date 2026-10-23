import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-700 flex items-center justify-center text-white">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="font-bold text-lg text-slate-900 tracking-tight">
                TypeNull
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-700 leading-snug">
              AI-Powered Application Validation, Document Authentication and Regulatory Compliance Intelligence
            </p>
            <p className="text-xs text-slate-500 max-w-md leading-relaxed">
              Designed for Smart India Hackathon 2026. Built with a modular, responsive architecture supporting multi-device document processing and evidence-backed regulatory verification.
            </p>
          </div>

          {/* Platform Sections */}
          <div>
            <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">
              Platform
            </h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li>
                <a href="#overview" className="hover:text-teal-700 transition-colors">
                  Overview & Scope
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-teal-700 transition-colors">
                  Core Capabilities
                </a>
              </li>
              <li>
                <a href="#flow" className="hover:text-teal-700 transition-colors">
                  Verification Pipeline
                </a>
              </li>
              <li>
                <a href="#scope" className="hover:text-teal-700 transition-colors">
                  Development Roadmap
                </a>
              </li>
            </ul>
          </div>

          {/* Technical Specs & Stack */}
          <div>
            <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">
              Technology Stack
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-500">
              <li>Frontend: React 18 & TypeScript</li>
              <li>Styling: Tailwind CSS (Mobile-First)</li>
              <li>Build Tool: Vite</li>
              <li>Database & Auth: Supabase (Phase 2)</li>
              <li>Target Hosting: Vercel</li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>
            &copy; {new Date().getFullYear()} TypeNull &bull; SIH 2026 Project. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-mono text-[11px]">
              Phase 0: Safe Initialisation
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
