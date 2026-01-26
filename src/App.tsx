import { ChessBoard } from './components/ChessBoard';
import { GameControls } from './components/GameControls';
import { MoveHistory } from './components/MoveHistory';
import { ThemeCustomizer } from './components/ThemeCustomizer';
import { AIOpponent } from './components/AIOpponent';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { CoachInsights } from './components/CoachInsights';
import { useGameStore } from './store/gameStore';
import { useTranslation } from 'react-i18next';
import './styles/glassmorphism.css';

function App() {
  const { startAIGame, isAIGame, toggleSound, soundEnabled } = useGameStore();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen animated-gradient p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="text-center mb-8 animate-fade-in">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-2 drop-shadow-lg">
            Glass<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-purple-200">Chess</span>
          </h1>
          <p className="text-white/80 text-lg">
            {t('app.subtitle')}
          </p>
          <div className="mt-4 flex justify-center">
            <LanguageSwitcher />
          </div>
          {isAIGame && (
            <div className="mt-2 glass-container inline-block px-4 py-2 rounded-lg">
              <p className="text-white/90 text-sm font-semibold">
                {t('app.aiBadge')}
              </p>
            </div>
          )}
        </header>

        {/* Main Game Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* Left Sidebar - Game Controls & AI */}
          <div className="lg:col-span-3 space-y-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <AIOpponent
              onStartGame={startAIGame}
              isPlaying={isAIGame}
              soundEnabled={soundEnabled}
              onToggleSound={toggleSound}
            />
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
            <CoachInsights />
          </div>
        </div>

        {/* Mobile Theme Customizer */}
        <div className="lg:hidden flex justify-center mb-8 animate-fade-in">
          <ThemeCustomizer />
        </div>

        {/* Footer */}
        <footer className="text-center text-white/60 text-sm animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <div className="glass-container rounded-lg p-4 inline-block">
            <p>{t('app.footer.madeBy')}</p>
            <p className="mt-2">
              <a 
                href="https://github.com/BernydotJar/chessy" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-300 hover:text-blue-200 transition-colors underline"
              >
                {t('app.footer.viewOnGithub')}
              </a>
              {' · '}
              <span className="text-white/40">{t('app.footer.phase')}</span>
            </p>
            <p className="mt-2 text-white/70 text-xs">
              {t('app.footer.credit')}
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
