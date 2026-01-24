# GlassChess - System Architecture

## Overview

GlassChess follows a modern, scalable architecture designed to grow from a simple single-player chess app to a full-featured multiplayer platform.

---

## Phase 1 Architecture (Current - MVP)

```
┌─────────────────────────────────────────────────────┐
│                    Web Browser                      │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │          React Application (SPA)            │  │
│  │                                              │  │
│  │  ┌──────────────┐  ┌──────────────────┐   │  │
│  │  │  Components  │  │  State (Zustand) │   │  │
│  │  │              │  │                   │   │  │
│  │  │ • ChessBoard │◄─┤ • gameStore.ts   │   │  │
│  │  │ • Controls   │  │ • Theme state    │   │  │
│  │  │ • History    │  │ • Game state     │   │  │
│  │  │ • Customizer │  │                   │   │  │
│  │  └──────┬───────┘  └──────────────────┘   │  │
│  │         │                                   │  │
│  │         ▼                                   │  │
│  │  ┌──────────────────────────────────┐     │  │
│  │  │     Chess.js Library             │     │  │
│  │  │  • Move validation               │     │  │
│  │  │  • Game rules                    │     │  │
│  │  │  • Position management           │     │  │
│  │  └──────────────────────────────────┘     │  │
│  │                                              │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘

Deployment: Vercel / Netlify (Static Hosting)
```

### Component Flow

```
User Interaction
      │
      ▼
┌────────────┐
│ ChessBoard │ ──► User drags piece
└─────┬──────┘
      │
      ▼
┌────────────┐
│ gameStore  │ ──► makeMove(from, to)
└─────┬──────┘
      │
      ▼
┌────────────┐
│ Chess.js   │ ──► Validate move
└─────┬──────┘
      │
      ▼
   Valid? ──► Yes ──► Update state
      │              Update UI
      │              Update history
      │
      No ──► Reject move
             Return to previous position
```

---

## Phase 2 Architecture (Enhanced Gameplay)

