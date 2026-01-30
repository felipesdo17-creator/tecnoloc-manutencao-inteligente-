import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Tenta renderizar o app, mas avisa no console se houver erro crítico
const rootElement = document.getElementById('root');

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error("Erro Crítico: Não foi encontrado o elemento 'root' no index.html");
}