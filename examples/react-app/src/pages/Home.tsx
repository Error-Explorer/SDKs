/**
 * Home Page
 */

import { useErrorExplorer, useComponentBreadcrumbs } from '@error-explorer/react';

function Home() {
  useComponentBreadcrumbs('Home');
  const { addBreadcrumb } = useErrorExplorer();

  const handleClick = () => {
    addBreadcrumb({
      type: 'user-action',
      category: 'button',
      message: 'User clicked welcome button',
      level: 'info',
    });
    alert('Welcome! Check the console for breadcrumb.');
  };

  return (
    <div>
      <h2>Welcome to Error Explorer React Demo</h2>
      <p>
        This example demonstrates the Error Explorer SDK integration with React.
      </p>
      <ul>
        <li>Automatic error boundary integration</li>
        <li>React hooks for error handling</li>
        <li>User context tracking</li>
        <li>Navigation breadcrumbs with React Router</li>
        <li>Component lifecycle tracking</li>
      </ul>
      <button onClick={handleClick} className="btn-info" style={{ padding: '10px 20px', marginTop: '20px' }}>
        Add Breadcrumb
      </button>
    </div>
  );
}

export default Home;
