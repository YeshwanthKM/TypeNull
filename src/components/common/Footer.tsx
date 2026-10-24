import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, BookOpen } from 'lucide-react';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-slate-200 mt-auto text-xs text-slate-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-700 flex items-center justify-center text-white shadow-xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="font-bold text-lg text-slate-900 tracking-tight">
                TypeNull
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-800 leading-snug">
              Regulatory Technology Platform &bull; Application Pre-Validation &amp; Document Intelligence
            </p>
            <p className="text-xs text-slate-500 max-w-md leading-relaxed">
              Assists applicants and institutional screening officers in identifying document omissions, verifying statutory form fields, and detecting cross-record discrepancies prior to official submission.
            </p>
            <div className="pt-2">
              <div className="text-[11px] text-slate-500 leading-relaxed max-w-md border-l-2 border-teal-600 pl-3 py-1 bg-slate-50/70 rounded-r">
                <span className="font-semibold text-slate-800 block mb-0.5">Statutory Disclaimer:</span>
                TypeNull is an independent pre-validation tool. It does not submit official applications, represent any government ministry, or guarantee approval by regulatory authorities. Final filings must be submitted directly through competent official portals.
              </div>
            </div>
          </div>

          {/* Product & Workflows */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Platform Modules
            </h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li>
                <Link to="/applications/explore" className="hover:text-teal-700 transition-colors">
                  Government Applications Catalogue
                </Link>
              </li>
              <li>
                <Link to="/applications/new" className="hover:text-teal-700 transition-colors">
                  Applicant Pre-Validation
                </Link>
              </li>
              <li>
                <Link to="/officer" className="hover:text-teal-700 transition-colors">
                  Organisation Bulk Screening
                </Link>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-teal-700 transition-colors">
                  Verification Pipeline
                </a>
              </li>
              <li>
                <a href="#trust" className="hover:text-teal-700 transition-colors">
                  Trust &amp; Boundaries
                </a>
              </li>
            </ul>
          </div>

          {/* Documentation & User Guides */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Help &amp; Documentation
            </h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li>
                <Link to="/guides" className="hover:text-teal-700 transition-colors font-medium text-teal-800 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-teal-700" />
                  View All Product Guides
                </Link>
              </li>
              <li>
                <Link to="/guides?guide=individual-validation" className="hover:text-teal-700 transition-colors">
                  Individual Pre-Validation Guide
                </Link>
              </li>
              <li>
                <Link to="/guides?guide=organisation-screening" className="hover:text-teal-700 transition-colors">
                  Organisation Bulk Screening Guide
                </Link>
              </li>
              <li>
                <Link to="/guides?guide=application-catalogue" className="hover:text-teal-700 transition-colors">
                  Government Applications Catalogue Guide
                </Link>
              </li>
              <li>
                <Link to="/guides?guide=understanding-results" className="hover:text-teal-700 transition-colors">
                  Understanding Audit Outcomes Guide
                </Link>
              </li>
              <li>
                <Link to="/guides?guide=account-access" className="hover:text-teal-700 transition-colors">
                  Account Roles &amp; Security Guide
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>
            &copy; {currentYear} TypeNull. All rights reserved.
          </p>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-mono text-[11px] font-semibold border border-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Verified Regulatory Engine Active
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
export default Footer;
