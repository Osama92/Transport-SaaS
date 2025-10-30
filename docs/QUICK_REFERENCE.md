# Quick Reference - Git Commands for Claude Code

## Simple Commands for You to Use

### Push Your Changes

Just say one of these to Claude Code:

- **"Push to main"** → Pushes to production
- **"Push to develop"** → Pushes to development
- **"Push to staging"** → Pushes to pre-production testing

Claude will automatically:
1. Switch to the right branch
2. Pull latest changes
3. Add all your changes
4. Create a commit message
5. Push to remote
6. Confirm success

### Deploy to Firebase

Just say:

- **"Deploy to production"** → Deploys main to live Firebase
- **"Deploy to dev"** → Deploys develop to dev Firebase
- **"Deploy to staging"** → Deploys staging to staging Firebase

### Check Status

Just say:

- **"Show git status"** → See what changed
- **"Show git log"** → See recent commits
- **"What branch am I on?"** → Check current branch

## Your Branch Structure

```
main (production) 🔴 Live customers use this
  ↑
staging (testing) 🟡 Test before going live
  ↑
develop (development) 🟢 Your daily work
  ↑
feature/* branches 💡 New features
```

## Development Flow (Simple)

### Daily Work
1. Work on code
2. Say: **"Push to develop"**
3. Test it on dev environment

### Ready for Testing
1. Say: **"Push to staging"**
2. Test everything thoroughly
3. Make sure it all works

### Ready for Customers
1. Say: **"Push to main"**
2. Say: **"Deploy to production"**
3. Your customers see the changes!

## Safety Net

- ✅ Claude will ALWAYS check before pushing
- ✅ Claude will ALWAYS show you what changed
- ✅ Claude will ALWAYS confirm success
- ✅ You can rollback if something breaks

## If Something Breaks

Just say: **"Rollback production"** or **"Undo last commit"**

Claude will fix it immediately.

## That's It!

You don't need to know Git commands. Just tell Claude what you want:
- "Push to main"
- "Push to develop"
- "Deploy to production"

Claude handles everything safely.
