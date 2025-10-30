# Git Workflow Guide - Simple & Practical

## Branch Structure

```
main (production) ← staging ← develop ← feature branches
```

## Daily Workflow

### Starting New Work

```bash
# 1. Always start from develop
git checkout develop
git pull origin develop

# 2. Create feature branch
git checkout -b feature/your-feature-name
# Examples:
# feature/invoice-templates
# bugfix/whatsapp-collection-name
# hotfix/payment-gateway-error
```

### While Working

```bash
# 1. Make changes
# (edit your files)

# 2. Save progress
git add .
git commit -m "feat: Add invoice template selector"

# 3. Push to remote (backup)
git push origin feature/your-feature-name
```

### Finishing Feature

```bash
# 1. Get latest develop changes
git checkout develop
git pull origin develop

# 2. Merge your feature
git checkout feature/your-feature-name
git merge develop  # Get latest changes
git checkout develop
git merge feature/your-feature-name

# 3. Push and cleanup
git push origin develop
git branch -d feature/your-feature-name  # Delete local
git push origin --delete feature/your-feature-name  # Delete remote
```

## Deploying

### To Development
```bash
git checkout develop
firebase use dev
firebase deploy
```

### To Staging (Testing)
```bash
git checkout staging
git merge develop
git push origin staging
firebase use staging
firebase deploy
```

### To Production (Live)
```bash
# Only after staging testing passes!
git checkout main
git merge staging
git push origin main
firebase use default
firebase deploy

# Tag the release
git tag -a v1.2.0 -m "Release: Amana WhatsApp improvements"
git push origin v1.2.0
```

## Quick Commands Cheat Sheet

```bash
# Check current branch
git branch

# See what changed
git status
git diff

# Undo uncommitted changes
git checkout -- filename.ts

# See commit history
git log --oneline

# Switch branches
git checkout develop
git checkout main

# Pull latest
git pull origin develop
```

## Commit Message Format

```bash
# Features
git commit -m "feat: Add voice note support to WhatsApp"

# Bug fixes
git commit -m "fix: Collection name mismatch in webhook"

# Documentation
git commit -m "docs: Update API documentation"

# Refactoring
git commit -m "refactor: Simplify invoice generation logic"

# Performance
git commit -m "perf: Optimize database queries"
```

## Rules

1. **Never commit directly to main** - Always use feature branches
2. **Test on develop first** - Make sure it works before staging
3. **Staging = final test** - Test everything here before production
4. **Tag releases** - Easy rollback if needed
5. **Pull before push** - Avoid conflicts

## Emergency Rollback

```bash
# If production breaks, rollback to last tag
git checkout main
git reset --hard v1.1.9  # Last working version
git push origin main --force  # ONLY IN EMERGENCY
firebase deploy
```

## That's It!

Keep it simple:
- Work on `feature/*` branches
- Merge to `develop` when done
- Test on `staging` before production
- Deploy to `main` when ready
