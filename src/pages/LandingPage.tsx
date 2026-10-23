import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, getRoleRedirectPath } from '../contexts/AuthContext';
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
  const { user, role, isLoading } = useAuth();
  const navigate = useNavigate();

  // If user just arrived from email confirmation with tokens in URL, navigate directly to authorized workspace
  useEffect(() => {
    if (user && !isLoading) {
      if (window.location.hash.includes('access_token') || window.location.hash.includes('type=signup')) {
        const dest = getRoleRedirectPath(role);
        navigate(dest, { replace: true });
      }
    }
  }, [user, role, isLoading, navigate]);

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
