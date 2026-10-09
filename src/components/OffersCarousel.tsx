import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Flame, Sparkles } from 'lucide-react';
import { Offer, FallbackOfferSettings } from '../types';

interface OffersCarouselProps {
  offers: Offer[];
  isArabic: boolean;
  fallbackOffer?: FallbackOfferSettings | null;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

function calculateTimeRemaining(targetDateStr: string): TimeRemaining {
  if (!targetDateStr) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }
  const target = new Date(targetDateStr).getTime();
  const now = new Date().getTime();
  const diff = target - now;

  if (isNaN(target) || diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, isExpired: false };
}

// Sub-component for individual real-time countdown timer
function OfferCountdownTimer({ targetDate, isArabic }: { targetDate: string; isArabic: boolean }) {
  const [timeLeft, setTimeLeft] = useState<TimeRemaining>(() => calculateTimeRemaining(targetDate));

  useEffect(() => {
    setTimeLeft(calculateTimeRemaining(targetDate));
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeRemaining(targetDate));
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (timeLeft.isExpired) {
    return (
      <div className="inline-flex items-center gap-2 bg-red-950/80 border border-red-500/40 text-red-200 px-3 py-1.5 rounded-xl text-xs font-bold backdrop-blur-md shadow-md">
        <Clock size={14} className="text-red-400 animate-pulse" />
        <span>{isArabic ? 'انتهى هذا العرض' : 'Offer ended'}</span>
      </div>
    );
  }

  const padZero = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="flex flex-col sm:flex-row items-center gap-2">
      <div className="flex items-center gap-1.5 text-yellow text-xs font-black uppercase tracking-wider">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow"></span>
        </span>
        <Clock size={13} className="shrink-0" />
        <span>{isArabic ? 'ينتهي خلال:' : 'Ends in:'}</span>
      </div>

      <div className="flex items-center gap-1 sm:gap-1.5 text-white" dir="ltr">
        {/* Days */}
        {timeLeft.days > 0 && (
          <>
            <div className="flex flex-col items-center justify-center bg-black/80 border border-yellow/40 rounded-lg min-w-[38px] sm:min-w-[44px] py-1 px-1.5 shadow-md">
              <span className="text-sm sm:text-base font-black font-mono text-yellow leading-none">
                {padZero(timeLeft.days)}
              </span>
              <span className="text-[8px] sm:text-[9px] text-white/70 font-bold uppercase mt-0.5">
                {isArabic ? 'يوم' : 'Days'}
              </span>
            </div>
            <span className="text-yellow/70 font-black text-xs">:</span>
          </>
        )}

        {/* Hours */}
        <div className="flex flex-col items-center justify-center bg-black/80 border border-yellow/40 rounded-lg min-w-[38px] sm:min-w-[44px] py-1 px-1.5 shadow-md">
          <span className="text-sm sm:text-base font-black font-mono text-yellow leading-none">
            {padZero(timeLeft.hours)}
          </span>
          <span className="text-[8px] sm:text-[9px] text-white/70 font-bold uppercase mt-0.5">
            {isArabic ? 'ساعة' : 'Hours'}
          </span>
        </div>
        <span className="text-yellow/70 font-black text-xs">:</span>

        {/* Minutes */}
        <div className="flex flex-col items-center justify-center bg-black/80 border border-yellow/40 rounded-lg min-w-[38px] sm:min-w-[44px] py-1 px-1.5 shadow-md">
          <span className="text-sm sm:text-base font-black font-mono text-yellow leading-none">
            {padZero(timeLeft.minutes)}
          </span>
          <span className="text-[8px] sm:text-[9px] text-white/70 font-bold uppercase mt-0.5">
            {isArabic ? 'دقيقة' : 'Mins'}
          </span>
        </div>
        <span className="text-yellow/70 font-black text-xs">:</span>

        {/* Seconds */}
        <div className="flex flex-col items-center justify-center bg-black/80 border border-yellow/40 rounded-lg min-w-[38px] sm:min-w-[44px] py-1 px-1.5 shadow-md">
          <span className="text-sm sm:text-base font-black font-mono text-yellow leading-none">
            {padZero(timeLeft.seconds)}
          </span>
          <span className="text-[8px] sm:text-[9px] text-white/70 font-bold uppercase mt-0.5">
            {isArabic ? 'ثانية' : 'Secs'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function OffersCarousel({ offers, isArabic, fallbackOffer }: OffersCarouselProps) {
  const [now, setNow] = useState(() => Date.now());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isDragging = useRef<boolean>(false);

  // Keep current time updated every second so expired offers disappear in real time
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter only active, already started (now >= startDate), and strictly unexpired (now < targetDate) offers
  const validActiveOffers = useMemo(() => {
    return offers.filter(o => {
      if (!o || !o.isActive) return false;
      
      // 1. If start date is set in the future, offer is scheduled and will auto-activate once start date arrives
      if (o.startDate) {
        const startTime = new Date(o.startDate).getTime();
        if (!isNaN(startTime) && startTime > now) {
          return false;
        }
      }

      // 2. End date check: must not have expired
      if (!o.targetDate) return false;
      const targetTime = new Date(o.targetDate).getTime();
      if (isNaN(targetTime)) return false;
      return targetTime > now;
    });
  }, [offers, now]);

  // Ensure current index is within bounds of remaining valid offers
  const safeIndex = validActiveOffers.length === 0 ? 0 : (currentIndex >= validActiveOffers.length ? 0 : currentIndex);
  const currentOffer = validActiveOffers[safeIndex];

  const handleNext = useCallback(() => {
    if (validActiveOffers.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % validActiveOffers.length);
  }, [validActiveOffers.length]);

  const handlePrev = useCallback(() => {
    if (validActiveOffers.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + validActiveOffers.length) % validActiveOffers.length);
  }, [validActiveOffers.length]);

  // Automatic slide rotation
  useEffect(() => {
    if (validActiveOffers.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      handleNext();
    }, 6000); // 6 seconds per slide

    return () => clearInterval(timer);
  }, [validActiveOffers.length, isPaused, handleNext]);

  // Touch handlers for seamless mobile touch swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setIsPaused(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current !== null && touchEndX.current !== null) {
      const distanceX = touchStartX.current - touchEndX.current;
      const distanceY = touchStartY.current !== null && e.changedTouches?.[0]
        ? Math.abs(touchStartY.current - e.changedTouches[0].clientY)
        : 0;

      // Only trigger horizontal swipe if horizontal swipe is dominant over vertical scroll
      if (Math.abs(distanceX) > 35 && Math.abs(distanceX) > distanceY) {
        if (distanceX > 0) {
          isArabic ? handlePrev() : handleNext();
        } else {
          isArabic ? handleNext() : handlePrev();
        }
      }
    }
    touchStartX.current = null;
    touchEndX.current = null;
    touchStartY.current = null;
    setIsPaused(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    touchStartX.current = e.clientX;
    isDragging.current = true;
    setIsPaused(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging.current) {
      touchEndX.current = e.clientX;
    }
  };

  const handleMouseUp = () => {
    if (isDragging.current && touchStartX.current !== null && touchEndX.current !== null) {
      const distance = touchStartX.current - touchEndX.current;
      const minSwipeDistance = 45;
      if (Math.abs(distance) > minSwipeDistance) {
        if (distance > 0) {
          isArabic ? handlePrev() : handleNext();
        } else {
          isArabic ? handleNext() : handlePrev();
        }
      }
    }
    isDragging.current = false;
    touchStartX.current = null;
    touchEndX.current = null;
    setIsPaused(false);
  };

  // If no valid active offers exist, check if a single fallback image is configured from admin
  if (validActiveOffers.length === 0) {
    if (fallbackOffer && fallbackOffer.imageUrl) {
      return (
        <section 
          className="relative w-full bg-neutral-950 border-b border-yellow/20 select-none py-5 sm:py-7 px-4 sm:px-6"
          dir={isArabic ? 'rtl' : 'ltr'}
          aria-label={isArabic ? 'قسم العروض' : 'Offers Section'}
        >
          <div className="max-w-5xl mx-auto">
            {/* Header Above Image */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Flame size={17} className="text-yellow fill-yellow animate-bounce" />
                  <span className="text-yellow text-xs font-black uppercase tracking-wider">
                    {isArabic ? 'قسم العروض' : 'Special Offers'}
                  </span>
                </div>
                <h2 className="text-white text-xl sm:text-2xl md:text-3xl font-black leading-snug">
                  {isArabic 
                    ? (fallbackOffer.titleAr || fallbackOffer.title || 'عروضنا المميزة')
                    : (fallbackOffer.title || fallbackOffer.titleAr || 'Special Offers')}
                </h2>
                {(fallbackOffer.subtitleAr || fallbackOffer.subtitle) && (
                  <p className="text-white/60 text-xs sm:text-sm mt-0.5 font-medium">
                    {isArabic ? fallbackOffer.subtitleAr : fallbackOffer.subtitle}
                  </p>
                )}
              </div>
            </div>

            {/* Single Fallback Image */}
            <div className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden bg-black shadow-2xl border border-white/10 flex items-center justify-center min-h-[220px] sm:min-h-[360px] md:min-h-[440px]">
              <img
                src={fallbackOffer.imageUrl}
                alt={fallbackOffer.titleAr || fallbackOffer.title || (isArabic ? 'صورة العروض' : 'Offers Banner')}
                className="w-full h-auto max-h-[70vh] sm:max-h-[520px] object-contain rounded-xl sm:rounded-2xl transition-all"
                draggable={false}
              />
            </div>
          </div>
        </section>
      );
    }

    // No active offers and no fallback image: hide section completely
    return null;
  }

  return (
    <section 
      className="relative w-full bg-neutral-950 border-b border-yellow/20 select-none py-5 sm:py-7 px-4 sm:px-6"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      dir={isArabic ? 'rtl' : 'ltr'}
      aria-label={isArabic ? 'قسم العروض' : 'Offers Section'}
    >
      <div className="max-w-5xl mx-auto">
        {/* 1. Header & Title Bar ABOVE the Image */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Flame size={17} className="text-yellow fill-yellow animate-bounce" />
              <span className="text-yellow text-xs font-black uppercase tracking-wider">
                {isArabic ? 'قسم العروض' : 'Special Offers'}
              </span>
              {validActiveOffers.length > 1 && (
                <span className="text-[11px] font-mono text-white/60 bg-white/10 px-2 py-0.5 rounded-full font-bold">
                  {safeIndex + 1} / {validActiveOffers.length}
                </span>
              )}
            </div>
            {/* Offer Title - Displayed clearly ABOVE the image, NOT ON it */}
            <h2 className="text-white text-xl sm:text-2xl md:text-3xl font-black leading-snug">
              {isArabic ? currentOffer.titleAr || currentOffer.title : currentOffer.title || currentOffer.titleAr}
            </h2>
          </div>

          {/* Real-time Countdown Timer - Positioned ABOVE the image */}
          {currentOffer.targetDate && (
            <div className="shrink-0 bg-neutral-900/90 border border-yellow/30 px-3.5 py-2 rounded-2xl shadow-lg">
              <OfferCountdownTimer targetDate={currentOffer.targetDate} isArabic={isArabic} />
            </div>
          )}
        </div>

        {/* 2. Clear, Crystal-Sharp Image Stage - Touch controlled, NO ARROWS covering the image */}
        <div 
          className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden bg-black shadow-2xl border border-white/10 flex items-center justify-center min-h-[240px] sm:min-h-[380px] md:min-h-[460px] cursor-grab active:cursor-grabbing touch-pan-y"
          style={{ touchAction: 'pan-y' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentOffer.id || safeIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="w-full h-full flex items-center justify-center p-1 sm:p-2"
            >
              {/* Crisp, 100% visible image with NO dark overlays and NO arrows covering it */}
              <img
                src={currentOffer.imageUrl}
                alt={isArabic ? currentOffer.titleAr || currentOffer.title : currentOffer.title || currentOffer.titleAr}
                className="w-full h-auto max-h-[70vh] sm:max-h-[520px] object-contain rounded-xl sm:rounded-2xl transition-all"
                draggable={false}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 3. Bottom Slide Indicators & Touch Hint */}
        {validActiveOffers.length > 1 && (
          <div className="flex items-center justify-between mt-3 px-2 text-white/60 text-xs">
            <span className="font-medium">
              {isArabic ? '👈 اسحب الصورة باللمس للتنقل بين العروض' : '👈 Swipe to browse offers'}
            </span>

            {/* Indicator Dots */}
            <div className="flex items-center gap-1.5" dir="ltr">
              {validActiveOffers.map((offer, idx) => (
                <button
                  key={offer.id || idx}
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`Go to offer ${idx + 1}`}
                  className={`transition-all duration-300 rounded-full cursor-pointer ${
                    idx === safeIndex
                      ? 'w-7 h-2 bg-yellow shadow-md shadow-yellow/50'
                      : 'w-2 h-2 bg-white/30 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
