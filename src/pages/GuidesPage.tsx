import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  Search,
  Info,
  ShieldCheck,
  Compass,
  FileCheck2,
  Scale,
  UserCheck,
  Play,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { PRODUCT_GUIDES, ProductGuide } from '../components/guides/UserGuidesData';
import { InteractiveWalkthrough } from '../components/guides/InteractiveWalkthrough';

export const GuidesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const guideParam = searchParams.get('guide');
  const initialGuideId =
    guideParam && PRODUCT_GUIDES.some((g) => g.id === guideParam)
      ? guideParam
      : PRODUCT_GUIDES[0].id;

  const [selectedGuideId, setSelectedGuideId] = useState<string>(initialGuideId);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isWalkthroughOpen, setIsWalkthroughOpen] = useState<boolean>(false);

  useEffect(() => {
    const param = searchParams.get('guide');
    if (param && PRODUCT_GUIDES.some((g) => g.id === param)) {
      setSelectedGuideId(param);
    }
  }, [searchParams]);

  const handleSelectGuide = (id: string) => {
    setSelectedGuideId(id);
    setSearchParams({ guide: id });
  };

  const filteredGuides = useMemo(() => {
    if (!searchQuery.trim()) return PRODUCT_GUIDES;
    const q = searchQuery.toLowerCase();
    return PRODUCT_GUIDES.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.summary.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const activeGuide: ProductGuide =
    PRODUCT_GUIDES.find((g) => g.id === selectedGuideId) || PRODUCT_GUIDES[0];

  const getGuideIcon = (iconName: string) => {
    switch (iconName) {
      case 'FileCheck2':
        return FileCheck2;
      case 'Shield':
        return ShieldCheck;
      case 'Compass':
        return Compass;
      case 'Scale':
        return Scale;
      case 'UserCheck':
        return UserCheck;
      default:
        return BookOpen;
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Page Header */}
      <PageHeader
        title="Help &amp; Product Guides"
        description="Comprehensive documentation, regulatory compliance checklists, and operating instructions for applicants and institutional officers."
        action={
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsWalkthroughOpen(true)}
              leftIcon={<Play className="w-4 h-4 fill-current" />}
            >
              Start Product Tour
            </Button>
          </div>
        }
      />

      {/* Search & Filter Bar */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search guides, rules, outcomes, or workflows..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium self-start sm:self-auto">
          <span>Showing {filteredGuides.length} of {PRODUCT_GUIDES.length} Product Guides</span>
        </div>
      </div>

      {/* Main Guides Layout: Sidebar List + Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Guides Navigation List */}
        <div className="lg:col-span-4 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
            Available Guides
          </h2>

          <div className="space-y-2">
            {filteredGuides.map((guide) => {
              const Icon = getGuideIcon(guide.iconName);
              const isSelected = guide.id === activeGuide.id;

              return (
                <button
                  key={guide.id}
                  type="button"
                  onClick={() => handleSelectGuide(guide.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    isSelected
                      ? 'border-teal-600 bg-teal-50/50 shadow-xs ring-1 ring-teal-600'
                      : 'border-slate-200 bg-white hover:bg-slate-50/80 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        isSelected
                          ? 'bg-teal-200 text-teal-900'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {guide.badge}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {guide.readTime}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isSelected
                          ? 'bg-teal-700 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-bold text-slate-900 leading-snug">
                      {guide.title}
                    </h3>
                  </div>

                  <p className="text-[11px] text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                    {guide.summary}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Guide Detailed Content */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-8">
          {/* Guide Header Banner */}
          <div className="border-b border-slate-100 pb-6 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-900 border border-teal-200">
                {activeGuide.badge}
              </span>
              <span className="text-xs text-slate-400">&bull;</span>
              <span className="text-xs text-slate-500 font-medium">Category: {activeGuide.category}</span>
              <span className="text-xs text-slate-400">&bull;</span>
              <span className="text-xs text-slate-500 font-mono">{activeGuide.readTime}</span>
            </div>

            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">
              {activeGuide.title}
            </h1>

            <p className="text-sm text-slate-600 leading-relaxed font-normal">
              {activeGuide.summary}
            </p>
          </div>

          {/* Guide Sections */}
          <div className="space-y-8">
            {activeGuide.sections.map((section, sIdx) => (
              <section key={sIdx} className="space-y-4">
                <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
                  {section.heading}
                </h2>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {section.content}
                </p>

                {/* Sub-steps if present */}
                {section.steps && section.steps.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {section.steps.map((st, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold text-slate-900">{st.title}</h3>
                          {st.badge && (
                            <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                              {st.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          {st.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Important Notice Callout if present */}
                {section.importantNotice && (
                  <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-950 text-xs flex items-start gap-3">
                    <Info className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                    <p className="leading-relaxed text-[11px] text-amber-900 font-medium">
                      {section.importantNotice}
                    </p>
                  </div>
                )}
              </section>
            ))}
          </div>

          {/* Guide Footer Action */}
          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-slate-500">
              Need more assistance with statutory requirements?
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsWalkthroughOpen(true)}
              leftIcon={<Play className="w-3.5 h-3.5 fill-current" />}
            >
              Replay Product Tour
            </Button>
          </div>
        </div>
      </div>

      {/* Interactive Walkthrough Modal */}
      <InteractiveWalkthrough
        isOpen={isWalkthroughOpen}
        onClose={() => setIsWalkthroughOpen(false)}
      />
    </div>
  );
};
export default GuidesPage;
