/** Presentation contract: production navigation will be supplied by a server data adapter. */
export type NavigationNode = {
  id: string;
  label: string;
  href: string;
  children: NavigationNode[];
};

export type DemoProduct = {
  id: string;
  name: string;
  image: string;
  alt: string;
  color: string;
  amountMinor: number;
  previousMinor?: number;
  collection: string;
};

export type DemoCollection = {
  id: string;
  label: string;
  image: string;
  alt: string;
  productIds: string[];
};
