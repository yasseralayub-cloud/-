import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { VerificationBadge } from '../types';
import { convertPdfToJpeg } from '../lib/pdfUtils';
import { Maximize2, X, FileCheck, Building2, Check, Copy, ExternalLink } from 'lucide-react';

interface VerificationCarouselProps {
  badges: VerificationBadge[];
  isArabic: boolean;
  vatNumber?: string;
  crNumber?: string;
}

export default function VerificationCarousel({ badges, isArabic, vatNumber, crNumber }: VerificationCarouselProps) {
  const [selectedBadge, setSelectedBadge] = useState<VerificationBadge | null>(null);
  const [copiedType, setCopiedType] = useState<'vat' | 'cr' | null>(null);
  const [pdfRenderMap, setPdfRenderMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!badges || badges.length === 0) return;

    badges.forEach((badge) => {
      const bKey = badge.id || badge.imageUrl;
      if (badge.imageUrl && badge.imageUrl.startsWith('data:application/pdf') && !pdfRenderMap[bKey]) {
        convertPdfToJpeg(badge.imageUrl)
          .then((jpegUrl) => {
            setPdfRenderMap((prev) => ({ ...prev, [bKey]: jpegUrl }));
          })
          .catch((err) => {
            console.error('Failed to convert PDF in carousel:', err);
          });
      }
    });
  }, [badges]);

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
        {badges.map((badge, index) => {
          const bKey = badge.id || badge.imageUrl || String(index);
          const displayUrl = pdfRenderMap[bKey] || badge.imageUrl;
          const isRawPdfUrl = !pdfRenderMap[bKey] && (badge.imageUrl.startsWith('data:application/pdf') || badge.imageUrl.toLowerCase().includes('.pdf'));

          return (
            <motion.div
              key={badge.id || index}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSelectedBadge(badge)}
              className="group relative bg-white border border-black/10 rounded-3xl p-3 shadow-lg hover:shadow-2xl transition-all cursor-pointer overflow-hidden flex items-center justify-center aspect-[16/10]"
            >
              {isRawPdfUrl ? (
                <iframe
                  src={`${badge.imageUrl}#toolbar=0&navpanes=0`}
                  title={badge.titleAr || badge.title || 'PDF Certificate'}
                  className="w-full h-full rounded-2xl border-none pointer-events-none"
                />
              ) : (
                <img
                  src={displayUrl}
                  alt={badge.titleAr || badge.title || 'Certificate'}
                  className="w-full h-full object-contain rounded-2xl"
                />
              )}

              {/* Hover Enlarge Overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-xs rounded-3xl">
                <div className="bg-yellow text-black font-black px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-xl">
                  <Maximize2 size={16} />
                  <span>{isArabic ? 'عرض الوثيقة' : 'View Document'}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedBadge && (() => {
          const bKey = selectedBadge.id || selectedBadge.imageUrl;
          const modalDisplayUrl = pdfRenderMap[bKey] || selectedBadge.imageUrl;
          const isRawPdfUrl = !pdfRenderMap[bKey] && (selectedBadge.imageUrl.startsWith('data:application/pdf') || selectedBadge.imageUrl.toLowerCase().includes('.pdf'));

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md p-4 sm:p-8 flex items-center justify-center"
              onClick={() => setSelectedBadge(null)}
            >
              <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-50">
                <h3 className="text-white font-bold text-lg">
                  {isArabic ? selectedBadge.titleAr || selectedBadge.title : selectedBadge.title || selectedBadge.titleAr}
                </h3>
                <div className="flex items-center gap-3">
                  {selectedBadge.imageUrl.startsWith('http') && (
                    <a
                      href={selectedBadge.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white/20 hover:bg-white/30 text-white p-3 rounded-full transition-all flex items-center gap-2 text-xs font-bold"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink size={18} />
                      <span className="hidden sm:inline">{isArabic ? 'فتح الملف' : 'Open File'}</span>
                    </a>
                  )}
                  <button
                    onClick={() => setSelectedBadge(null)}
                    className="bg-white/20 hover:bg-red-500 text-white p-3 rounded-full transition-all cursor-pointer"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div 
                className="relative max-w-5xl w-full h-[82vh] mt-12 flex items-center justify-center p-2"
                onClick={(e) => e.stopPropagation()}
              >
                {isRawPdfUrl ? (
                  <iframe
                    src={selectedBadge.imageUrl}
                    title={selectedBadge.titleAr || selectedBadge.title || 'Certificate Document'}
                    className="w-full h-full rounded-2xl bg-white shadow-2xl border-none"
                  />
                ) : (
                  <img
                    src={modalDisplayUrl}
                    alt={selectedBadge.titleAr || selectedBadge.title || 'Certificate'}
                    className="max-w-full max-h-[80vh] object-contain rounded-2xl bg-white shadow-2xl p-2"
                  />
                )}
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </section>
  );
}
