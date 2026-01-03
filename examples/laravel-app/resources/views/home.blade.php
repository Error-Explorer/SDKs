<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error Explorer Laravel SDK Test</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 40px 20px;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
        }
        h1 {
            color: white;
            text-align: center;
            margin-bottom: 10px;
            font-size: 2.5rem;
        }
        .subtitle {
            color: rgba(255,255,255,0.8);
            text-align: center;
            margin-bottom: 40px;
        }
        .card {
            background: white;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 20px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }
        .card h2 {
            color: #333;
            margin-bottom: 20px;
            font-size: 1.3rem;
        }
        .test-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }
        .test-btn {
            display: block;
            padding: 15px 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            text-align: center;
            font-weight: 500;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .test-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
        }
        .test-btn.success {
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
        }
        .test-btn.warning {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }
        .info {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin-top: 20px;
        }
        .info h3 {
            color: #333;
            margin-bottom: 10px;
            font-size: 1rem;
        }
        .info code {
            display: block;
            background: #2d3748;
            color: #68d391;
            padding: 15px;
            border-radius: 6px;
            font-size: 0.9rem;
            overflow-x: auto;
        }
        .status {
            display: inline-block;
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 600;
        }
        .status.active {
            background: #c6f6d5;
            color: #22543d;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Error Explorer</h1>
        <p class="subtitle">Laravel SDK Test Application</p>

        <div class="card">
            <h2>SDK Status: <span class="status active">Active</span></h2>
            <div class="info">
                <h3>Configuration</h3>
                <code>
Environment: {{ config('error-explorer.environment', 'production') }}<br>
Release: {{ config('error-explorer.release', '1.0.0') }}<br>
HMAC: {{ config('error-explorer.security.hmac_enabled') ? 'Enabled' : 'Disabled' }}
                </code>
            </div>
        </div>

        <div class="card">
            <h2>Exception Tests</h2>
            <div class="test-grid">
                <a href="{{ route('test.exception') }}" class="test-btn">
                    Basic Exception
                </a>
                <a href="{{ route('test.breadcrumbs') }}" class="test-btn">
                    With Breadcrumbs
                </a>
                <a href="{{ route('test.user-context') }}" class="test-btn">
                    With User Context
                </a>
                <a href="{{ route('test.php-error') }}" class="test-btn warning">
                    PHP Error
                </a>
            </div>
        </div>

        <div class="card">
            <h2>Manual Capture Tests</h2>
            <div class="test-grid">
                <a href="{{ route('test.manual-capture') }}" class="test-btn success">
                    Manual Capture
                </a>
                <a href="{{ route('test.capture-message') }}" class="test-btn success">
                    Capture Message
                </a>
            </div>
        </div>

        <div class="card">
            <h2>Usage Examples</h2>
            <div class="info">
                <h3>Add Breadcrumb</h3>
                <code>ErrorExplorer::addBreadcrumb([
    'type' => 'user-action',
    'message' => 'User clicked button',
    'data' => ['button_id' => 'checkout']
]);</code>
            </div>
            <div class="info" style="margin-top: 15px;">
                <h3>Set User Context</h3>
                <code>ErrorExplorer::setUser([
    'id' => 'user_123',
    'email' => 'user@example.com',
    'plan' => 'pro'
]);</code>
            </div>
            <div class="info" style="margin-top: 15px;">
                <h3>Capture Exception Manually</h3>
                <code>try {
    $this->riskyOperation();
} catch (\Exception $e) {
    ErrorExplorer::captureException($e, [
        'tags' => ['module' => 'checkout'],
        'extra' => ['orderId' => '12345']
    ]);
}</code>
            </div>
        </div>
    </div>
</body>
</html>
