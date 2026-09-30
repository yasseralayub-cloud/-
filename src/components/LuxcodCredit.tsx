import React from 'react';

interface LuxcodCreditProps {
  isArabic?: boolean;
  variant?: 'hero' | 'footer' | 'default';
}

export const LuxcodLogo: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="luxBg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0B2B48" />
          <stop offset="100%" stopColor="#020C1B" />
        </radialGradient>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F7D46E" />
          <stop offset="50%" stopColor="#E6B33D" />
          <stop offset="100%" stopColor="#996E1E" />
        </linearGradient>
        <linearGradient id="cyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00F2FE" />
          <stop offset="100%" stopColor="#4FACFE" />
        </linearGradient>
      </defs>

      {/* Dark Navy Background */}
      <circle cx="50" cy="50" r="48" fill="url(#luxBg)" />
      
      {/* Gold Circular Ring */}
      <circle cx="50" cy="50" r="43" stroke="url(#goldGrad)" strokeWidth="3" fill="none" />

      {/* Golden L Shape */}
      <path d="M 32 30 V 68 H 66 V 60 H 40 V 30 Z" fill="url(#goldGrad)" />

      {/* Cyan Neon </> Symbol */}
      {/* '<' */}
      <path d="M 52 44 L 43 51 L 52 58" stroke="url(#cyanGrad)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* '/' */}
      <path d="M 61 40 L 55 62" stroke="url(#cyanGrad)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* '>' */}
      <path d="M 63 44 L 72 51 L 63 58" stroke="url(#cyanGrad)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export const LuxcodCredit: React.FC<LuxcodCreditProps> = ({ variant = 'default' }) => {
  if (variant === 'hero') {
    return (
      <div className="inline-flex flex-col items-start gap-1 my-2">
        <span className="text-[10px] uppercase font-black tracking-widest text-amber-300/80 dir-ltr">
          Powered by
        </span>
        <a
          href="https://luxcod.online"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-gradient-to-r from-[#020C1B] via-[#0C2D4A] to-[#020C1B] border border-[#E6B33D]/60 hover:border-[#F7D46E] text-white backdrop-blur-md transition-all hover:scale-105 active:scale-95 shadow-xl group cursor-pointer"
          title="luxcod.online"
        >
          <LuxcodLogo className="w-5 h-5 shadow-sm group-hover:rotate-6 transition-transform" />
          <span className="font-mono text-xs font-bold tracking-wider text-[#F7D46E] group-hover:text-amber-200 dir-ltr">
            luxcod.online
          </span>
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center items-center gap-1.5 py-4 dir-ltr">
      <span className="text-[10px] uppercase font-black tracking-widest text-amber-300/80">
        Powered by
      </span>
      <a
        href="https://luxcod.online"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#020C1B] via-[#0C2D4A] to-[#020C1B] border border-[#E6B33D]/60 hover:border-[#F7D46E] text-white shadow-xl hover:scale-105 active:scale-95 transition-all group cursor-pointer"
        title="luxcod.online"
      >
        <LuxcodLogo className="w-5 h-5 shadow-sm group-hover:rotate-6 transition-transform" />
        <span className="font-mono text-xs sm:text-sm font-bold tracking-wider text-[#F7D46E] group-hover:text-amber-200">
          luxcod.online
        </span>
      </a>
    </div>
  );
};
