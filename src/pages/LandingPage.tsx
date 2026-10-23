import React from 'react';
import { Hero } from '../components/landing/Hero';
import { FeaturesOverview } from '../components/landing/FeaturesOverview';

interface LandingPageProps {
  onGetStartedClick: () => void;
  onExploreFeaturesClick: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGetStartedClick,
  onExploreFeaturesClick,
}) => {
  return (
    <>
      <Hero
        onGetStartedClick={onGetStartedClick}
        onExploreFeaturesClick={onExploreFeaturesClick}
      />
      <FeaturesOverview />
    </>
  );
};
