# 🎮 GlassChess - Free Modern Chess Platform

A beautiful, free, and modern chess application with glassmorphism design inspired by Apple's latest UI aesthetic. Built as an alternative to chess.com with focus on accessibility and customization.

## ✨ Features

### Current (MVP - Phase 1)
- 🎨 **Glassmorphism UI** - Beautiful translucent design with blur effects
- ♟️ **Full Chess Functionality** - Complete chess rules implementation
- 🎨 **Board Customization** - Customize board colors and themes
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile
- ⚡ **Lightning Fast** - Built with Vite for optimal performance

### Roadmap
- **Phase 2**: AI Opponent with multiple difficulty levels
- **Phase 3**: Real-time Multiplayer via WebSockets
- **Phase 4**: User Accounts, Game History, and ELO Ratings
- **Phase 5**: Puzzles, Tournaments, and Social Features

## 🏗️ Architecture

### Frontend
- **React 18** + **TypeScript** - Type-safe component development
- **Vite** - Next-generation frontend tooling
- **Tailwind CSS** - Utility-first CSS framework
- **Chess.js** - Chess logic and move validation
- **React-Chessboard** - Customizable chess board component
- **Zustand** - Lightweight state management

### Backend (Phase 3+)
- **Node.js** + **Express** - RESTful API
- **Socket.io** - Real-time communication
- **PostgreSQL** - Relational database for users and games
- **Redis** - Session management and caching
- **Prisma** - Type-safe database ORM

### Deployment
- **Frontend**: Vercel (Free tier)
- **Backend**: Railway/Render (Free tier)
- **Database**: Supabase (Free tier)
- **CDN**: Cloudflare (Free tier)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm/pnpm/yarn
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/BernydotJar/chessy.git
cd chessy

# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:5173 in your browser
```

### Build for Production

```bash
# Create optimized production build
npm run build

# Preview production build locally
npm run preview
```

### Deploy to GitHub Pages

```bash
npm run deploy
```

Then enable Pages in GitHub: Settings → Pages → Source: **GitHub Actions**.
Your site will be available at `https://bernydotjar.github.io/chessy/`.

On every push to `main`, GitHub Actions will build and deploy automatically.

## 🎨 Customization

The app includes a built-in theme customizer allowing users to:
- Change board square colors (light and dark)
- Adjust glassmorphism opacity and blur
- Select from preset themes (Classic, Ocean, Forest, Sunset, Midnight)
- Create and save custom color schemes

## 📁 Project Structure

```
chessy/
├── src/
│   ├── components/        # React components
│   │   ├── ChessBoard.tsx
│   │   ├── GameControls.tsx
│   │   ├── ThemeCustomizer.tsx
│   │   └── MoveHistory.tsx
│   ├── hooks/            # Custom React hooks
│   │   ├── useChessGame.ts
│   │   └── useTheme.ts
│   ├── store/            # Zustand state management
│   │   └── gameStore.ts
│   ├── types/            # TypeScript types
│   │   └── chess.types.ts
│   ├── utils/            # Utility functions
│   │   └── chessHelpers.ts
│   ├── styles/           # Global styles
│   │   └── glassmorphism.css
│   ├── App.tsx           # Main app component
│   └── main.tsx          # Entry point
├── public/               # Static assets
├── .gitignore
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run e2e tests
npm run test:e2e

# Generate coverage report
npm run test:coverage
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📋 Development Roadmap

### Phase 1: Core Chess Board ✅ (Current)
- [x] Basic chess board rendering
- [x] Glassmorphism design implementation
- [x] Color customization system
- [x] Move validation
- [x] Responsive layout

### Phase 2: Enhanced Gameplay
- [ ] AI opponent (Stockfish integration)
- [ ] Multiple difficulty levels
- [ ] Move hints and suggestions
- [ ] Game analysis tools

### Phase 3: Multiplayer
- [ ] WebSocket server setup
- [ ] Real-time game synchronization
- [ ] Matchmaking system
- [ ] Friend challenges
- [ ] Spectator mode

### Phase 4: User System
- [ ] User authentication (OAuth + Email)
- [ ] Profile management
- [ ] Game history and statistics
- [ ] ELO rating system
- [ ] Achievements and badges

### Phase 5: Advanced Features
- [ ] Daily puzzles
- [ ] Tournament system
- [ ] Chess variants (960, Crazyhouse, etc.)
- [ ] Video chat during games
- [ ] Mobile native apps

## 🛠️ Tech Stack Deep Dive

### Why These Technologies?

**React + TypeScript**: Type safety prevents bugs and improves developer experience
**Vite**: 10-100x faster than webpack, instant HMR
**Tailwind CSS**: Rapid UI development with consistent design
**Chess.js**: Battle-tested chess logic, no need to reinvent the wheel
**Zustand**: Simpler than Redux, perfect for our state needs
**Socket.io**: Industry standard for real-time bidirectional communication

## 📊 Performance Targets

- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Lighthouse Score**: > 95
- **Bundle Size**: < 200KB (gzipped)

## 🔒 Security

- XSS protection via React's built-in escaping
- CSRF tokens for API requests
- Rate limiting on backend endpoints
- Input validation and sanitization
- Secure WebSocket connections (WSS)

## 📄 License

MIT License - feel free to use this project for learning or building your own chess platform!

## 👥 Team & Credits

**Solution Architect**: Eduardo (Edu) - Lead architect and technical director

**Core Team**:
- Frontend Lead: Glass UI implementation and UX
- Backend Lead: Game logic and multiplayer infrastructure  
- DevOps Engineer: CI/CD and deployment
- QA Engineer: Testing and quality assurance

**Special Thanks**:
- Chess.js library maintainers
- React-Chessboard contributors
- The chess community

## 📞 Contact & Support

- **Issues**: [GitHub Issues](https://github.com/BernydotJar/chessy/issues)
- **Discussions**: [GitHub Discussions](https://github.com/BernydotJar/chessy/discussions)
- **Email**: your.email@example.com

---

Made with ♟️ and ❤️ by the GlassChess Team
