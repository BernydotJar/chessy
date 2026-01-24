import React from 'react';
import { ChessBoard } from './components/ChessBoard';
import { GameControls } from './components/GameControls';
import { MoveHistory } from './components/MoveHistory';
import { ThemeCustomizer } from './components/ThemeCustomizer';
import './styles/glassmorphism.css';

function App() {
  return (
    <div className="min-h-screen animated-gradient p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="text-center mb-8 animate-fade-in">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-2 drop-shadow-lg">
            Glass<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-purple-200">Chess</span>
          </h1>
          <p className="text-white/80 text-lg">
            Free, Beautiful, Modern Chess Platform
          </p>
        </header>

        {/* Main Game Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* Left Sidebar - Game Controls */}
          <div className="lg:col-span-3 space-y-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <GameControls />
            <div className="hidden lg:block">
              <ThemeCustomizer />
            </div>
          </div>

          {/* Center - Chess Board */}
          <div className="lg:col-span-6 flex justify-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <ChessBoard />
          </div>

          {/* Right Sidebar - Move History */}
          <div className="lg:col-span-3 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <MoveHistory />
          </div>
        </div>

        {/* Mobile Theme Customizer */}
        <div className="lg:hidden flex justify-center mb-8 animate-fade-in">
          <ThemeCustomizer />
        </div>

        {/* Footer */}
        <footer className="text-center text-white/60 text-sm animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <div className="glass-container rounded-lg p-4 inline-block">
            <p>Made with ♟️ and ❤️ by the GlassChess Team</p>
            <p className="mt-2">
              <a 
                href="https://github.com/BernydotJar/chessy" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-300 hover:text-blue-200 transition-colors underline"
              >
                View on GitHub
              </a>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
