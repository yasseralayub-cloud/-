import { SiteSettings } from '../types';

// Helper SVG data URLs for realistic default certificates & badges
const createVatCertificateSvg = () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">
    <rect width="800" height="500" rx="24" fill="#ffffff" stroke="#e5e7eb" stroke-width="4"/>
    <rect x="20" y="20" width="760" height="460" rx="16" fill="#f8fafc" stroke="#059669" stroke-width="2" stroke-dasharray="6,6"/>
    <!-- Header -->
    <rect x="20" y="20" width="760" height="80" rx="16" fill="#065f46"/>
    <text x="400" y="55" fill="#ffffff" font-family="sans-serif" font-size="22" font-weight="bold" text-anchor="middle">هيئة الزكاة والضريبة والجمارك</text>
    <text x="400" y="80" fill="#a7f3d0" font-family="sans-serif" font-size="14" text-anchor="middle">Zakat, Tax and Customs Authority - ZATCA</text>
    
    <!-- Title -->
    <text x="400" y="145" fill="#0f172a" font-family="sans-serif" font-size="24" font-weight="900" text-anchor="middle">شهادة تسجيل في ضريبة القيمة المضافة</text>
    <text x="400" y="170" fill="#059669" font-family="sans-serif" font-size="16" font-weight="bold" text-anchor="middle">VAT Registration Certificate</text>
    <line x1="200" y1="185" x2="600" y2="185" stroke="#cbd5e1" stroke-width="2"/>

    <!-- Details Box -->
    <rect x="60" y="205" width="680" height="190" rx="12" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
    
    <!-- Items -->
    <text x="710" y="240" fill="#64748b" font-family="sans-serif" font-size="14" text-anchor="end">اسم المنشأة:</text>
    <text x="500" y="240" fill="#0f172a" font-family="sans-serif" font-size="16" font-weight="bold" text-anchor="end">رحلة شواء للمأكولات البحرية والمشويات</text>
    
    <text x="710" y="280" fill="#64748b" font-family="sans-serif" font-size="14" text-anchor="end">رقم التسجيل الضريبي (VAT):</text>
    <text x="500" y="280" fill="#059669" font-family="sans-serif" font-size="18" font-weight="900" text-anchor="end">310245892300003</text>
    
    <text x="710" y="320" fill="#64748b" font-family="sans-serif" font-size="14" text-anchor="end">رقم السجل التجاري:</text>
    <text x="500" y="320" fill="#0f172a" font-family="sans-serif" font-size="16" font-weight="bold" text-anchor="end">1010892341</text>
    
    <text x="710" y="360" fill="#64748b" font-family="sans-serif" font-size="14" text-anchor="end">تاريخ الإصدار:</text>
    <text x="500" y="360" fill="#0f172a" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="end">01 / 01 / 2024م</text>

    <!-- Official Seal -->
    <circle cx="150" cy="300" r="45" fill="#065f46" opacity="0.1"/>
    <circle cx="150" cy="300" r="40" fill="none" stroke="#065f46" stroke-width="3" stroke-dasharray="4,4"/>
    <text x="150" y="295" fill="#065f46" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">موثق</text>
    <text x="150" y="312" fill="#065f46" font-family="sans-serif" font-size="10" text-anchor="middle">ZATCA VERIFIED</text>

    <!-- Footer -->
    <rect x="20" y="420" width="760" height="60" rx="12" fill="#f1f5f9"/>
    <text x="400" y="455" fill="#475569" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle">هذه الشهادة وثيقة رسمية ومسجلة في النظام الآلي لضريبة القيمة المضافة 15%</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const createCrCertificateSvg = () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">
    <rect width="800" height="500" rx="24" fill="#ffffff" stroke="#e5e7eb" stroke-width="4"/>
    <rect x="20" y="20" width="760" height="460" rx="16" fill="#fdfbf7" stroke="#b45309" stroke-width="2"/>
    
    <!-- Header -->
    <rect x="20" y="20" width="760" height="80" rx="16" fill="#78350f"/>
    <text x="400" y="55" fill="#ffffff" font-family="sans-serif" font-size="22" font-weight="bold" text-anchor="middle">المملكة العربية السعودية - وزارة التجارة</text>
    <text x="400" y="80" fill="#fef3c7" font-family="sans-serif" font-size="14" text-anchor="middle">Ministry of Commerce - Commercial Registration</text>
    
    <!-- Title -->
    <text x="400" y="145" fill="#451a03" font-family="sans-serif" font-size="24" font-weight="900" text-anchor="middle">شهادة السجل التجاري</text>
    <text x="400" y="170" fill="#b45309" font-family="sans-serif" font-size="16" font-weight="bold" text-anchor="middle">Commercial Registration Certificate</text>
    <line x1="200" y1="185" x2="600" y2="185" stroke="#fde68a" stroke-width="2"/>

    <!-- Details Box -->
    <rect x="60" y="205" width="680" height="190" rx="12" fill="#ffffff" stroke="#fef3c7" stroke-width="2"/>
    
    <!-- Items -->
    <text x="710" y="240" fill="#78350f" font-family="sans-serif" font-size="14" text-anchor="end">الاسم التجاري:</text>
    <text x="500" y="240" fill="#0f172a" font-family="sans-serif" font-size="16" font-weight="bold" text-anchor="end">مطعم رحلة شواء للمأكولات</text>
    
    <text x="710" y="280" fill="#78350f" font-family="sans-serif" font-size="14" text-anchor="end">رقم السجل التجاري:</text>
    <text x="500" y="280" fill="#b45309" font-family="sans-serif" font-size="18" font-weight="900" text-anchor="end">1010892341</text>
    
    <text x="710" y="320" fill="#78350f" font-family="sans-serif" font-size="14" text-anchor="end">النشاط التجاري:</text>
    <text x="500" y="320" fill="#0f172a" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="end">تقديم الوجبات والمشويات والمشروبات</text>
    
    <text x="710" y="360" fill="#78350f" font-family="sans-serif" font-size="14" text-anchor="end">حالة السجل:</text>
    <text x="500" y="360" fill="#15803d" font-family="sans-serif" font-size="15" font-weight="bold" text-anchor="end">قائم وموثق (Active)</text>

    <!-- Official Seal -->
    <circle cx="150" cy="300" r="45" fill="#b45309" opacity="0.1"/>
    <circle cx="150" cy="300" r="40" fill="none" stroke="#b45309" stroke-width="3"/>
    <text x="150" y="295" fill="#b45309" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">سجل موثق</text>
    <text x="150" y="312" fill="#b45309" font-family="sans-serif" font-size="10" text-anchor="middle">VERIFIED CR</text>

    <!-- Footer -->
    <rect x="20" y="420" width="760" height="60" rx="12" fill="#fef3c7"/>
    <text x="400" y="455" fill="#78350f" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle">شهادة معتمدة من وزارة التجارة السعودية - جميع الحقوق محفوظة</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const createSbcBadgeSvg = () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">
    <rect width="800" height="500" rx="24" fill="#ffffff" stroke="#e5e7eb" stroke-width="4"/>
    <rect x="20" y="20" width="760" height="460" rx="16" fill="#f0f9ff" stroke="#0284c7" stroke-width="2"/>
    
    <!-- Header -->
    <rect x="20" y="20" width="760" height="80" rx="16" fill="#0369a1"/>
    <text x="400" y="55" fill="#ffffff" font-family="sans-serif" font-size="22" font-weight="bold" text-anchor="middle">المركز السعودي للأعمال | Saudi Business Center</text>
    <text x="400" y="80" fill="#bae6fd" font-family="sans-serif" font-size="14" text-anchor="middle">منصة توثيق المتاجر والمنشآت التجارية - منصة أعمال</text>
    
    <!-- Title -->
    <text x="400" y="145" fill="#0c4a6e" font-family="sans-serif" font-size="24" font-weight="900" text-anchor="middle">وثيقة توثيق متجر إلكتروني ومحل تجاري</text>
    <text x="400" y="170" fill="#0284c7" font-family="sans-serif" font-size="16" font-weight="bold" text-anchor="middle">Business Verification Badge</text>
    <line x1="200" y1="185" x2="600" y2="185" stroke="#7dd3fc" stroke-width="2"/>

    <!-- Details Box -->
    <rect x="60" y="205" width="680" height="190" rx="12" fill="#ffffff" stroke="#e0f2fe" stroke-width="2"/>
    
    <!-- Items -->
    <text x="710" y="240" fill="#0369a1" font-family="sans-serif" font-size="14" text-anchor="end">اسم المنشأة الموثقة:</text>
    <text x="500" y="240" fill="#0f172a" font-family="sans-serif" font-size="16" font-weight="bold" text-anchor="end">رحلة شواء</text>
    
    <text x="710" y="280" fill="#0369a1" font-family="sans-serif" font-size="14" text-anchor="end">رقم التوثيق الموحد:</text>
    <text x="500" y="280" fill="#0284c7" font-family="sans-serif" font-size="18" font-weight="900" text-anchor="end">SBC-000084923</text>
    
    <text x="710" y="320" fill="#0369a1" font-family="sans-serif" font-size="14" text-anchor="end">نوع التوثيق:</text>
    <text x="500" y="320" fill="#0f172a" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="end">منشأة تجارية موثقة بهوية موحدة</text>
    
    <text x="710" y="360" fill="#0369a1" font-family="sans-serif" font-size="14" text-anchor="end">حالة التوثيق:</text>
    <text x="500" y="360" fill="#16a34a" font-family="sans-serif" font-size="15" font-weight="bold" text-anchor="end">✓ موثق رسميًا (Verified)</text>

    <!-- Official Seal -->
    <circle cx="150" cy="300" r="45" fill="#0284c7" opacity="0.1"/>
    <circle cx="150" cy="300" r="40" fill="none" stroke="#0284c7" stroke-width="3"/>
    <text x="150" y="295" fill="#0284c7" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">موثق معتمد</text>
    <text x="150" y="312" fill="#0284c7" font-family="sans-serif" font-size="10" text-anchor="middle">SBC VERIFIED</text>

    <!-- Footer -->
    <rect x="20" y="420" width="760" height="60" rx="12" fill="#e0f2fe"/>
    <text x="400" y="455" fill="#0369a1" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle">هذا المتجر موثق لدى المركز السعودي للأعمال ومصرح له بممارسة النشاط</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const defaultSiteSettings: SiteSettings = {
  vatEnabled: true,
  vatRate: 15,
  vatIncludedInPrices: true,
  vatNumber: '310245892300003',
  crNumber: '1010892341',
  verificationBadges: [
    {
      id: 'badge_vat',
      title: 'شهادة التسجيل الضريبي',
      titleAr: 'شهادة التسجيل في ضريبة القيمة المضافة (15%)',
      subtitle: 'هيئة الزكاة والضريبة والجمارك (ZATCA)',
      subtitleAr: 'هيئة الزكاة والضريبة والجمارك (ZATCA)',
      imageUrl: createVatCertificateSvg(),
    },
    {
      id: 'badge_cr',
      title: 'السجل التجاري',
      titleAr: 'شهادة السجل التجاري المعتمد',
      subtitle: 'وزارة التجارة - المملكة العربية السعودية',
      subtitleAr: 'وزارة التجارة - المملكة العربية السعودية',
      imageUrl: createCrCertificateSvg(),
    },
    {
      id: 'badge_sbc',
      title: 'توثيق المركز السعودي للأعمال',
      titleAr: 'شهادة التوثيق من المركز السعودي للأعمال (منصة أعمال)',
      subtitle: 'منصة التوثيق الموحدة للمنشآت التجارية',
      subtitleAr: 'منصة التوثيق الموحدة للمنشآت التجارية',
      imageUrl: createSbcBadgeSvg(),
    }
  ]
};
