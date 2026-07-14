import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, MapPin, Search, X } from 'lucide-react';
import MenuHeader from '../components/MenuHeader';
import CategoryFilter from '../components/CategoryFilter';
import MenuCard from '../components/MenuCard';
import { MenuItem, Category } from '../types';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { categories as mockCategories, menuItems as mockMenuItems } from '../data/mockMenu';

export default function PublicMenu() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isArabic, setIsArabic] = useState(true);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Fetch categories
    const categoriesUnsub = onSnapshot(collection(db, 'categories'), (snapshot) => {
      const cats = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Category));
      // Filter out invalid items
      const validCats = cats.filter(c => c && c.id && (c.label || c.labelAr));
      setCategories([...validCats].sort((a, b) => (a.order || 0) - (b.order || 0)));
    }, (err) => {
      console.error("Firestore loading categories error: ", err);
      // Fail silently or set categories empty so mock data can handle it
      setLoading(false);
    });

    // Fetch menu items
    const itemsUnsub = onSnapshot(collection(db, 'menuItems'), (snapshot) => {
      const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as MenuItem));
      // Filter out invalid items
      const validItems = items.filter(i => i && i.id && (i.name || i.nameAr));
      setMenuItems(validItems);
      setLoading(false);
    }, (err) => {
      console.error("Firestore loading items error: ", err);
      setLoading(false);
    });

    return () => {
      categoriesUnsub();
      itemsUnsub();
    };
  }, []);

  // Use mock data as safety default fallback if Firestore dataset is entirely empty
  const activeCategories = useMemo(() => {
    return categories.length > 0 ? categories : mockCategories;
  }, [categories]);

  const activeMenuItems = useMemo(() => {
    return menuItems.length > 0 ? menuItems : mockMenuItems;
  }, [menuItems]);

  const filteredMenuItems = useMemo(() => {
    if (!searchQuery.trim()) {
      return activeMenuItems;
    }
    const queryStr = searchQuery.toLowerCase().trim();
    return activeMenuItems.filter(item => {
      const nameMatch = (item.name || '').toLowerCase().includes(queryStr);
      const nameArMatch = (item.nameAr || '').toLowerCase().includes(queryStr);
      const descMatch = (item.description || '').toLowerCase().includes(queryStr);
      const descArMatch = (item.descriptionAr || '').toLowerCase().includes(queryStr);
      return nameMatch || nameArMatch || descMatch || descArMatch;
    });
  }, [activeMenuItems, searchQuery]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, MenuItem[]> = {};
    
    // Group all items by their category ID
    filteredMenuItems.forEach(item => {
      if (item && item.category) {
        if (!groups[item.category]) {
          groups[item.category] = [];
        }
        groups[item.category].push(item);
      }
    });

    // Sort items within each group safely
    Object.keys(groups).forEach(catId => {
      groups[catId].sort((a, b) => {
        const nameA = a.nameAr || a.name || '';
        const nameB = b.nameAr || b.name || '';
        return nameA.localeCompare(nameB, 'ar');
      });
    });

    return groups;
  }, [filteredMenuItems]);

  const displayCategories = useMemo(() => {
    // Filter categories to show
    // We skip the "all" category in the grouping view
    const cats = activeCategories.filter(c => c.id !== 'all');
    
    if (selectedCategory === 'all') {
      return cats;
    }
    return cats.filter(c => c.id === selectedCategory);
  }, [activeCategories, selectedCategory]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-yellow border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 pb-20" dir={isArabic ? 'rtl' : 'ltr'}>
      <MenuHeader 
        isArabic={isArabic} 
        onLanguageToggle={() => setIsArabic(!isArabic)} 
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-black py-20 mb-12">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: isArabic ? 100 : -100 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-yellow text-[10px] font-black uppercase tracking-[0.3em] mb-4">
              {isArabic ? 'تذوق المعنى الحقيقي للمشويات' : 'Taste the real grill'}
            </h2>
            <h1 className="text-white text-5xl md:text-7xl font-black mb-8 leading-[1.1] uppercase">
              {isArabic ? (
                <>رحلة من <span className="text-yellow">النكهات</span><br />المميزة</>
              ) : (
                <>A Journey of <span className="text-yellow">Flavors</span></>
              )}
            </h1>
            <p className="text-white/40 text-lg mb-10 max-w-lg leading-relaxed">
              {isArabic 
                ? 'نقدم لكم أفضل قطع اللحم والدجاج المختارة بعناية والمشوية على لهب الفحم الطبيعي لتستمتعوا بطعم لا يُنسى.'
                : 'We offer the best carefully selected pieces of meat and chicken grilled over natural charcoal flames for an unforgettable taste.'}
            </p>
            <div className="flex flex-wrap gap-4">
              <button 
                onClick={() => document.getElementById('menu-start')?.scrollIntoView({ behavior: 'smooth' })}
                className="bg-yellow text-black font-black px-10 py-5 rounded-full hover:scale-105 transition-transform shadow-xl uppercase text-xs tracking-widest"
              >
                {isArabic ? 'استكشف القائمة' : 'Explore Menu'}
              </button>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            className="hidden lg:block relative"
          >
            <div className="absolute inset-0 bg-yellow/20 blur-[120px] rounded-full" />
            <img 
              src="https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=800" 
              alt="Grill Masterpiece" 
              className="relative rounded-[3rem] shadow-2xl border border-white/5 rotate-3 hover:rotate-0 transition-transform duration-700"
            />
          </motion.div>
        </div>
        
        {/* Background Decorative patterns could be added here */}
      </section>

      <main id="menu-start" className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-dark/20 text-5xl md:text-8xl font-black uppercase tracking-tighter opacity-10 absolute left-1/2 -translate-x-1/2 -translate-y-12 select-none pointer-events-none">
            {isArabic ? 'قائمة الطعام' : 'The Menu'}
          </h2>
          <h2 className="relative text-3xl md:text-4xl font-black text-dark uppercase tracking-tight">
            {isArabic ? 'قائمة الطعام' : 'The Menu'}
          </h2>
        </div>

        {/* Elegant Search Box */}
        <div className="max-w-md mx-auto mb-10 relative px-4 sm:px-0">
          <div className="relative flex items-center bg-white rounded-full border border-black/5 shadow-md shadow-black/5 hover:shadow-lg hover:border-yellow/50 focus-within:border-yellow/50 focus-within:shadow-yellow/5 focus-within:shadow-lg transition-all duration-300">
            <span className={`absolute ${isArabic ? 'right-5' : 'left-5'} text-neutral-400`}>
              <Search size={20} strokeWidth={2} />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isArabic ? 'ابحث عن طبق...' : 'Search for a dish...'}
              className={`w-full bg-transparent py-4 ${isArabic ? 'pr-12 pl-12 text-right' : 'pl-12 pr-12 text-left'} rounded-full text-sm font-medium text-dark placeholder-neutral-400 focus:outline-none focus:ring-0`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className={`absolute ${isArabic ? 'left-4' : 'right-4'} text-neutral-400 hover:text-dark transition-colors p-1 hover:bg-neutral-100 rounded-full`}
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>

        <CategoryFilter
          selectedCategory={selectedCategory}
          onSelect={setSelectedCategory}
          isArabic={isArabic}
          customCategories={activeCategories}
        />

        <div className="mt-12 space-y-20">
          <AnimatePresence mode="popLayout">
            {displayCategories.map((cat) => {
              const items = groupedItems[cat.id] || [];
              if (items.length === 0) return null;

              return (
                <motion.div 
                  key={cat.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="flex items-center gap-6 mb-10 overflow-hidden">
                    <div className="h-[2px] bg-yellow/20 flex-grow" />
                    <h3 className="text-2xl font-black text-dark flex items-center gap-4 whitespace-nowrap">
                      <span className="w-12 h-12 bg-black text-yellow rounded-2xl flex items-center justify-center shadow-lg">
                        <span className="text-xl">
                          {cat.labelAr ? cat.labelAr[0] : (cat.label ? cat.label[0] : '★')} 
                        </span>
                      </span>
                      <span className="uppercase tracking-tighter">
                        {isArabic ? (cat.labelAr || cat.label) : (cat.label || cat.labelAr)}
                      </span>
                    </h3>
                    <div className="h-[2px] bg-yellow/20 flex-grow" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {items.map((item, itemIndex) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: itemIndex * 0.05 }}
                      >
                        <MenuCard item={item} isArabic={isArabic} />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-16 text-center max-w-xl mx-auto bg-red-500/5 border border-red-500/10 rounded-[2.5rem] p-8 md:p-12 shadow-xl mt-12"
          >
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl font-black">!</span>
            </div>
            <h3 className="text-xl font-black text-red-600 mb-3">
              {isArabic ? 'حدث خطأ أثناء تحميل البيانات' : 'Error Loading Menu Data'}
            </h3>
            <p className="text-dark/60 text-sm mb-6 leading-relaxed">
              {isArabic 
                ? 'فشل الاتصال بقاعدة بيانات Firebase. يرجى التحقق من تفعيل قواعد الحماية وإعدادات المشروع.' 
                : 'Could not connect to Firebase database. Please check Firestore configuration and rules.'}
            </p>
            <div className="bg-black/5 rounded-2xl p-4 text-left font-mono text-xs text-red-600 overflow-x-auto max-h-40 border border-black/5" dir="ltr">
              {error}
            </div>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-8 bg-black text-white font-black px-8 py-4 rounded-xl hover:bg-neutral-800 transition-all cursor-pointer text-xs uppercase tracking-wider"
            >
              {isArabic ? 'إعادة تحميل الصفحة' : 'Reload Page'}
            </button>
          </motion.div>
        )}

        {activeMenuItems.length > 0 && filteredMenuItems.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-16 text-center max-w-xl mx-auto bg-white border border-black/5 rounded-[2.5rem] p-8 md:p-12 shadow-xl mt-12"
          >
            <div className="w-16 h-16 bg-neutral-100 border border-black/5 text-neutral-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Search size={28} strokeWidth={1.5} />
            </div>
            <h3 className="text-2xl font-black text-dark mb-3">
              {isArabic ? 'لم نجد نتائج مطابقة' : 'No matching results'}
            </h3>
            <p className="text-dark/60 text-sm mb-8 leading-relaxed">
              {isArabic 
                ? 'لم نعثر على أي طبق يطابق كلمة البحث. جرب البحث بكلمات أخرى أو تصفح الأقسام.' 
                : 'No dishes match your search keywords. Try searching for something else or browse categories.'}
            </p>
            <button 
              onClick={() => setSearchQuery('')} 
              className="bg-yellow text-black font-black px-8 py-4 rounded-xl hover:scale-105 transition-transform shadow-lg text-xs uppercase tracking-wider cursor-pointer"
            >
              {isArabic ? 'عرض كل الأطباق' : 'View all dishes'}
            </button>
          </motion.div>
        )}

        {activeMenuItems.length === 0 && !loading && !error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-16 text-center max-w-xl mx-auto bg-white border border-black/5 rounded-[2.5rem] p-8 md:p-12 shadow-xl mt-12"
          >
            <div className="w-16 h-16 bg-yellow/10 border border-yellow/20 text-yellow-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl font-black">🧑‍🍳</span>
            </div>
            <h3 className="text-2xl font-black text-dark mb-3">
              {isArabic ? 'قائمة الطعام جاهزة للعمل' : 'Menu System is Ready'}
            </h3>
            <p className="text-dark/60 text-sm mb-8 leading-relaxed">
              {isArabic 
                ? 'مرحباً بك! موقع قائمة الطعام يعمل وجاهز، ولكن قاعدة البيانات فارغة حالياً ولا توجد أي أصناف لعرضها.' 
                : 'Welcome! The menu details are functioning, but the database is currently empty and there are no items to list.'}
              <br /><br />
              {isArabic 
                ? 'يرجى الانتقال إلى لوحة التحكم لتعبئة المنيو فوراً إما عبر استيراد الأصناف التجريبية أو البدء بإضافة أقسامك الخاصة.' 
                : 'Please navigate to the admin control panel to populate the menu immediately by importing demo items or adding your custom categories.'}
            </p>
            <a 
              href="/admin" 
              className="inline-block bg-yellow text-black font-black px-8 py-4 rounded-xl hover:scale-105 transition-transform shadow-lg text-xs uppercase tracking-wider"
            >
              {isArabic ? 'الانتقال إلى لوحة التحكم' : 'Go to Admin Dashboard'}
            </a>
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
