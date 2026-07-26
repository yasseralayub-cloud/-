export interface MenuItem {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  price: number;
  category: string;
  image: string;
  calories?: number;
  isPopular?: boolean;
  isVatExempt?: boolean;
}

export interface Category {
  id: string;
  label: string;
  labelAr: string;
  icon: string;
  order?: number;
}

export interface VerificationBadge {
  id: string;
  title: string;
  titleAr: string;
  subtitle?: string;
  subtitleAr?: string;
  imageUrl: string;
}

export interface SiteSettings {
  vatEnabled: boolean;
  vatRate: number; // e.g., 15
  vatIncludedInPrices: boolean; // default true
  vatNumber?: string; // e.g., 310000000000003
  crNumber?: string; // e.g., 1010123456
  verificationBadges: VerificationBadge[];
}
