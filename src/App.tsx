import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { MainLayout } from './layouts/MainLayout';
import { AppLayout } from './layouts/AppLayout';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { NewApplicationPage } from './pages/NewApplicationPage';
import { ApplicationDetailsPlaceholder } from './pages/ApplicationDetailsPlaceholder';
import { SettingsPage } from './pages/SettingsPage';
import { OfficerWorkspacePage } from './pages/OfficerWorkspacePage';
import { AdminWorkspacePage } from './pages/AdminWorkspacePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { NotFoundPage } from './pages/NotFoundPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
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

          {/* Authentication Pages */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Applicant Pre-Validation Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['applicant']}>
                <AppLayout>
                  <DashboardPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/applications/new"
            element={
              <ProtectedRoute allowedRoles={['applicant']}>
                <AppLayout>
                  <NewApplicationPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/applications/:id"
            element={
              <ProtectedRoute allowedRoles={['applicant', 'officer', 'administrator']}>
                <AppLayout>
                  <ApplicationDetailsPlaceholder />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute allowedRoles={['applicant', 'officer', 'administrator']}>
                <AppLayout>
                  <SettingsPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Organisation Bulk Application Screening (Officer) */}
          <Route
            path="/officer"
            element={
              <ProtectedRoute allowedRoles={['officer']}>
                <AppLayout>
                  <OfficerWorkspacePage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Administration Console (Administrator) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['administrator']}>
                <AppLayout>
                  <AdminWorkspacePage />
                </AppLayout>
              </ProtectedRoute>
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
    </AuthProvider>
  );
};

export default App;