```
┌─────────────────────────────────────────────────────┐
│                    Web Browser                      │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │          React Application                  │  │
│  │                                              │  │
│  │  Components                                  │  │
│  │  • ChessBoard                                │  │
│  │  • AI Opponent Selector  ◄──┐              │  │
│  │  • Analysis Board            │              │  │
│  │  • Promotion Dialog          │              │  │
│  │  • Sound Controls            │              │  │
│  │  • Time Controls             │              │  │
│  │                              │              │  │
│  │  State Management            │              │  │
│  │  • Game state                │              │  │
│  │  • AI difficulty             │              │  │
│  │  • Timer state               │              │  │
│  │  • Sound settings            │              │  │
│  │                              │              │  │
│  └──────────────────────────────┼──────────────┘  │
│                                 │                   │
│  ┌──────────────────────────────▼──────────────┐  │
│  │          Web Workers                        │  │
│  │                                              │  │
│  │  ┌────────────────────────────────────┐    │  │
│  │  │  Stockfish.js (Chess Engine)       │    │  │
│  │  │  • Position evaluation             │    │  │
│  │  │  • Best move calculation           │    │  │
│  │  │  • Multi-depth analysis            │    │  │
│  │  └────────────────────────────────────┘    │  │
│  │                                              │  │
│  │  ┌────────────────────────────────────┐    │  │
│  │  │  Audio Context                     │    │  │
│  │  │  • Move sounds                     │    │  │
│  │  │  • Capture sounds                  │    │  │
│  │  │  • Check/Checkmate sounds          │    │  │
│  │  └────────────────────────────────────┘    │  │
│  └──────────────────────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Phase 3 Architecture (Multiplayer)

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Devices                          │
│                                                             │
│   ┌──────────────┐      ┌──────────────┐                  │
│   │  Browser A   │      │  Browser B   │                  │
│   │  (Player 1)  │      │  (Player 2)  │                  │
│   └──────┬───────┘      └──────┬───────┘                  │
│          │                     │                            │
│          │  WebSocket (WSS)    │                            │
│          └──────────┬──────────┘                            │
└─────────────────────┼───────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────────┐
│                  Backend Infrastructure                      │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Load Balancer (Nginx)                     │ │
│  └────────────────────┬───────────────────────────────────┘ │
│                       │                                      │
│         ┌─────────────┴─────────────┐                       │
│         │                           │                       │
│  ┌──────▼──────┐             ┌──────▼──────┐              │
│  │  Node.js    │             │  Node.js    │              │
│  │  Server 1   │             │  Server 2   │              │
│  │             │             │             │              │
│  │ • Socket.io │             │ • Socket.io │              │
│  │ • Express   │             │ • Express   │              │
│  │ • JWT Auth  │             │ • JWT Auth  │              │
│  └──────┬──────┘             └──────┬──────┘              │
│         │                           │                       │
│         └─────────────┬─────────────┘                       │
│                       │                                      │
│         ┌─────────────┴─────────────┐                       │
│         │                           │                       │
│  ┌──────▼──────┐             ┌──────▼──────┐              │
│  │   Redis     │             │ PostgreSQL  │              │
│  │             │             │             │              │
│  │ • Sessions  │             │ • Users     │              │
│  │ • Queues    │             │ • Games     │              │
│  │ • Cache     │             │ • Ratings   │              │
│  │ • Pubsub    │             │ • History   │              │
│  └─────────────┘             └─────────────┘              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### WebSocket Communication Flow

```
Player 1                    Server                    Player 2
   │                          │                          │
   │──────move(e4)──────────► │                          │
   │                          │                          │
   │                          ├─validate move            │
   │                          ├─update game state        │
   │                          ├─save to database         │
   │                          │                          │
   │                          ├────move(e4)────────────► │
   │                          │                          │
   │                          │ ◄────move(e5)──────────  │
   │                          │                          │
   │ ◄────move(e5)────────────┤                          │
   │                          │                          │
```

---

## Phase 4 Architecture (Full Platform)

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend Layer                         │
│                                                             │
│  Web App (Vite + React)    Mobile Apps (React Native)      │
│  • Desktop browsers        • iOS App                        │
│  • Mobile browsers         • Android App                    │
│  • PWA                                                       │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ REST API + WebSocket
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                    Application Layer                        │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │             API Gateway (GraphQL Optional)            │ │
│  └─────────────────────┬─────────────────────────────────┘ │
│                        │                                    │
│         ┌──────────────┼──────────────┐                    │
│         │              │              │                    │
│  ┌──────▼──────┐ ┌────▼─────┐ ┌─────▼──────┐             │
│  │   Auth      │ │  Game    │ │ Analysis   │             │
│  │   Service   │ │  Service │ │  Service   │             │
│  │             │ │          │ │            │             │
│  │ • Login     │ │ • Moves  │ │ • Engine   │             │
│  │ • Register  │ │ • State  │ │ • Eval     │             │
│  │ • OAuth     │ │ • Match  │ │ • Puzzles  │             │
│  └──────┬──────┘ └────┬─────┘ └─────┬──────┘             │
│         │              │              │                    │
└─────────┼──────────────┼──────────────┼────────────────────┘
          │              │              │
┌─────────┴──────────────┴──────────────┴────────────────────┐
│                     Data Layer                              │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ PostgreSQL  │  │    Redis     │  │  S3 / CDN    │     │
│  │             │  │              │  │              │     │
│  │ • Users     │  │ • Cache      │  │ • Avatars    │     │
│  │ • Games     │  │ • Sessions   │  │ • Assets     │     │
│  │ • Ratings   │  │ • Queues     │  │ • PGN files  │     │
│  │ • Stats     │  │ • Realtime   │  │              │     │
│  └─────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Models

### Core Entities

```typescript
// User
interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  createdAt: Date;
  ratings: {
    bullet: number;
    blitz: number;
    rapid: number;
    classical: number;
  };
}

