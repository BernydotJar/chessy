import React, { useState } from 'react';
import { useGameStore, themePresets } from '../store/gameStore';
import { Palette, X } from 'lucide-react';
import { BoardTheme } from '../types/chess.types';
import { useTranslation } from 'react-i18next';

export const ThemeCustomizer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, setTheme } = useGameStore();
  const [customTheme, setCustomTheme] = useState<BoardTheme>(theme);
  const { t } = useTranslation();

  const handlePresetSelect = (preset: BoardTheme) => {
    setCustomTheme(preset);
    setTheme(preset);
  };

  const handleCustomChange = (key: keyof BoardTheme, value: string | number) => {
    const newTheme = { ...customTheme, [key]: value };
    setCustomTheme(newTheme);
    setTheme(newTheme);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="glass-button px-4 py-2 rounded-lg text-white font-medium flex items-center gap-2 hover:scale-105 transition-transform"
        aria-label={t('theme.open')}
      >
        <Palette size={20} />
        <span>{t('theme.customize')}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto glass-scrollbar animate-slide-up">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Palette size={24} />
                {t('theme.title')}
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="glass-button p-2 rounded-lg text-white hover:bg-white/20"
                aria-label={t('theme.close')}
              >
                <X size={20} />
              </button>
            </div>

            {/* Preset Themes */}
            <div className="mb-6">
              <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wide">
                {t('theme.preset')}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {themePresets.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => handlePresetSelect(preset.theme)}
                    className="glass-button p-3 rounded-xl text-white text-left hover:scale-105 transition-transform"
                  >
                    <div className="flex gap-2 mb-2">
                      <div
                        className="w-6 h-6 rounded"
                        style={{ backgroundColor: preset.theme.lightSquare }}
                      />
                      <div
                        className="w-6 h-6 rounded"
                        style={{ backgroundColor: preset.theme.darkSquare }}
                      />
                    </div>
                    <div className="text-sm font-medium">{preset.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Colors */}
            <div className="space-y-4">
              <h3 className="text-white font-semibold text-sm uppercase tracking-wide">
                {t('theme.custom')}
              </h3>

              <div>
                <label className="block text-white text-sm mb-2">
                  {t('theme.light')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={customTheme.lightSquare}
                    onChange={(e) => handleCustomChange('lightSquare', e.target.value)}
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={customTheme.lightSquare}
                    onChange={(e) => handleCustomChange('lightSquare', e.target.value)}
                    className="glass-input flex-1 px-3 py-2 rounded-lg text-white text-sm"
                    placeholder="#f0d9b5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white text-sm mb-2">
                  {t('theme.dark')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={customTheme.darkSquare}
                    onChange={(e) => handleCustomChange('darkSquare', e.target.value)}
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={customTheme.darkSquare}
                    onChange={(e) => handleCustomChange('darkSquare', e.target.value)}
                    className="glass-input flex-1 px-3 py-2 rounded-lg text-white text-sm"
                    placeholder="#b58863"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white text-sm mb-2">
                  {t('theme.glassOpacity', { value: customTheme.glassOpacity.toFixed(2) })}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={customTheme.glassOpacity}
                  onChange={(e) => handleCustomChange('glassOpacity', parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-white text-sm mb-2">
                  {t('theme.glassBlur', { value: customTheme.glassBlur })}
                </label>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="1"
                  value={customTheme.glassBlur}
                  onChange={(e) => handleCustomChange('glassBlur', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            {/* Preview */}
            <div className="mt-6">
              <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wide">
                {t('theme.preview')}
              </h3>
              <div className="grid grid-cols-8 gap-0 w-full aspect-square rounded-lg overflow-hidden">
                {Array.from({ length: 64 }).map((_, i) => {
                  const row = Math.floor(i / 8);
                  const col = i % 8;
                  const isLight = (row + col) % 2 === 0;
                  return (
                    <div
                      key={i}
                      style={{
                        backgroundColor: isLight
                          ? customTheme.lightSquare
                          : customTheme.darkSquare,
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
