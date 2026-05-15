import { Languages } from 'lucide-react';

interface LanguageToggleProps {
  isArabic: boolean;
  onToggle: () => void;
}

export default function LanguageToggle({ isArabic, onToggle }: LanguageToggleProps) {
  return (
    <button
      onClick={onToggle}
      className="fixed top-6 right-6 z-50 bg-black text-yellow p-3 rounded-full shadow-lg hover:scale-110 transition-all duration-300 flex items-center gap-2 group border border-yellow/20"
    >
      <Languages size={20} />
      <span className="font-bold text-sm hidden group-hover:inline transition-all">
        {isArabic ? 'English' : 'عربي'}
      </span>
    </button>
  );
}
