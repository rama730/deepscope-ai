#!/bin/bash
# Script to safely remove secrets from git history
# WARNING: This rewrites git history - coordinate with team before running

set -e

echo "🔴 WARNING: This script will rewrite git history!"
echo "All collaborators will need to re-clone the repository after this."
echo ""
read -p "Have you rotated the exposed credentials? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Please rotate credentials first. See SECURITY_REMEDIATION.md"
    exit 1
fi

read -p "Have you coordinated with your team? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Please coordinate with your team before rewriting history."
    exit 1
fi

echo "📦 Checking for git-filter-repo..."
if ! command -v git-filter-repo &> /dev/null; then
    echo "❌ git-filter-repo not found. Installing..."
    pip install git-filter-repo || {
        echo "❌ Failed to install git-filter-repo"
        echo "Install manually: pip install git-filter-repo"
        exit 1
    }
fi

echo "📋 Files to remove from history:"
echo "  - supabase/.temp/pooler-url"
echo "  - Any other .temp files"
echo ""

read -p "Continue with history cleanup? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Aborted."
    exit 1
fi

# Create a backup branch
echo "💾 Creating backup branch..."
git branch backup-before-history-cleanup-$(date +%Y%m%d-%H%M%S) || true

# Remove the file from all history
echo "🧹 Removing secrets from git history..."
git filter-repo --invert-paths --path supabase/.temp/pooler-url --force

# Also remove other temp files that might contain secrets
git filter-repo --invert-paths --path-glob 'supabase/.temp/*' --force || true
git filter-repo --invert-paths --path-glob 'nb/supabase/.temp/*' --force || true

echo ""
echo "✅ History cleanup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Verify the file is gone: git log --all --full-history -- supabase/.temp/pooler-url"
echo "2. Force push to remote: git push --force --all"
echo "3. Force push tags: git push --force --tags"
echo "4. Notify team to re-clone the repository"
echo ""
echo "⚠️  WARNING: After force pushing, all collaborators must:"
echo "   git fetch origin"
echo "   git reset --hard origin/main"

