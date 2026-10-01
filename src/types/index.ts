export interface MenuItem {
  id?: number;
  name: string;
  category: string;
  costPrice: number;     // Harga modal dari katering
  sellingPrice: number;  // Harga jual ke pembeli (bisa sama atau margin laba)
  isActive: boolean;
}

export interface OrderItem {
  menuId?: number;
  menuName: string;
  qty: number;
  unitPrice: number;
  notes?: string;
  subtotal: number;
}

export interface CustomerOrder {
  id?: number;
  sessionId: string;      // Tanggal atau identifier batch (misal: "2026-10-02")
  customerName: string;
  customerPhone?: string;
  items: OrderItem[];
  totalAmount: number;
  isPaid: boolean;
  paymentProofImage?: string; // Base64 data url for preview
  paidAt?: string;
  createdAt: string;
}

export interface AppSettings {
  id?: number;
  cateringName: string;
  cateringPhone: string;
  qrisImageDataUrl?: string; // Base64 image
  merchantName?: string;
  qrisRawString?: string;   // Optional QRIS raw string for dynamic amount injection
}

export interface ParsedItemCandidate {
  customerName: string;
  customerPhone?: string;
  rawText: string;
  items: {
    menuName: string;
    qty: number;
    matchedMenuItem?: MenuItem;
    unitPrice: number;
    notes?: string;
  }[];
}
