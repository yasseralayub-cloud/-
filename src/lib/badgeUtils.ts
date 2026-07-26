import { VerificationBadge } from '../types';
import { defaultSiteSettings } from '../data/defaultSettings';

export const resolveVerificationBadges = (
  rawBadges?: VerificationBadge[],
  certCollectionBadges?: VerificationBadge[]
): VerificationBadge[] => {
  const certMap = new Map<string, VerificationBadge>();
  if (certCollectionBadges) {
    certCollectionBadges.forEach(b => {
      if (b && b.id && b.imageUrl) {
        certMap.set(b.id, b);
      }
    });
  }

  const defaultMap = new Map<string, VerificationBadge>();
  defaultSiteSettings.verificationBadges.forEach(b => {
    if (b && b.id && b.imageUrl) {
      defaultMap.set(b.id, b);
    }
  });

  const sourceBadges = (rawBadges && rawBadges.length > 0)
    ? rawBadges
    : defaultSiteSettings.verificationBadges;

  const result: VerificationBadge[] = [];
  const processedIds = new Set<string>();

  for (const b of sourceBadges) {
    if (!b || !b.id) continue;
    processedIds.add(b.id);

    let finalImg = b.imageUrl;
    if (!finalImg) {
      if (certMap.has(b.id)) {
        finalImg = certMap.get(b.id)!.imageUrl;
      } else if (defaultMap.has(b.id)) {
        finalImg = defaultMap.get(b.id)!.imageUrl;
      }
    }

    if (finalImg) {
      result.push({
        ...b,
        imageUrl: finalImg
      });
    }
  }

  if (certCollectionBadges) {
    certCollectionBadges.forEach(b => {
      if (b && b.id && b.imageUrl && !processedIds.has(b.id)) {
        result.push(b);
        processedIds.add(b.id);
      }
    });
  }

  return result;
};
