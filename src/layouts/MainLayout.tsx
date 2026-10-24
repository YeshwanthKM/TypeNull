import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { InteractiveWalkthrough } from '../components/guides/InteractiveWalkthrough';

interface MainLayoutProps {
  children: (props: {
    openGetStartedModal: () => void;
    scrollToFeatures: () => void;
  }) => React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const [walkthroughOpen, setWalkthroughOpen] = useState(false);

  const scrollToFeatures = () => {
    const featuresElement = document.getElementById('capabilities');
    if (featuresElement) {
      featuresElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleGetStarted = () => {
    navigate('/applications/explore');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <Navbar
        onGetStartedClick={handleGetStarted}
        onStartTourClick={() => setWalkthroughOpen(true)}
      />

      <main className="flex-grow">
        {children({ openGetStartedModal: handleGetStarted, scrollToFeatures })}
      </main>

      <Footer />

      <InteractiveWalkthrough
        isOpen={walkthroughOpen}
        onClose={() => setWalkthroughOpen(false)}
      />
    </div>
  );
};
export default MainLayout;
