/**
 * Main App Component
 */

import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useUserContext } from '@error-explorer/react';
import { useRouterBreadcrumbs } from '@error-explorer/react/router';
import Home from './pages/Home';
import About from './pages/About';
import ErrorTest from './pages/ErrorTest';
import './App.css';

function App() {
  const location = useLocation();

  // Set user context for error tracking (id must be UUID or integer)
  useUserContext({
    id: '456',
    email: 'demo@react-example.com',
    name: 'React Demo User',
  });

  // Track navigation events
  useRouterBreadcrumbs(location, {
    trackNavigation: true,
    trackParams: false,
    trackQuery: false,
  });

  return (
    <div className="app">
      <header className="header">
        <h1>Error Explorer - React Example</h1>
        <nav>
          <Link to="/">Home</Link>
          <Link to="/about">About</Link>
          <Link to="/error-test">Error Test</Link>
        </nav>
      </header>

      <main className="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/error-test" element={<ErrorTest />} />
        </Routes>
      </main>

      <footer className="footer">
        <p>React 18 + Error Explorer SDK Example</p>
      </footer>
    </div>
  );
}

export default App;
