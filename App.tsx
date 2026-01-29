
import React, { Suspense, lazy } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { LoadingOverlay } from './components/UI.tsx';
import { ProtectedRoute } from './components/ProtectedRoute.tsx';

// Lazy loading das páginas
const Home = lazy(() => import('./pages/Home.tsx'));
const AuthPage = lazy(() => import('./pages/AuthPage.tsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.tsx'));
const DiagnosticPage = lazy(() => import('./pages/DiagnosticPage.tsx'));
const ManualsPage = lazy(() => import('./pages/ManualsPage.tsx'));
const HistoryPage = lazy(() => import('./pages/HistoryPage.tsx'));
const ChecklistPage = lazy(() => import('./pages/ChecklistPage.tsx'));

const queryClient = new QueryClient();

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Suspense fallback={<LoadingOverlay />}>
          <Routes>
            <Route path="/login" element={<AuthPage />} />
            
            {/* Fix: Passing children as a prop to ProtectedRoute to resolve TypeScript error about missing children in strict environments */}
            <Route path="/" element={
              <ProtectedRoute children={<Home />} />
            } />
            
            <Route path="/dashboard" element={
              <ProtectedRoute children={<Dashboard />} />
            } />
            
            <Route path="/diagnostico" element={
              <ProtectedRoute children={<DiagnosticPage />} />
            } />
            
            <Route path="/manuais" element={
              <ProtectedRoute children={<ManualsPage />} />
            } />
            
            <Route path="/historico" element={
              <ProtectedRoute children={<HistoryPage />} />
            } />
            
            <Route path="/checklist" element={
              <ProtectedRoute children={<ChecklistPage />} />
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Router>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
};

export default App;
