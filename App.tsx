
import React, { Suspense, lazy } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { LoadingOverlay } from './components/UI.tsx';

// Lazy loading das páginas para reduzir o tamanho do bundle inicial
const Home = lazy(() => import('./pages/Home.tsx'));
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
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/diagnostico" element={<DiagnosticPage />} />
            <Route path="/manuais" element={<ManualsPage />} />
            <Route path="/historico" element={<HistoryPage />} />
            <Route path="/checklist" element={<ChecklistPage />} />
          </Routes>
        </Suspense>
      </Router>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
};

export default App;
