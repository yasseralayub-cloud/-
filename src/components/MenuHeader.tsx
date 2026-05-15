import { motion } from 'motion/react';
import { Phone, MessageCircle, Languages, MapPin } from 'lucide-react';
import logo from '../assets/images/regenerated_image_1778880416572.jpg';

interface MenuHeaderProps {
  isArabic: boolean;
  onLanguageToggle: () => void;
}

export default function MenuHeader({ isArabic, onLanguageToggle }: MenuHeaderProps) {
  const mapsUrl = "https://www.google.com/maps/dir/?api=1&destination=26.5148613,43.6442633";

  return (
    <header className="relative pt-6 pb-12 px-6 bg-black text-white border-b border-yellow/20">
      <div className="max-w-7xl mx-auto flex flex-col items-center">
        {/* Top Controls Bar */}
        <div className="w-full flex flex-wrap justify-between items-center gap-4 mb-10">
          <button 
            onClick={onLanguageToggle}
            className="flex items-center gap-2 bg-yellow/10 hover:bg-yellow/20 border border-yellow/20 px-4 py-2 rounded-full transition-all"
          >
            <Languages size={18} className="text-yellow" />
            <span className="text-xs font-bold text-yellow uppercase">
              {isArabic ? 'English' : 'عربي'}
            </span>
          </button>

          <div className="flex items-center gap-3 md:gap-4">
            <a 
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-yellow/10 border border-yellow/20 rounded-full hover:bg-yellow/20 transition-all"
              title={isArabic ? 'الموقع' : 'Location'}
            >
              <MapPin size={20} className="text-yellow" />
            </a>
            <a 
              href="https://wa.me/966502163363" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2 bg-[#25D366]/10 border border-[#25D366]/20 rounded-full hover:bg-[#25D366]/20 transition-all"
              title="WhatsApp"
            >
              <MessageCircle size={20} className="text-[#25D366]" />
            </a>
            <a 
              href="tel:0502163363"
              className="p-2 bg-yellow/10 border border-yellow/20 rounded-full hover:bg-yellow/20 transition-all font-bold flex items-center gap-2 text-yellow text-sm"
            >
              <Phone size={18} />
              <span className="hidden sm:inline">0502163363</span>
            </a>
          </div>
        </div>

        {/* Logo and Branding */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="flex flex-col items-center"
        >
          <div className="w-28 h-28 md:w-36 md:h-36 rounded-full bg-white mb-4 p-2 overflow-hidden shadow-2xl border-4 border-yellow flex items-center justify-center">
            <img 
              src={logo} 
              alt="رحلة شواء" 
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://placehold.co/200x200/FACC15/000000?text=رحلة+شواء';
              }}
            />
          </div>
          <h1 className="font-sans text-3xl md:text-5xl mb-2 tracking-tight font-black text-yellow uppercase text-center">
            رحلة شواء
          </h1>
          <div className="w-16 h-[2px] bg-yellow mb-4" />
          <p className="max-w-md mx-auto text-yellow/70 font-sans text-base md:text-lg font-medium text-center">
            أشهى المشويات والشاورما على أصولها
          </p>
        </motion.div>
      </div>

      {/* Decorative background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-yellow/5 blur-3xl pointer-events-none -z-10" />
    </header>
  );
}
