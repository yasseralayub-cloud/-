import React, { useState, useEffect } from 'react';
import { db, auth, storage } from '../lib/firebase';
import { collection, onSnapshot, updateDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { MenuItem, Category, SiteSettings, VerificationBadge } from '../types';
import { defaultSiteSettings } from '../data/defaultSettings';
import { resolveVerificationBadges } from '../lib/badgeUtils';
import { convertPdfToJpeg } from '../lib/pdfUtils';
import { Plus, Edit, Trash2, LogOut, Image, Save, X, Flame, Upload, Loader2, ChevronUp, ChevronDown, ListOrdered, ShieldCheck, Receipt, Utensils, RotateCcw, Share2, Phone, MessageCircle, MapPin, QrCode, Clock } from 'lucide-react';
import { SnapchatIcon, InstagramIcon, TikTokIcon, TwitterIcon } from '../components/SocialIcons';
import * as Icons from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

import { migrateData } from '../lib/migrate';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'items' | 'settings'>('items');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(defaultSiteSettings);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  
  // Badge management modal state
  const [editingBadge, setEditingBadge] = useState<Partial<VerificationBadge> | null>(null);
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [badgeUploadProgress, setBadgeUploadProgress] = useState<number | null>(null);

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

  // Utility to strip undefined and NaN values before saving to Firestore
  const cleanForFirestore = <T extends Record<string, any>>(obj: T): T => {
    const cleaned: Record<string, any> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (val === undefined) continue;
      if (typeof val === 'number' && isNaN(val)) continue;
      if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        cleaned[key] = cleanForFirestore(val);
      } else if (Array.isArray(val)) {
        cleaned[key] = val
          .filter(item => item !== undefined)
          .map(item => (item && typeof item === 'object') ? cleanForFirestore(item) : (typeof item === 'number' && isNaN(item) ? null : item));
      } else {
        cleaned[key] = val;
      }
    }
    return cleaned as T;
  };

  useEffect(() => {
    const catsUnsub = onSnapshot(collection(db, 'categories'), (snapshot) => {
      const cats = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Category));
      setCategories([...cats].sort((a, b) => (a.order || 0) - (b.order || 0)));
    });

    const itemsUnsub = onSnapshot(collection(db, 'menuItems'), (snapshot) => {
      setMenuItems(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as MenuItem)));
    });

    let fetchedSiteBadges: VerificationBadge[] = [];
    let fetchedCerts: VerificationBadge[] = [];

    const updateAdminBadges = () => {
      setSiteSettings(prev => ({
        ...prev,
        verificationBadges: resolveVerificationBadges(fetchedSiteBadges, fetchedCerts)
      }));
    };

    const settingsUnsub = onSnapshot(doc(db, 'settings', 'site'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as SiteSettings;
        fetchedSiteBadges = data.verificationBadges || [];
        setSiteSettings(prev => ({
          ...defaultSiteSettings,
          ...data,
          verificationBadges: resolveVerificationBadges(fetchedSiteBadges, fetchedCerts)
        }));
      } else {
        fetchedSiteBadges = defaultSiteSettings.verificationBadges;
        setSiteSettings(prev => ({
          ...defaultSiteSettings,
          verificationBadges: resolveVerificationBadges(fetchedSiteBadges, fetchedCerts)
        }));
      }
    });

    const certsUnsub = onSnapshot(collection(db, 'certificates'), (snapshot) => {
      fetchedCerts = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as VerificationBadge));
      updateAdminBadges();
    });

    return () => {
      catsUnsub();
      itemsUnsub();
      settingsUnsub();
      certsUnsub();
    };
  }, []);

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingSettings(true);
    try {
      // 1. Save badges individually to certificates collection so each badge has its own doc limit
      if (siteSettings.verificationBadges && siteSettings.verificationBadges.length > 0) {
        for (const badge of siteSettings.verificationBadges) {
          if (badge && badge.id && badge.imageUrl) {
            await setDoc(doc(db, 'certificates', badge.id), cleanForFirestore(badge));
          }
        }
      }

      // 2. Strip large base64 strings from settings/site doc to keep it under 1MB
      const siteSettingsToSave = {
        ...siteSettings,
        verificationBadges: siteSettings.verificationBadges.map(b => ({
          id: b.id,
          title: b.title || '',
          titleAr: b.titleAr || '',
          subtitle: b.subtitle || '',
          subtitleAr: b.subtitleAr || '',
          imageUrl: (b.imageUrl && b.imageUrl.length < 500) ? b.imageUrl : ''
        }))
      };

      const cleaned = cleanForFirestore(siteSettingsToSave);
      await setDoc(doc(db, 'settings', 'site'), cleaned);
      alert(isArabic ? 'تم حفظ إعدادات الضريبة والشهادات بنجاح!' : 'Tax and certification settings saved successfully!');
    } catch (err: any) {
      console.error("Save settings error:", err);
      alert(isArabic ? `حدث خطأ أثناء حفظ الإعدادات: ${err?.message || ''}` : `Error saving settings: ${err?.message || ''}`);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const processImageFile = async (file: File, maxWidth = 800, maxHeight = 800, quality = 0.65): Promise<string> => {
    if (file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf')) {
      try {
        const jpegUrl = await convertPdfToJpeg(file);
        return jpegUrl;
      } catch (pdfErr) {
        console.error("PDF to JPEG conversion error:", pdfErr);
      }
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (!result) {
          reject(new Error('Failed to read file'));
          return;
        }

        if (file.type.includes('svg')) {
          if (result.length > 950000) {
            reject(new Error(isArabic ? 'حجم ملف SVG كبير جداً (أكثر من 900 كيلوبايت)' : 'SVG file too large (>900KB)'));
            return;
          }
          resolve(result);
          return;
        }

        const img = new window.Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > maxWidth || height > maxHeight) {
              if (width / height > maxWidth / maxHeight) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
              } else {
                width = Math.round((width * maxHeight) / height);
                height = maxHeight;
              }
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              const dataUrl = canvas.toDataURL('image/jpeg', quality);
              resolve(dataUrl);
            } else {
              resolve(result);
            }
          } catch (err) {
            resolve(result);
          }
        };
        img.onerror = () => resolve(result);
        img.src = result;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const handleBadgeImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert(isArabic ? 'حجم الملف كبير جداً (الحد الأقصى 15 ميجابايت)' : 'File too large (Max 15MB)');
      return;
    }

    try {
      setBadgeUploadProgress(50);
      const dataUrl = await processImageFile(file);
      setEditingBadge(prev => ({ ...prev!, imageUrl: dataUrl }));
      setBadgeUploadProgress(100);
      setTimeout(() => setBadgeUploadProgress(null), 400);
    } catch (err: any) {
      console.error("Direct file processing error:", err);
      alert(isArabic ? `فشل معالجة الملف: ${err?.message || ''}` : `File processing failed: ${err?.message || ''}`);
      setBadgeUploadProgress(null);
    }
  };

  const handleSaveBadge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBadge || !editingBadge.imageUrl) {
      alert(isArabic ? 'يرجى اختيار أو رفع صورة الشهادة' : 'Please provide a certificate image');
      return;
    }

    let finalImageUrl = editingBadge.imageUrl;
    if (finalImageUrl.startsWith('data:application/pdf')) {
      try {
        finalImageUrl = await convertPdfToJpeg(finalImageUrl);
      } catch (err) {
        console.error("PDF conversion on save failed:", err);
      }
    }

    if (finalImageUrl.length > 950000) {
      alert(isArabic ? 'حجم ملف الشهادة كبير جداً (أكثر من 900 كيلوبايت). يرجى تقليل حجم الصورة/الملف أو استخدام رابط مباشر.' : 'Certificate file size is too large (>900KB). Please compress or use a smaller file/URL.');
      return;
    }

    const badgeId = editingBadge.id || `badge_${Date.now()}`;
    const newBadge: VerificationBadge = {
      id: badgeId,
      title: editingBadge.title || 'شهادة توثيق',
      titleAr: editingBadge.titleAr || editingBadge.title || 'شهادة توثيق',
      subtitle: editingBadge.subtitle || '',
      subtitleAr: editingBadge.subtitleAr || editingBadge.subtitle || '',
      imageUrl: finalImageUrl,
    };

    try {
      await setDoc(doc(db, 'certificates', badgeId), cleanForFirestore(newBadge));

      const existingIndex = siteSettings.verificationBadges.findIndex(b => b.id === badgeId);
      let updatedBadges = [...siteSettings.verificationBadges];
      if (existingIndex >= 0) {
        updatedBadges[existingIndex] = newBadge;
      } else {
        updatedBadges.push(newBadge);
      }

      setSiteSettings(prev => ({ ...prev, verificationBadges: updatedBadges }));
      setEditingBadge(null);
      setIsBadgeModalOpen(false);
      alert(isArabic ? 'تم حفظ الشهادة بنجاح!' : 'Certificate saved successfully!');
    } catch (err: any) {
      console.error("Save badge error:", err);
      alert(isArabic ? `فشل حفظ الشهادة: ${err?.message || ''}` : `Failed to save certificate: ${err?.message || ''}`);
    }
  };

  const handleDeleteBadge = async (id: string) => {
    if (!window.confirm(isArabic ? 'هل أنت متأكد من حذف هذه الشهادة؟' : 'Delete this certificate?')) return;
    try {
      await deleteDoc(doc(db, 'certificates', id));
    } catch (err) {
      console.error("Delete cert error:", err);
    }
    setSiteSettings(prev => ({
      ...prev,
      verificationBadges: prev.verificationBadges.filter(b => b.id !== id)
    }));
  };

  const handleResetBadgesToDefault = () => {
    if (!window.confirm(isArabic ? 'هل تريد استعادة الشهادات الرسمية الافتراضية؟' : 'Reset to default official certificates?')) return;
    setSiteSettings(prev => ({
      ...prev,
      verificationBadges: defaultSiteSettings.verificationBadges
    }));
  };

  const handleLogout = async () => {
    sessionStorage.removeItem('admin_authenticated');
    await auth.signOut();
    navigate('/login');
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const rawPrice = editingItem.price;
      const parsedPrice = typeof rawPrice === 'number' ? rawPrice : parseFloat(String(rawPrice || 0));
      
      const itemData: Record<string, any> = {
        id: editingItem.id || `item_${Date.now()}`,
        name: editingItem.name || '',
        nameAr: editingItem.nameAr || '',
        description: editingItem.description || '',
        descriptionAr: editingItem.descriptionAr || '',
        price: isNaN(parsedPrice) ? 0 : parsedPrice,
        category: editingItem.category || categories[0]?.id || 'grills',
        image: editingItem.image || '',
        isPopular: !!editingItem.isPopular,
        isVatExempt: !!editingItem.isVatExempt,
        includesVat: editingItem.includesVat !== undefined ? editingItem.includesVat : siteSettings.vatIncludedInPrices,
      };

      if (editingItem.calories !== undefined && editingItem.calories !== null) {
        const cal = typeof editingItem.calories === 'number' ? editingItem.calories : parseInt(String(editingItem.calories));
        if (!isNaN(cal)) {
          itemData.calories = cal;
        }
      }

      const cleanData = cleanForFirestore(itemData);
      await setDoc(doc(db, 'menuItems', cleanData.id), cleanData);
      setIsModalOpen(false);
      setEditingItem(null);
    } catch (error: any) {
      console.error("Save item error:", error);
      alert(isArabic ? `فشل حفظ الصنف: ${error?.message || 'يرجى التأكد من البيانات'}` : `Failed to save item: ${error?.message || 'Check inputs'}`);
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

    if (file.size > 15 * 1024 * 1024) {
      alert(isArabic ? 'الملف كبير جداً. الحد الأقصى 15 ميجابايت.' : 'File is too large. Max 15MB.');
      return;
    }

    try {
      setUploadProgress(50);
      const dataUrl = await processImageFile(file);
      setEditingItem(prev => ({ ...prev!, image: dataUrl }));
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(null), 400);
    } catch (err) {
      console.error("Direct processing error:", err);
      alert(isArabic ? 'فشل معالجة الصورة' : 'Upload failed');
      setUploadProgress(null);
    }
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
      const cleanCat = cleanForFirestore(catData);
      await setDoc(doc(db, 'categories', catId), cleanCat);
      setEditingCategory(null);
    } catch (error: any) {
      console.error('Save category failed:', error);
      alert(isArabic ? `فشل حفظ القسم: ${error?.message || ''}` : `Failed to save category: ${error?.message || ''}`);
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

      {/* Navigation Tabs */}
      <div className="bg-black/95 border-b border-white/10 px-8 py-3 sticky top-0 z-20 flex gap-3 text-sm font-bold text-white shadow-md">
        <button
          onClick={() => setActiveTab('items')}
          className={`px-6 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'items' 
              ? 'bg-yellow text-black font-black shadow-lg' 
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          <Utensils size={18} />
          <span>{isArabic ? 'إدارة الأصناف والأقسام' : 'Items & Categories'}</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-6 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'settings' 
              ? 'bg-yellow text-black font-black shadow-lg' 
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          <ShieldCheck size={18} />
          <span>{isArabic ? 'إعدادات الضريبة والتوثيق' : 'VAT & Badges Settings'}</span>
        </button>
      </div>

      <main className="max-w-7xl mx-auto p-8">
        {activeTab === 'items' ? (
          <>
            <div className="flex justify-between items-center mb-10">
              <div>
                <h2 className="text-3xl font-black text-dark mb-2">الأصناف الحالية</h2>
                <p className="text-dark/40">يمكنك تعديل الأسعار، المكونات، وإضافة أصناف جديدة</p>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => setIsCategoryReorderModalOpen(true)}
                  className="bg-white text-dark border border-black/5 font-black px-8 py-4 rounded-2xl flex items-center gap-3 hover:bg-neutral-100 transition-all shadow-xl cursor-pointer"
                >
                  <ListOrdered size={24} />
                  <span>إدارة وترتيب الأقسام</span>
                </button>
                <button 
                  onClick={() => {
                    setEditingItem({ category: categories[0]?.id, isPopular: false, isVatExempt: false });
                    setIsModalOpen(true);
                  }}
                  className="bg-black text-yellow font-black px-8 py-4 rounded-2xl flex items-center gap-3 hover:scale-105 transition-transform shadow-2xl cursor-pointer"
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
                  <div className="flex flex-col items-end gap-1">
                    {(() => {
                      const rawPrice = Number(item.price) || 0;
                      const isExempt = !!item.isVatExempt;
                      const isIncludesVat = item.includesVat !== undefined ? item.includesVat : siteSettings.vatIncludedInPrices;
                      const vatRate = siteSettings.vatRate || 15;
                      let pBefore = rawPrice;
                      let pWith = rawPrice;
                      if (siteSettings.vatEnabled && !isExempt) {
                        if (isIncludesVat) {
                          pWith = rawPrice;
                          pBefore = rawPrice / (1 + vatRate / 100);
                        } else {
                          pBefore = rawPrice;
                          pWith = rawPrice * (1 + vatRate / 100);
                        }
                      }
                      return (
                        <div className="bg-black text-yellow font-black px-3.5 py-2 rounded-xl text-sm shadow-sm flex flex-col items-end">
                          <div className="flex items-center gap-1 text-yellow">
                            <span className="text-[10px] text-white/70 font-medium">{isArabic ? 'شامل:' : 'Incl:'}</span>
                            <span className="text-base font-black">{pWith.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
                            <span className="text-xs">﷼</span>
                          </div>
                          {siteSettings.vatEnabled && !isExempt && (
                            <div className="flex items-center gap-1 text-white/80 border-t border-white/10 pt-0.5 mt-0.5 text-[10px]">
                              <span className="text-white/50">{isArabic ? 'قبل:' : 'Excl:'}</span>
                              <span className="font-bold">{pBefore.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
                              <span className="text-[9px]">﷼</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    {siteSettings.vatEnabled && (
                      item.isVatExempt ? (
                        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                          {isArabic ? 'معفى من الضريبة' : 'VAT Exempt'}
                        </span>
                      ) : (item.includesVat !== undefined ? item.includesVat : siteSettings.vatIncludedInPrices) ? (
                        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {isArabic ? 'شامل الضريبة' : 'VAT Incl.'}
                        </span>
                      ) : (
                        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200">
                          {isArabic ? 'لا يشمل الضريبة' : 'Excl. VAT'}
                        </span>
                      )
                    )}
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
          </>
        ) : (
          <div className="space-y-10">
            {/* Title & Save Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-black/5 rounded-[2rem] p-8 shadow-sm">
              <div>
                <h2 className="text-3xl font-black text-dark mb-1">إعدادات الضريبة وصور التوثيق</h2>
                <p className="text-dark/50 text-sm">تفعيل قيمة الضريبة وإدارة صور الشهادات الرسمية التي تظهر أسفل الموقع بشكل متحرك</p>
              </div>

              <button
                onClick={() => handleSaveSettings()}
                disabled={isSavingSettings}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-8 py-4 rounded-2xl flex items-center gap-3 transition-all shadow-xl cursor-pointer disabled:opacity-50"
              >
                {isSavingSettings ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Save size={20} />
                )}
                <span>{isArabic ? 'حفظ التغييرات' : 'Save Settings'}</span>
              </button>
            </div>

            {/* VAT Settings Card */}
            <div className="bg-white border border-black/5 rounded-[2.5rem] p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-black/5">
                <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 rounded-2xl flex items-center justify-center">
                  <Receipt size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-dark">إعدادات ضريبة القيمة المضافة (VAT)</h3>
                  <p className="text-xs text-dark/40">التحكم في تفعيل أو إخفاء نسبة الضريبة المضافة والأرقام الرسمية</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* VAT Toggle */}
                <div className="bg-neutral-50 p-6 rounded-2xl border border-black/5 flex items-center justify-between">
                  <div>
                    <label className="block font-black text-dark text-base mb-1">تفعيل ضريبة القيمة المضافة</label>
                    <p className="text-xs text-dark/50">تفعيل خيار الضريبة المضافة للوجبات والمنيو</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSiteSettings(prev => ({ ...prev, vatEnabled: !prev.vatEnabled }))}
                    className={`w-16 h-9 rounded-full p-1 transition-colors duration-300 flex items-center cursor-pointer ${
                      siteSettings.vatEnabled ? 'bg-emerald-500 justify-end' : 'bg-neutral-300 justify-start'
                    }`}
                  >
                    <motion.div layout className="w-7 h-7 bg-white rounded-full shadow-md" />
                  </button>
                </div>

                {/* VAT Inclusion Mode Option */}
                <div className="bg-neutral-50 p-6 rounded-2xl border border-black/5 md:col-span-2">
                  <label className="block font-black text-dark text-sm mb-3">طريقة احتساب واحتساب الضريبة المضافة للأسعار:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setSiteSettings(prev => ({ ...prev, vatIncludedInPrices: false }))}
                      className={`p-5 rounded-2xl border-2 text-right transition-all flex flex-col justify-between cursor-pointer ${
                        !siteSettings.vatIncludedInPrices 
                          ? 'border-yellow bg-yellow/10 font-bold shadow-md' 
                          : 'border-black/5 bg-white text-dark/70 hover:bg-neutral-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-black text-sm text-dark">الأسعار المكتوبة لا تشمل الضريبة</span>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${!siteSettings.vatIncludedInPrices ? 'border-black bg-yellow' : 'border-neutral-300'}`}>
                          {!siteSettings.vatIncludedInPrices && <div className="w-2 h-2 rounded-full bg-black" />}
                        </div>
                      </div>
                      <p className="text-xs text-dark/60 leading-relaxed">
                        مثال: إذا كان سعر الصنف 100 ﷼، فإن الضريبة (15%) = 15 ﷼، ويصبح السعر النهائي المعروض 115 ﷼ مع بيان تفصيلي للعميل.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSiteSettings(prev => ({ ...prev, vatIncludedInPrices: true }))}
                      className={`p-5 rounded-2xl border-2 text-right transition-all flex flex-col justify-between cursor-pointer ${
                        siteSettings.vatIncludedInPrices 
                          ? 'border-yellow bg-yellow/10 font-bold shadow-md' 
                          : 'border-black/5 bg-white text-dark/70 hover:bg-neutral-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-black text-sm text-dark">الأسعار المكتوبة شاملة الضريبة</span>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${siteSettings.vatIncludedInPrices ? 'border-black bg-yellow' : 'border-neutral-300'}`}>
                          {siteSettings.vatIncludedInPrices && <div className="w-2 h-2 rounded-full bg-black" />}
                        </div>
                      </div>
                      <p className="text-xs text-dark/60 leading-relaxed">
                        مثال: إذا كان سعر الصنف 100 ﷼، فإن هذا السعر شامل لضريبة القيمة المضافة بالفعل ويظهر إشعار "شامل الضريبة".
                      </p>
                    </button>
                  </div>
                </div>

                {/* VAT Rate */}
                <div className="bg-neutral-50 p-6 rounded-2xl border border-black/5">
                  <label className="block font-black text-dark text-xs uppercase tracking-wider mb-2">نسبة الضريبة المضافة (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={siteSettings.vatRate ?? 15}
                      onChange={(e) => setSiteSettings(prev => ({ ...prev, vatRate: parseFloat(e.target.value) || 0 }))}
                      placeholder="15"
                      className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 font-black text-dark focus:outline-none focus:border-yellow"
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-dark/40">%</span>
                  </div>
                </div>

                {/* VAT Number */}
                <div className="bg-neutral-50 p-6 rounded-2xl border border-black/5">
                  <label className="block font-black text-dark text-xs uppercase tracking-wider mb-2">رقم التسجيل الضريبي (VAT Number)</label>
                  <input
                    type="text"
                    value={siteSettings.vatNumber || ''}
                    onChange={(e) => setSiteSettings(prev => ({ ...prev, vatNumber: e.target.value }))}
                    placeholder="مثال: 310245892300003"
                    className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 font-mono text-dark focus:outline-none focus:border-yellow"
                  />
                  <span className="text-[11px] text-dark/40 mt-1 block">رقم الشهادة الضريبية من هيئة الزكاة والضريبة والجمارك (15 رقم)</span>
                </div>

                {/* CR Number */}
                <div className="bg-neutral-50 p-6 rounded-2xl border border-black/5">
                  <label className="block font-black text-dark text-xs uppercase tracking-wider mb-2">رقم السجل التجاري (CR Number)</label>
                  <input
                    type="text"
                    value={siteSettings.crNumber || ''}
                    onChange={(e) => setSiteSettings(prev => ({ ...prev, crNumber: e.target.value }))}
                    placeholder="مثال: 1010892341"
                    className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 font-mono text-dark focus:outline-none focus:border-yellow"
                  />
                  <span className="text-[11px] text-dark/40 mt-1 block">رقم السجل التجاري الصادر للمطعم من وزارة التجارة</span>
                </div>
              </div>
            </div>

            {/* Social Media & Contact Info Card */}
            <div className="bg-white border border-black/5 rounded-[2.5rem] p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-black/5">
                <div className="w-12 h-12 bg-amber-500/10 text-amber-600 rounded-2xl flex items-center justify-center">
                  <Share2 size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-dark">حسابات التواصل الاجتماعي ومعلومات الاتصال</h3>
                  <p className="text-xs text-dark/40">التحكم في حساب السناب شات، الواتساب، رقم التواصل، خرائط جوجل وساعات العمل</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Phone */}
                <div className="bg-neutral-50 p-5 rounded-2xl border border-black/5">
                  <label className="flex items-center gap-2 font-black text-dark text-xs uppercase tracking-wider mb-2">
                    <Phone size={16} className="text-amber-600" />
                    <span>رقم الهاتف / الاتصال المباشر</span>
                  </label>
                  <input
                    type="text"
                    value={siteSettings.socialLinks?.phone || ''}
                    onChange={(e) => setSiteSettings(prev => ({
                      ...prev,
                      socialLinks: { ...prev.socialLinks, phone: e.target.value }
                    }))}
                    placeholder="مثال: 0502163363"
                    className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 font-mono text-dark focus:outline-none focus:border-yellow"
                  />
                </div>

                {/* WhatsApp */}
                <div className="bg-neutral-50 p-5 rounded-2xl border border-black/5">
                  <label className="flex items-center gap-2 font-black text-dark text-xs uppercase tracking-wider mb-2">
                    <MessageCircle size={16} className="text-emerald-600" />
                    <span>رقم الواتساب (مع رمز الدولة)</span>
                  </label>
                  <input
                    type="text"
                    value={siteSettings.socialLinks?.whatsapp || ''}
                    onChange={(e) => setSiteSettings(prev => ({
                      ...prev,
                      socialLinks: { ...prev.socialLinks, whatsapp: e.target.value }
                    }))}
                    placeholder="مثال: 966502163363"
                    className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 font-mono text-dark focus:outline-none focus:border-yellow"
                  />
                </div>

                {/* Snapchat Username */}
                <div className="bg-neutral-50 p-5 rounded-2xl border border-black/5">
                  <label className="flex items-center gap-2 font-black text-dark text-xs uppercase tracking-wider mb-2">
                    <SnapchatIcon className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span>حساب السناب شات (اسم المستخدم)</span>
                  </label>
                  <input
                    type="text"
                    value={siteSettings.socialLinks?.snapchat || ''}
                    onChange={(e) => setSiteSettings(prev => ({
                      ...prev,
                      socialLinks: { ...prev.socialLinks, snapchat: e.target.value }
                    }))}
                    placeholder="مثال: bbq_trip"
                    className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 font-mono text-dark focus:outline-none focus:border-yellow"
                  />
                </div>

                {/* Snapchat QR Code Image */}
                <div className="bg-neutral-50 p-5 rounded-2xl border border-black/5 md:col-span-2">
                  <label className="flex items-center gap-2 font-black text-dark text-xs uppercase tracking-wider mb-2">
                    <QrCode size={16} className="text-amber-500" />
                    <span>رمز كود السناب شات (Snapcode Image)</span>
                  </label>
                  <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <div className="relative w-28 h-28 bg-[#FFFC00] border-2 border-yellow rounded-2xl overflow-hidden p-2 flex items-center justify-center shrink-0 shadow-md">
                      <img
                        src={siteSettings.socialLinks?.snapchatQr || '/snapchat_qr.jpg'}
                        alt="Snapchat QR Code"
                        className="w-full h-full object-contain rounded-xl"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/snapchat_qr.jpg';
                        }}
                      />
                    </div>
                    <div className="flex-1 w-full space-y-3">
                      <input
                        type="text"
                        value={siteSettings.socialLinks?.snapchatQr || ''}
                        onChange={(e) => setSiteSettings(prev => ({
                          ...prev,
                          socialLinks: { ...prev.socialLinks, snapchatQr: e.target.value }
                        }))}
                        placeholder="رابط الصورة أو مسار الملف (مثال: /snapchat_qr.jpg)"
                        className="w-full bg-white border border-black/10 rounded-xl px-4 py-2.5 font-mono text-xs text-dark focus:outline-none focus:border-yellow"
                      />
                      <label className="inline-flex items-center gap-2 bg-yellow hover:bg-yellow/80 text-black font-bold px-4 py-2 rounded-xl text-xs cursor-pointer shadow-sm transition-all">
                        <Upload size={14} />
                        <span>رفع صورة / كود سناب جديد</span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const dataUrl = await processImageFile(file, 600, 600, 0.8);
                                setSiteSettings(prev => ({
                                  ...prev,
                                  socialLinks: { ...prev.socialLinks, snapchatQr: dataUrl }
                                }));
                              } catch (err) {
                                console.error("Snapchat QR image upload error:", err);
                              }
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Instagram */}
                <div className="bg-neutral-50 p-5 rounded-2xl border border-black/5">
                  <label className="flex items-center gap-2 font-black text-dark text-xs uppercase tracking-wider mb-2">
                    <InstagramIcon className="w-4 h-4 text-pink-600" />
                    <span>حساب إنستغرام (اسم المستخدم أو الرابط)</span>
                  </label>
                  <input
                    type="text"
                    value={siteSettings.socialLinks?.instagram || ''}
                    onChange={(e) => setSiteSettings(prev => ({
                      ...prev,
                      socialLinks: { ...prev.socialLinks, instagram: e.target.value }
                    }))}
                    placeholder="مثال: bbq_trip"
                    className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 font-mono text-dark focus:outline-none focus:border-yellow"
                  />
                </div>

                {/* TikTok */}
                <div className="bg-neutral-50 p-5 rounded-2xl border border-black/5">
                  <label className="flex items-center gap-2 font-black text-dark text-xs uppercase tracking-wider mb-2">
                    <TikTokIcon className="w-4 h-4 text-black" />
                    <span>حساب تيك توك (اسم المستخدم أو الرابط)</span>
                  </label>
                  <input
                    type="text"
                    value={siteSettings.socialLinks?.tiktok || ''}
                    onChange={(e) => setSiteSettings(prev => ({
                      ...prev,
                      socialLinks: { ...prev.socialLinks, tiktok: e.target.value }
                    }))}
                    placeholder="مثال: bbq_trip"
                    className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 font-mono text-dark focus:outline-none focus:border-yellow"
                  />
                </div>

                {/* Twitter / X */}
                <div className="bg-neutral-50 p-5 rounded-2xl border border-black/5">
                  <label className="flex items-center gap-2 font-black text-dark text-xs uppercase tracking-wider mb-2">
                    <TwitterIcon className="w-4 h-4 text-sky-600" />
                    <span>حساب تويتر / منصة X</span>
                  </label>
                  <input
                    type="text"
                    value={siteSettings.socialLinks?.twitter || ''}
                    onChange={(e) => setSiteSettings(prev => ({
                      ...prev,
                      socialLinks: { ...prev.socialLinks, twitter: e.target.value }
                    }))}
                    placeholder="مثال: bbq_trip"
                    className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 font-mono text-dark focus:outline-none focus:border-yellow"
                  />
                </div>

                {/* Google Maps URL */}
                <div className="bg-neutral-50 p-5 rounded-2xl border border-black/5">
                  <label className="flex items-center gap-2 font-black text-dark text-xs uppercase tracking-wider mb-2">
                    <MapPin size={16} className="text-red-500" />
                    <span>رابط موقع المطعم (خرائط جوجل)</span>
                  </label>
                  <input
                    type="text"
                    value={siteSettings.socialLinks?.googleMapsUrl || ''}
                    onChange={(e) => setSiteSettings(prev => ({
                      ...prev,
                      socialLinks: { ...prev.socialLinks, googleMapsUrl: e.target.value }
                    }))}
                    placeholder="https://maps.google.com/..."
                    className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 font-mono text-xs text-dark focus:outline-none focus:border-yellow"
                  />
                </div>

                {/* Working Hours */}
                <div className="bg-neutral-50 p-5 rounded-2xl border border-black/5 md:col-span-2">
                  <label className="flex items-center gap-2 font-black text-dark text-xs uppercase tracking-wider mb-2">
                    <Clock size={16} className="text-amber-600" />
                    <span>أوقات وساعات العمل (بالعربية)</span>
                  </label>
                  <input
                    type="text"
                    value={siteSettings.socialLinks?.workingHoursAr || ''}
                    onChange={(e) => setSiteSettings(prev => ({
                      ...prev,
                      socialLinks: { ...prev.socialLinks, workingHoursAr: e.target.value }
                    }))}
                    placeholder="مثال: يوميًا من 4:00 مساءً حتى 2:00 صباحًا"
                    className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-dark focus:outline-none focus:border-yellow"
                  />
                </div>
              </div>
            </div>

            {/* Verification Badges Manager */}
            <div className="bg-white border border-black/5 rounded-[2.5rem] p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-black/5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-yellow/10 text-yellow-700 rounded-2xl flex items-center justify-center">
                    <ShieldCheck size={26} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-dark">صور شهادات التوثيق والاعتماد (Carousel)</h3>
                    <p className="text-xs text-dark/40">تظهر هذه الصور بشكل متحرك ومتعاقب (صورة واحدة متفاعلة) في أسفل الموقع</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleResetBadgesToDefault}
                    className="bg-neutral-100 hover:bg-neutral-200 text-dark font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <RotateCcw size={14} />
                    <span>استعادة الافتراضية</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingBadge({ titleAr: '', subtitleAr: '', imageUrl: '' });
                      setIsBadgeModalOpen(true);
                    }}
                    className="bg-black text-yellow font-black px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 hover:scale-105 transition-transform shadow-lg cursor-pointer"
                  >
                    <Plus size={16} />
                    <span>إضافة شهادة جديدة</span>
                  </button>
                </div>
              </div>

              {/* Badges Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {siteSettings.verificationBadges.map((badge, idx) => (
                  <div 
                    key={badge.id || idx}
                    className="bg-neutral-50 rounded-2xl border border-black/5 p-5 flex flex-col justify-between relative shadow-2xs hover:shadow-md transition-all"
                  >
                    <div className="relative aspect-[16/10] bg-white rounded-xl overflow-hidden mb-3 border border-black/5 flex items-center justify-center p-2">
                      <img
                        src={badge.imageUrl}
                        alt={badge.titleAr}
                        className="w-full h-full object-contain"
                      />
                      <span className="absolute top-2 right-2 bg-black/80 text-yellow text-[10px] font-black px-2 py-0.5 rounded-md">
                        #{idx + 1}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-black text-dark text-sm mb-1">{badge.titleAr || badge.title}</h4>
                      <p className="text-xs text-dark/50 line-clamp-1">{badge.subtitleAr || badge.subtitle}</p>
                    </div>

                    <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-black/5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingBadge(badge);
                          setIsBadgeModalOpen(true);
                        }}
                        className="w-9 h-9 bg-white hover:bg-black hover:text-yellow text-dark rounded-xl flex items-center justify-center transition-all border border-black/5 cursor-pointer"
                        title="تعديل"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBadge(badge.id)}
                        className="w-9 h-9 bg-red-50 hover:bg-red-500 hover:text-white text-red-500 rounded-xl flex items-center justify-center transition-all border border-red-100 cursor-pointer"
                        title="حذف"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Item Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col z-10"
            >
              <div className="bg-black text-white p-6 sm:p-8 flex justify-between items-center shrink-0 border-b border-white/10">
                <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight">
                  {editingItem?.id ? (isArabic ? 'تعديل صنف' : 'Edit Item') : (isArabic ? 'إضافة صنف جديد' : 'Add New Item')}
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveItem} className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
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
                        step="any"
                        value={editingItem?.price ?? ''}
                        onChange={e => setEditingItem(prev => ({ ...prev!, price: e.target.value === '' ? 0 : parseFloat(e.target.value) }))}
                        className="w-full bg-neutral-100 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-yellow font-bold text-dark pr-12"
                      />
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-dark/30 font-bold">﷼</span>
                    </div>
                  </label>

                  <label className="block">
                    <span className="text-xs font-black uppercase text-dark/40 tracking-widest block mb-2">التصنيف</span>
                    <select 
                      value={editingItem?.category || categories[0]?.id || 'grills'}
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
                      value={editingItem?.calories ?? ''}
                      onChange={e => setEditingItem(prev => ({ ...prev!, calories: e.target.value === '' ? undefined : parseInt(e.target.value) }))}
                      className="w-full bg-neutral-100 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-yellow font-bold text-dark"
                    />
                  </label>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row gap-6 items-center">
                    <div className="flex-1 w-full space-y-4">
                      {/* Upload Option */}
                      <div>
                        <span className="text-xs font-black uppercase text-dark/40 tracking-widest block mb-2">
                          {isArabic ? 'رفع صورة من جهازك' : 'Upload Image'}
                        </span>
                        <div className="relative">
                          <input 
                            type="file" 
                            accept="image/*,.pdf,application/pdf"
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
                                <p className="text-[10px] text-emerald-600 font-bold text-center mt-2 px-4 leading-tight">
                                  {isArabic 
                                    ? 'يتم رفع وتحويل الصور مباشرة من جهازك بسرعة فائقة' 
                                    : 'Directly converts and uploads images from your device'}
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
                      <div className="w-full md:w-40 h-40 bg-neutral-100 rounded-2xl overflow-hidden border-2 border-yellow/20 flex-shrink-0 relative">
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

                  <div className="space-y-4 pt-2">
                    {/* Popular Toggle */}
                    <label className="flex items-center gap-3 cursor-pointer group bg-neutral-100 p-4 rounded-2xl border border-black/5 hover:bg-neutral-200/60 transition-colors">
                      <div className="relative flex-shrink-0">
                        <input 
                          type="checkbox" 
                          checked={editingItem?.isPopular || false}
                          onChange={e => setEditingItem(prev => ({ ...prev!, isPopular: e.target.checked }))}
                          className="sr-only"
                        />
                        <div className={`w-11 h-6 rounded-full transition-colors ${editingItem?.isPopular ? 'bg-yellow' : 'bg-neutral-300'}`} />
                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${editingItem?.isPopular ? 'translate-x-5' : ''}`} />
                      </div>
                      <span className="font-bold text-xs text-dark">{isArabic ? 'تمييز كـ "شائع" (Popular)' : 'Mark as Popular'}</span>
                    </label>

                    {/* VAT Option selector for this item */}
                    <div className="bg-neutral-100 p-4 rounded-2xl border border-black/5 space-y-2">
                      <span className="text-xs font-black text-dark block">
                        {isArabic ? 'حالة ضريبة القيمة المضافة لهذا الصنف:' : 'VAT Status for this item:'}
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingItem(prev => ({ ...prev!, isVatExempt: false, includesVat: false }))}
                          className={`p-3 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                            !editingItem?.isVatExempt && editingItem?.includesVat === false
                              ? 'bg-yellow text-black border-black font-black shadow-sm'
                              : 'bg-white text-dark/70 border-black/5 hover:bg-neutral-50'
                          }`}
                        >
                          {isArabic ? 'السعر لا يشمل الضريبة' : 'Excludes VAT'}
                          <span className="block text-[9px] opacity-75 font-normal">{isArabic ? '(تُضاف 15% ضريبة)' : '(+15% VAT added)'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingItem(prev => ({ ...prev!, isVatExempt: false, includesVat: true }))}
                          className={`p-3 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                            !editingItem?.isVatExempt && editingItem?.includesVat !== false
                              ? 'bg-yellow text-black border-black font-black shadow-sm'
                              : 'bg-white text-dark/70 border-black/5 hover:bg-neutral-50'
                          }`}
                        >
                          {isArabic ? 'السعر شامل الضريبة' : 'Includes VAT'}
                          <span className="block text-[9px] opacity-75 font-normal">{isArabic ? '(السعر نهائي)' : '(Final Price)'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingItem(prev => ({ ...prev!, isVatExempt: true }))}
                          className={`p-3 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                            editingItem?.isVatExempt
                              ? 'bg-amber-100 text-amber-900 border-amber-300 font-black shadow-sm'
                              : 'bg-white text-dark/70 border-black/5 hover:bg-neutral-50'
                          }`}
                        >
                          {isArabic ? 'معفى من الضريبة' : 'VAT Exempt'}
                          <span className="block text-[9px] opacity-75 font-normal">{isArabic ? '(0% ضريبة)' : '(0% VAT)'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 flex gap-4">
                  <button 
                    type="submit"
                    className="flex-1 bg-black text-yellow font-black py-4 sm:py-5 rounded-2xl hover:scale-102 transition-transform flex items-center justify-center gap-3 shadow-2xl cursor-pointer"
                  >
                    <Save size={20} />
                    <span>حفظ الصنف</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-dark font-bold py-4 sm:py-5 rounded-2xl transition-colors cursor-pointer"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsCategoryReorderModalOpen(false);
                setEditingCategory(null);
              }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col z-10"
            >
              <div className="bg-black text-white p-6 sm:p-8 flex justify-between items-center bg-zinc-950 shrink-0 border-b border-white/10">
                <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight">
                  {isArabic ? 'إدارة أقسام المنيو' : 'Manage Categories'}
                </h3>
                <button 
                  onClick={() => {
                    setIsCategoryReorderModalOpen(false);
                    setEditingCategory(null);
                  }}
                  className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 sm:p-8 overflow-y-auto flex-1 custom-scrollbar">
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

      {/* Verification Badge Edit/Add Modal */}
      <AnimatePresence>
        {isBadgeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBadgeModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-[2.5rem] p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl z-10 text-dark"
            >
              <button 
                onClick={() => setIsBadgeModalOpen(false)}
                className="absolute top-6 left-6 text-dark/40 hover:text-dark p-2 rounded-full hover:bg-neutral-100 transition-all cursor-pointer"
              >
                <X size={20} />
              </button>

              <h3 className="text-2xl font-black mb-6">
                {editingBadge?.id ? 'تعديل شهادة التوثيق' : 'إضافة شهادة توثيق جديدة'}
              </h3>

              <form onSubmit={handleSaveBadge} className="space-y-5">
                <div>
                  <label className="block text-xs font-black uppercase text-dark/50 mb-1">اسم الشهادة / الوثيقة (بالعربي)</label>
                  <input 
                    type="text" 
                    required
                    value={editingBadge?.titleAr || ''}
                    onChange={(e) => setEditingBadge(prev => ({ ...prev, titleAr: e.target.value, title: e.target.value }))}
                    placeholder="مثال: شهادة التسجيل الضريبي"
                    className="w-full bg-neutral-50 border border-black/10 rounded-xl px-4 py-3 font-bold text-dark focus:outline-none focus:border-yellow"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-dark/50 mb-1">الجهة المصدرة / الوصف الفرعي</label>
                  <input 
                    type="text" 
                    value={editingBadge?.subtitleAr || ''}
                    onChange={(e) => setEditingBadge(prev => ({ ...prev, subtitleAr: e.target.value, subtitle: e.target.value }))}
                    placeholder="مثال: هيئة الزكاة والضريبة والجمارك"
                    className="w-full bg-neutral-50 border border-black/10 rounded-xl px-4 py-3 font-medium text-dark focus:outline-none focus:border-yellow"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-dark/50 mb-2">صورة الشهادة</label>
                  
                  {/* Image/PDF Upload Box */}
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-black/10 hover:border-yellow rounded-2xl cursor-pointer bg-neutral-50 hover:bg-yellow/5 transition-all mb-3">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload size={28} className="text-dark/40 mb-2" />
                      <p className="text-xs font-bold text-dark/70">اضغط لرفع صورة أو ملف PDF من جهازك</p>
                      <p className="text-[10px] text-dark/40 mt-1">PNG, JPG, SVG, PDF حتى 10 ميجابايت</p>
                    </div>
                    <input type="file" accept="image/*,.pdf,application/pdf" onChange={handleBadgeImageUpload} className="hidden" />
                  </label>

                  {badgeUploadProgress !== null && (
                    <div className="w-full bg-neutral-200 rounded-full h-2 mb-3 overflow-hidden">
                      <div className="bg-yellow h-2 transition-all" style={{ width: `${badgeUploadProgress}%` }} />
                    </div>
                  )}

                  {/* Direct Image/PDF URL input */}
                  <div>
                    <label className="block text-[11px] font-bold text-dark/40 mb-1">أو أدخل رابط الملف/الصورة مباشرة (URL):</label>
                    <input
                      type="text"
                      value={editingBadge?.imageUrl || ''}
                      onChange={(e) => setEditingBadge(prev => ({ ...prev, imageUrl: e.target.value }))}
                      placeholder="https://..."
                      className="w-full bg-neutral-50 border border-black/10 rounded-xl px-4 py-2.5 text-xs font-mono text-dark focus:outline-none focus:border-yellow"
                    />
                  </div>

                  {/* Preview */}
                  {editingBadge?.imageUrl && (
                    <div className="mt-3 bg-neutral-100 p-2 rounded-xl border border-black/5 h-44 flex items-center justify-center overflow-hidden">
                      {(editingBadge.imageUrl.startsWith('data:application/pdf') || editingBadge.imageUrl.toLowerCase().includes('.pdf')) ? (
                        <iframe src={`${editingBadge.imageUrl}#toolbar=0`} className="w-full h-full rounded-lg border-none" title="PDF Certificate Preview" />
                      ) : (
                        <img src={editingBadge.imageUrl} alt="Preview" className="max-h-full object-contain" />
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="submit"
                    className="flex-1 bg-black text-yellow font-black py-4 rounded-xl hover:scale-102 transition-transform shadow-lg cursor-pointer"
                  >
                    حفظ الشهادة
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsBadgeModalOpen(false)}
                    className="bg-neutral-100 text-dark font-bold px-6 py-4 rounded-xl hover:bg-neutral-200 transition-all cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
