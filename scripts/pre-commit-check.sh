#!/bin/sh
set -e
npm run check
git diff --cached --check
