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
}

export interface Category {
  id: string;
  label: string;
  labelAr: string;
  icon: string;
}
