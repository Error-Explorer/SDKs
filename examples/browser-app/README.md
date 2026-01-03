# Browser SDK Example

Interactive demo page for the `@error-explorer/browser` SDK.

## Quick Start

### Option 1: Open directly
Simply open `index.html` in your browser:

```bash
# From the examples/browser-app directory
open index.html
# or
xdg-open index.html  # Linux
start index.html     # Windows
```

### Option 2: Local server (recommended)
Using a local server avoids CORS issues and provides a more realistic environment:

```bash
# Using Python
python -m http.server 8080

# Using Node.js (npx)
npx serve .

# Using PHP
php -S localhost:8080
```

Then open http://localhost:8080 in your browser.

## Features Demonstrated

### Error Triggers
- **ReferenceError** - Accessing undefined variable
- **TypeError** - Calling method on null
- **SyntaxError** - Invalid JavaScript via eval
- **RangeError** - Invalid array length
- **Custom Error** - User-defined error class
- **Async Error** - Error in setTimeout
- **Unhandled Promise** - Rejected promise without catch

### Manual Capture
- `captureException()` - Capture caught exceptions
- `captureMessage()` - Capture custom messages with severity

### User Context
- Set user information (id, email, name, custom fields)
- Clear user context

### Breadcrumbs
- Add custom breadcrumbs for navigation, UI, HTTP, console

### Network Errors
- Fetch 404 errors
- Fetch timeout (aborted)
- XHR errors

## Demo Mode

This example runs in **demo mode** - errors are captured but not sent to the server.
The `beforeSend` callback returns `null` to prevent actual transmission.

To enable real error sending:

1. Update the DSN in `index.html`:
```javascript
ErrorExplorer.init({
    dsn: 'https://YOUR_KEY@api.error-explorer.com/YOUR_PROJECT',
    // ...
    beforeSend: function(event) {
        return event; // Return event to send it
    }
});
```

2. Or remove the `beforeSend` callback entirely.

## SDK Integration

### Via CDN (UMD)
```html
<script src="https://cdn.error-explorer.com/browser/1.0.0/error-explorer.min.js"></script>
<script>
    ErrorExplorer.init({
        dsn: 'https://key@api.error-explorer.com/project'
    });
</script>
```

### Via npm (ESM)
```bash
npm install @error-explorer/browser
```

```javascript
import { init, captureException } from '@error-explorer/browser';

init({
    dsn: 'https://key@api.error-explorer.com/project'
});
```

## Activity Log

The demo includes an activity log showing:
- SDK initialization status
- Triggered errors
- Captured events
- User context changes
- Added breadcrumbs

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

The SDK uses:
- `sendBeacon()` for reliable error transmission
- `fetch()` with `keepalive` as fallback
- `XMLHttpRequest` as final fallback
