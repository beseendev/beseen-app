export type AdvertisementType = 'VIDEO' | 'BANNER';

export interface Advertisement {
  id: number;
  companyName: string;
  siteLink: string;
  type?: AdvertisementType;
  videoLink?: string;
  thumbnailLink: string | null;
  imageLink?: string | null;
  ctaText: string;
  description: string;
  active: boolean;
  createdAt: string;
}
