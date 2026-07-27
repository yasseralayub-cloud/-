import React from 'react';
import { motion } from 'motion/react';
import { Phone, MessageCircle, Languages, MapPin } from 'lucide-react';
import { SnapchatIcon, InstagramIcon, TikTokIcon } from './SocialIcons';
import { SocialMediaSettings } from '../types';
// @ts-ignore
import logo from '../assets/images/regenerated_image_1778880416572.jpg';

interface MenuHeaderProps {
  isArabic: boolean;
  onLanguageToggle: () => void;
  socialLinks?: SocialMediaSettings;
  onOpenSnapchat?: () => void;
}

export default function MenuHeader({ isArabic, onLanguageToggle, socialLinks, onOpenSnapchat }: MenuHeaderProps) {
  const phone = socialLinks?.phone || '0502163363';
  const whatsapp = socialLinks?.whatsapp || '966502163363';
  const mapsUrl = socialLinks?.googleMapsUrl || "https://www.google.com/maps/dir/?api=1&destination=26.5148613,43.6442633";
  const snapchatRaw = socialLinks?.snapchat || 'https://snapchat.com/t/tVS6feFp';
  const snapchatUrl = snapchatRaw.startsWith('http') ? snapchatRaw : `https://snapchat.com/add/${snapchatRaw.replace('@', '')}`;

  return (
    <header className="relative pt-6 pb-12 px-6 bg-black text-white border-b border-yellow/20">
      <div className="max-w-7xl mx-auto flex flex-col items-center">
        {/* Top Controls Bar */}
        <div className="w-full flex flex-wrap justify-between items-center gap-3 mb-8">
          <button 
            onClick={onLanguageToggle}
            className="flex items-center gap-2 bg-yellow/10 hover:bg-yellow/20 border border-yellow/20 px-3.5 py-2 rounded-full transition-all cursor-pointer"
          >
            <Languages size={18} className="text-yellow" />
            <span className="text-xs font-bold text-yellow uppercase">
              {isArabic ? 'English' : 'عربي'}
            </span>
          </button>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Snapchat Icon Link */}
            <a
              href={snapchatUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-[#FFFC00]/10 border border-[#FFFC00]/30 rounded-full hover:bg-[#FFFC00]/25 transition-all text-[#FFFC00] flex items-center justify-center hover:scale-105 active:scale-95"
              title="Snapchat"
            >
              <SnapchatIcon className="w-4 h-4 fill-[#FFFC00]" />
            </a>

            {/* Instagram Link if present */}
            {socialLinks?.instagram && (
              <a
                href={socialLinks.instagram.startsWith('http') ? socialLinks.instagram : `https://instagram.com/${socialLinks.instagram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-pink-500/10 border border-pink-500/20 text-pink-400 rounded-full hover:bg-pink-500/20 transition-all hover:scale-105 active:scale-95"
                title="Instagram"
              >
                <InstagramIcon className="w-4 h-4" />
              </a>
            )}

            {/* TikTok Link if present */}
            {socialLinks?.tiktok && (
              <a
                href={socialLinks.tiktok.startsWith('http') ? socialLinks.tiktok : `https://tiktok.com/@${socialLinks.tiktok.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-white/10 border border-white/20 text-white rounded-full hover:bg-white/20 transition-all hover:scale-105 active:scale-95"
                title="TikTok"
              >
                <TikTokIcon className="w-4 h-4" />
              </a>
            )}

            {/* Location Link */}
            <a 
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-yellow/10 border border-yellow/20 rounded-full hover:bg-yellow/20 transition-all hover:scale-105 active:scale-95"
              title={isArabic ? 'الموقع' : 'Location'}
            >
              <MapPin size={18} className="text-yellow" />
            </a>

            {/* WhatsApp Link */}
            <a 
              href={`https://wa.me/${whatsapp.replace('+', '').trim()}`}
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2 bg-[#25D366]/10 border border-[#25D366]/20 rounded-full hover:bg-[#25D366]/20 transition-all hover:scale-105 active:scale-95"
              title="WhatsApp"
            >
              <MessageCircle size={18} className="text-[#25D366]" />
            </a>

            {/* Phone Call Link */}
            <a 
              href={`tel:${phone}`}
              className="p-2 bg-yellow/10 border border-yellow/20 rounded-full hover:bg-yellow/20 transition-all font-bold flex items-center gap-2 text-yellow text-xs sm:text-sm hover:scale-105 active:scale-95"
            >
              <Phone size={16} />
              <span className="hidden sm:inline">{phone}</span>
            </a>
          </div>
        </div>

        {/* Logo and Branding */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="flex flex-col items-center"
        >
          <div className="w-28 h-28 md:w-36 md:h-36 rounded-full bg-white mb-4 p-2 overflow-hidden shadow-2xl border-4 border-yellow flex items-center justify-center">
            <img 
              src={logo} 
              alt="رحلة شواء" 
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://placehold.co/200x200/FACC15/000000?text=رحلة+شواء';
              }}
            />
          </div>
          <h1 className="font-sans text-3xl md:text-5xl mb-2 tracking-tight font-black text-yellow uppercase text-center">
            رحلة شواء
          </h1>
          <div className="w-16 h-[2px] bg-yellow mb-4" />
          <p className="max-w-md mx-auto text-yellow/70 font-sans text-base md:text-lg font-medium text-center">
            أشهى المشويات والشاورما على أصولها
          </p>
        </motion.div>
      </div>

      {/* Decorative background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-yellow/5 blur-3xl pointer-events-none -z-10" />
    </header>
  );
}
