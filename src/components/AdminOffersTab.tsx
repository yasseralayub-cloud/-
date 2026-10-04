import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, doc, setDoc, deleteDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { Offer, FallbackOfferSettings } from '../types';
import { defaultOffers } from '../data/mockOffers';
import { 
  Plus, Edit, Trash2, Image as ImageIcon, Clock, 
  Flame, Upload, Calendar, RefreshCw, XCircle, Sparkles, CheckCircle2, Save, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminOffersTabProps {
  isArabic: boolean;
}

// Image processing helper: compresses & scales device image to data URL
export const processDeviceImage = async (
  file: File, 
  maxWidth = 1200, 
  maxHeight = 900, 
  quality = 0.78
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (!result) {
        reject(new Error('Failed to read image file'));
        return;
      }

      if (file.type.includes('svg')) {
        resolve(result);
        return;
      }

      const img = new Image();
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

// Formats a Date object into 'YYYY-MM-DDTHH:mm' for datetime-local input
const formatForDateTimeLocal = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mi = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
};

// Calculates human-readable countdown remaining string
function getRemainingTimeText(targetDateStr: string, isArabic: boolean): { text: string; isExpired: boolean } {
  if (!targetDateStr) return { text: isArabic ? 'غير محدد' : 'Not set', isExpired: false };
  const target = new Date(targetDateStr).getTime();
  const now = new Date().getTime();
  const diff = target - now;

  if (isNaN(target) || diff <= 0) {
    return { text: isArabic ? 'منتهي' : 'Expired', isExpired: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return { 
      text: isArabic ? `${days} يوم و ${hours} ساعة` : `${days}d ${hours}h left`, 
      isExpired: false 
    };
  }
  return { 
    text: isArabic ? `${hours} ساعة و ${minutes} دقيقة` : `${hours}h ${minutes}m left`, 
    isExpired: false 
  };
}

export default function AdminOffersTab({ isArabic }: AdminOffersTabProps) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingOffer, setEditingOffer] = useState<Partial<Offer> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [previewTab, setPreviewTab] = useState<'upload' | 'url'>('upload');

  // Fallback offer state (the single image shown when all offers expire)
  const [fallbackOffer, setFallbackOffer] = useState<FallbackOfferSettings | null>(null);
  const [isEditingFallback, setIsEditingFallback] = useState(false);
  const [fallbackForm, setFallbackForm] = useState<FallbackOfferSettings>({
    imageUrl: '',
    titleAr: '',
    title: '',
    subtitleAr: '',
    subtitle: ''
  });
  const [fallbackUploadProgress, setFallbackUploadProgress] = useState<number | null>(null);
  const [isSavingFallback, setIsSavingFallback] = useState(false);

  // Real-time Firestore sync for fallback offer
  useEffect(() => {
    const unsubFallback = onSnapshot(doc(db, 'settings', 'fallbackOffer'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as FallbackOfferSettings;
        setFallbackOffer(data);
        setFallbackForm(data);
      } else {
        setFallbackOffer(null);
      }
    }, (err) => {
      console.error("Firestore fallback offer error:", err);
    });

    return () => unsubFallback();
  }, []);

  const handleFallbackImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert(isArabic ? 'حجم الملف كبير جداً (الحد الأقصى 15 ميجابايت)' : 'File too large (Max 15MB)');
      return;
    }

    try {
      setFallbackUploadProgress(40);
      const dataUrl = await processDeviceImage(file, 1200, 900, 0.78);
      setFallbackUploadProgress(85);
      setFallbackForm(prev => ({ ...prev, imageUrl: dataUrl }));
      setFallbackUploadProgress(100);
      setTimeout(() => setFallbackUploadProgress(null), 400);
    } catch (err: any) {
      console.error("Fallback image upload error:", err);
      alert(isArabic ? `فشل تحميل الصورة: ${err?.message || ''}` : `Failed to upload image: ${err?.message || ''}`);
      setFallbackUploadProgress(null);
    }
  };

  const handleSaveFallbackOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fallbackForm.imageUrl?.trim()) {
      alert(isArabic ? 'يرجى تحميل الصورة البديلة أولاً' : 'Please upload the fallback image first');
      return;
    }
    setIsSavingFallback(true);
    try {
      const payload: FallbackOfferSettings = {
        imageUrl: fallbackForm.imageUrl,
        titleAr: (fallbackForm.titleAr || '').trim() || (isArabic ? 'عروضنا المميزة' : 'Special Offers'),
        title: (fallbackForm.title || '').trim() || (fallbackForm.titleAr || 'Special Offers'),
        subtitleAr: (fallbackForm.subtitleAr || '').trim(),
        subtitle: (fallbackForm.subtitle || '').trim(),
        updatedAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'settings', 'fallbackOffer'), payload);
      setIsEditingFallback(false);
      alert(isArabic ? 'تم حفظ الصورة البديلة بنجاح! ستظهر كصورة واحدة تلقائياً عند انتهاء وقت العروض.' : 'Fallback image saved! Will appear automatically when offers expire.');
    } catch (err: any) {
      console.error("Save fallback offer error:", err);
      alert(isArabic ? `فشل الحفظ: ${err?.message || ''}` : `Save failed: ${err?.message || ''}`);
    } finally {
      setIsSavingFallback(false);
    }
  };

  const handleDeleteFallbackOffer = async () => {
    if (!window.confirm(isArabic ? 'هل أنت متأكد من حذف الصورة البديلة؟' : 'Are you sure you want to delete the fallback image?')) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'settings', 'fallbackOffer'));
      setFallbackForm({ imageUrl: '', titleAr: '', title: '', subtitleAr: '', subtitle: '' });
      setIsEditingFallback(false);
      alert(isArabic ? 'تم حذف الصورة البديلة بنجاح' : 'Fallback image deleted');
    } catch (err: any) {
      console.error("Delete fallback offer error:", err);
      alert(isArabic ? `فشل الحذف: ${err?.message || ''}` : `Delete failed: ${err?.message || ''}`);
    }
  };

  const handleExtendOffer = async (offer: Offer, daysToAdd: number = 3) => {
    try {
      const newDate = new Date();
      newDate.setDate(newDate.getDate() + daysToAdd);
      await updateDoc(doc(db, 'offers', offer.id), {
        targetDate: newDate.toISOString(),
        isActive: true
      });
      alert(isArabic ? `تم تمديد العرض بنجاح لمدة ${daysToAdd} أيام إضافية!` : `Offer extended by ${daysToAdd} days!`);
    } catch (err: any) {
      console.error("Extend offer error:", err);
      alert(isArabic ? `فشل تمديد العرض: ${err?.message || ''}` : `Failed to extend offer: ${err?.message || ''}`);
    }
  };

  // Real-time Firestore sync for offers
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'offers'), (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Offer));
      const sorted = fetched.sort((a, b) => (a.order || 0) - (b.order || 0));
      setOffers(sorted);
      setLoading(false);
    }, (err) => {
      console.error("Firestore offers listener error:", err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Quick preset helper to add hours or days to current date
  const setQuickTargetDate = (days: number, hours: number = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(d.getHours() + hours);
    setEditingOffer(prev => ({
      ...prev,
      targetDate: d.toISOString()
    }));
  };

  // Direct device image upload handler
  const handleDeviceImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert(isArabic ? 'حجم الملف كبير جداً (الحد الأقصى 15 ميجابايت)' : 'File too large (Max 15MB)');
      return;
    }

    try {
      setUploadProgress(40);
      const dataUrl = await processDeviceImage(file, 1200, 900, 0.78);
      setUploadProgress(85);
      setEditingOffer(prev => ({
        ...prev,
        imageUrl: dataUrl
      }));
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(null), 400);
    } catch (err: any) {
      console.error("Device image processing error:", err);
      alert(isArabic ? `فشل تحميل الصورة: ${err?.message || ''}` : `Failed to upload image: ${err?.message || ''}`);
      setUploadProgress(null);
    }
  };

  const handleOpenAddModal = () => {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 3);

    setEditingOffer({
      id: `offer-${Date.now()}`,
      titleAr: '',
      title: '',
      imageUrl: '',
      targetDate: defaultDate.toISOString(),
      isActive: true,
      order: offers.length + 1
    });
    setPreviewTab('upload');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (offer: Offer) => {
    setEditingOffer({ ...offer });
    setPreviewTab('upload');
    setIsModalOpen(true);
  };

  const handleSaveOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOffer?.titleAr?.trim()) {
      alert(isArabic ? 'يرجى إدخال اسم العرض' : 'Please provide offer title');
      return;
    }
    if (!editingOffer?.imageUrl?.trim()) {
      alert(isArabic ? 'يرجى تحميل صورة العرض من جهازك' : 'Please upload offer image from your device');
      return;
    }
    if (!editingOffer?.targetDate) {
      alert(isArabic ? 'يرجى تحديد موعد انتهاء العرض التنازلي' : 'Please specify countdown end date and time');
      return;
    }

    setIsSaving(true);
    try {
      const offerId = editingOffer.id || `offer-${Date.now()}`;
      const payload: Offer = {
        id: offerId,
        titleAr: editingOffer.titleAr.trim(),
        title: editingOffer.title?.trim() || editingOffer.titleAr.trim(),
        imageUrl: editingOffer.imageUrl,
        targetDate: editingOffer.targetDate,
        isActive: editingOffer.isActive !== false,
        order: editingOffer.order ?? (offers.length + 1),
        createdAt: editingOffer.createdAt || new Date().toISOString()
      };

      await setDoc(doc(db, 'offers', offerId), payload);
      setIsModalOpen(false);
      setEditingOffer(null);
      alert(isArabic ? 'تم حفظ العرض بنجاح وبدء الموقت التنازلي!' : 'Offer saved successfully!');
    } catch (err: any) {
      console.error("Save offer error:", err);
      alert(isArabic ? `حدث خطأ أثناء حفظ العرض: ${err?.message || ''}` : `Error saving offer: ${err?.message || ''}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteOffer = async (offerId: string) => {
    if (!window.confirm(isArabic ? 'هل أنت متأكد من رغبتك في حذف هذا العرض نهائياً؟' : 'Are you sure you want to delete this offer?')) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'offers', offerId));
    } catch (err: any) {
      console.error("Delete offer error:", err);
      alert(isArabic ? `فشل حذف العرض: ${err?.message || ''}` : `Failed to delete offer: ${err?.message || ''}`);
    }
  };

  const handleToggleOfferActive = async (offer: Offer) => {
    try {
      await updateDoc(doc(db, 'offers', offer.id), {
        isActive: !offer.isActive
      });
    } catch (err: any) {
      console.error("Toggle offer status error:", err);
    }
  };

  const handleImportDefaults = async () => {
    if (!window.confirm(isArabic ? 'هل تريد استيراد نماذج العروض الجاهزة وتفعيلها في قاعدة البيانات؟' : 'Import default sample offers to database?')) {
      return;
    }
    try {
      for (const sample of defaultOffers) {
        await setDoc(doc(db, 'offers', sample.id), sample);
      }
      alert(isArabic ? 'تم استيراد العروض الجاهزة بنجاح!' : 'Default offers imported successfully!');
    } catch (err: any) {
      console.error("Import default offers error:", err);
      alert(isArabic ? `فشل الاستيراد: ${err?.message || ''}` : `Import failed: ${err?.message || ''}`);
    }
  };

  const targetDateInputValue = editingOffer?.targetDate 
    ? formatForDateTimeLocal(new Date(editingOffer.targetDate))
    : '';

  return (
    <div className="space-y-8" dir={isArabic ? 'rtl' : 'ltr'}>
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-black/5 rounded-[2.5rem] p-8 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-yellow/20 text-black flex items-center justify-center font-black">
              <Flame size={22} className="text-amber-500 fill-amber-500" />
            </div>
            <h2 className="text-3xl font-black text-dark">
              {isArabic ? 'إدارة قسم العروض' : 'Offers Management'}
            </h2>
          </div>
          <p className="text-dark/50 text-sm mt-1">
            {isArabic 
              ? 'رفع صور العروض الجاهزة من جهازك مع كتابة اسم العرض ليظهر أعلى الصورة بوضوح تام، وضبط مؤقت العد التنازلي.' 
              : 'Upload your offer posters from device, set the offer title to appear clearly above the image, and set countdown timer.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {offers.length === 0 && (
            <button
              onClick={handleImportDefaults}
              className="bg-neutral-100 hover:bg-neutral-200 text-dark font-bold px-5 py-4 rounded-2xl flex items-center gap-2 transition-all cursor-pointer text-sm"
            >
              <RefreshCw size={18} />
              <span>{isArabic ? 'استيراد نماذج جاهزة' : 'Import Sample Offers'}</span>
            </button>
          )}

          <button
            onClick={handleOpenAddModal}
            className="bg-yellow hover:bg-yellow/90 text-black font-black px-7 py-4 rounded-2xl flex items-center gap-3 transition-all shadow-xl shadow-yellow/20 cursor-pointer transform hover:scale-105 active:scale-95 text-sm"
          >
            <Plus size={20} strokeWidth={3} />
            <span>{isArabic ? 'إضافة عرض جديد' : 'Add New Offer'}</span>
          </button>
        </div>
      </div>

      {/* Fallback Image Management Card (Appears when all timed offers expire) */}
      <div className="bg-white border border-black/5 rounded-[2.5rem] p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 mb-6 border-b border-black/5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black shrink-0">
              <Sparkles size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-dark">
                  {isArabic ? 'الصورة البديلة عند انتهاء وقت العروض' : 'Fallback Image When Offers Expire'}
                </h3>
                {fallbackOffer?.imageUrl ? (
                  <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{isArabic ? 'مفعلة وجاهزة' : 'Active & Ready'}</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-bold bg-neutral-100 text-dark/50 px-2.5 py-0.5 rounded-full">
                    {isArabic ? 'غير محددة بعد' : 'Not set yet'}
                  </span>
                )}
              </div>
              <p className="text-xs text-dark/40 mt-0.5">
                {isArabic 
                  ? 'هذه الصورة ستظهر تلقائياً كصورة واحدة مميزة في قسم العروض فور انتهاء وقت كافة العروض المحددة بمؤقت' 
                  : 'This image will appear automatically as a single image when all timed offers expire'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditingFallback ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setFallbackForm(fallbackOffer || { imageUrl: '', titleAr: 'عروضنا المميزة', title: 'Special Offers' });
                    setIsEditingFallback(true);
                  }}
                  className="bg-yellow hover:bg-yellow/90 text-black font-black text-xs px-5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Upload size={14} />
                  <span>{fallbackOffer?.imageUrl ? (isArabic ? 'تغيير الصورة' : 'Change Image') : (isArabic ? 'رفع الصورة البديلة' : 'Upload Fallback Image')}</span>
                </button>
                {fallbackOffer?.imageUrl && (
                  <button
                    type="button"
                    onClick={handleDeleteFallbackOffer}
                    className="bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 size={14} />
                    <span>{isArabic ? 'حذف' : 'Delete'}</span>
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingFallback(false)}
                className="bg-neutral-100 hover:bg-neutral-200 text-dark font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <X size={14} />
                <span>{isArabic ? 'إلغاء' : 'Cancel'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Editing or Uploading Form */}
        {isEditingFallback ? (
          <form onSubmit={handleSaveFallbackOffer} className="space-y-5 bg-neutral-50 p-6 rounded-3xl border border-black/5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase text-dark mb-1">
                  {isArabic ? 'عنوان الصورة البديلة (بالعربي)' : 'Fallback Image Title (Arabic)'}
                </label>
                <input
                  type="text"
                  value={fallbackForm.titleAr || ''}
                  onChange={(e) => setFallbackForm(prev => ({ ...prev, titleAr: e.target.value }))}
                  placeholder={isArabic ? 'مثال: عروضنا المميزة مستمرة' : 'e.g., Special Offers'}
                  className="w-full bg-white border border-black/10 rounded-xl px-4 py-2.5 text-sm font-bold text-dark focus:outline-none focus:border-yellow"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-dark mb-1">
                  {isArabic ? 'الوصف الفرعي (اختياري)' : 'Subtitle (Optional)'}
                </label>
                <input
                  type="text"
                  value={fallbackForm.subtitleAr || ''}
                  onChange={(e) => setFallbackForm(prev => ({ ...prev, subtitleAr: e.target.value }))}
                  placeholder={isArabic ? 'مثال: ترقبوا أقوى العروض قريباً' : 'e.g., Stay tuned for more'}
                  className="w-full bg-white border border-black/10 rounded-xl px-4 py-2.5 text-sm font-medium text-dark focus:outline-none focus:border-yellow"
                />
              </div>
            </div>

            {/* Image upload area */}
            <div className="space-y-3">
              <label className="block text-xs font-black uppercase text-dark">
                {isArabic ? 'صورة العرض البديلة (التي ستظهر عند انتهاء العروض) *' : 'Fallback Image *'}
              </label>

              <div className="flex flex-col sm:flex-row gap-4 items-center">
                {/* File picker */}
                <label className="flex-1 w-full flex flex-col items-center justify-center h-36 border-2 border-dashed border-amber-300 hover:border-yellow rounded-2xl cursor-pointer bg-white hover:bg-yellow/5 transition-all p-4 text-center">
                  <Upload size={24} className="text-amber-500 mb-1.5" />
                  <p className="text-xs font-black text-dark">
                    {isArabic ? 'اضغط لاختيار صورة من جوالك أو كمبيوترك' : 'Click to select image from device'}
                  </p>
                  <p className="text-[10px] text-dark/40 mt-1">PNG, JPG, WEBP حتى 15 ميجابايت (يتم ضغطها تلقائياً)</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFallbackImageUpload}
                    className="hidden"
                  />
                </label>

                {/* Direct URL input */}
                <div className="w-full sm:w-1/2 space-y-2">
                  <span className="text-[11px] font-bold text-dark/50 block">
                    {isArabic ? 'أو ضع رابط الصورة مباشرة (URL):' : 'Or enter direct image URL:'}
                  </span>
                  <input
                    type="text"
                    value={fallbackForm.imageUrl || ''}
                    onChange={(e) => setFallbackForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                    placeholder="https://..."
                    className="w-full bg-white border border-black/10 rounded-xl px-4 py-2.5 text-xs font-mono text-dark focus:outline-none focus:border-yellow"
                  />
                </div>
              </div>

              {fallbackUploadProgress !== null && (
                <div className="w-full bg-neutral-200 rounded-full h-2 overflow-hidden">
                  <div className="bg-yellow h-2 transition-all duration-300" style={{ width: `${fallbackUploadProgress}%` }} />
                </div>
              )}

              {/* Preview */}
              {fallbackForm.imageUrl && (
                <div className="mt-3 bg-neutral-900 rounded-2xl p-2 max-h-60 flex items-center justify-center overflow-hidden border border-black/10">
                  <img
                    src={fallbackForm.imageUrl}
                    alt="Fallback Preview"
                    className="max-h-56 w-auto object-contain rounded-xl"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isSavingFallback || !fallbackForm.imageUrl}
                className="bg-black hover:bg-neutral-800 text-yellow font-black px-6 py-3 rounded-xl transition-all flex items-center gap-2 text-xs shadow-md disabled:opacity-50 cursor-pointer"
              >
                <Save size={16} />
                <span>{isSavingFallback ? (isArabic ? 'جاري الحفظ...' : 'Saving...') : (isArabic ? 'حفظ الصورة البديلة' : 'Save Fallback Image')}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsEditingFallback(false)}
                className="bg-neutral-200 hover:bg-neutral-300 text-dark font-bold px-5 py-3 rounded-xl transition-all text-xs cursor-pointer"
              >
                {isArabic ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </form>
        ) : fallbackOffer?.imageUrl ? (
          /* Active Fallback Image Preview */
          <div className="flex flex-col md:flex-row items-center gap-6 bg-neutral-50 p-5 rounded-3xl border border-black/5">
            <div className="relative w-full md:w-64 h-40 bg-neutral-900 rounded-2xl overflow-hidden flex items-center justify-center p-2 shrink-0">
              <img
                src={fallbackOffer.imageUrl}
                alt="Active Fallback Offer"
                className="max-h-full max-w-full object-contain rounded-xl"
              />
              <span className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md text-yellow text-[9px] font-black px-2 py-0.5 rounded-full border border-yellow/30">
                {isArabic ? 'صورة وحيدة بديلة' : 'Single Fallback'}
              </span>
            </div>

            <div className="flex-1 space-y-2 text-center md:text-right">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <h4 className="text-lg font-black text-dark">
                  {fallbackOffer.titleAr || (isArabic ? 'عروضنا المميزة' : 'Special Offers')}
                </h4>
                <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <CheckCircle2 size={12} className="text-emerald-600" />
                  <span>{isArabic ? 'جاهزة للعرض التلقائي' : 'Ready for auto-display'}</span>
                </span>
              </div>
              {fallbackOffer.subtitleAr && (
                <p className="text-xs text-dark/60 font-medium">
                  {fallbackOffer.subtitleAr}
                </p>
              )}
              <div className="text-xs text-dark/50 bg-white p-3 rounded-xl border border-black/5 leading-relaxed">
                ℹ️ {isArabic 
                  ? 'بمجرد انتهاء مؤقتات العد التنازلي للعروض النشطة، يتم إيقاف عرض صور تلك العروض تلقائياً وتظهر هذه الصورة الواحدة لجميع زوار المنيو.' 
                  : 'As soon as active offer timers expire, those offers are hidden automatically and this single image is shown.'}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200/70 p-5 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-right">
            <div>
              <p className="text-xs font-black text-amber-900 mb-0.5">
                {isArabic ? 'لم يتم رفع صورة بديلة بعد' : 'No fallback image uploaded yet'}
              </p>
              <p className="text-[11px] text-amber-800/80">
                {isArabic 
                  ? 'يُنصح برفع صورة واحدة الآن (مثل بوستر دائم أو شعار العروض) لتظهر تلقائياً عندما تنتهي مواعيد العروض المؤقتة.' 
                  : 'Upload a single image now to appear automatically when timed offers expire.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setFallbackForm({ imageUrl: '', titleAr: 'عروضنا المميزة', title: 'Special Offers' });
                setIsEditingFallback(true);
              }}
              className="bg-amber-500 hover:bg-amber-600 text-black font-black text-xs px-5 py-3 rounded-2xl transition-all shadow-md shrink-0 cursor-pointer flex items-center gap-2"
            >
              <Upload size={14} />
              <span>{isArabic ? 'رفع الصورة البديلة الآن' : 'Upload Fallback Image Now'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Offers List Grid */}
      <div className="flex items-center justify-between pt-2">
        <h3 className="text-xl font-black text-dark flex items-center gap-2">
          <span>{isArabic ? 'قائمة العروض المؤقتة' : 'Timed Offers List'}</span>
          <span className="text-xs font-mono bg-neutral-200 text-dark/60 px-2 py-0.5 rounded-full font-bold">
            {offers.length}
          </span>
        </h3>
      </div>

      {offers.length === 0 ? (
        <div className="bg-white border border-black/5 rounded-[2.5rem] p-12 text-center shadow-sm">
          <div className="w-20 h-20 bg-yellow/20 text-amber-600 rounded-3xl mx-auto flex items-center justify-center mb-5">
            <Flame size={40} />
          </div>
          <h3 className="text-2xl font-black text-dark mb-2">
            {isArabic ? 'لا توجد عروض مضافة حالياً' : 'No Offers Added Yet'}
          </h3>
          <p className="text-dark/50 text-sm max-w-md mx-auto mb-6">
            {isArabic 
              ? 'ارفع صورة عرضك الآن من جهازك مع تحديد موقت العد التنازلي ليظهر في أعلى الصفحة لجميع الزوار.' 
              : 'Upload your offer image now with countdown timer to show at the top of the menu.'}
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={handleOpenAddModal}
              className="bg-yellow text-black font-black px-8 py-3.5 rounded-2xl shadow-lg cursor-pointer hover:scale-105 transition-transform"
            >
              {isArabic ? 'إنشاء أول عرض' : 'Create First Offer'}
            </button>
            <button
              onClick={handleImportDefaults}
              className="bg-neutral-100 hover:bg-neutral-200 text-dark font-bold px-6 py-3.5 rounded-2xl cursor-pointer"
            >
              {isArabic ? 'استيراد نماذج افتراضية' : 'Import Samples'}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {offers.map((offer, idx) => {
            const timeInfo = getRemainingTimeText(offer.targetDate, isArabic);
            return (
              <motion.div
                key={offer.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white rounded-[2rem] border overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
                  offer.isActive ? 'border-black/5' : 'border-neutral-200 opacity-60 bg-neutral-50'
                }`}
              >
                {/* Header Above Image (Previewing how title sits above image) */}
                <div className="p-5 pb-3 border-b border-black/5 flex items-start justify-between gap-2 bg-neutral-50/50">
                  <div>
                    <span className="text-[10px] font-black uppercase text-amber-600 block mb-0.5">
                      {isArabic ? 'اسم العرض (أعلى الصورة):' : 'Offer Title (Above Image):'}
                    </span>
                    <h4 className="text-base font-black text-dark line-clamp-1">
                      {isArabic ? offer.titleAr || offer.title : offer.title || offer.titleAr}
                    </h4>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-dark/40 bg-neutral-200 px-2 py-0.5 rounded-lg shrink-0">
                    #{offer.order || idx + 1}
                  </span>
                </div>

                {/* Clear Image Preview */}
                <div className="relative h-56 w-full bg-neutral-900 overflow-hidden flex items-center justify-center p-2">
                  <img
                    src={offer.imageUrl}
                    alt={offer.titleAr || offer.title}
                    className="w-full h-full object-contain rounded-xl"
                  />

                  {/* Top Bar inside Image for status */}
                  <div className="absolute top-4 inset-x-4 flex items-center justify-end">
                    <button
                      onClick={() => handleToggleOfferActive(offer)}
                      title={isArabic ? 'انقر لتغيير حالة العرض' : 'Click to toggle status'}
                      className={`text-[11px] font-bold px-3 py-1 rounded-full backdrop-blur-md border cursor-pointer flex items-center gap-1.5 transition-all ${
                        offer.isActive
                          ? 'bg-emerald-500/90 text-white border-emerald-400'
                          : 'bg-neutral-800/90 text-neutral-300 border-neutral-600'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${offer.isActive ? 'bg-white animate-pulse' : 'bg-neutral-400'}`} />
                      <span>{offer.isActive ? (isArabic ? 'نشط' : 'Active') : (isArabic ? 'معطل' : 'Inactive')}</span>
                    </button>
                  </div>
                </div>

                {/* Card Body & Countdown */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div className="space-y-3 mb-4">
                    {/* Countdown Timer Display */}
                    {timeInfo.isExpired ? (
                      <div className="bg-red-500/10 border border-red-500/30 text-red-700 px-3.5 py-2.5 rounded-2xl text-xs font-bold space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <XCircle size={15} className="text-red-600 shrink-0" />
                            <span>{isArabic ? 'انتهى وقت العرض' : 'Offer Expired'}</span>
                          </div>
                          <span className="text-[10px] font-black uppercase bg-red-600 text-white px-2 py-0.5 rounded-full">
                            {isArabic ? 'متوقف تلقائياً' : 'Auto Hidden'}
                          </span>
                        </div>
                        <p className="text-[11px] text-red-600/80 font-medium leading-tight">
                          {isArabic ? 'تم إيقاف عرض هذه الصورة تلقائياً لجميع العملاء لانتهاء وقتها.' : 'Automatically hidden from customers because time ended.'}
                        </p>
                        <div className="flex items-center gap-1.5 pt-1.5 border-t border-red-200">
                          <span className="text-[10px] text-dark/60 font-bold">{isArabic ? 'تمديد سريع:' : 'Quick extend:'}</span>
                          <button
                            type="button"
                            onClick={() => handleExtendOffer(offer, 1)}
                            className="bg-white hover:bg-yellow hover:text-black text-dark font-bold text-[10px] px-2 py-1 rounded-lg border border-red-200 transition-all cursor-pointer shadow-xs"
                          >
                            {isArabic ? '+يوم' : '+1d'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExtendOffer(offer, 3)}
                            className="bg-white hover:bg-yellow hover:text-black text-dark font-bold text-[10px] px-2 py-1 rounded-lg border border-red-200 transition-all cursor-pointer shadow-xs"
                          >
                            {isArabic ? '+3 أيام' : '+3d'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExtendOffer(offer, 7)}
                            className="bg-white hover:bg-yellow hover:text-black text-dark font-bold text-[10px] px-2 py-1 rounded-lg border border-red-200 transition-all cursor-pointer shadow-xs"
                          >
                            {isArabic ? '+أسبوع' : '+7d'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 px-3.5 py-2.5 rounded-2xl text-xs font-bold space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span>{isArabic ? 'نشط ويظهر للعملاء:' : 'Active on Menu:'}</span>
                          </div>
                          <span className="font-mono font-black text-emerald-800">{timeInfo.text}</span>
                        </div>
                      </div>
                    )}

                    <div className="text-[11px] text-dark/40 flex items-center gap-1.5 pt-1">
                      <Calendar size={13} />
                      <span>{isArabic ? 'ينتهي في:' : 'Ends at:'}</span>
                      <span className="font-mono text-dark/70 font-semibold" dir="ltr">
                        {new Date(offer.targetDate).toLocaleString(isArabic ? 'ar-SA' : 'en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-black/5 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleToggleOfferActive(offer)}
                      className={`text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer ${
                        offer.isActive 
                          ? 'bg-neutral-100 hover:bg-neutral-200 text-dark/70' 
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      {offer.isActive 
                        ? (isArabic ? 'إيقاف مؤقت' : 'Deactivate') 
                        : (isArabic ? 'تفعيل العرض' : 'Activate')}
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditModal(offer)}
                        className="p-2.5 bg-neutral-100 hover:bg-neutral-200 text-dark rounded-xl transition-all cursor-pointer"
                        title={isArabic ? 'تعديل' : 'Edit'}
                      >
                        <Edit size={16} />
                      </button>

                      <button
                        onClick={() => handleDeleteOffer(offer.id)}
                        className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all cursor-pointer"
                        title={isArabic ? 'حذف' : 'Delete'}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Offer Modal */}
      <AnimatePresence>
        {isModalOpen && editingOffer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] w-full max-w-xl p-6 sm:p-8 shadow-2xl border border-black/5 my-8 max-h-[90vh] overflow-y-auto"
              dir={isArabic ? 'rtl' : 'ltr'}
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center pb-4 mb-5 border-b border-black/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-yellow/20 text-black flex items-center justify-center font-black">
                    <Flame size={20} className="text-amber-500 fill-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-dark">
                      {editingOffer.id && offers.some(o => o.id === editingOffer.id)
                        ? (isArabic ? 'تعديل العرض' : 'Edit Offer')
                        : (isArabic ? 'إضافة عرض جديد' : 'Add New Offer')}
                    </h3>
                    <p className="text-xs text-dark/40">
                      {isArabic 
                        ? 'ارفع صورة العرض من جهازك واكتب اسم العرض الذي سيظهر فوق الصورة' 
                        : 'Upload offer image and set title to appear above the photo'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-10 h-10 rounded-full bg-neutral-100 hover:bg-neutral-200 text-dark/60 flex items-center justify-center transition-all cursor-pointer"
                >
                  <XCircle size={20} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveOffer} className="space-y-5">
                {/* Offer Title Field */}
                <div>
                  <label className="block text-xs font-black uppercase text-dark tracking-wider mb-1">
                    {isArabic ? 'اسم العرض (سيظهر أعلى الصورة بوضوح) *' : 'Offer Title (Appears above the image) *'}
                  </label>
                  <p className="text-[11px] text-dark/40 mb-2">
                    {isArabic 
                      ? 'اكتب اسم العرض ليظهر كنص بارز ومنفصل فوق صورة العرض مباشرة.' 
                      : 'This title will be displayed cleanly above the banner photo.'}
                  </p>
                  <input
                    type="text"
                    required
                    placeholder={isArabic ? 'مثال: عرض نهاية الأسبوع للمشويات' : 'e.g., Weekend Grill Special'}
                    value={editingOffer.titleAr || ''}
                    onChange={(e) => setEditingOffer(prev => ({ ...prev, titleAr: e.target.value }))}
                    className="w-full bg-neutral-50 border border-black/5 rounded-2xl px-4 py-3.5 text-dark font-bold focus:ring-2 focus:ring-yellow focus:bg-white transition-all text-sm"
                  />
                </div>

                {/* DEVICE IMAGE UPLOAD SECTION */}
                <div className="bg-neutral-50 border border-black/5 rounded-3xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-xs font-black uppercase text-dark tracking-wider">
                        {isArabic ? 'صورة العرض (تحميل من جهازك) *' : 'Offer Image (Upload from device) *'}
                      </label>
                      <p className="text-[11px] text-dark/40">
                        {isArabic 
                          ? 'اختر صورة العرض المصممة من جوالك أو كمبيوترك، ستظهر بدقة كاملة وبدون أي كتابة فوقها.' 
                          : 'Select flyer from your phone or PC. It will be shown with full clarity.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-black/5 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setPreviewTab('upload')}
                        className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                          previewTab === 'upload' ? 'bg-yellow text-black shadow-xs' : 'text-dark/50'
                        }`}
                      >
                        {isArabic ? 'من الجهاز' : 'Upload'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewTab('url')}
                        className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                          previewTab === 'url' ? 'bg-yellow text-black shadow-xs' : 'text-dark/50'
                        }`}
                      >
                        {isArabic ? 'رابط' : 'URL'}
                      </button>
                    </div>
                  </div>

                  {previewTab === 'upload' ? (
                    <div>
                      <label className="border-2 border-dashed border-neutral-300 hover:border-yellow bg-white rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-neutral-50/50 group">
                        <Upload size={30} className="text-dark/40 group-hover:text-amber-500 mb-2 transition-colors" />
                        <span className="text-sm font-black text-dark group-hover:text-amber-600">
                          {isArabic ? 'انقر لاختيار صورة من جهازك' : 'Click to select image from device'}
                        </span>
                        <span className="text-xs text-dark/40 mt-1">
                          {isArabic ? 'JPG, PNG, WebP (مناسبة لجميع مقاسات الجوال)' : 'JPG, PNG, WebP (fits all mobile screens)'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleDeviceImageUpload}
                          className="hidden"
                        />
                      </label>

                      {uploadProgress !== null && (
                        <div className="mt-2">
                          <div className="w-full bg-neutral-200 rounded-full h-2 overflow-hidden">
                            <div 
                              className="bg-yellow h-2 transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-dark/50 font-bold block text-center mt-1">
                            {isArabic ? `جاري تحميل ومعالجة الصورة... ${uploadProgress}%` : `Processing... ${uploadProgress}%`}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={editingOffer.imageUrl || ''}
                        onChange={(e) => setEditingOffer(prev => ({ ...prev, imageUrl: e.target.value }))}
                        className="w-full bg-white border border-black/5 rounded-2xl px-4 py-3 text-dark font-medium focus:ring-2 focus:ring-yellow text-sm"
                      />
                    </div>
                  )}

                  {/* Image Preview Box */}
                  {editingOffer.imageUrl && (
                    <div className="relative rounded-2xl overflow-hidden border border-black/10 h-48 bg-neutral-900 flex items-center justify-center p-2">
                      <img
                        src={editingOffer.imageUrl}
                        alt="Offer preview"
                        className="w-full h-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => setEditingOffer(prev => ({ ...prev, imageUrl: '' }))}
                        className="absolute top-3 left-3 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-xs font-bold cursor-pointer shadow-md"
                      >
                        {isArabic ? 'إزالة الصورة' : 'Remove'}
                      </button>
                    </div>
                  )}
                </div>

                {/* COUNTDOWN TIMER SECTION */}
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Clock size={18} className="text-amber-600" />
                    <label className="text-xs font-black uppercase text-amber-900 tracking-wider">
                      {isArabic ? 'مؤقت العد التنازلي لوقت انتهاء العرض *' : 'Countdown Timer & End Date *'}
                    </label>
                  </div>
                  <p className="text-[11px] text-amber-800/80">
                    {isArabic 
                      ? 'حدد موعد انتهاء العرض، وسيظهر عداد تنازلي حي بالثواني والدقائق والساعات أعلى الصورة.' 
                      : 'Set expiry date. Real-time countdown clock ticks above the image.'}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    <div>
                      <input
                        type="datetime-local"
                        required
                        value={targetDateInputValue}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val) {
                            setEditingOffer(prev => ({
                              ...prev,
                              targetDate: new Date(val).toISOString()
                            }));
                          }
                        }}
                        className="w-full bg-white border border-amber-500/30 rounded-2xl px-4 py-3 text-dark font-bold font-mono focus:ring-2 focus:ring-amber-500 text-sm"
                      />
                    </div>

                    {/* Quick Preset Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setQuickTargetDate(1)}
                        className="bg-white hover:bg-amber-100 text-amber-900 text-xs font-bold px-3 py-1.5 rounded-xl border border-amber-500/20 transition-all cursor-pointer"
                      >
                        {isArabic ? '+24 ساعة' : '+24h'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickTargetDate(3)}
                        className="bg-white hover:bg-amber-100 text-amber-900 text-xs font-bold px-3 py-1.5 rounded-xl border border-amber-500/20 transition-all cursor-pointer"
                      >
                        {isArabic ? '+3 أيام' : '+3d'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickTargetDate(7)}
                        className="bg-white hover:bg-amber-100 text-amber-900 text-xs font-bold px-3 py-1.5 rounded-xl border border-amber-500/20 transition-all cursor-pointer"
                      >
                        {isArabic ? '+أسبوع' : '+1w'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickTargetDate(30)}
                        className="bg-white hover:bg-amber-100 text-amber-900 text-xs font-bold px-3 py-1.5 rounded-xl border border-amber-500/20 transition-all cursor-pointer"
                      >
                        {isArabic ? '+شهر' : '+1m'}
                      </button>
                    </div>
                  </div>

                  {/* Live Countdown Preview in Modal */}
                  {editingOffer.targetDate && (
                    <div className="bg-black text-white p-3 rounded-2xl border border-yellow/30 flex items-center justify-between text-xs">
                      <span className="text-yellow font-black">
                        {isArabic ? 'المتبقي للمؤقت الآن:' : 'Time Left:'}
                      </span>
                      <span className="font-mono font-black text-amber-300">
                        {getRemainingTimeText(editingOffer.targetDate, isArabic).text}
                      </span>
                    </div>
                  )}
                </div>

                {/* Active switch & Order */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="bg-neutral-50 p-4 rounded-2xl border border-black/5 flex items-center justify-between">
                    <div>
                      <span className="block font-black text-dark text-sm">
                        {isArabic ? 'حالة تفعيل العرض' : 'Active Status'}
                      </span>
                      <span className="text-[11px] text-dark/40">
                        {isArabic ? 'إظهار العرض في الموقع' : 'Display in storefront'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingOffer(prev => ({ ...prev, isActive: !prev?.isActive }))}
                      className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 flex items-center cursor-pointer ${
                        editingOffer.isActive !== false ? 'bg-yellow justify-end' : 'bg-neutral-300 justify-start'
                      }`}
                    >
                      <div className="w-6 h-6 bg-black rounded-full shadow-md" />
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-dark/60 tracking-wider mb-2">
                      {isArabic ? 'ترتيب ظهور العرض (1، 2، 3...)' : 'Display Order'}
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={editingOffer.order ?? 1}
                      onChange={(e) => setEditingOffer(prev => ({ ...prev, order: parseInt(e.target.value) || 1 }))}
                      className="w-full bg-neutral-50 border border-black/5 rounded-2xl px-4 py-3 text-dark font-bold text-sm focus:ring-2 focus:ring-yellow font-mono"
                    />
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-black/5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="bg-neutral-100 hover:bg-neutral-200 text-dark font-bold px-6 py-3.5 rounded-2xl text-sm transition-all cursor-pointer"
                  >
                    {isArabic ? 'إلغاء' : 'Cancel'}
                  </button>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="bg-yellow hover:bg-yellow/90 text-black font-black px-8 py-3.5 rounded-2xl text-sm transition-all shadow-xl shadow-yellow/20 cursor-pointer disabled:opacity-50 transform hover:scale-105 active:scale-95"
                  >
                    {isSaving 
                      ? (isArabic ? 'جاري الحفظ...' : 'Saving...') 
                      : (isArabic ? 'حفظ ونشر العرض' : 'Save & Publish Offer')}
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
