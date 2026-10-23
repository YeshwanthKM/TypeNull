import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { AppLayout } from './layouts/AppLayout';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { NewApplicationPage } from './pages/NewApplicationPage';
import { ApplicationDetailsPlaceholder } from './pages/ApplicationDetailsPlaceholder';
import { SettingsPage } from './pages/SettingsPage';
import { NotFoundPage } from './pages/NotFoundPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Landing Presentation */}
        <Route
          path="/"
          element={
            <MainLayout>
              {({ openGetStartedModal, scrollToFeatures }) => (
                <LandingPage
                  onGetStartedClick={openGetStartedModal}
                  onExploreFeaturesClick={scrollToFeatures}
                />
              )}
            </MainLayout>
          }
        />

        {/* Dashboard Console */}
        <Route
          path="/dashboard"
          element={
            <AppLayout>
              <DashboardPage />
            </AppLayout>
          }
        />

        {/* New Application Intake Form */}
        <Route
          path="/applications/new"
          element={
            <AppLayout>
              <NewApplicationPage />
            </AppLayout>
          }
        />

        {/* Application Details & Review Placeholder */}
        <Route
          path="/applications/:id"
          element={
            <AppLayout>
              <ApplicationDetailsPlaceholder />
            </AppLayout>
          }
        />

        {/* Settings & System Governance Placeholder */}
        <Route
          path="/settings"
          element={
            <AppLayout>
              <SettingsPage />
            </AppLayout>
          }
        />

        {/* 404 Route Fallback */}
        <Route
          path="*"
          element={
            <AppLayout>
              <NotFoundPage />
            </AppLayout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
