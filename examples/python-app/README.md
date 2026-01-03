# Python Example Application

This example demonstrates the Error Explorer Python SDK integration.

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Update the configuration in `main.py`:
```python
client = ErrorExplorer.init({
    "token": "YOUR_ERROR_EXPLORER_TOKEN",
    "project": "your-project",
    "environment": "development",
    # ...
})
```

## Run

```bash
python main.py
```

## What this example demonstrates

1. **SDK Initialization** - Setting up the SDK with configuration options
2. **User Context** - Setting user information for error tracking
3. **Tags & Extra Data** - Adding metadata to errors
4. **Breadcrumbs** - Tracking user actions leading to errors
5. **Scope Management** - Isolating context changes
6. **Exception Capture** - Both automatic and manual error capture
7. **Safe Execution** - Wrapping risky operations

## Output

The application will:
- Initialize the SDK
- Set user context and tags
- Add breadcrumbs simulating user actions
- Capture various types of errors
- Demonstrate scope isolation
- Flush and close the SDK properly

Check your Error Explorer dashboard to see the captured events!
