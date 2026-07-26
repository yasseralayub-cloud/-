import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { VerificationBadge } from '../types';
import { Maximize2, X, FileCheck, Building2, Check, Copy } from 'lucide-react';

interface VerificationCarouselProps {
  badges: VerificationBadge[];
  isArabic: boolean;
  vatNumber?: string;
  crNumber?: string;
}

export default function VerificationCarousel({ badges, isArabic, vatNumber, crNumber }: VerificationCarouselProps) {
  const [selectedBadge, setSelectedBadge] = useState<VerificationBadge | null>(null);
  const [copiedType, setCopiedType] = useState<'vat' | 'cr' | null>(null);

  if (!badges || badges.length === 0) return null;

  const handleCopy = (text: string, type: 'vat' | 'cr') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <section className="mt-16 px-4 sm:px-6 max-w-5xl mx-auto" dir={isArabic ? 'rtl' : 'ltr'}>
      {/* Optional Numbers Copy Bar */}
      {(vatNumber || crNumber) && (
        <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
          {vatNumber && (
            <button
              onClick={() => handleCopy(vatNumber, 'vat')}
              className="bg-black/90 hover:bg-black text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-bold transition-all cursor-pointer shadow-md"
            >
              <FileCheck size={14} className="text-emerald-400" />
              <span>{isArabic ? 'الرقم الضريبي:' : 'VAT:'} <strong className="font-mono text-white tracking-wider">{vatNumber}</strong></span>
              {copiedType === 'vat' ? (
                <Check size={14} className="text-emerald-400" />
              ) : (
                <Copy size={13} className="text-white/40" />
              )}
            </button>
          )}

          {crNumber && (
            <button
              onClick={() => handleCopy(crNumber, 'cr')}
              className="bg-black/90 hover:bg-black text-amber-400 border border-amber-500/30 px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-bold transition-all cursor-pointer shadow-md"
            >
              <Building2 size={14} className="text-amber-400" />
              <span>{isArabic ? 'السجل التجاري:' : 'CR:'} <strong className="font-mono text-white tracking-wider">{crNumber}</strong></span>
              {copiedType === 'cr' ? (
                <Check size={14} className="text-amber-400" />
              ) : (
                <Copy size={13} className="text-white/40" />
              )}
            </button>
          )}
        </div>
      )}

      {/* Direct Clean Images Grid */}
      <div className={`grid grid-cols-1 ${badges.length > 1 ? 'sm:grid-cols-2' : ''} gap-6`}>
        {badges.map((badge, index) => (
          <motion.div
            key={badge.id || index}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
            onClick={() => setSelectedBadge(badge)}
            className="group relative bg-white border border-black/10 rounded-3xl p-3 shadow-lg hover:shadow-2xl transition-all cursor-pointer overflow-hidden flex items-center justify-center aspect-[16/10]"
          >
            <img
              src={badge.imageUrl}
              alt={badge.titleAr || badge.title || 'Certificate'}
              className="w-full h-full object-contain rounded-2xl"
            />

            {/* Hover Enlarge Overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-xs rounded-3xl">
              <div className="bg-yellow text-black font-black px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-xl">
                <Maximize2 size={16} />
                <span>{isArabic ? 'تكبير الصورة' : 'Enlarge Image'}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedBadge && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md p-4 sm:p-8 flex items-center justify-center"
            onClick={() => setSelectedBadge(null)}
          >
            <button
              onClick={() => setSelectedBadge(null)}
              className="absolute top-6 right-6 bg-white/20 hover:bg-red-500 text-white p-3 rounded-full transition-all cursor-pointer z-50"
            >
              <X size={24} />
            </button>

            <div 
              className="relative max-w-5xl w-full max-h-[90vh] flex items-center justify-center p-2"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedBadge.imageUrl}
                alt={selectedBadge.titleAr || selectedBadge.title || 'Certificate'}
                className="max-w-full max-h-[85vh] object-contain rounded-2xl bg-white shadow-2xl p-2"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}


