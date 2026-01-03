# Contributing to Error Explorer SDKs

Thank you for your interest in contributing to Error Explorer SDKs!

## Development Setup

### Prerequisites

- Node.js 20+
- PHP 8.1+
- Python 3.9+
- Composer
- npm

### Clone and Install

```bash
git clone https://github.com/Error-Explorer/sdks.git
cd sdks

# JavaScript SDKs
cd core/browser && npm install
cd ../node && npm install
cd ../../frameworks/react && npm install
cd ../vue && npm install

# PHP SDKs
cd ../../core/php && composer install
cd ../../frameworks/symfony && composer install
cd ../laravel && composer install

# Python SDKs
cd ../../core/python && pip install -e ".[dev]"
cd ../../frameworks/django && pip install -e ".[dev]"
cd ../flask && pip install -e ".[dev]"
cd ../fastapi && pip install -e ".[dev]"
```

## Running Tests

### JavaScript
```bash
cd core/browser && npm test
cd core/node && npm test
cd frameworks/react && npm test
cd frameworks/vue && npm test
```

### PHP
```bash
cd core/php && vendor/bin/phpunit
cd frameworks/symfony && vendor/bin/phpunit
cd frameworks/laravel && vendor/bin/phpunit
```

### Python
```bash
cd core/python && pytest tests/ -v
cd frameworks/django && pytest tests/ -v
cd frameworks/flask && pytest tests/ -v
cd frameworks/fastapi && pytest tests/ -v
```

## Coding Standards

### JavaScript/TypeScript
- Use TypeScript for all new code
- Follow ESLint configuration
- Use Prettier for formatting

### PHP
- Follow PSR-12 coding standard
- Use PHPStan for static analysis
- Add PHPDoc blocks for public methods

### Python
- Follow PEP 8
- Use type hints
- Use Black for formatting
- Use mypy for type checking

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for your changes
5. Ensure all tests pass
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to your branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## Commit Messages

Follow conventional commits:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `test:` Adding tests
- `refactor:` Code refactoring
- `chore:` Maintenance tasks

Example: `feat(react): add useErrorExplorer hook`

## Questions?

Open an issue or reach out at support@error-explorer.com
