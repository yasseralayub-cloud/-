import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/firebase';
import { collection, doc, setDoc, deleteDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { Offer, FallbackOfferSettings } from '../types';
import { defaultOffers } from '../data/mockOffers';
import { 
  Plus, Edit, Trash2, Clock, 
  Flame, Upload, Calendar, RefreshCw, XCircle, Sparkles, CheckCircle2, Save,
  Play, Timer, Filter, CalendarClock, ArrowLeft, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminOffersTabProps {
  isArabic: boolean;
}

export type OfferScheduleStatus = 'active' | 'scheduled' | 'expired' | 'inactive';

interface ScheduleInfo {
  status: OfferScheduleStatus;
  badgeText: string;
  badgeColorClass: string;
  descriptionText: string;
  timeRemainingText: string;
  isExpired: boolean;
  isScheduled: boolean;
  isActiveNow: boolean;
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

// Formats a Date object or ISO string into 'YYYY-MM-DDTHH:mm' for datetime-local input
const formatForDateTimeLocal = (dateInput: Date | string | undefined): string => {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';
  
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mi = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
};

// Calculates comprehensive schedule status and timing for each offer
export function getOfferScheduleInfo(offer: Offer, isArabic: boolean): ScheduleInfo {
  if (!offer.isActive) {
    return {
      status: 'inactive',
      badgeText: isArabic ? 'معطل يدوياً' : 'Disabled',
      badgeColorClass: 'bg-neutral-200 text-neutral-700 border-neutral-300',
      descriptionText: isArabic ? 'تم إيقاف هذا العرض يدوياً من لوحة التحكم.' : 'Offer is manually disabled.',
      timeRemainingText: isArabic ? 'معطل' : 'Disabled',
      isExpired: false,
      isScheduled: false,
      isActiveNow: false
    };
  }

  const now = Date.now();
  const startTime = offer.startDate ? new Date(offer.startDate).getTime() : 0;
  const endTime = offer.targetDate ? new Date(offer.targetDate).getTime() : 0;

  // 1. Expired check
  if (endTime && endTime <= now) {
    return {
      status: 'expired',
      badgeText: isArabic ? 'منتهي الصلاحية' : 'Expired',
      badgeColorClass: 'bg-red-500/10 text-red-700 border-red-300',
      descriptionText: isArabic 
        ? 'تم إيقاف عرض هذه الصورة تلقائياً لجميع العملاء لانتهاء وقت العرض المحدد.' 
        : 'Automatically hidden from menu because offer period ended.',
      timeRemainingText: isArabic ? 'انتهى وقته' : 'Expired',
      isExpired: true,
      isScheduled: false,
      isActiveNow: false
    };
  }

  // 2. Scheduled check (start date in future)
  if (startTime && startTime > now) {
    const diff = startTime - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const startCountStr = days > 0
      ? (isArabic ? `${days} يوم و ${hours} ساعة` : `${days}d ${hours}h`)
      : (isArabic ? `${hours} ساعة و ${minutes} دقيقة` : `${hours}h ${minutes}m`);

    return {
      status: 'scheduled',
      badgeText: isArabic ? 'مجدول (يبدأ قريباً)' : 'Scheduled',
      badgeColorClass: 'bg-amber-500/15 text-amber-900 border-amber-300',
      descriptionText: isArabic 
        ? `هذا العرض مجدول، وسيتفعل ويظهر للعملاء تلقائياً بمجرد حلول تاريخ البدء (خلال ${startCountStr}).`
        : `Scheduled offer. Will auto-activate and show to customers once start date arrives (${startCountStr}).`,
      timeRemainingText: isArabic ? `يبدأ خلال: ${startCountStr}` : `Starts in: ${startCountStr}`,
      isExpired: false,
      isScheduled: true,
      isActiveNow: false
    };
  }

  // 3. Active now
  const diff = endTime ? endTime - now : 0;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const endCountStr = days > 0
    ? (isArabic ? `${days} يوم و ${hours} ساعة` : `${days}d ${hours}h`)
    : (isArabic ? `${hours} ساعة و ${minutes} دقيقة` : `${hours}h ${minutes}m`);

  return {
    status: 'active',
    badgeText: isArabic ? 'نشط ويظهر للعملاء الآن' : 'Active Now',
    badgeColorClass: 'bg-emerald-500/15 text-emerald-900 border-emerald-300',
    descriptionText: isArabic 
      ? 'العرض نشط حالياً ويظهر في أعلى المنيو لجميع الزوار مع مؤقت تنازلي حي.' 
      : 'Currently active and showing at top of menu with live countdown.',
    timeRemainingText: isArabic ? `ينتهي خلال: ${endCountStr}` : `Ends in: ${endCountStr}`,
    isExpired: false,
    isScheduled: false,
    isActiveNow: true
  };
}

export default function AdminOffersTab({ isArabic }: AdminOffersTabProps) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [, setLoading] = useState(true);
  const [editingOffer, setEditingOffer] = useState<Partial<Offer> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [previewTab, setPreviewTab] = useState<'upload' | 'url'>('upload');
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'scheduled' | 'expired'>('all');
  const [, setNowTick] = useState(Date.now());

  // Keep ticking every 15s to update remaining minutes/hours display in the admin view
  useEffect(() => {
    const interval = setInterval(() => {
      setNowTick(Date.now());
    }, 15000);
    return () => clearInterval(interval);
  }, []);

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

  // Quick preset helper to adjust targetDate (end date)
  const setQuickTargetDate = (days: number, hours: number = 0) => {
    const base = editingOffer?.startDate ? new Date(editingOffer.startDate) : new Date();
    const d = new Date(base.getTime());
    d.setDate(d.getDate() + days);
    d.setHours(d.getHours() + hours);
    setEditingOffer(prev => ({
      ...prev,
      targetDate: d.toISOString()
    }));
  };

  // Quick preset helper to adjust startDate (start date)
  const setQuickStartDate = (daysFromNow: number, setHoursTo?: number) => {
    const d = new Date();
    if (daysFromNow === 0) {
      // Immediate start (now)
      setEditingOffer(prev => {
        const newStart = new Date().toISOString();
        // If targetDate is already before newStart, bump targetDate
        let newTarget = prev?.targetDate;
        if (!newTarget || new Date(newTarget).getTime() <= Date.now()) {
          const future = new Date();
          future.setDate(future.getDate() + 3);
          newTarget = future.toISOString();
        }
        return { ...prev, startDate: newStart, targetDate: newTarget };
      });
      return;
    }

    d.setDate(d.getDate() + daysFromNow);
    if (setHoursTo !== undefined) {
      d.setHours(setHoursTo, 0, 0, 0);
    }
    const newStartIso = d.toISOString();

    setEditingOffer(prev => {
      // Ensure targetDate is after new start date
      let newTarget = prev?.targetDate;
      const targetTime = newTarget ? new Date(newTarget).getTime() : 0;
      if (!targetTime || targetTime <= d.getTime()) {
        const future = new Date(d.getTime());
        future.setDate(future.getDate() + 3);
        newTarget = future.toISOString();
      }
      return {
        ...prev,
        startDate: newStartIso,
        targetDate: newTarget
      };
    });
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
    const now = new Date();
    const defaultEnd = new Date();
    defaultEnd.setDate(defaultEnd.getDate() + 3);

    setEditingOffer({
      id: `offer-${Date.now()}`,
      titleAr: '',
      title: '',
      imageUrl: '',
      startDate: now.toISOString(),
      targetDate: defaultEnd.toISOString(),
      isActive: true,
      order: offers.length + 1
    });
    setPreviewTab('upload');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (offer: Offer) => {
    setEditingOffer({
      ...offer,
      startDate: offer.startDate || offer.createdAt || new Date().toISOString(),
      targetDate: offer.targetDate
    });
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
      alert(isArabic ? 'يرجى تحديد موعد انتهاء العرض' : 'Please specify offer end date and time');
      return;
    }

    const startTime = editingOffer.startDate ? new Date(editingOffer.startDate).getTime() : Date.now();
    const endTime = new Date(editingOffer.targetDate).getTime();

    if (isNaN(endTime)) {
      alert(isArabic ? 'صيغة تاريخ الانتهاء غير صحيحة' : 'Invalid end date format');
      return;
    }

    if (endTime <= startTime) {
      alert(
        isArabic 
          ? 'تنبيه: تاريخ ووقت انتهاء العرض يجب أن يكون بعد تاريخ ووقت بدء العرض!' 
          : 'Notice: Offer end date must be after start date!'
      );
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
        startDate: editingOffer.startDate || new Date().toISOString(),
        targetDate: editingOffer.targetDate,
        isActive: editingOffer.isActive !== false,
        order: editingOffer.order ?? (offers.length + 1),
        createdAt: editingOffer.createdAt || new Date().toISOString()
      };

      await setDoc(doc(db, 'offers', offerId), payload);
      setIsModalOpen(false);
      setEditingOffer(null);

      const isFutureScheduled = new Date(payload.startDate || '').getTime() > Date.now();
      if (isFutureScheduled) {
        alert(
          isArabic 
            ? 'تم حفظ وجدولة العرض بنجاح! سيتفعل ويظهر للعملاء تلقائياً بمجرد حلول تاريخ البدء المحدد.' 
            : 'Offer scheduled successfully! It will automatically activate and show to customers once start date arrives.'
        );
      } else {
        alert(
          isArabic 
            ? 'تم حفظ ونشر العرض بنجاح! هو الآن نشط ويظهر للعملاء في أعلى المنيو.' 
            : 'Offer saved and activated successfully! It is now live on the menu.'
        );
      }
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

  // Immediate start for a scheduled offer
  const handleStartOfferNow = async (offer: Offer) => {
    try {
      await updateDoc(doc(db, 'offers', offer.id), {
        startDate: new Date().toISOString(),
        isActive: true
      });
      alert(
        isArabic 
          ? 'تم تفعيل العرض الآن فوراً وأصبح ظاهراً لجميع زوار المنيو!' 
          : 'Offer activated immediately and is now live!'
      );
    } catch (err: any) {
      console.error("Start offer error:", err);
      alert(isArabic ? `فشل تفعيل العرض: ${err?.message || ''}` : `Failed to start offer: ${err?.message || ''}`);
    }
  };

  // Quick extend for expired or expiring offers
  const handleExtendOffer = async (offer: Offer, daysToAdd: number = 3) => {
    try {
      const newDate = new Date();
      newDate.setDate(newDate.getDate() + daysToAdd);
      await updateDoc(doc(db, 'offers', offer.id), {
        startDate: new Date().toISOString(),
        targetDate: newDate.toISOString(),
        isActive: true
      });
      alert(
        isArabic 
          ? `تم تمديد وتفعيل العرض بنجاح لمدة ${daysToAdd} أيام إضافية من الآن!` 
          : `Offer extended and activated for ${daysToAdd} days!`
      );
    } catch (err: any) {
      console.error("Extend offer error:", err);
      alert(isArabic ? `فشل تمديد العرض: ${err?.message || ''}` : `Failed to extend offer: ${err?.message || ''}`);
    }
  };

  const handleImportDefaults = async () => {
    if (!window.confirm(isArabic ? 'هل تريد استيراد نماذج العروض الجاهزة وتفعيلها في قاعدة البيانات؟' : 'Import default sample offers to database?')) {
      return;
    }
    try {
      for (const sample of defaultOffers) {
        await setDoc(doc(db, 'offers', sample.id), {
          ...sample,
          startDate: new Date().toISOString()
        });
      }
      alert(isArabic ? 'تم استيراد العروض الجاهزة بنجاح!' : 'Default offers imported successfully!');
    } catch (err: any) {
      console.error("Import default offers error:", err);
      alert(isArabic ? `فشل الاستيراد: ${err?.message || ''}` : `Import failed: ${err?.message || ''}`);
    }
  };

  // Filtered offers by schedule tab
  const filteredOffers = useMemo(() => {
    if (filterTab === 'all') return offers;
    return offers.filter(o => {
      const info = getOfferScheduleInfo(o, isArabic);
      if (filterTab === 'active') return info.isActiveNow;
      if (filterTab === 'scheduled') return info.isScheduled;
      if (filterTab === 'expired') return info.isExpired;
      return true;
    });
  }, [offers, filterTab, isArabic]);

  // Counts for tabs
  const counts = useMemo(() => {
    let active = 0;
    let scheduled = 0;
    let expired = 0;
    offers.forEach(o => {
      const info = getOfferScheduleInfo(o, isArabic);
      if (info.isActiveNow) active++;
      else if (info.isScheduled) scheduled++;
      else if (info.isExpired) expired++;
    });
    return { all: offers.length, active, scheduled, expired };
  }, [offers, isArabic]);

  // Modal input values
  const startDateInputValue = editingOffer?.startDate 
    ? formatForDateTimeLocal(editingOffer.startDate)
    : '';

  const targetDateInputValue = editingOffer?.targetDate 
    ? formatForDateTimeLocal(editingOffer.targetDate)
    : '';

  // Determine modal schedule preview
  const modalSchedulePreview = useMemo(() => {
    if (!editingOffer) return null;
    const now = Date.now();
    const st = editingOffer.startDate ? new Date(editingOffer.startDate).getTime() : now;
    const et = editingOffer.targetDate ? new Date(editingOffer.targetDate).getTime() : 0;

    if (et && et <= st) {
      return {
        isInvalid: true,
        text: isArabic ? 'تنبيه: وقت النهاية قبل وقت البداية!' : 'Error: End time is before start time!'
      };
    }

    if (st > now) {
      const diff = st - now;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const timeStr = days > 0 ? `${days} يوم و ${hours} س` : `${hours} س و ${mins} د`;
      return {
        isInvalid: false,
        isScheduled: true,
        text: isArabic 
          ? `⏳ مجدول: سيتفعل ويظهر تلقائياً بعد ${timeStr}` 
          : `⏳ Scheduled: Will auto-activate in ${timeStr}`
      };
    }

    if (et && et <= now) {
      return {
        isInvalid: true,
        text: isArabic ? 'تنبيه: وقت الانتهاء منقضٍ بالفعل!' : 'Warning: End time already in past!'
      };
    }

    return {
      isInvalid: false,
      isScheduled: false,
      text: isArabic 
        ? '⚡ فوري: سيتفعل ويظهر للعملاء فور الحفظ مباشرة' 
        : '⚡ Immediate: Will activate on menu upon saving'
    };
  }, [editingOffer, isArabic]);

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
              {isArabic ? 'إدارة قسم العروض والجدولة التلقائية' : 'Offers & Scheduling Management'}
            </h2>
          </div>
          <p className="text-dark/50 text-sm mt-1">
            {isArabic 
              ? 'رفع بوسترات العروض وتحديد تاريخ ووقت البداية ليتفعل العرض تلقائياً، وتاريخ النهاية ليتوقف ويختفي تلقائياً.' 
              : 'Set offer start date to auto-activate and end date to auto-hide automatically without manual intervention.'}
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
            <span>{isArabic ? 'إضافة وجدولة عرض جديد' : 'Add & Schedule Offer'}</span>
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
                  <span className="text-[10px] font-black bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full">
                    {isArabic ? 'غير محددة' : 'Not Set'}
                  </span>
                )}
              </div>
              <p className="text-dark/50 text-xs mt-0.5">
                {isArabic 
                  ? 'صورة واحدة ثابتة يتم عرضها تلقائياً إذا انتهى وقت جميع العروض المؤقتة أو إذا كانت العروض القادمة مجدولة ولم يحن وقتها بعد.' 
                  : 'A single fallback banner shown automatically when all temporary offers expire or before scheduled offers start.'}
              </p>
            </div>
          </div>

          {!isEditingFallback && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setFallbackForm(fallbackOffer || { imageUrl: '', titleAr: 'عروضنا المميزة', title: 'Special Offers' });
                  setIsEditingFallback(true);
                }}
                className="bg-neutral-100 hover:bg-neutral-200 text-dark font-black text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Edit size={14} />
                <span>{fallbackOffer?.imageUrl ? (isArabic ? 'تعديل أو استبدال الصورة' : 'Change Image') : (isArabic ? 'رفع صورة بديلة' : 'Upload Image')}</span>
              </button>

              {fallbackOffer?.imageUrl && (
                <button
                  type="button"
                  onClick={handleDeleteFallbackOffer}
                  className="bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs p-2.5 rounded-xl transition-all cursor-pointer"
                  title={isArabic ? 'حذف الصورة البديلة' : 'Delete fallback'}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          )}
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

      {/* Filter Tabs & Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-black text-dark flex items-center gap-2">
            <span>{isArabic ? 'قائمة العروض والجدولة' : 'Offers & Schedule List'}</span>
            <span className="text-xs font-mono bg-neutral-200 text-dark/60 px-2 py-0.5 rounded-full font-bold">
              {offers.length}
            </span>
          </h3>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 bg-neutral-100 p-1.5 rounded-2xl border border-black/5 text-xs font-bold">
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              filterTab === 'all' ? 'bg-white text-black shadow-xs font-black' : 'text-dark/60 hover:text-black'
            }`}
          >
            <span>{isArabic ? 'الكل' : 'All'}</span>
            <span className="text-[10px] bg-neutral-200 px-1.5 py-0.2 rounded-full font-mono">{counts.all}</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('active')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              filterTab === 'active' ? 'bg-emerald-500 text-white shadow-xs font-black' : 'text-dark/60 hover:text-black'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>{isArabic ? 'النشطة الآن' : 'Active Now'}</span>
            <span className="text-[10px] bg-black/20 px-1.5 py-0.2 rounded-full font-mono">{counts.active}</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('scheduled')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              filterTab === 'scheduled' ? 'bg-amber-500 text-black shadow-xs font-black' : 'text-dark/60 hover:text-black'
            }`}
          >
            <CalendarClock size={12} />
            <span>{isArabic ? 'المجدولة قريباً' : 'Scheduled'}</span>
            <span className="text-[10px] bg-black/10 px-1.5 py-0.2 rounded-full font-mono">{counts.scheduled}</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('expired')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              filterTab === 'expired' ? 'bg-red-500 text-white shadow-xs font-black' : 'text-dark/60 hover:text-black'
            }`}
          >
            <span>{isArabic ? 'المنتهية' : 'Expired'}</span>
            <span className="text-[10px] bg-black/20 px-1.5 py-0.2 rounded-full font-mono">{counts.expired}</span>
          </button>
        </div>
      </div>

      {filteredOffers.length === 0 ? (
        <div className="bg-white border border-black/5 rounded-[2.5rem] p-12 text-center shadow-sm">
          <div className="w-20 h-20 bg-yellow/20 text-amber-600 rounded-3xl mx-auto flex items-center justify-center mb-5">
            <Filter size={36} />
          </div>
          <h3 className="text-2xl font-black text-dark mb-2">
            {filterTab === 'all' 
              ? (isArabic ? 'لا توجد عروض مضافة حالياً' : 'No Offers Added Yet')
              : (isArabic ? 'لا توجد عروض في هذا التصنيف' : 'No offers found in this category')}
          </h3>
          <p className="text-dark/50 text-sm max-w-md mx-auto mb-6">
            {isArabic 
              ? 'ارفع صورة عرضك الآن من جهازك مع تحديد موعد البداية والنهاية ليتفعل ويختفي تلقائياً.' 
              : 'Add your offer poster now with start and end dates for automatic activation and hiding.'}
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={handleOpenAddModal}
              className="bg-yellow text-black font-black px-8 py-3.5 rounded-2xl shadow-lg cursor-pointer hover:scale-105 transition-transform"
            >
              {isArabic ? 'إنشاء وجدولة عرض' : 'Create & Schedule Offer'}
            </button>
            {filterTab !== 'all' && (
              <button
                onClick={() => setFilterTab('all')}
                className="bg-neutral-100 hover:bg-neutral-200 text-dark font-bold px-6 py-3.5 rounded-2xl cursor-pointer"
              >
                {isArabic ? 'عرض كل العروض' : 'Show All'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOffers.map((offer, idx) => {
            const schedInfo = getOfferScheduleInfo(offer, isArabic);
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

                  {/* Status Overlay Badge */}
                  <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none">
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full backdrop-blur-md border shadow-md flex items-center gap-1 ${
                      schedInfo.isActiveNow 
                        ? 'bg-emerald-950/85 text-emerald-300 border-emerald-500/40' 
                        : schedInfo.isScheduled 
                          ? 'bg-amber-950/85 text-amber-300 border-amber-500/40'
                          : schedInfo.isExpired
                            ? 'bg-red-950/85 text-red-300 border-red-500/40'
                            : 'bg-neutral-900/85 text-neutral-300 border-neutral-700'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        schedInfo.isActiveNow 
                          ? 'bg-emerald-400 animate-ping' 
                          : schedInfo.isScheduled
                            ? 'bg-amber-400'
                            : 'bg-red-400'
                      }`} />
                      <span>{schedInfo.badgeText}</span>
                    </span>

                    <button
                      onClick={() => handleToggleOfferActive(offer)}
                      title={isArabic ? 'انقر لتغيير حالة التفعيل' : 'Click to toggle status'}
                      className="pointer-events-auto text-[10px] font-bold px-2.5 py-1 rounded-full bg-black/70 hover:bg-black text-white border border-white/20 backdrop-blur-md cursor-pointer transition-all"
                    >
                      {offer.isActive ? (isArabic ? 'إيقاف مؤقت' : 'Disable') : (isArabic ? 'تفعيل' : 'Enable')}
                    </button>
                  </div>
                </div>

                {/* Card Body with Schedule & Timestamps */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div className="space-y-3 mb-4">
                    {/* Status Alert Box */}
                    {schedInfo.isExpired ? (
                      <div className="bg-red-500/10 border border-red-500/30 text-red-700 px-3.5 py-2.5 rounded-2xl text-xs font-bold space-y-2">
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
                          {schedInfo.descriptionText}
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
                    ) : schedInfo.isScheduled ? (
                      /* Scheduled Box */
                      <div className="bg-amber-500/10 border border-amber-500/30 text-amber-900 px-3.5 py-2.5 rounded-2xl text-xs font-bold space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-amber-800">
                            <CalendarClock size={16} className="text-amber-600 shrink-0" />
                            <span>{schedInfo.timeRemainingText}</span>
                          </div>
                          <span className="text-[10px] font-black uppercase bg-amber-500 text-black px-2 py-0.5 rounded-full">
                            {isArabic ? 'تفعيل تلقائي' : 'Auto Start'}
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-900/80 font-medium leading-tight">
                          {schedInfo.descriptionText}
                        </p>
                        <div className="pt-1.5 border-t border-amber-200/60 flex items-center justify-between">
                          <span className="text-[10px] text-amber-900/70 font-bold">
                            {isArabic ? 'تريد بدء العرض الآن فوراً؟' : 'Start now immediately?'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleStartOfferNow(offer)}
                            className="bg-amber-500 hover:bg-amber-600 text-black font-black text-[10px] px-2.5 py-1 rounded-lg shadow-xs transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Play size={10} fill="currentColor" />
                            <span>{isArabic ? 'تفعيل الآن فوراً' : 'Start Now'}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Active Now Box */
                      <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 px-3.5 py-2.5 rounded-2xl text-xs font-bold space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span>{isArabic ? 'نشط ويظهر للعملاء:' : 'Live on Menu:'}</span>
                          </div>
                          <span className="font-mono font-black text-emerald-800">{schedInfo.timeRemainingText}</span>
                        </div>
                      </div>
                    )}

                    {/* Timeline dates info */}
                    <div className="bg-neutral-50 p-3 rounded-xl border border-black/5 text-[11px] space-y-1.5 font-medium">
                      <div className="flex items-center justify-between text-dark/70">
                        <span className="flex items-center gap-1 text-dark/50">
                          <Clock size={12} className="text-amber-600" />
                          <span>{isArabic ? 'تاريخ البدء:' : 'Start:'}</span>
                        </span>
                        <span className="font-mono font-semibold" dir="ltr">
                          {offer.startDate ? new Date(offer.startDate).toLocaleString(isArabic ? 'ar-SA' : 'en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : (isArabic ? 'فوري' : 'Immediate')}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-dark/70 pt-1 border-t border-black/5">
                        <span className="flex items-center gap-1 text-dark/50">
                          <Timer size={12} className="text-red-500" />
                          <span>{isArabic ? 'تاريخ الانتهاء:' : 'End:'}</span>
                        </span>
                        <span className="font-mono font-semibold" dir="ltr">
                          {offer.targetDate ? new Date(offer.targetDate).toLocaleString(isArabic ? 'ar-SA' : 'en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '-'}
                        </span>
                      </div>
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
                        title={isArabic ? 'تعديل التواريخ والبيانات' : 'Edit Schedule & Details'}
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
                        ? (isArabic ? 'تعديل بيانات وجدولة العرض' : 'Edit Offer & Schedule')
                        : (isArabic ? 'إضافة وجدولة عرض جديد' : 'Add & Schedule Offer')}
                    </h3>
                    <p className="text-xs text-dark/40">
                      {isArabic 
                        ? 'حدد تاريخ البداية ليتفعل العرض تلقائياً، وتاريخ النهاية ليختفي تلقائياً' 
                        : 'Set start date for auto-activation and end date for auto-expiry'}
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
                    {isArabic ? 'اسم العرض (سيظهر أعلى الصورة بوضوح) *' : 'Offer Title (Appears above image) *'}
                  </label>
                  <p className="text-[11px] text-dark/40 mb-2">
                    {isArabic 
                      ? 'اكتب اسم العرض ليظهر كنص بارز ومنفصل فوق صورة العرض مباشرة.' 
                      : 'This title will be displayed cleanly above the flyer.'}
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
                        {isArabic ? 'صورة العرض (تحميل من جهازك) *' : 'Offer Flyer (Upload from device) *'}
                      </label>
                      <p className="text-[11px] text-dark/40">
                        {isArabic 
                          ? 'اختر صورة العرض المصممة من جهازك، ستظهر بكامل وضوحها بدون كتابة تغطيها.' 
                          : 'Select flyer from your device. Will be shown cleanly.'}
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
                          {isArabic ? 'JPG, PNG, WebP حتى 15 ميجابايت' : 'JPG, PNG, WebP up to 15MB'}
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

                {/* 1. START DATE & TIME SECTION (Auto-Activation) */}
                <div className="bg-blue-500/10 border border-blue-500/25 rounded-3xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock size={18} className="text-blue-600" />
                      <label className="text-xs font-black uppercase text-blue-950 tracking-wider">
                        {isArabic ? '1. تاريخ ووقت بدء العرض (تفعيل تلقائي) *' : '1. Offer Start Date & Time (Auto-Activation) *'}
                      </label>
                    </div>
                    <span className="text-[10px] font-black bg-blue-600 text-white px-2 py-0.5 rounded-full">
                      {isArabic ? 'يبدأ ويظهر لحاله' : 'Auto Starts'}
                    </span>
                  </div>

                  <p className="text-[11px] text-blue-900/80 leading-relaxed">
                    {isArabic 
                      ? 'اختر متى يبدأ ظهور العرض للعملاء. إذا حددت تاريخاً مستقبلياً، سيظل العرض مخفياً ويتفعل ويظهر تلقائياً بمجرد حلول هذا الموعد دون الحاجة لتدخل يدوي.' 
                      : 'Choose when offer appears. If in the future, it stays hidden and auto-activates when start date arrives.'}
                  </p>

                  <div className="space-y-2">
                    <input
                      type="datetime-local"
                      required
                      value={startDateInputValue}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) {
                          setEditingOffer(prev => ({
                            ...prev,
                            startDate: new Date(val).toISOString()
                          }));
                        }
                      }}
                      className="w-full bg-white border border-blue-500/30 rounded-2xl px-4 py-3 text-dark font-bold font-mono focus:ring-2 focus:ring-blue-500 text-sm"
                    />

                    {/* Quick Preset Buttons for Start Date */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-blue-900/60 font-bold ml-1">
                        {isArabic ? 'اختصارات سريعة:' : 'Presets:'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuickStartDate(0)}
                        className="bg-white hover:bg-blue-100 text-blue-950 text-xs font-bold px-3 py-1 rounded-xl border border-blue-500/20 transition-all cursor-pointer shadow-2xs"
                      >
                        {isArabic ? 'الآن فوراً' : 'Start Now'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickStartDate(1, 9)}
                        className="bg-white hover:bg-blue-100 text-blue-950 text-xs font-bold px-3 py-1 rounded-xl border border-blue-500/20 transition-all cursor-pointer shadow-2xs"
                      >
                        {isArabic ? 'غداً (09:00 ص)' : 'Tomorrow 9am'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickStartDate(2, 9)}
                        className="bg-white hover:bg-blue-100 text-blue-950 text-xs font-bold px-3 py-1 rounded-xl border border-blue-500/20 transition-all cursor-pointer shadow-2xs"
                      >
                        {isArabic ? 'بعد يومين' : 'In 2 days'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. END DATE & TIME SECTION (Auto-Expiry / Auto-Hiding) */}
                <div className="bg-amber-500/10 border border-amber-500/25 rounded-3xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar size={18} className="text-amber-600" />
                      <label className="text-xs font-black uppercase text-amber-950 tracking-wider">
                        {isArabic ? '2. تاريخ ووقت انتهاء العرض (إيقاف تلقائي) *' : '2. Offer End Date & Time (Auto-Hiding) *'}
                      </label>
                    </div>
                    <span className="text-[10px] font-black bg-amber-600 text-black px-2 py-0.5 rounded-full">
                      {isArabic ? 'يختفي لحاله' : 'Auto Hides'}
                    </span>
                  </div>

                  <p className="text-[11px] text-amber-900/80 leading-relaxed">
                    {isArabic 
                      ? 'حدد موعد انتهاء العرض. بمجرد انتهاء هذا الموعد، يختفي العرض تلقائياً وتتوقف كل صوره وتظهر الصورة البديلة إن وجدت.' 
                      : 'Set expiry date. When time runs out, flyer is hidden automatically and fallback image appears.'}
                  </p>

                  <div className="space-y-2">
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

                    {/* Quick Preset Buttons for End Date */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-amber-900/60 font-bold ml-1">
                        {isArabic ? 'مدة العرض من البداية:' : 'Duration from start:'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuickTargetDate(1)}
                        className="bg-white hover:bg-amber-100 text-amber-900 text-xs font-bold px-3 py-1 rounded-xl border border-amber-500/20 transition-all cursor-pointer shadow-2xs"
                      >
                        {isArabic ? '+24 ساعة' : '+24h'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickTargetDate(3)}
                        className="bg-white hover:bg-amber-100 text-amber-900 text-xs font-bold px-3 py-1 rounded-xl border border-amber-500/20 transition-all cursor-pointer shadow-2xs"
                      >
                        {isArabic ? '+3 أيام' : '+3d'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickTargetDate(7)}
                        className="bg-white hover:bg-amber-100 text-amber-900 text-xs font-bold px-3 py-1 rounded-xl border border-amber-500/20 transition-all cursor-pointer shadow-2xs"
                      >
                        {isArabic ? '+أسبوع' : '+1w'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickTargetDate(30)}
                        className="bg-white hover:bg-amber-100 text-amber-900 text-xs font-bold px-3 py-1 rounded-xl border border-amber-500/20 transition-all cursor-pointer shadow-2xs"
                      >
                        {isArabic ? '+شهر' : '+1m'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* VISUAL SCHEDULE TIMELINE PREVIEW IN MODAL */}
                {modalSchedulePreview && (
                  <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between ${
                    modalSchedulePreview.isInvalid 
                      ? 'bg-red-500/10 border-red-500/30 text-red-700' 
                      : modalSchedulePreview.isScheduled
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-900'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900'
                  }`}>
                    <div className="flex items-center gap-2">
                      <CalendarClock size={16} />
                      <span>{modalSchedulePreview.text}</span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] opacity-75 font-mono">
                      <span>{isArabic ? 'من' : 'From'}</span>
                      {isArabic ? <ArrowLeft size={12} /> : <ArrowRight size={12} />}
                      <span>{isArabic ? 'إلى' : 'To'}</span>
                    </div>
                  </div>
                )}

                {/* Active switch & Order */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="bg-neutral-50 p-4 rounded-2xl border border-black/5 flex items-center justify-between">
                    <div>
                      <span className="block font-black text-dark text-sm">
                        {isArabic ? 'حالة التفعيل العامة' : 'Active Status'}
                      </span>
                      <span className="text-[11px] text-dark/40">
                        {isArabic ? 'تفعيل ظهور العرض في الموقع' : 'Enable display on menu'}
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
                    disabled={isSaving || !!modalSchedulePreview?.isInvalid}
                    className="bg-yellow hover:bg-yellow/90 text-black font-black px-8 py-3.5 rounded-2xl text-sm transition-all shadow-xl shadow-yellow/20 cursor-pointer disabled:opacity-50 transform hover:scale-105 active:scale-95"
                  >
                    {isSaving 
                      ? (isArabic ? 'جاري الحفظ...' : 'Saving...') 
                      : (isArabic ? 'حفظ وتثبيت الجدولة' : 'Save & Confirm Schedule')}
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