// Game
interface Game {
  id: string;
  whitePlayerId: string;
  blackPlayerId: string;
  moves: string[]; // PGN moves
  result: 'white' | 'black' | 'draw' | null;
  timeControl: {
    minutes: number;
    increment: number;
  };
  startedAt: Date;
  endedAt?: Date;
  rated: boolean;
}

// Match
interface Match {
  id: string;
  player1Id: string;
  player2Id: string;
  gameId?: string;
  status: 'pending' | 'active' | 'completed';
  createdAt: Date;
}
```

---

## State Management Architecture

### Zustand Store Structure

```typescript
// Current Phase 1 Structure
GameStore
├── chess: Chess            // Chess.js instance
├── fen: string            // Current position
├── history: string[]      // Move history
├── theme: BoardTheme      // UI theme
├── isGameOver: boolean    // Game status
└── actions
    ├── makeMove()
    ├── resetGame()
    ├── undoMove()
    └── setTheme()

// Future Phase 2+ Structure
RootStore
├── gameStore              // Game logic
├── aiStore                // AI opponent
├── timerStore             // Time controls
├── soundStore             // Audio settings
├── userStore              // User data (Phase 4)
└── multiplayerStore       // Multiplayer (Phase 3)
```

---

## Security Architecture

### Authentication Flow (Phase 4)

```
┌──────────┐                ┌──────────┐                ┌──────────┐
│  Client  │                │  Server  │                │   DB     │
└────┬─────┘                └────┬─────┘                └────┬─────┘
     │                           │                           │
     │──login(email, pass)──────►│                           │
     │                           │                           │
     │                           ├──hash password            │
     │                           │                           │
     │                           ├───query user─────────────►│
     │                           │                           │
     │                           │◄──user data───────────────┤
     │                           │                           │
     │                           ├──verify password          │
     │                           ├──generate JWT             │
     │                           │                           │
     │◄─────JWT token────────────┤                           │
     │                           │                           │
     │                           │                           │
     │──authenticated request───►│                           │
     │  (Authorization: Bearer)  │                           │
     │                           │                           │
     │                           ├──verify JWT               │
     │                           ├──check expiry             │
     │                           │                           │
     │◄──────response────────────┤                           │
     │                           │                           │
```

### Data Security Measures

- ✅ HTTPS only (TLS 1.3)
- ✅ JWT tokens (short-lived)
- ✅ Password hashing (bcrypt)
- ✅ Rate limiting
- ✅ CORS configuration
- ✅ Input validation
- ✅ SQL injection prevention (Prisma ORM)
- ✅ XSS protection (React escaping)

---

## Performance Optimization Strategy

### Frontend Optimizations

```
┌─────────────────────────────────────────┐
│       Performance Techniques            │
├─────────────────────────────────────────┤
│ • Code Splitting                        │
│   - Route-based                         │
│   - Component lazy loading              │
│                                         │
│ • Bundle Optimization                   │
│   - Tree shaking                        │
│   - Minification                        │
│   - Compression (Brotli/Gzip)          │
│                                         │
│ • Asset Optimization                    │
│   - Image lazy loading                  │
│   - SVG sprites                         │
│   - CSS purging                         │
│                                         │
│ • Caching Strategy                      │
│   - Service Worker                      │
│   - Browser caching                     │
│   - CDN edge caching                    │
│                                         │
│ • React Optimizations                   │
│   - React.memo for components           │
│   - useMemo for expensive calcs         │
│   - useCallback for handlers            │
│   - Virtual scrolling (move history)    │
└─────────────────────────────────────────┘
```

### Backend Optimizations (Phase 3+)

```
┌─────────────────────────────────────────┐
│     Backend Performance                 │
├─────────────────────────────────────────┤
│ • Database                              │
│   - Indexing on key fields              │
│   - Query optimization                  │
│   - Connection pooling                  │
│                                         │
│ • Caching Layers                        │
│   - Redis for hot data                  │
│   - CDN for static assets               │
│   - In-memory cache                     │
│                                         │
│ • Horizontal Scaling                    │
│   - Multiple server instances           │
│   - Load balancing                      │
│   - Auto-scaling policies               │
│                                         │
│ • WebSocket Optimization                │
│   - Binary protocol option              │
│   - Message compression                 │
│   - Connection pooling                  │
└─────────────────────────────────────────┘
```

---

## Deployment Pipeline

```
┌─────────────┐
│ Developer   │
│ Pushes Code │
└──────┬──────┘
       │
       ▼
