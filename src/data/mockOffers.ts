import { Offer } from '../types';

// Default countdown target dates calculated dynamically into the future
const getFutureDate = (days: number, hours: number = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(d.getHours() + hours);
  return d.toISOString();
};

export const defaultOffers: Offer[] = [
  {
    id: 'offer-1',
    title: 'Royal Weekend Grill Special',
    titleAr: 'عرض نهاية الأسبوع الملكي للمشويات',
    imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=1200',
    targetDate: getFutureDate(3, 14),
    isActive: true,
    order: 1,
    createdAt: new Date().toISOString()
  },
  {
    id: 'offer-2',
    title: 'Grand Gathering BBQ Box',
    titleAr: 'عرض بوكس الجمعات والمناسبات',
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=1200',
    targetDate: getFutureDate(5, 8),
    isActive: true,
    order: 2,
    createdAt: new Date().toISOString()
  },
  {
    id: 'offer-3',
    title: 'Smoked Shawarma Duo Feast',
    titleAr: 'عرض الشاورما على الفحم لشخصين',
    imageUrl: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?auto=format&fit=crop&q=80&w=1200',
    targetDate: getFutureDate(2, 6),
    isActive: true,
    order: 3,
    createdAt: new Date().toISOString()
  }
];
