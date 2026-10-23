import React, { useState } from 'react';
import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { PhaseModal } from '../components/common/PhaseModal';

interface MainLayoutProps {
  children: (props: {
    openGetStartedModal: () => void;
    scrollToFeatures: () => void;
  }) => React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [modalOpen, setModalOpen] = useState(false);

  const scrollToFeatures = () => {
    const featuresElement = document.getElementById('features');
    if (featuresElement) {
      featuresElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const openGetStartedModal = () => {
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <Navbar onGetStartedClick={openGetStartedModal} />
      
      <main className="flex-grow">
        {children({ openGetStartedModal, scrollToFeatures })}
      </main>

      <Footer />

      <PhaseModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onExploreFeatures={scrollToFeatures}
      />
    </div>
  );
};