┌──────────────┐
│   GitHub     │
│  Repository  │
└──────┬───────┘
       │
       │ Webhook
       ▼
┌──────────────────────┐
│  GitHub Actions      │
│  CI/CD Pipeline      │
│                      │
│  ┌────────────────┐ │
│  │  Run Tests     │ │
│  └────────┬───────┘ │
│           │         │
│  ┌────────▼───────┐ │
│  │  Build Project │ │
│  └────────┬───────┘ │
│           │         │
│  ┌────────▼───────┐ │
│  │  Run Linter    │ │
│  └────────┬───────┘ │
└───────────┼─────────┘
            │
            ▼
       All Passed?
            │
       ┌────┴────┐
       │   Yes   │
       └────┬────┘
            │
            ▼
┌────────────────────┐
│      Vercel        │
│  Auto Deployment   │
│                    │
│  • Build assets    │
│  • Deploy to edge  │
│  • Invalidate CDN  │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│   Production       │
│   Live Site! 🎉    │
└────────────────────┘
```

---

## Monitoring & Analytics

### Observability Stack (Future)

```
┌─────────────────────────────────────────┐
│         Monitoring Tools                │
├─────────────────────────────────────────┤
│                                         │
│  Frontend                               │
│  • Vercel Analytics                     │
│  • Web Vitals tracking                  │
│  • Error tracking (Sentry)              │
│  • User analytics (Plausible/Umami)     │
│                                         │
│  Backend                                │
│  • Server monitoring (PM2/Forever)      │
│  • Database monitoring                  │
│  • API latency tracking                 │
│  • WebSocket connection monitoring      │
│                                         │
│  Business Metrics                       │
│  • Daily active users                   │
│  • Games played                         │
│  • Average session duration             │
│  • Retention rate                       │
└─────────────────────────────────────────┘
```

---

## Scalability Considerations

### Current Capacity (Phase 1)
- 🔵 **Concurrent Users**: Unlimited (static site)
- 🔵 **Requests/month**: Unlimited (Vercel)
- 🔵 **Storage**: Minimal (browser localStorage)

### Target Capacity (Phase 3+)
- 🎯 **Concurrent Users**: 10,000+
- 🎯 **WebSocket Connections**: 5,000+
- 🎯 **Database**: 1M+ users
- 🎯 **Games Storage**: 100M+ games

### Scaling Strategy
1. **Vertical Scaling** (Phase 3): Upgrade server resources
2. **Horizontal Scaling** (Phase 4): Add more servers
3. **Database Sharding** (Phase 5): Split data across instances
4. **CDN Distribution** (All phases): Edge caching
5. **Microservices** (Future): Service separation

---

## Technology Migration Path

```
Phase 1 (Current)
├── React SPA
├── Static Hosting
└── Client-side only

Phase 2 (Next)
├── React SPA
├── Web Workers (AI)
└── Still client-side

Phase 3
├── React SPA
├── Node.js Backend
├── WebSocket Server
├── PostgreSQL
└── Redis

Phase 4
├── React SPA
├── Microservices (optional)
├── API Gateway
├── Multiple databases
└── Caching layers

Phase 5+
├── Native Apps
├── GraphQL (optional)
├── Event-driven architecture
└── Global distribution
```

---

**Architecture Version**: 1.0  
**Last Updated**: January 2025  
**Maintained By**: GlassChess Architecture Team
