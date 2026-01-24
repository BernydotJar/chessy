# GitHub Repository Setup Instructions

## Quick Setup (5 minutes)

Follow these steps to push the GlassChess project to GitHub:

### Step 1: Create a New Repository on GitHub

1. Go to [github.com/new](https://github.com/new)
2. **Repository name**: `glasschess`
3. **Description**: A beautiful, free chess platform with glassmorphism design
4. **Visibility**: Choose Public or Private
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. Click **Create repository**

### Step 2: Initialize Git and Push (Run these commands)

```bash
# Navigate to the project directory
cd glasschess

# Initialize git repository
git init

# Add all files to staging
git add .

# Create initial commit
git commit -m "feat: initial commit - GlassChess MVP with glassmorphism UI"

# Add your GitHub repository as remote (replace with your username)
git remote add origin https://github.com/YOUR_USERNAME/glasschess.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

### Step 3: Verify Upload

Go to your repository URL: `https://github.com/YOUR_USERNAME/glasschess`

You should see:
- ✅ README.md with project description
- ✅ All source code in the `src/` directory
- ✅ Configuration files (package.json, vite.config.ts, etc.)
- ✅ License and contributing guidelines

## Alternative: Using GitHub CLI

If you have GitHub CLI installed:

```bash
cd glasschess

# Initialize and create repository in one command
gh repo create glasschess --public --source=. --remote=origin --push

# Or for private repository
gh repo create glasschess --private --source=. --remote=origin --push
```

## Repository Settings (Recommended)

After creating the repository, configure these settings:

### 1. Enable GitHub Pages (Optional)
- Go to Settings → Pages
- Source: Deploy from branch → `main` → `/dist`
- Save

### 2. Add Topics
Add these topics to help others discover your project:
- `chess`
- `react`
- `typescript`
- `glassmorphism`
- `vite`
- `tailwindcss`
- `chess-game`
- `web-app`

### 3. Set Branch Protection (Optional)
- Go to Settings → Branches
- Add rule for `main` branch
- Enable "Require pull request reviews before merging"

### 4. Add Repository Description
In the About section (top right), add:
- **Description**: A beautiful, free chess platform with glassmorphism design
- **Website**: (add after deployment)
- **Topics**: Add the tags mentioned above

## Connecting to Vercel for Auto-Deployment

1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "New Project"
4. Import your `glasschess` repository
5. Configure:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
6. Click "Deploy"

Every push to the `main` branch will now automatically deploy!

## Next Steps

After setting up the repository:

1. **Add collaborators** (Settings → Collaborators)
2. **Create issues** for Phase 2 features
3. **Set up project board** for task management
4. **Add secrets** for CI/CD (if using GitHub Actions)
5. **Share the project** with the community!

## Troubleshooting

### Authentication Issues

If you get authentication errors:

**Using HTTPS** (recommended):
```bash
# Use personal access token as password
# Create token at: https://github.com/settings/tokens
```

**Using SSH**:
```bash
# Change remote URL to SSH
git remote set-url origin git@github.com:YOUR_USERNAME/glasschess.git
```

### Large Files Warning

If you see warnings about large files:
```bash
# Check .gitignore includes node_modules and dist
cat .gitignore
```

### Permission Denied

Make sure you have:
- Created the repository on GitHub first
- Replaced `YOUR_USERNAME` with your actual GitHub username
- Proper authentication configured

## Repository Structure After Push

```
glasschess/
├── .github/
│   └── workflows/
│       └── ci-cd.yml
├── src/
│   ├── components/
│   ├── hooks/
│   ├── store/
│   ├── types/
│   ├── utils/
│   ├── styles/
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── public/
├── .gitignore
├── CONTRIBUTING.md
├── DEPLOYMENT.md
├── LICENSE
├── README.md
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── postcss.config.js
```

## Success Checklist

- [ ] Repository created on GitHub
- [ ] All files pushed successfully
- [ ] README.md displays correctly
- [ ] License is visible
- [ ] Topics/tags added
- [ ] Repository description set
- [ ] (Optional) Deployed to Vercel/Netlify
- [ ] (Optional) Custom domain configured

## Need Help?

- GitHub Docs: https://docs.github.com
- Vercel Docs: https://vercel.com/docs
- Project Issues: Open an issue in the repository

---

🎉 **Congratulations!** Your GlassChess project is now on GitHub!
