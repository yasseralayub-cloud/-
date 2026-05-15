/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, MapPin } from 'lucide-react';
import MenuHeader from './components/MenuHeader';
import CategoryFilter from './components/CategoryFilter';
import MenuCard from './components/MenuCard';
import LanguageToggle from './components/LanguageToggle';
import { menuItems } from './data/mockMenu';

export default function App() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isArabic, setIsArabic] = useState(true);

  const filteredItems = useMemo(() => {
    if (selectedCategory === 'all') return menuItems;
    return menuItems.filter((item) => item.category === selectedCategory);
  }, [selectedCategory]);

  return (
    <div className="min-h-screen bg-white pb-20" dir={isArabic ? 'rtl' : 'ltr'}>
      <MenuHeader 
        isArabic={isArabic} 
        onLanguageToggle={() => setIsArabic(!isArabic)} 
      />

      <main className="max-w-7xl mx-auto px-6">
        <CategoryFilter
          selectedCategory={selectedCategory}
          onSelect={setSelectedCategory}
          isArabic={isArabic}
        />

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item, index) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <MenuCard item={item} isArabic={isArabic} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredItems.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-20 text-center"
          >
            <p className="text-dark/40 italic font-serif text-xl">
              {isArabic ? 'لا توجد أطباق في هذا التصنيف حالياً' : 'No items found in this category'}
            </p>
          </motion.div>
        )}
      </main>

      {/* Location Section */}
      <section className="mt-24 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="font-sans text-3xl font-black text-dark uppercase tracking-tight mb-2">
            {isArabic ? 'موقعنا' : 'Our Location'}
          </h2>
          <div className="w-12 h-[2px] bg-yellow mx-auto mb-6" />
          <a 
            href="https://www.google.com/maps/dir/?api=1&destination=26.5148613,43.6442633" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-yellow text-black font-black px-6 py-3 rounded-full hover:scale-105 transition-transform shadow-xl uppercase text-sm"
          >
            <MapPin size={18} />
            {isArabic ? 'فتح في خرائط جوجل' : 'Open in Google Maps'}
          </a>
        </div>
        <div className="rounded-3xl overflow-hidden shadow-2xl border border-black/5 h-[400px] w-full bg-black/5">
          <iframe 
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3570.163633001701!2d43.6442633!3d26.5148613!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1578a9860620016b%3A0x9c1444742cb50351!2z2LHYrdmE2Kkg2LTZiNin2KE!5e0!3m2!1sar!2ssa!4v1778884641466!5m2!1sar!2ssa" 
            width="100%" 
            height="100%" 
            style={{ border: 0 }} 
            allowFullScreen={true} 
            loading="lazy" 
            referrerPolicy="no-referrer-when-downgrade"
            title="Restaurant Location"
          ></iframe>
        </div>
      </section>

      {/* Footer social icons and info */}
      <footer className="mt-32 py-16 border-t border-black/5 bg-black text-center text-white">
        <div className="max-w-md mx-auto px-6">
          <h2 className="font-sans text-3xl mb-4 font-black text-yellow uppercase">رحلة شواء</h2>
          <p className="text-white/60 text-sm mb-6 leading-relaxed">
            {isArabic 
              ? 'نقدم لكم أجود أنواع اللحوم والدواجن المشوية على الفحم، مع شاورما مميزة وتتبيلة سرية تأخذكم في رحلة من النكهات.' 
              : 'We offer the finest types of meat and poultry grilled on charcoal, with a distinctive shawarma and a secret seasoning that takes you on a journey of flavors.'}
          </p>
          
          <div className="mb-8 space-y-2">
            <a href="tel:0502163363" className="block text-2xl font-bold text-yellow hover:scale-105 transition-transform">0502163363</a>
            <p className="text-xs text-white/40 uppercase tracking-widest">
              {isArabic ? 'اتصل بنا للحجز والطلبات' : 'Call us for reservations & orders'}
            </p>
          </div>

          <div className="flex justify-center gap-6 text-yellow font-bold text-xs tracking-widest uppercase">
            <a href="https://wa.me/966502163363" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">WhatsApp</a>
            <a href="https://www.google.com/maps/dir/?api=1&destination=26.5148613,43.6442633" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">{isArabic ? 'الموقع' : 'Location'}</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
