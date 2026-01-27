import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type GlossarySection = {
  title: string;
  items: string[];
};

export const ChessGlossary: React.FC = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const sections = t('glossary.sections', { returnObjects: true }) as GlossarySection[];

  return (
    <div className="glass-card rounded-xl p-6 space-y-4 mt-6">
      <div className="flex items-center justify-between text-white font-semibold text-lg">
        <div className="flex items-center gap-2">
          <BookOpen size={22} />
          <span>{t('glossary.title')}</span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="glass-button glass-button--subtle px-3 py-1 rounded-md text-xs text-white"
        >
          {isOpen ? t('glossary.hide') : t('glossary.show')}
        </button>
      </div>

      {isOpen && (
        <div className="space-y-4 text-white/80 text-sm max-h-80 overflow-y-auto glass-scrollbar pr-1">
          {sections.map((section) => (
            <div key={section.title} className="glass-container rounded-lg p-3">
              <p className="text-white font-semibold mb-2">{section.title}</p>
              <ul className="space-y-1 text-white/70 text-sm">
                {section.items.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
