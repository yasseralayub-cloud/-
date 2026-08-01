import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface GreetingSplashProps {
  onComplete: () => void;
  isArabic?: boolean;
}

function getSmartIsMorning(): boolean {
  try {
    // Determine hour specifically in Saudi Arabia (Asia/Riyadh) timezone
    const riyadhHourStr = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Riyadh',
      hour: 'numeric',
      hour12: false,
    }).format(new Date());

    const hour = parseInt(riyadhHourStr, 10);
    if (!isNaN(hour)) {
      // 4:00 AM (04:00) to 11:59 AM (11:59) is morning
      return hour >= 4 && hour < 12;
    }
  } catch {
    // Fallback to local browser device time
  }

  const localHour = new Date().getHours();
  return localHour >= 4 && localHour < 12;
}

export default function GreetingSplash({ onComplete, isArabic = true }: GreetingSplashProps) {
  const [isVisible, setIsVisible] = useState(true);

  const isMorning = getSmartIsMorning();

  const messageAr = isMorning
    ? 'يا هلا والله بعملاء رحلة شواء الكرام صبحكم الله بالخير'
    : 'يا هلا والله بعملاء رحلة شواء الكرام مساكم الله بالخير';

  const messageEn = isMorning
    ? 'Welcome to BBQ Trip valued guests, good morning'
    : 'Welcome to BBQ Trip valued guests, good evening';

  useEffect(() => {
    // 2.6 seconds timer for reading the greeting then smoothly auto-transition
    const timer = setTimeout(() => {
      handleDismiss();
    }, 2600);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      onComplete();
    }, 350);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          onClick={handleDismiss}
          className="fixed inset-0 z-[100] bg-black text-white flex flex-col items-center justify-center p-4 sm:p-6 text-center cursor-pointer select-none overflow-hidden"
        >
          {/* Ambient background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 sm:w-80 sm:h-80 bg-yellow/10 rounded-full blur-3xl pointer-events-none" />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -15 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="relative z-10 max-w-lg w-full mx-auto space-y-6 px-4"
          >
            {/* Header / Brand Title */}
            <div className="inline-block border-b-2 border-yellow pb-2 px-4">
              <span className="text-yellow text-xs sm:text-sm font-black uppercase tracking-widest">
                رحلة شواء
              </span>
            </div>

            {/* Time-based Greeting Message - Fluid & Mobile-optimized */}
            <h1 className="text-lg sm:text-2xl md:text-3xl font-black text-white leading-relaxed sm:leading-snug tracking-tight">
              {isArabic ? messageAr : messageEn}
            </h1>

            {/* Subtle progress line */}
            <div className="w-28 sm:w-36 h-1 bg-white/10 mx-auto rounded-full overflow-hidden mt-6">
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 2.5, ease: "linear" }}
                className="h-full bg-yellow"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
