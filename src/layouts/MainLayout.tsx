import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);

  const scrollToFeatures = () => {
    const featuresElement = document.getElementById('features');
    if (featuresElement) {
      featuresElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleGetStarted = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <Navbar onGetStartedClick={handleGetStarted} />
      
      <main className="flex-grow">
        {children({ openGetStartedModal: handleGetStarted, scrollToFeatures })}
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
