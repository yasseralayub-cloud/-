import React from 'react';
import { motion } from 'motion/react';

export const LuxcodLogo: React.FC<{ className?: string }> = ({ className = "w-10 h-10" }) => {
  return (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={`rounded-xl shadow-md ${className}`}>
      <defs>
        <radialGradient id="bgGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0b3660" />
          <stop offset="100%" stopColor="#030c1a" />
        </radialGradient>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f5e5b8" />
          <stop offset="50%" stopColor="#d4af37" />
          <stop offset="100%" stopColor="#987820" />
        </linearGradient>
        <linearGradient id="cyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00f2fe" />
          <stop offset="100%" stopColor="#00c6ff" />
        </linearGradient>
        <filter id="cyanGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Dark Navy Square Container */}
      <rect width="200" height="200" rx="42" fill="url(#bgGlow)" />
      
      {/* Gold Outer Ring */}
      <circle cx="100" cy="100" r="62" stroke="url(#goldGrad)" strokeWidth="6" />

      {/* Stylized Gold L */}
      <path 
        d="M 68 64 V 124 C 68 132 75 138 83 138 H 132 C 134 138 135 136 134 134 C 132 126 123 122 115 122 H 84 V 64 C 84 62 82 60 80 60 H 70 C 68.8 60 68 60.8 68 62 Z" 
        fill="url(#goldGrad)" 
      />

      {/* Neon Cyan Code Symbol </ > inside */}
      <g filter="url(#cyanGlow)" stroke="url(#cyanGrad)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
        {/* Left bracket < */}
        <path d="M 103 88 L 92 99 L 103 110" />
        {/* Slash / */}
        <path d="M 119 84 L 107 116" />
        {/* Right bracket > */}
        <path d="M 123 88 L 134 99 L 123 110" />
      </g>
    </svg>
  );
};

interface LuxcodCreditProps {
  isArabic?: boolean;
  variant?: 'hero' | 'footer';
}

export const LuxcodCredit: React.FC<LuxcodCreditProps> = ({ isArabic = true, variant = 'footer' }) => {
  if (variant === 'hero') {
    return (
      <div className="mb-8 flex flex-col items-start gap-3">
        <p className="text-white/70 text-base md:text-lg font-medium">
          {isArabic ? 'تم إعداده بواسطة luxcod.online' : 'Developed & Powered by luxcod.online'}
        </p>
        
        <motion.a
          href="https://luxcod.online"
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          className="group inline-flex items-center gap-3 bg-gradient-to-r from-[#031122] via-[#082240] to-[#031122] border-2 border-[#d4af37]/60 hover:border-[#d4af37] px-6 py-3 rounded-2xl shadow-2xl shadow-cyan-950/50 transition-all duration-300"
        >
          <LuxcodLogo className="w-10 h-10 transition-transform group-hover:rotate-6 shrink-0" />
          
          <div className="flex flex-col text-right">
            <span className="font-sans text-base font-black text-[#00f2fe] tracking-wider group-hover:text-white transition-colors">
              luxcod.online
            </span>
            <span className="text-[11px] text-[#d4af37] font-bold">
              {isArabic ? 'اضغط لزيارة الموقع الرسمي' : 'Click to visit website'}
            </span>
          </div>
        </motion.a>
      </div>
    );
  }

  return (
    <div className="pt-8 border-t border-white/10 mt-8 flex flex-col items-center justify-center gap-3">
      <p className="text-xs text-white/50 font-medium tracking-wide">
        {isArabic ? 'تم إعداده بواسطة luxcod.online' : 'Developed & Powered by luxcod.online'}
      </p>
      
      <motion.a
        href="https://luxcod.online"
        target="_blank"
        rel="noopener noreferrer"
        whileHover={{ scale: 1.04, y: -2 }}
        whileTap={{ scale: 0.96 }}
        className="group inline-flex items-center gap-3 bg-gradient-to-r from-[#031122] via-[#082240] to-[#031122] border border-[#d4af37]/40 hover:border-[#d4af37] px-5 py-2.5 rounded-2xl shadow-xl transition-all duration-300"
      >
        <LuxcodLogo className="w-9 h-9 transition-transform group-hover:rotate-6 shrink-0" />
        
        <div className="flex flex-col text-right">
          <span className="font-sans text-sm font-black text-[#00f2fe] tracking-wider group-hover:text-white transition-colors">
            luxcod.online
          </span>
          <span className="text-[10px] text-[#d4af37] font-bold">
            {isArabic ? 'اضغط لزيارة الموقع الرسمي' : 'Click to visit website'}
          </span>
        </div>
      </motion.a>
    </div>
  );
};
