import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { LandingPage } from './pages/LandingPage';
import { NotFoundPage } from './pages/NotFoundPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <MainLayout>
        {({ openGetStartedModal, scrollToFeatures }) => (
          <Routes>
            <Route
              path="/"
              element={
                <LandingPage
                  onGetStartedClick={openGetStartedModal}
                  onExploreFeaturesClick={scrollToFeatures}
                />
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        )}
      </MainLayout>
    </BrowserRouter>
  );
};

export default App;
