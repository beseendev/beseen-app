export interface Advertisement {
  id: number;
  companyName: string;
  siteLink: string;
  videoLink?: string;
  thumbnailLink: string | null;
  ctaText: string;
  description: string;
  active: boolean;
  createdAt: string;
}
