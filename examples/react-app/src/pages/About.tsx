/**
 * About Page
 */

import { useComponentBreadcrumbs } from '@error-explorer/react';

function About() {
  useComponentBreadcrumbs('About');

  return (
    <div>
      <h2>About This Example</h2>
      <p>
        This is an example React application demonstrating the Error Explorer SDK
        integration.
      </p>
      <h3>Features Demonstrated</h3>
      <ul>
        <li>
          <strong>ErrorBoundary</strong> - Catches errors in component tree
        </li>
        <li>
          <strong>useErrorExplorer</strong> - Access to SDK methods
        </li>
        <li>
          <strong>useErrorHandler</strong> - Async error handling
        </li>
        <li>
          <strong>useUserContext</strong> - Set user information
        </li>
        <li>
          <strong>useActionTracker</strong> - Track user actions
        </li>
        <li>
          <strong>useComponentBreadcrumbs</strong> - Track component lifecycle
        </li>
        <li>
          <strong>Router Integration</strong> - Navigation breadcrumbs
        </li>
      </ul>
      <h3>SDK Configuration</h3>
      <pre style={{
        background: '#f5f5f5',
        padding: '15px',
        borderRadius: '4px',
        overflow: 'auto'
      }}>
{`<ErrorExplorerProvider
  options={{
    token: 'ee_xxx...',
    project: 'projet-de-test-react-js',
    environment: 'development',
    debug: true,
  }}
>
  <App />
</ErrorExplorerProvider>`}
      </pre>
    </div>
  );
}

export default About;
