import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useProfileCompletion } from './hooks/useProfileCompletion';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import EmailVerificationPage from './components/auth/EmailVerificationPage';
import ResendVerificationPage from './components/auth/ResendVerificationPage';
import ForgotPasswordPage from './components/auth/ForgotPasswordPage';
import ResetPasswordPage from './components/auth/ResetPasswordPage';
import UserDashboard from './components/dashboard/UserDashboard';
import AppLayout from './components/layout/AppLayout';
import { ProfileCompletionPage } from './pages/ProfileCompletionPage';
import { ProfileEditPage } from './pages/ProfileEditPage';
import { ProfilePublicPage } from './pages/ProfilePublicPage';
import BrowsingPage from './pages/BrowsingPage';
import { Header } from './components/layout/Header';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Composant pour vérifier la complétion du profil
const ProfileCheckWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isComplete, isLoading } = useProfileCompletion();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-25 to-rose-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-twilight/60">Vérification du profil...</p>
        </div>
      </div>
    );
  }
  
  if (!isComplete) {
    return <Navigate to="/complete-profile" replace />;
  }
  
  return <>{children}</>;
};

// Composant pour protéger les routes qui nécessitent une authentification
const ProtectedRoute: React.FC<{ children: React.ReactNode; requireCompleteProfile?: boolean }> = ({ 
  children, 
  requireCompleteProfile = false 
}) => {
  const { user, token } = useAuth();
  
  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }
  
  if (requireCompleteProfile) {
    return (
      <ProfileCheckWrapper>
        {children}
      </ProfileCheckWrapper>
    );
  }
  
  return <>{children}</>;
};

// Composant pour les routes publiques (rediriger si déjà connecté)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  
  if (user && token) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

const AppContent: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-25 to-rose-50">
      <Header />
      <Routes>
      {/* Routes publiques */}
      <Route path="/login" element={
        <PublicRoute>
          <div className="flex items-center justify-center px-4 pt-20 pb-8">
            <LoginForm onSwitchToRegister={() => window.location.href = '/register'} />
          </div>
        </PublicRoute>
      } />
      
      <Route path="/register" element={
        <PublicRoute>
          <div className="flex items-center justify-center px-4 pt-20 pb-8">
            <RegisterForm onSwitchToLogin={() => window.location.href = '/login'} />
          </div>
        </PublicRoute>
      } />
      
      <Route path="/verify-email/:token" element={<EmailVerificationPage />} />
      <Route path="/resend-verification" element={<ResendVerificationPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      
      {/* Routes protégées - Complétion de profil */}
      <Route path="/complete-profile" element={
        <ProtectedRoute>
          <ProfileCompletionPage />
        </ProtectedRoute>
      } />
      
      {/* Routes protégées - Profil */}
      <Route path="/profile-edit" element={
        <ProtectedRoute requireCompleteProfile={true}>
          <ProfileEditPage />
        </ProtectedRoute>
      } />
      
      {/* Page de profil public (mon profil ou celui d'un autre utilisateur) */}
      <Route path="/profile" element={
        <ProtectedRoute requireCompleteProfile={true}>
          <ProfilePublicPage />
        </ProtectedRoute>
      } />
      
      <Route path="/profile/:userId" element={
        <ProtectedRoute requireCompleteProfile={true}>
          <ProfilePublicPage />
        </ProtectedRoute>
      } />
      
      {/* Routes protégées - Dashboard */}
      <Route path="/dashboard" element={
        <ProtectedRoute requireCompleteProfile={true}>
          <AppLayout>
            <UserDashboard />
          </AppLayout>
        </ProtectedRoute>
      } />
      
      {/* Routes protégées - Découverte */}
      <Route path="/browsing" element={
        <ProtectedRoute requireCompleteProfile={true}>
          <AppLayout>
            <BrowsingPage />
          </AppLayout>
        </ProtectedRoute>
      } />
      
      {/* Redirection par défaut */}
      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <Suspense fallback={<div className="loading-screen">Chargement...</div>}>
          <AppContent />
        </Suspense>
        <ToastContainer
          position="bottom-center"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </AuthProvider>
    </Router>
  );
};

export default App;
