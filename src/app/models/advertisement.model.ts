export type AdvertisementType = 'VIDEO' | 'BANNER';

export interface Advertisement {
  id: number;
  companyName: string;
  siteLink: string;
  type?: AdvertisementType;
  videoLink?: string;
  thumbnailLink: string | null;
  imageLink?: string | null;
  /** Logo quadrado/compacto da empresa, usado na listagem simples de fundadoras. */
  logoLink?: string | null;
  ctaText: string;
  description: string;
  active: boolean;
  createdAt: string;
}
