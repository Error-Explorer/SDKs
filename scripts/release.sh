#!/bin/bash
set -e

# ============================================================
# Error Explorer SDK Release Script
# Usage: ./scripts/release.sh <version> [sdk1,sdk2,...|all]
# Example: ./scripts/release.sh 1.0.0 all
# Example: ./scripts/release.sh 1.0.1 browser,node,react
# ============================================================

VERSION=$1
SDKS=${2:-all}

if [ -z "$VERSION" ]; then
    echo "Usage: ./scripts/release.sh <version> [sdks]"
    echo "Example: ./scripts/release.sh 1.0.0 all"
    exit 1
fi

# Validate version format
if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9]+)?$ ]]; then
    echo "Error: Invalid version format. Use semver (e.g., 1.0.0 or 1.0.0-beta.1)"
    exit 1
fi

echo "============================================"
echo "Error Explorer SDK Release v$VERSION"
echo "SDKs: $SDKS"
echo "============================================"

should_release() {
    local sdk=$1
    if [ "$SDKS" = "all" ]; then
        return 0
    fi
    if [[ ",$SDKS," == *",$sdk,"* ]]; then
        return 0
    fi
    return 1
}

# Update version in package.json
update_npm_version() {
    local dir=$1
    local name=$2
    if should_release "$name"; then
        echo "📦 Updating $name to v$VERSION..."
        cd "$dir"
        npm version "$VERSION" --no-git-tag-version
        cd - > /dev/null
    fi
}

# Update version in pyproject.toml
update_python_version() {
    local dir=$1
    local name=$2
    if should_release "$name"; then
        echo "🐍 Updating $name to v$VERSION..."
        sed -i "s/version = \".*\"/version = \"$VERSION\"/" "$dir/pyproject.toml"
    fi
}

# Update version in composer.json
update_php_version() {
    local dir=$1
    local name=$2
    if should_release "$name"; then
        echo "🐘 Updating $name to v$VERSION..."
        cd "$dir"
        # Use jq if available, otherwise sed
        if command -v jq &> /dev/null; then
            jq ".version = \"$VERSION\"" composer.json > tmp.json && mv tmp.json composer.json
        else
            sed -i "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" composer.json
        fi
        cd - > /dev/null
    fi
}

# JavaScript SDKs
update_npm_version "core/browser" "browser"
update_npm_version "core/node" "node"
update_npm_version "frameworks/react" "react"
update_npm_version "frameworks/vue" "vue"

# PHP SDKs
update_php_version "core/php" "php"
update_php_version "frameworks/symfony" "symfony"
update_php_version "frameworks/laravel" "laravel"

# Python SDKs
update_python_version "core/python" "python"
update_python_version "frameworks/django" "django"
update_python_version "frameworks/flask" "flask"
update_python_version "frameworks/fastapi" "fastapi"

echo ""
echo "✅ Version updated to $VERSION"
echo ""
echo "Next steps:"
echo "  1. Review changes: git diff"
echo "  2. Commit: git add -A && git commit -m 'chore: release v$VERSION'"
echo "  3. Tag: git tag -a v$VERSION -m 'Release v$VERSION'"
echo "  4. Push: git push origin main --tags"
echo "  5. GitHub Actions will publish to npm/packagist/pypi"
echo ""
