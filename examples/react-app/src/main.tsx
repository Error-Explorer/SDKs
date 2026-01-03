/**
 * React App with Error Explorer Integration
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ErrorExplorerProvider, ErrorBoundary } from '@error-explorer/react';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorExplorerProvider
      options={{
        token: 'ee_e513876a065d185931592689e7b5bc59c4e412b53261b233e62ffd5e05c4',
        hmacSecret: 'dbaffa598398fa4d34bdbdfc3474bc0b424748b23310fe64cfc42d5fd73ae234',
        project: 'projet-de-test-react-js',
        environment: 'development',
        release: '1.0.0',
        debug: true,
        endpoint: 'http://error-explorer.localhost/api/v1/webhook',
      }}
    >
      <BrowserRouter>
        <ErrorBoundary
          onError={(error, errorInfo) => {
            console.log('[ErrorExplorer] Global error caught:', error.message);
          }}
        >
          <App />
        </ErrorBoundary>
      </BrowserRouter>
    </ErrorExplorerProvider>
  </React.StrictMode>
);

console.log('[React App] Error Explorer initialized');
