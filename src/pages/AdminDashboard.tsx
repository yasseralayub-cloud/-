import React, { useState, useEffect } from 'react';
import { db, auth, storage } from '../lib/firebase';
import { collection, onSnapshot, updateDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { MenuItem, Category } from '../types';
import { Plus, Edit, Trash2, LogOut, Image, Save, X, Flame, Upload, Loader2, ChevronUp, ChevronDown, ListOrdered } from 'lucide-react';
import * as Icons from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

import { migrateData } from '../lib/migrate';

export default function AdminDashboard() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(null);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryReorderModalOpen, setIsCategoryReorderModalOpen] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [isArabic, setIsArabic] = useState(true);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  
  // Filtering and Sorting state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('default');
  
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);
  
  const navigate = useNavigate();

  const handleMigrate = async () => {
    if (!window.confirm('سيتم استيراد البيانات التجريبية إلى قاعدة البيانات. هل أنت متأكد؟')) return;
    setIsMigrating(true);
    await migrateData();
    setIsMigrating(false);
    alert('تم استيراد البيانات بنجاح!');
  };

  useEffect(() => {
    const catsUnsub = onSnapshot(collection(db, 'categories'), (snapshot) => {
      const cats = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Category));
      setCategories([...cats].sort((a, b) => (a.order || 0) - (b.order || 0)));
    });

    const itemsUnsub = onSnapshot(collection(db, 'menuItems'), (snapshot) => {
      setMenuItems(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as MenuItem)));
    });

    return () => {
      catsUnsub();
      itemsUnsub();
    };
  }, []);

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const itemData = {
        ...editingItem,
        id: editingItem.id || `item_${Date.now()}`,
      } as MenuItem;

      await setDoc(doc(db, 'menuItems', itemData.id), itemData);
      setIsModalOpen(false);
      setEditingItem(null);
    } catch (error) {
      console.error("Scale save error:", error);
      alert('فشل حفظ الصنف. تحقق من الصلاحيات.');
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الصنف؟')) return;
    try {
      await deleteDoc(doc(db, 'menuItems', id));
    } catch (error) {
      alert('فشل حذف الصنف.');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert(isArabic ? 'الملف كبير جداً. الحد الأقصى 5 ميجابايت.' : 'File is too large. Max 5MB.');
      return;
    }

    const storageRef = ref(storage, `menu-items/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    // Timeout safety: if 0% for 10 seconds, inform user
    const timeout = setTimeout(() => {
      if (uploadProgress === 0 || uploadProgress === null) {
        alert(isArabic 
          ? 'يبدو أن التحميل متوقف. تأكد من تفعيل "Storage" في لوحة تحكم Firebase وضبط القواعد لتمويل الرفع.' 
          : 'Upload seems stuck. Make sure "Storage" is enabled in Firebase Console and rules allow uploads.');
        setUploadProgress(null);
        uploadTask.cancel();
      }
    }, 15000);

    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      }, 
      (error) => {
        clearTimeout(timeout);
        console.error("Upload error details:", error);
        let message = isArabic ? 'فشل رفع الصورة' : 'Upload failed';
        
        if (error.code === 'storage/unauthorized') {
          message += isArabic 
            ? ': غير مصرح لك (تحقق من قواعد الحماية في Firebase Storage)' 
            : ': Unauthorized (Check Firebase Storage Security Rules)';
        } else if (error.code === 'storage/canceled') {
          message += isArabic ? ': تم إلغاء العملية' : ': Canceled';
        } else {
          message += `: ${error.message}`;
        }
        
        alert(message);
        setUploadProgress(null);
      }, 
      async () => {
        clearTimeout(timeout);
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        setEditingItem(prev => ({ ...prev!, image: downloadURL }));
        setUploadProgress(null);
      }
    );
  };

  const handleUpdateCategoryOrder = async (categoryId: string, direction: 'up' | 'down') => {
    if (isUpdatingOrder) return;
    setIsUpdatingOrder(true);

    const currentIndex = categories.findIndex(c => c.id === categoryId);
    if (currentIndex === -1) {
      setIsUpdatingOrder(false);
      return;
    }

    const newCategories = [...categories];
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= newCategories.length) {
      setIsUpdatingOrder(false);
      return;
    }

    // Swap positions
    [newCategories[currentIndex], newCategories[targetIndex]] = [newCategories[targetIndex], newCategories[currentIndex]];

    // Update orders in DB
    const updates = newCategories.map((cat, index) => {
      const ref = doc(db, 'categories', cat.id);
      return updateDoc(ref, { order: index });
    });

    try {
      await Promise.all(updates);
    } catch (error) {
      console.error('Order update failed:', error);
      alert('فشل تحديث الترتيب');
    } finally {
      setIsUpdatingOrder(false);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;

    const isNew = !editingCategory.id;
    
    // Generate valid, clean id matching regex '^[a-zA-Z0-9_\-]+$'
    let catId = editingCategory.id;
    if (!catId) {
      const cleanLabel = (editingCategory.label || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      catId = cleanLabel || `cat_${Date.now()}`;
    }

    const catData: Category = {
      id: catId,
      label: (editingCategory.label || '').trim(),
      labelAr: (editingCategory.labelAr || '').trim(),
      icon: editingCategory.icon || 'Utensils',
      order: isNew ? categories.length : (editingCategory.order ?? categories.length),
    };

    if (!catData.label || !catData.labelAr) {
      alert(isArabic ? 'الرجاء كتابة الاسم بالعربي وبالانجليزي' : 'Please fill in both Arabic and English names');
      return;
    }

    try {
      await setDoc(doc(db, 'categories', catId), catData);
      setEditingCategory(null);
    } catch (error) {
      console.error('Save category failed:', error);
      alert(isArabic ? 'فشل حفظ القسم' : 'Failed to save category');
    }
  };

  const handleDeleteCategory = async (cat: Category) => {
    if (cat.id === 'all') return;
    const hasItems = menuItems.some(item => item.category === cat.id);
    let confirmMessage = isArabic 
      ? `هل أنت متأكد من حذف قسم "${cat.labelAr}"؟` 
      : `Are you sure you want to delete category "${cat.label}"?`;
      
    if (hasItems) {
      confirmMessage += isArabic 
        ? '\nتنبيه: هذا القسم يحتوي على أصناف حالية. لن تظهر هذه الأصناف للعملاء حتى تقوم بنقلها لقسم آخر.' 
        : '\nWarning: This category contains current menu items. They will not be visible to customers until reassigned.';
    }
    
    if (!window.confirm(confirmMessage)) return;

    try {
      await deleteDoc(doc(db, 'categories', cat.id));
    } catch (error) {
      console.error("Delete category failed:", error);
      alert(isArabic ? 'فشل حذف القسم' : 'Failed to delete category');
    }
  };

  const filteredAndSortedItems = menuItems
    .filter(item => {
      const matchesSearch = 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.nameAr.includes(searchQuery);
      const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'name-ar':
          return a.nameAr.localeCompare(b.nameAr, 'ar');
        case 'name-en':
          return a.name.localeCompare(b.name);
        case 'popular':
          if (a.isPopular === b.isPopular) return 0;
          return a.isPopular ? -1 : 1;
        default:
          return 0; // Maintain Firestore order
      }
    });

  return (
    <div className="min-h-screen bg-neutral-50" dir="rtl">
      {/* Sidebar/Header */}
      <header className="bg-black text-white px-8 py-6 sticky top-0 z-30 flex justify-between items-center shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-yellow rounded-lg flex items-center justify-center text-black font-black">Admin</div>
          <h1 className="text-2xl font-black uppercase tracking-tight">إدارة المنيو</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsArabic(!isArabic)}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/5 text-xs font-bold"
          >
            {isArabic ? 'English' : 'عربي'}
          </button>
          <button 
            onClick={handleMigrate}
            disabled={isMigrating}
            className="hidden md:flex items-center gap-2 bg-yellow/10 hover:bg-yellow text-yellow hover:text-black px-4 py-2 rounded-xl transition-all border border-yellow/20 text-sm font-bold"
          >
            {isMigrating ? (isArabic ? 'جاري الاستيراد...' : 'Importing...') : (isArabic ? 'استيراد البيانات الأولية' : 'Import Mock Data')}
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 bg-white/10 hover:bg-red-500/20 text-white px-4 py-2 rounded-xl transition-all border border-white/5"
          >
            <LogOut size={18} />
            <span>تسجيل خروج</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-8">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-3xl font-black text-dark mb-2">الأصناف الحالية</h2>
            <p className="text-dark/40">يمكنك تعديل الأسعار، المكونات، وضافة أصناف جديدة</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => setIsCategoryReorderModalOpen(true)}
              className="bg-white text-dark border border-black/5 font-black px-8 py-4 rounded-2xl flex items-center gap-3 hover:bg-neutral-100 transition-all shadow-xl"
            >
              <ListOrdered size={24} />
              <span>إدارة وترتيب الأقسام</span>
            </button>
            <button 
              onClick={() => {
                setEditingItem({ category: categories[0]?.id, isPopular: false });
                setIsModalOpen(true);
              }}
              className="bg-black text-yellow font-black px-8 py-4 rounded-2xl flex items-center gap-3 hover:scale-105 transition-transform shadow-2xl"
            >
              <Plus size={24} />
              <span>إضافة صنف جديد</span>
            </button>
          </div>
        </div>

        {/* Filter & Sort Controls */}
        <div className="bg-white border border-black/5 rounded-[2rem] p-6 mb-10 flex flex-col md:flex-row gap-6 items-center shadow-sm">
          <div className="flex-1 w-full">
            <label className="text-[10px] font-black uppercase text-dark/30 tracking-[0.2em] block mb-2 px-1">
              {isArabic ? 'البحث عن صنف' : 'Search Item'}
            </label>
            <input 
              type="text"
              placeholder={isArabic ? 'ابحث بالاسم...' : 'Search by name...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-yellow font-bold text-dark"
            />
          </div>

          <div className="w-full md:w-64">
            <label className="text-[10px] font-black uppercase text-dark/30 tracking-[0.2em] block mb-2 px-1">
              {isArabic ? 'التصنيف' : 'Category'}
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full bg-neutral-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-yellow font-bold text-dark appearance-none"
            >
              <option value="all">{isArabic ? 'الكل' : 'All'}</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{isArabic ? cat.labelAr : cat.label}</option>
              ))}
            </select>
          </div>

          <div className="w-full md:w-64">
            <label className="text-[10px] font-black uppercase text-dark/30 tracking-[0.2em] block mb-2 px-1">
              {isArabic ? 'ترتيب حسب' : 'Sort By'}
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-neutral-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-yellow font-bold text-dark appearance-none"
            >
              <option value="default">{isArabic ? 'الافتراضي' : 'Default'}</option>
              <option value="price-low">{isArabic ? 'السعر (من الأقل)' : 'Price (Low to High)'}</option>
              <option value="price-high">{isArabic ? 'السعر (من الأعلى)' : 'Price (High to Low)'}</option>
              <option value="name-ar">{isArabic ? 'الاسم (عربي)' : 'Name (Arabic)'}</option>
              <option value="name-en">{isArabic ? 'الاسم (إنجليزي)' : 'Name (English)'}</option>
              <option value="popular">{isArabic ? 'الأكثر طلباً' : 'Most Popular'}</option>
            </select>
          </div>
        </div>

        {/* List of Items */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredAndSortedItems.map((item) => (
              <motion.div 
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              className="group bg-white border border-black/5 rounded-[2rem] shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden flex flex-col"
            >
              {/* Popular Badge */}
              {item.isPopular && (
                <div className="absolute top-4 right-4 z-10 bg-yellow text-black text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full flex items-center gap-1 shadow-lg">
                  <Flame size={12} fill="currentColor" /> {isArabic ? 'شائع' : 'Popular'}
                </div>
              )}
              
              {/* Image Preview Container */}
              <div className="relative h-48 overflow-hidden bg-neutral-100">
                {item.image ? (
                  <img 
                    src={item.image} 
                    alt={item.name} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-dark/10">
                    <Image size={48} strokeWidth={1} />
                    <span className="text-xs font-bold mt-2 uppercase tracking-tighter">No Image</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              {/* Content */}
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="font-sans text-xl font-black text-dark mb-1 leading-tight">{item.nameAr}</h3>
                    <p className="text-xs text-dark/40 font-medium uppercase tracking-wider">{item.name}</p>
                  </div>
                  <div className="bg-black text-yellow font-black px-4 py-2 rounded-xl text-lg shadow-sm">
                    {item.price} <span className="text-[10px] opacity-70">ر.س</span>
                  </div>
                </div>

                <div className="mt-auto pt-6 border-t border-black/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow" />
                    <span className="text-[10px] font-black text-dark/30 uppercase tracking-widest">
                      {categories.find(c => c.id === item.category)?.labelAr || item.category}
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setEditingItem(item);
                        setIsModalOpen(true);
                      }}
                      className="w-10 h-10 bg-neutral-100 hover:bg-black hover:text-yellow text-dark rounded-xl transition-all flex items-center justify-center group/btn"
                      title="Edit"
                    >
                      <Edit size={18} />
                    </button>
                    <button 
                      onClick={() => handleDeleteItem(item.id)}
                      className="w-10 h-10 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all flex items-center justify-center group/btn"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
          </AnimatePresence>
        </div>
      </main>

      {/* Item Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="bg-black text-white p-8 flex justify-between items-center">
                <h3 className="text-2xl font-black uppercase tracking-tight">
                  {editingItem?.id ? 'تعديل صنف' : 'إضافة صنف جديد'}
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveItem} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Arabic Info */}
                  <div className="space-y-4">
                    <label className="block">
                      <span className="text-xs font-black uppercase text-dark/40 tracking-widest block mb-2">الاسم (عربي)</span>
                      <input 
                        type="text" 
                        required
                        value={editingItem?.nameAr || ''}
                        onChange={e => setEditingItem(prev => ({ ...prev!, nameAr: e.target.value }))}
                        className="w-full bg-neutral-100 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-yellow font-bold text-dark"
                        placeholder="مثلاً: كفتة لحم"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-black uppercase text-dark/40 tracking-widest block mb-2">الوصف (عربي)</span>
                      <textarea 
                        rows={3}
                        value={editingItem?.descriptionAr || ''}
                        onChange={e => setEditingItem(prev => ({ ...prev!, descriptionAr: e.target.value }))}
                        className="w-full bg-neutral-100 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-yellow font-bold text-dark"
                        placeholder="وصف الصنف بالعربي..."
                      />
                    </label>
                  </div>

                  {/* English Info */}
                  <div className="space-y-4" dir="ltr">
                    <label className="block">
                      <span className="text-xs font-black uppercase text-dark/40 tracking-widest block mb-1">Name (English)</span>
                      <input 
                        type="text" 
                        required
                        value={editingItem?.name || ''}
                        onChange={e => setEditingItem(prev => ({ ...prev!, name: e.target.value }))}
                        className="w-full bg-neutral-100 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-yellow font-bold text-dark"
                        placeholder="e.g. Beef Kofta"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-black uppercase text-dark/40 tracking-widest block mb-1">Description (English)</span>
                      <textarea 
                        rows={3}
                        value={editingItem?.description || ''}
                        onChange={e => setEditingItem(prev => ({ ...prev!, description: e.target.value }))}
                        className="w-full bg-neutral-100 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-yellow font-bold text-dark"
                        placeholder="English description..."
                      />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <label className="block">
                    <span className="text-xs font-black uppercase text-dark/40 tracking-widest block mb-2">السعر</span>
                    <div className="relative">
                      <input 
                        type="number" 
                        required
                        value={editingItem?.price || ''}
                        onChange={e => setEditingItem(prev => ({ ...prev!, price: parseFloat(e.target.value) }))}
                        className="w-full bg-neutral-100 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-yellow font-bold text-dark pr-12"
                      />
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-dark/30 font-bold">ر.س</span>
                    </div>
                  </label>

                  <label className="block">
                    <span className="text-xs font-black uppercase text-dark/40 tracking-widest block mb-2">التصنيف</span>
                    <select 
                      value={editingItem?.category || ''}
                      onChange={e => setEditingItem(prev => ({ ...prev!, category: e.target.value }))}
                      className="w-full bg-neutral-100 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-yellow font-bold text-dark appearance-none"
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.labelAr}</option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-xs font-black uppercase text-dark/40 tracking-widest block mb-2">السعرات (اختياري)</span>
                    <input 
                      type="number" 
                      value={editingItem?.calories || ''}
                      onChange={e => setEditingItem(prev => ({ ...prev!, calories: parseInt(e.target.value) }))}
                      className="w-full bg-neutral-100 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-yellow font-bold text-dark"
                    />
                  </label>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1 space-y-4">
                      {/* Upload Option */}
                      <div>
                        <span className="text-xs font-black uppercase text-dark/40 tracking-widest block mb-2">
                          {isArabic ? 'رفع صورة من جهازك' : 'Upload Image'}
                        </span>
                        <div className="relative">
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            disabled={uploadProgress !== null}
                          />
                          <div className={`w-full bg-neutral-100 border-2 border-dashed border-black/10 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 transition-colors ${uploadProgress !== null ? 'opacity-50' : 'hover:border-yellow hover:bg-yellow/5'}`}>
                            {uploadProgress !== null ? (
                              <div className="flex flex-col items-center gap-2">
                                <Loader2 className="animate-spin text-yellow" size={32} />
                                <span className="font-bold text-sm">{Math.round(uploadProgress)}%</span>
                              </div>
                            ) : (
                              <>
                                <Upload className="text-dark/20" size={32} />
                                <span className="font-bold text-sm text-dark/40">
                                  {isArabic ? 'اختر صورة أو اسحبها هنا' : 'Choose image or drag here'}
                                </span>
                                <p className="text-[10px] text-dark/20 text-center mt-2 px-4 italic leading-tight">
                                  {isArabic 
                                    ? 'تأكد من تفعيل Storage في Firebase Console وضبط قواعد الحماية للسماح بالرفع' 
                                    : 'Ensure Storage is enabled in Firebase Console and rules allow uploads'}
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* URL Option */}
                      <label className="block">
                        <span className="text-xs font-black uppercase text-dark/40 tracking-widest block mb-2">
                          {isArabic ? 'أو أدخل رابط الصورة' : 'Or enter Image URL'}
                        </span>
                        <input 
                          type="text" 
                          value={editingItem?.image || ''}
                          onChange={e => setEditingItem(prev => ({ ...prev!, image: e.target.value }))}
                          className="w-full bg-neutral-100 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-yellow font-bold text-dark"
                          placeholder="https://example.com/image.jpg"
                        />
                      </label>
                    </div>

                    {(editingItem?.image || uploadProgress !== null) && (
                      <div className="w-40 h-40 bg-neutral-100 rounded-2xl overflow-hidden border-2 border-yellow/20 flex-shrink-0 relative">
                        {editingItem?.image ? (
                          <img 
                            src={editingItem.image} 
                            alt="Preview" 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://placehold.co/400x400?text=Invalid+Link';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-yellow/20">
                            <Image size={48} />
                          </div>
                        )}
                        {uploadProgress !== null && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <Loader2 className="animate-spin text-white" size={32} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        checked={editingItem?.isPopular || false}
                        onChange={e => setEditingItem(prev => ({ ...prev!, isPopular: e.target.checked }))}
                        className="sr-only"
                      />
                      <div className={`w-12 h-6 rounded-full transition-colors ${editingItem?.isPopular ? 'bg-yellow' : 'bg-neutral-200'}`} />
                      <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${editingItem?.isPopular ? 'translate-x-6' : ''}`} />
                    </div>
                    <span className="font-bold text-dark">تمييز كـ "شائع" (Popular)</span>
                  </label>
                </div>

                <div className="pt-6 flex gap-4">
                  <button 
                    type="submit"
                    className="flex-1 bg-black text-yellow font-black py-5 rounded-2xl hover:scale-105 transition-transform flex items-center justify-center gap-3 shadow-2xl"
                  >
                    <Save size={20} />
                    <span>حفظ الصنف</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-dark font-bold py-5 rounded-2xl transition-colors"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Category Reorder Modal */}
      <AnimatePresence>
        {isCategoryReorderModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="bg-black text-white p-8 flex justify-between items-center bg-zinc-950">
                <h3 className="text-2xl font-black uppercase tracking-tight">
                  {isArabic ? 'إدارة أقسام المنيو' : 'Manage Categories'}
                </h3>
                <button 
                  onClick={() => {
                    setIsCategoryReorderModalOpen(false);
                    setEditingCategory(null);
                  }}
                  className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8">
                {editingCategory ? (
                  /* Form to Add or Edit Category */
                  <form onSubmit={handleSaveCategory} className="space-y-6">
                    <div className="border-b border-black/5 pb-4 mb-4">
                      <h4 className="text-lg font-black text-dark">
                        {editingCategory.id 
                          ? (isArabic ? 'تعديل بيانات القسم' : 'Edit Category Details') 
                          : (isArabic ? 'إضافة قسم جديد' : 'Add New Category')
                        }
                      </h4>
                      <p className="text-dark/40 text-xs">
                        {isArabic 
                          ? 'قم بملء البيانات التالية لإنشاء قسم أو تعديله.' 
                          : 'Fill in the details below to create or update a category.'
                        }
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <label className="block">
                        <span className="text-xs font-black uppercase text-dark/40 tracking-widest block mb-2">
                          {isArabic ? 'الاسم (عربي)' : 'Name (Arabic)'}
                        </span>
                        <input 
                          type="text" 
                          required
                          value={editingCategory.labelAr || ''}
                          onChange={e => setEditingCategory(prev => ({ ...prev!, labelAr: e.target.value }))}
                          className="w-full bg-neutral-100 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-yellow font-bold text-dark text-right"
                          placeholder={isArabic ? 'مثال: المشويات' : 'e.g., Grills'}
                        />
                      </label>

                      <label className="block animate-none" dir="ltr">
                        <span className="text-xs font-black uppercase text-dark/40 tracking-widest block mb-2 text-left">
                          Name (English)
                        </span>
                        <input 
                          type="text" 
                          required
                          value={editingCategory.label || ''}
                          onChange={e => setEditingCategory(prev => ({ ...prev!, label: e.target.value }))}
                          className="w-full bg-neutral-100 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-yellow font-bold text-dark text-left"
                          placeholder="e.g., Grills"
                        />
                      </label>
                    </div>

                    <div>
                      <span className="text-xs font-black uppercase text-dark/40 tracking-widest block mb-3">
                        {isArabic ? 'اختر أيقونة للقسم' : 'Select Category Icon'}
                      </span>
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                        {[
                          { name: 'Flame', labelAr: 'مشويات', labelEn: 'Flame' },
                          { name: 'Utensils', labelAr: 'أدوات', labelEn: 'Utensils' },
                          { name: 'ChefHat', labelAr: 'طاهي', labelEn: 'ChefHat' },
                          { name: 'Salad', labelAr: 'سلطة', labelEn: 'Salad' },
                          { name: 'Soup', labelAr: 'شوربة', labelEn: 'Soup' },
                          { name: 'Pizza', labelAr: 'معجنات', labelEn: 'Pizza' },
                          { name: 'Coffee', labelAr: 'قهوة', labelEn: 'Coffee' },
                          { name: 'GlassWater', labelAr: 'عصائر', labelEn: 'Drinks' },
                          { name: 'IceCream', labelAr: 'حلى', labelEn: 'Sweets' },
                          { name: 'Cookie', labelAr: 'بسكويت', labelEn: 'Cookie' },
                          { name: 'Fish', labelAr: 'بحري', labelEn: 'Seafood' },
                          { name: 'Beef', labelAr: 'لحوم', labelEn: 'Beef' }
                        ].map(preset => {
                          const IconComp = (Icons as any)[preset.name] || Icons.Utensils;
                          const isSelected = editingCategory.icon === preset.name;
                          return (
                            <button
                              type="button"
                              key={preset.name}
                              onClick={() => setEditingCategory(prev => ({ ...prev!, icon: preset.name }))}
                              className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                                isSelected 
                                  ? 'bg-yellow/10 border-yellow text-black scale-105 font-black' 
                                  : 'bg-neutral-50 border-black/5 text-dark/50 hover:bg-neutral-100 hover:text-dark'
                              }`}
                            >
                              <IconComp size={24} />
                              <span className="text-[9px] mt-1 font-bold">
                                {isArabic ? preset.labelAr : preset.labelEn}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-4 flex gap-4">
                      <button 
                        type="submit"
                        className="flex-grow bg-black text-yellow font-black py-4 rounded-xl hover:scale-[1.02] transition-transform shadow-lg flex items-center justify-center gap-2"
                      >
                        <Save size={18} />
                        <span>{isArabic ? 'حفظ القسم' : 'Save Category'}</span>
                      </button>
                      <button 
                        type="button"
                        onClick={() => setEditingCategory(null)}
                        className="flex-grow bg-neutral-100 text-dark hover:bg-neutral-200 font-bold py-4 rounded-xl transition-colors"
                      >
                        {isArabic ? 'إلغاء' : 'Cancel'}
                      </button>
                    </div>
                  </form>
                ) : (
                  /* List and Reorder of categories */
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-dark/40 text-sm">
                        {isArabic 
                          ? 'تحكم في الأقسام، ترتيبها، أو أضف قسماً جديداً لتنظيم أطباق المنيو.'
                          : 'Control categories, their order, or add a new category to organize items.'}
                      </p>
                      <button
                        onClick={() => setEditingCategory({ labelAr: '', label: '', icon: 'Utensils' })}
                        className="bg-black text-yellow px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 hover:scale-105 transition-transform shadow"
                      >
                        <Plus size={14} />
                        <span>{isArabic ? 'قسم جديد' : 'New Category'}</span>
                      </button>
                    </div>
                    
                    <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                      {categories.map((cat, index) => {
                        const IconComp = (Icons as any)[cat.icon] || Icons.Utensils;
                        return (
                          <div 
                            key={cat.id}
                            className="bg-neutral-50 rounded-2xl p-4 flex items-center justify-between border border-transparent hover:border-yellow/20 transition-all group"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-black text-yellow rounded-xl flex items-center justify-center font-bold">
                                {index + 1}
                              </div>
                              <div className="w-10 h-10 bg-neutral-100 rounded-xl flex items-center justify-center text-dark/60">
                                <IconComp size={20} />
                              </div>
                              <div>
                                <p className="font-black text-dark">{cat.labelAr}</p>
                                <p className="text-[10px] text-dark/30 uppercase font-bold tracking-widest">{cat.label}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Edit Button */}
                              <button
                                onClick={() => setEditingCategory(cat)}
                                className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-blue-500 hover:bg-blue-50 transition-all border border-zinc-200"
                                title={isArabic ? 'تعديل القسم' : 'Edit Category'}
                              >
                                <Edit size={16} />
                              </button>

                              {/* Delete Button */}
                              <button
                                onClick={() => handleDeleteCategory(cat)}
                                className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-red-500 hover:bg-red-50 transition-all border border-zinc-200"
                                title={isArabic ? 'حذف القسم' : 'Delete Category'}
                              >
                                <Trash2 size={16} />
                              </button>

                              <div className="w-[1px] h-6 bg-black/10 mx-1" />

                              {/* Reorder Buttons */}
                              <button 
                                disabled={index === 0 || isUpdatingOrder}
                                onClick={() => handleUpdateCategoryOrder(cat.id, 'up')}
                                className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm disabled:opacity-30 hover:bg-yellow hover:text-black transition-all border border-zinc-200"
                                title={isArabic ? 'تحريك للأعلى' : 'Move Up'}
                              >
                                {isUpdatingOrder ? <Loader2 className="animate-spin" size={16} /> : <ChevronUp size={20} />}
                              </button>
                              <button 
                                disabled={index === categories.length - 1 || isUpdatingOrder}
                                onClick={() => handleUpdateCategoryOrder(cat.id, 'down')}
                                className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm disabled:opacity-30 hover:bg-yellow hover:text-black transition-all border border-zinc-200"
                                title={isArabic ? 'تحريك للأسفل' : 'Move Down'}
                              >
                                {isUpdatingOrder ? <Loader2 className="animate-spin" size={16} /> : <ChevronDown size={20} />}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-6">
                      <button 
                        onClick={() => setIsCategoryReorderModalOpen(false)}
                        className="w-full bg-black text-yellow font-black py-5 rounded-2xl hover:scale-[1.02] transition-transform shadow-2xl"
                      >
                        {isArabic ? 'إغلاق' : 'Close'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
