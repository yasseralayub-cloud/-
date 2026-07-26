import { motion } from 'motion/react';
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
    <div className="flex overflow-x-auto gap-3 px-6 py-6 no-scrollbar justify-start md:justify-center mb-4" dir={isArabic ? 'rtl' : 'ltr'}>
      {displayCategories.map((category) => {
        const isActive = selectedCategory === category.id;

        return (
          <button
            key={category.id}
            onClick={() => onSelect(category.id)}
            className={`
              relative flex items-center justify-center px-6 py-3.5 rounded-2xl transition-all duration-300 shrink-0 cursor-pointer
              ${isActive 
                ? 'text-black font-black scale-105' 
                : 'bg-neutral-100/80 text-dark/60 hover:bg-neutral-200/80 hover:text-dark font-bold'}
            `}
          >
            <span className="text-xs uppercase tracking-wider relative z-10">
              {isArabic ? category.labelAr : category.label}
            </span>
            
            {isActive && (
              <motion.div
                layoutId="active-bg"
                className="absolute inset-0 bg-yellow border border-black/10 shadow-lg shadow-yellow/20 rounded-2xl -z-0"
                transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
