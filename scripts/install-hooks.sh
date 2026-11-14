#!/bin/bash

# Install pre-commit hook for Svelte and TypeScript checking

# Create hooks directory if it doesn't exist
mkdir -p .git/hooks

# Copy the pre-commit hook
cp scripts/pre-commit-check.sh .git/hooks/pre-commit

# Make it executable
chmod +x .git/hooks/pre-commit

echo "✅ Pre-commit hook installed successfully."
echo "Svelte and TypeScript checking will run automatically before each commit."
