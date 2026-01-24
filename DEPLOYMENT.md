# Setup and Deployment Guide

## Local Development Setup

### Prerequisites
- Node.js 18+ installed
- npm, pnpm, or yarn package manager
- Git installed

### Step-by-Step Setup

1. **Clone the repository**
```bash
git clone https://github.com/BernydotJar/chessy.git
cd chessy
```

2. **Install dependencies**
```bash
npm install
# or
pnpm install
# or
yarn install
```

3. **Start the development server**
```bash
npm run dev
```

4. **Open your browser**
Navigate to `http://localhost:5173`

5. **Start developing!**
- The app will hot-reload as you make changes
- Edit files in the `src/` directory
- Customize themes in `src/store/gameStore.ts`

## Production Build

```bash
# Create optimized production build
npm run build

# Preview the production build locally
npm run preview
```

The build output will be in the `dist/` directory.

## Deployment Options

### Option 1: Vercel (Recommended - Free)

1. **Install Vercel CLI**
```bash
npm i -g vercel
```

2. **Deploy**
```bash
vercel
```

3. **Follow the prompts** to link your project

For automatic deployments:
- Push to GitHub
- Connect your repo to Vercel dashboard
- Every push to `main` will auto-deploy

### Option 2: Netlify (Free)

1. **Install Netlify CLI**
```bash
npm i -g netlify-cli
```

2. **Build and deploy**
```bash
npm run build
netlify deploy --prod --dir=dist
```

Or use the Netlify dashboard:
- Connect your GitHub repo
- Build command: `npm run build`
- Publish directory: `dist`

### Option 3: GitHub Pages (Free)

1. **Deploy**
```bash
npm run deploy
```

This builds with the correct base path and publishes `dist/` to the `gh-pages` branch.

2. **Enable GitHub Pages**
- Go to Settings → Pages
- Source: Deploy from branch → `gh-pages` → `/` (root)
- Save

Your site will be available at `https://bernydotjar.github.io/chessy/`.

### Option 4: Railway (Free tier available)

1. **Create account** at railway.app
2. **Connect GitHub** repository
3. **Configure**:
   - Build command: `npm run build`
   - Start command: `npm run preview`
4. **Deploy** automatically on push

## Environment Variables

Currently, the app doesn't require environment variables for Phase 1. For future phases:

```env
# .env.local (for Phase 3+)
VITE_API_URL=your_backend_url
VITE_SOCKET_URL=your_websocket_url
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

## Custom Domain Setup

### Vercel
1. Go to your project settings
2. Navigate to "Domains"
3. Add your custom domain
4. Update DNS records as instructed

### Netlify
1. Go to Site settings → Domain management
2. Add custom domain
3. Configure DNS (Netlify DNS or external)

## CI/CD Setup

The project includes GitHub Actions workflow for automated testing and deployment.

### Required Secrets (for Vercel deployment)
Add these to your GitHub repository secrets:
- `VERCEL_TOKEN` - Get from Vercel account settings
- `VERCEL_ORG_ID` - Found in Vercel project settings
- `VERCEL_PROJECT_ID` - Found in Vercel project settings

## Performance Optimization

### Analyzing Bundle Size
```bash
npm run build
# Check the dist/ folder size
```

### Optimizations Applied
- Code splitting for vendor libraries
- Tree shaking for unused code
- CSS purging via Tailwind
- Asset optimization by Vite

## Troubleshooting

### Build Errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Port Already in Use
```bash
# Change port in vite.config.ts
server: {
  port: 5174, // or any available port
}
```

### TypeScript Errors
```bash
# Check TypeScript configuration
npx tsc --noEmit
```

## Monitoring and Analytics

Consider adding:
- **Vercel Analytics** (free for personal projects)
- **Google Analytics** for user insights
- **Sentry** for error tracking

## Support

For deployment issues:
- Check the [Vercel documentation](https://vercel.com/docs)
- Visit our [GitHub Discussions](https://github.com/BernydotJar/chessy/discussions)
- Open an issue with the `deployment` label
