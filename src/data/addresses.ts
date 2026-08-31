export type Address = {
  id: string;
  label: string;
  line1: string;
  line2?: string;
  city: string;
  pincode: string;
  lat?: number;
  lng?: number;
  isDefault: boolean;
};
