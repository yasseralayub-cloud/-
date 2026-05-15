import { motion } from 'motion/react';
import * as Icons from 'lucide-react';
import { categories } from '../data/mockMenu';

interface CategoryFilterProps {
  selectedCategory: string;
  onSelect: (id: string) => void;
  isArabic: boolean;
}

export default function CategoryFilter({ selectedCategory, onSelect, isArabic }: CategoryFilterProps) {
  return (
    <div className="flex overflow-x-auto gap-4 px-6 py-4 no-scrollbar justify-start md:justify-center mb-8" dir={isArabic ? 'rtl' : 'ltr'}>
      {categories.map((category) => {
        const Icon = (Icons as any)[category.icon];
        const isActive = selectedCategory === category.id;

        return (
          <button
            key={category.id}
            onClick={() => onSelect(category.id)}
            id={`category-${category.id}`}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-full border transition-all shrink-0
              ${isActive 
                ? 'bg-black text-yellow border-black shadow-lg scale-105' 
                : 'bg-white text-dark/60 border-black/10 hover:border-yellow hover:text-yellow'}
            `}
          >
            {Icon && <Icon size={18} />}
            <span className={`font-medium ${isArabic ? 'text-lg' : 'text-sm uppercase tracking-wider'}`}>
              {isArabic ? category.labelAr : category.label}
            </span>
            {isActive && (
              <motion.div
                layoutId="active-pill"
                className="absolute inset-0 bg-dark rounded-full -z-10"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
