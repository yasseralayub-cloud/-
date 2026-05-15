import { motion } from 'motion/react';
import { MenuItem } from '../types';
import { Flame } from 'lucide-react';

interface MenuCardProps {
  item: MenuItem;
  isArabic: boolean;
}

export default function MenuCard({ item, isArabic }: MenuCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white rounded-xl p-5 border border-dark/5 shadow-sm hover:shadow-md transition-all duration-300 relative group overflow-hidden"
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      {/* Popular Badge */}
      {item.isPopular && (
        <div className={`absolute top-0 ${isArabic ? 'left-0 rounded-br-lg' : 'right-0 rounded-bl-lg'} bg-yellow text-black px-3 py-1 text-[10px] font-bold uppercase tracking-tighter z-10 shadow-sm`}>
          {isArabic ? 'الأكثر طلباً' : 'Popular'}
        </div>
      )}

      <div className="flex flex-col h-full">
        <div className="flex justify-between items-start gap-4 mb-2">
          <div className="flex-1">
            <h3 className={`text-lg font-bold group-hover:text-yellow transition-colors duration-300 leading-tight ${isArabic ? 'font-sans' : 'font-serif'}`}>
              {isArabic ? item.nameAr : item.name}
            </h3>
            {item.calories && (
              <div className="flex items-center gap-1.5 text-xs text-black/40 mt-1 font-medium">
                <Flame size={12} className="text-yellow/60" />
                <span>{item.calories} {isArabic ? 'سعرة' : 'kcal'}</span>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end">
            <span className="font-serif text-xl font-bold text-dark whitespace-nowrap">
              {item.price} <span className="text-[10px] text-dark/40 uppercase tracking-tighter">{isArabic ? '﷼' : 'SAR'}</span>
            </span>
          </div>
        </div>
        
        <p className="text-dark/50 text-xs leading-relaxed mt-2 line-clamp-2">
          {isArabic ? item.descriptionAr : item.description}
        </p>
      </div>

      {/* Decorative side accent */}
      <div className={`absolute top-1/2 -translate-y-1/2 ${isArabic ? 'right-0' : 'left-0'} w-1 h-12 bg-yellow/20 rounded-full group-hover:h-16 group-hover:bg-yellow transition-all duration-300`} />
    </motion.div>
  );
}
