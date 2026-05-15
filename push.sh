#!/bin/bash

# Check if commit message is provided
if [ -z "$1" ]; then
  echo "Usage: ./push.sh \"your commit message\""
  exit 1
fi

# Git commands
git add .
git commit -m "testing: $1"
git push origin main