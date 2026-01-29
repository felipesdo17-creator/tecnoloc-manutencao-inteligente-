
import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import DiagnosticPage from './pages/DiagnosticPage';
import ManualsPage from './pages/ManualsPage';
import HistoryPage from './pages/HistoryPage';
import ChecklistPage from './pages/ChecklistPage';

const queryClient = new QueryClient();

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/diagnostico" element={<DiagnosticPage />} />
          <Route path="/manuais" element={<ManualsPage />} />
          <Route path="/historico" element={<HistoryPage />} />
          <Route path="/checklist" element={<ChecklistPage />} />
        </Routes>
      </Router>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
};

export default App;
