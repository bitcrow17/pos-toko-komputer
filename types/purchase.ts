export type PurchaseStatus = "completed" | "void";

export interface PurchaseItem {
  id?: string;
  purchaseId: string;
  productId: string;
  productName: string;
  quantity: number;
  purchasePrice: number;
  subtotal: number;
  updateSellingPrice: boolean;
  newSellingPrice?: number;
  prevStock?: number;
  prevPurchasePrice?: number;
  createdAt?: string;
}

export interface PurchaseItemInput {
  productId: string;
  productName: string;
  quantity: number;
  purchasePrice: number;
  subtotal?: number;
  updateSellingPrice: boolean;
  newSellingPrice?: number;
}

export interface Purchase {
  id: string;
  invoiceNumber?: string;
  supplierName?: string;
  purchaseDate: string;
  totalAmount: number;
  totalItems: number;
  notes?: string;
  status: PurchaseStatus;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
  items?: PurchaseItem[];
}

export interface PurchaseInput {
  id?: string;
  invoiceNumber?: string;
  supplierName?: string;
  purchaseDate?: string;
  totalAmount?: number;
  notes?: string;
  createdBy?: string;
  items: PurchaseItemInput[];
}

export interface StockMutation {
  id: string;
  productId: string;
  productName?: string;
  mutationType: "PURCHASE" | "PURCHASE_VOID" | "SALE" | "SALE_RETURN" | "ADJUSTMENT";
  referenceType: string;
  referenceId: string;
  quantityChange: number;
  stockBefore: number;
  stockAfter: number;
  notes?: string;
  createdAt: string;
}

