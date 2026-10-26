import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { MainLayout } from './layouts/MainLayout';
import { AppLayout } from './layouts/AppLayout';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { NewApplicationPage } from './pages/NewApplicationPage';
import { GovernmentApplicationsCataloguePage } from './pages/GovernmentApplicationsCataloguePage';
import { ApplicationDetailsPlaceholder } from './pages/ApplicationDetailsPlaceholder';
import { SettingsPage } from './pages/SettingsPage';
import { OfficerWorkspacePage } from './pages/OfficerWorkspacePage';
import { AdminWorkspacePage } from './pages/AdminWorkspacePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { GuidesPage } from './pages/GuidesPage';
import { RulebookPage } from './pages/RulebookPage';
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

          {/* User Guides & Help */}
          <Route
            path="/guides"
            element={
              <MainLayout>
                {() => <GuidesPage />}
              </MainLayout>
            }
          />

          {/* AICTE Regulatory Rulebook & Compliance Guide */}
          <Route
            path="/rulebook"
            element={
              <AppLayout>
                <RulebookPage />
              </AppLayout>
            }
          />

          {/* Authentication Pages */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Institution Pre-Validation & EoA Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['institution', 'applicant']}>
                <AppLayout>
                  <DashboardPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/applications/explore"
            element={
              <ProtectedRoute allowedRoles={['institution', 'applicant', 'officer', 'administrator']}>
                <AppLayout>
                  <GovernmentApplicationsCataloguePage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/applications/catalogue"
            element={
              <ProtectedRoute allowedRoles={['institution', 'applicant', 'officer', 'administrator']}>
                <AppLayout>
                  <GovernmentApplicationsCataloguePage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/applications/new"
            element={
              <ProtectedRoute allowedRoles={['institution', 'applicant']}>
                <AppLayout>
                  <NewApplicationPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/applications/:id"
            element={
              <ProtectedRoute allowedRoles={['institution', 'applicant', 'officer', 'administrator']}>
                <AppLayout>
                  <ApplicationDetailsPlaceholder />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute allowedRoles={['institution', 'applicant', 'officer', 'administrator']}>
                <AppLayout>
                  <SettingsPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* AICTE Officer Workspace (Scrutiny & Institution Registration Verification) */}
          <Route
            path="/officer"
            element={
              <ProtectedRoute allowedRoles={['officer', 'administrator']}>
                <AppLayout>
                  <OfficerWorkspacePage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Administration Console */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['administrator', 'officer']}>
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
