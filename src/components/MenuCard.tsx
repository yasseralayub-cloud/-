import { motion } from 'motion/react';
import { MenuItem } from '../types';
import { Flame } from 'lucide-react';
import { SarSymbol } from './SarSymbol';

interface MenuCardProps {
  item: MenuItem;
  isArabic: boolean;
  vatEnabled?: boolean;
  vatIncludedInPrices?: boolean;
  vatRate?: number;
}

export default function MenuCard({ 
  item, 
  isArabic, 
  vatEnabled = true, 
  vatIncludedInPrices = true,
  vatRate = 15 
}: MenuCardProps) {
  const itemPrice = Number(item.price) || 0;
  const isExempt = !!item.isVatExempt;
  const isIncludesVat = item.includesVat !== undefined ? item.includesVat : vatIncludedInPrices;

  // Calculate prices before and after VAT
  let priceBeforeVat = itemPrice;
  let priceWithVat = itemPrice;
  let calculatedVatAmount = 0;

  if (vatEnabled && !isExempt) {
    if (isIncludesVat) {
      priceWithVat = itemPrice;
      priceBeforeVat = itemPrice / (1 + vatRate / 100);
      calculatedVatAmount = priceWithVat - priceBeforeVat;
    } else {
      priceBeforeVat = itemPrice;
      calculatedVatAmount = itemPrice * (vatRate / 100);
      priceWithVat = itemPrice + calculatedVatAmount;
    }
  }

  // Format price using English/Western digits
  const formatPrice = (val: number) => {
    return val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      className="bg-white rounded-[2rem] border border-dark/5 shadow-sm hover:shadow-xl transition-all duration-500 relative group overflow-hidden flex flex-col h-full"
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      {/* Popular Badge */}
      {item.isPopular && (
        <div className={`absolute top-4 ${isArabic ? 'left-4' : 'right-4'} bg-yellow text-black px-4 py-1.5 text-[10px] font-black uppercase tracking-widest z-10 shadow-lg rounded-full flex items-center gap-1.5`}>
          <Flame size={12} fill="currentColor" />
          {isArabic ? 'الأكثر طلباً' : 'Popular'}
        </div>
      )}

      {/* Image Section */}
      <div className="relative h-56 overflow-hidden bg-neutral-100 group-hover:cursor-pointer">
        {item.image ? (
          <img 
            src={item.image} 
            alt={isArabic ? item.nameAr : item.name} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-dark/10">
            <Flame size={48} strokeWidth={1} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>

      {/* Content Section */}
      <div className="p-6 flex flex-col flex-1">
        <div className="flex justify-between items-start gap-4 mb-4">
          <div className="flex-1">
            <h3 className={`text-xl font-black text-dark group-hover:text-yellow transition-colors duration-300 leading-tight mb-1 ${isArabic ? 'font-sans' : 'font-serif tracking-tight'}`}>
              {isArabic ? item.nameAr : item.name}
            </h3>
            <p className="text-dark/40 text-[10px] uppercase font-bold tracking-widest">
              {item.category}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {vatEnabled && !isExempt ? (
              <div className="bg-dark text-yellow px-4 py-2.5 rounded-2xl flex flex-col items-end shadow-md group-hover:scale-105 transition-transform duration-300">
                {/* After Tax Price (السعر شامل الضريبة) */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-white/70 font-bold">
                    {isArabic ? 'شامل الضريبة:' : 'Incl. VAT:'}
                  </span>
                  <span className="font-sans text-lg font-black leading-none text-yellow">
                    {formatPrice(priceWithVat)}
                  </span>
                  <SarSymbol className="text-xs font-bold text-yellow" />
                </div>
                {/* Before Tax Price (السعر قبل الضريبة) */}
                <div className="flex items-center gap-1 border-t border-white/10 pt-1 mt-1 text-white/80 w-full justify-end">
                  <span className="text-[9px] text-white/60 font-medium">
                    {isArabic ? 'قبل الضريبة:' : 'Excl. VAT:'}
                  </span>
                  <span className="font-sans text-xs font-bold text-white">
                    {formatPrice(priceBeforeVat)}
                  </span>
                  <SarSymbol className="text-[10px] font-bold text-white/70" />
                </div>
              </div>
            ) : (
              <div className="bg-dark text-yellow px-4 py-2 rounded-2xl flex items-center gap-1 shadow-md group-hover:scale-105 transition-transform duration-300">
                <span className="font-sans text-lg font-black leading-none">
                  {formatPrice(itemPrice)}
                </span>
                <SarSymbol className="text-xs font-bold text-yellow" />
              </div>
            )}

            {/* VAT Display Tag */}
            {vatEnabled && (
              isExempt ? (
                <span className="text-[9px] text-amber-700 bg-amber-50 font-bold tracking-tighter px-2.5 py-0.5 rounded-full border border-amber-200/60">
                  {isArabic ? 'معفى من الضريبة' : 'VAT Exempt'}
                </span>
              ) : (
                <span className="text-[9px] text-emerald-800 bg-emerald-50/90 font-bold tracking-tighter px-2.5 py-0.5 rounded-full border border-emerald-200/60">
                  {isArabic 
                    ? `مبلغ الضريبة (${vatRate}%): ${formatPrice(calculatedVatAmount)} ﷼` 
                    : `VAT (${vatRate}%): ${formatPrice(calculatedVatAmount)} ﷼`}
                </span>
              )
            )}
          </div>
        </div>
        
        <p className="text-dark/60 text-sm leading-relaxed mb-6 line-clamp-3 flex-1">
          {isArabic ? item.descriptionAr : item.description}
        </p>

        {/* Footer Details */}
        <div className="flex items-center justify-between pt-4 border-t border-black/5">
          {item.calories ? (
            <div className="flex items-center gap-2 text-xs text-dark/40 font-bold">
              <div className="w-1.5 h-1.5 rounded-full bg-yellow" />
              <span>{item.calories} {isArabic ? 'سعرة حرارية' : 'KCAL'}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-dark/20 font-bold">
              <div className="w-1.5 h-1.5 rounded-full bg-black/5" />
              <span>{isArabic ? 'جودة مضمونة' : 'Quality Guaranteed'}</span>
            </div>
          )}
          
          <div className="h-8 w-8 rounded-full border border-black/5 flex items-center justify-center text-dark/40 group-hover:bg-yellow group-hover:text-black group-hover:border-yellow transition-all duration-300">
            <Flame size={14} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
