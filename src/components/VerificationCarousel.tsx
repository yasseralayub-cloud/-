import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { VerificationBadge } from '../types';
import { ShieldCheck, ChevronRight, ChevronLeft, Maximize2, X, FileCheck, ExternalLink } from 'lucide-react';

interface VerificationCarouselProps {
  badges: VerificationBadge[];
  isArabic: boolean;
  vatNumber?: string;
  crNumber?: string;
}

export default function VerificationCarousel({ badges, isArabic, vatNumber, crNumber }: VerificationCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-play interval: switch every 4.5 seconds unless paused or lightbox is open
  useEffect(() => {
    if (!badges || badges.length <= 1 || isPaused || isLightboxOpen) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % badges.length);
    }, 4500);

    return () => clearInterval(timer);
  }, [badges, isPaused, isLightboxOpen]);

  if (!badges || badges.length === 0) return null;

  const currentBadge = badges[currentIndex] || badges[0];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % badges.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + badges.length) % badges.length);
  };

  return (
    <section className="mt-20 px-4 sm:px-6 max-w-4xl mx-auto" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="bg-gradient-to-b from-white to-neutral-50 rounded-[2.5rem] border border-black/5 p-6 sm:p-10 shadow-xl relative overflow-hidden">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 pb-6 border-b border-black/5 text-center sm:text-right">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-yellow/10 border border-yellow/30 text-yellow-700 rounded-2xl flex items-center justify-center shadow-sm">
              <ShieldCheck size={26} strokeWidth={2} />
            </div>
            <div>
              <h3 className="font-sans text-xl font-black text-dark tracking-tight">
                {isArabic ? 'شهادات التوثيق والاعتماد الرسمية' : 'Official Verification & Certificates'}
              </h3>
              <p className="text-xs text-dark/50 font-medium mt-0.5">
                {isArabic ? 'اضغط على الشهادة للتكبير والمعاينة' : 'Click on the certificate to enlarge and view'}
              </p>
            </div>
          </div>

          {/* Quick Info Badges */}
          <div className="flex flex-wrap justify-center gap-2 text-[11px] font-bold">
            {vatNumber && (
              <span className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-2xs">
                <FileCheck size={13} className="text-emerald-600" />
                <span>{isArabic ? 'رقم الضريبة:' : 'VAT No:'} {vatNumber}</span>
              </span>
            )}
            {crNumber && (
              <span className="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-2xs">
                <FileCheck size={13} className="text-amber-600" />
                <span>{isArabic ? 'السجل التجاري:' : 'CR No:'} {crNumber}</span>
              </span>
            )}
          </div>
        </div>

        {/* Single Image Carousel Container */}
        <div 
          className="relative group rounded-2xl overflow-hidden bg-neutral-900 border border-black/10 shadow-2xl"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full flex items-center justify-center overflow-hidden bg-neutral-950">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentBadge.id || currentIndex}
                initial={{ opacity: 0, x: isArabic ? -50 : 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isArabic ? 50 : -50 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="w-full h-full flex flex-col items-center justify-center cursor-pointer relative"
                onClick={() => setIsLightboxOpen(true)}
              >
                <img
                  src={currentBadge.imageUrl}
                  alt={isArabic ? currentBadge.titleAr : currentBadge.title}
                  className="w-full h-full object-contain p-2 sm:p-4 hover:scale-102 transition-transform duration-500"
                />

                {/* Overlay Title & Enlarge Hint */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 sm:p-6 text-white flex items-end justify-between">
                  <div className="text-right">
                    <span className="inline-block bg-yellow text-black text-[10px] font-black px-2.5 py-1 rounded-md mb-1 uppercase tracking-widest">
                      {isArabic ? `شهادة ${currentIndex + 1} من ${badges.length}` : `Certificate ${currentIndex + 1} of ${badges.length}`}
                    </span>
                    <h4 className="text-base sm:text-lg font-black text-white leading-tight">
                      {isArabic ? (currentBadge.titleAr || currentBadge.title) : (currentBadge.title || currentBadge.titleAr)}
                    </h4>
                    {(currentBadge.subtitleAr || currentBadge.subtitle) && (
                      <p className="text-xs text-white/70 font-medium mt-0.5">
                        {isArabic ? (currentBadge.subtitleAr || currentBadge.subtitle) : (currentBadge.subtitle || currentBadge.subtitleAr)}
                      </p>
                    )}
                  </div>

                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsLightboxOpen(true); }}
                    className="bg-white/20 hover:bg-yellow hover:text-black text-white p-2.5 rounded-xl backdrop-blur-md transition-all shadow-lg flex items-center gap-1.5 text-xs font-bold"
                    title={isArabic ? 'تكبير' : 'Enlarge'}
                  >
                    <Maximize2 size={16} />
                    <span className="hidden sm:inline">{isArabic ? 'تكبير الشهادة' : 'Enlarge'}</span>
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation Arrows */}
            {badges.length > 1 && (
              <>
                <button
                  onClick={handlePrev}
                  className={`absolute ${isArabic ? 'right-3 sm:right-5' : 'left-3 sm:left-5'} top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-black/60 hover:bg-yellow hover:text-black text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-xl z-10 cursor-pointer border border-white/20`}
                  aria-label="Previous image"
                >
                  <ChevronRight size={24} className={isArabic ? '' : 'rotate-180'} />
                </button>
                <button
                  onClick={handleNext}
                  className={`absolute ${isArabic ? 'left-3 sm:left-5' : 'right-3 sm:right-5'} top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-black/60 hover:bg-yellow hover:text-black text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-xl z-10 cursor-pointer border border-white/20`}
                  aria-label="Next image"
                >
                  <ChevronLeft size={24} className={isArabic ? '' : 'rotate-180'} />
                </button>
              </>
            )}
          </div>

          {/* Dots Indicator & Slide Control Bar */}
          {badges.length > 1 && (
            <div className="bg-neutral-900/90 py-3 px-6 flex items-center justify-between border-t border-white/10">
              <div className="flex items-center gap-2">
                {badges.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                      idx === currentIndex ? 'w-8 bg-yellow' : 'w-2.5 bg-white/30 hover:bg-white/60'
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>

              <div className="text-[11px] font-mono text-white/50 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{isArabic ? 'تحرك تلقائي' : 'Auto-sliding'}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal for Full Resolution Certificate View */}
      <AnimatePresence>
        {isLightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl p-4 sm:p-8 flex flex-col items-center justify-center"
            onClick={() => setIsLightboxOpen(false)}
          >
            {/* Modal Controls */}
            <div className="absolute top-6 right-6 flex items-center gap-3 z-50">
              <button
                onClick={() => setIsLightboxOpen(false)}
                className="bg-white/10 hover:bg-red-500 text-white p-3 rounded-full backdrop-blur-md transition-all cursor-pointer shadow-2xl border border-white/20"
                aria-label="Close"
              >
                <X size={24} />
              </button>
            </div>

            <div 
              className="max-w-4xl w-full max-h-[85vh] flex flex-col items-center justify-center relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 text-center">
                <h3 className="text-xl sm:text-2xl font-black text-white mb-1">
                  {isArabic ? (currentBadge.titleAr || currentBadge.title) : (currentBadge.title || currentBadge.titleAr)}
                </h3>
                <p className="text-sm text-yellow font-bold">
                  {isArabic ? (currentBadge.subtitleAr || currentBadge.subtitle) : (currentBadge.subtitle || currentBadge.subtitleAr)}
                </p>
              </div>

              <div className="w-full max-h-[70vh] bg-white rounded-2xl overflow-hidden p-2 shadow-2xl border border-white/20 flex items-center justify-center">
                <img
                  src={currentBadge.imageUrl}
                  alt={isArabic ? currentBadge.titleAr : currentBadge.title}
                  className="max-w-full max-h-[68vh] object-contain rounded-xl"
                />
              </div>

              <div className="mt-6 flex items-center justify-between w-full max-w-md text-xs text-white/60">
                <button
                  onClick={handlePrev}
                  className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                >
                  <ChevronRight size={16} className={isArabic ? '' : 'rotate-180'} />
                  <span>{isArabic ? 'الشهادة السابقة' : 'Previous'}</span>
                </button>
                <span className="font-mono text-yellow font-bold">
                  {currentIndex + 1} / {badges.length}
                </span>
                <button
                  onClick={handleNext}
                  className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>{isArabic ? 'الشهادة التالية' : 'Next'}</span>
                  <ChevronLeft size={16} className={isArabic ? '' : 'rotate-180'} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
