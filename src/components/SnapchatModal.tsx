import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ExternalLink, QrCode } from 'lucide-react';
import { SnapchatIcon } from './SocialIcons';

interface SnapchatModalProps {
  isOpen: boolean;
  onClose: () => void;
  username?: string;
  qrCodeUrl?: string;
  isArabic?: boolean;
}

export const SnapchatModal: React.FC<SnapchatModalProps> = ({
  isOpen,
  onClose,
  username = 'bbq_trip',
  qrCodeUrl = '/snapchat_qr.jpg',
  isArabic = true,
}) => {
  if (!isOpen) return null;

  // Formulate Snapchat URL
  const cleanUsername = username.replace('@', '').trim();
  const snapchatUrl = cleanUsername.startsWith('http')
    ? cleanUsername
    : `https://snapchat.com/add/${cleanUsername}`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative bg-black text-white w-full max-w-sm rounded-[2.5rem] border-2 border-yellow/40 p-6 sm:p-8 shadow-2xl overflow-hidden flex flex-col items-center text-center"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 left-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all cursor-pointer"
          >
            <X size={20} />
          </button>

          {/* Header Badge */}
          <div className="inline-flex items-center gap-2 bg-[#FFFC00] text-black px-4 py-1.5 rounded-full text-xs font-black shadow-lg mb-4">
            <SnapchatIcon className="w-4 h-4" />
            <span>Snapchat</span>
          </div>

          <h3 className="font-sans text-2xl font-black text-yellow mb-1">
            {isArabic ? 'تابعنا على سناب شات' : 'Follow us on Snapchat'}
          </h3>
          <p className="text-white/60 text-xs mb-6 font-mono dir-ltr">
            @{cleanUsername}
          </p>

          {/* Snapcode QR Image Container */}
          <div className="relative w-56 h-56 bg-[#FFFC00] p-3 rounded-3xl shadow-2xl border-4 border-yellow mb-6 flex items-center justify-center group overflow-hidden">
            <img
              src={qrCodeUrl}
              alt={`Snapchat QR code @${cleanUsername}`}
              className="w-full h-full object-contain rounded-2xl group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                // Fallback to placeholder if image fails
                (e.target as HTMLImageElement).src = '/snapchat_qr.jpg';
              }}
            />
            <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
              <span className="bg-black/90 text-yellow text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                <QrCode size={14} />
                {isArabic ? 'امسح الكود' : 'Scan Code'}
              </span>
            </div>
          </div>

          <p className="text-white/70 text-xs mb-6 max-w-xs leading-relaxed">
            {isArabic
              ? 'امسح الكود أعلاه بكاميرا السناب شات أو اضغط على الزر أدناه للمتابعة المباشرة'
              : 'Scan the code with your Snapchat camera or click below to add directly'}
          </p>

          {/* Open Snapchat Direct Button */}
          <a
            href={snapchatUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-[#FFFC00] hover:bg-[#e6e300] text-black font-black py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl hover:scale-105 active:scale-95 text-sm"
          >
            <SnapchatIcon className="w-5 h-5 fill-black" />
            <span>{isArabic ? 'فتح حساب السناب شات' : 'Open Snapchat Account'}</span>
            <ExternalLink size={16} />
          </a>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
