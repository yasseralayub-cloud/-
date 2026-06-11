import { motion } from 'motion/react';
import * as Icons from 'lucide-react';
import { Category } from '../types';
import { categories as mockCategories } from '../data/mockMenu';

interface CategoryFilterProps {
  selectedCategory: string;
  onSelect: (id: string) => void;
  isArabic: boolean;
  customCategories?: Category[];
}

export default function CategoryFilter({ selectedCategory, onSelect, isArabic, customCategories }: CategoryFilterProps) {
  const displayCategories = customCategories && customCategories.length > 0 ? customCategories : mockCategories;
  return (
    <div className="flex overflow-x-auto gap-4 px-6 py-8 no-scrollbar justify-start md:justify-center mb-4" dir={isArabic ? 'rtl' : 'ltr'}>
      {displayCategories.map((category) => {
        const Icon = (Icons as any)[category.icon] || Icons.Utensils;
        const isActive = selectedCategory === category.id;

        return (
          <button
            key={category.id}
            onClick={() => onSelect(category.id)}
            className={`
              relative flex flex-col items-center gap-3 px-8 py-6 rounded-[2rem] transition-all duration-500 shrink-0 min-w-[120px]
              ${isActive 
                ? 'text-black scale-105' 
                : 'bg-neutral-50 text-dark/40 hover:bg-neutral-100 hover:text-dark'}
            `}
          >
            <div className={`
              w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500
              ${isActive ? 'bg-yellow text-black rotate-12 shadow-lg shadow-yellow/20' : 'bg-black/5'}
            `}>
              {Icon && <Icon size={24} strokeWidth={1.5} />}
            </div>
            <span className={`font-black uppercase tracking-widest text-[10px] ${isActive ? 'opacity-100' : 'opacity-60'}`}>
              {isArabic ? category.labelAr : category.label}
            </span>
            
            {isActive && (
              <motion.div
                layoutId="active-bg"
                className="absolute inset-0 bg-white border border-black/5 shadow-xl shadow-black/5 rounded-[2rem] -z-10"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
