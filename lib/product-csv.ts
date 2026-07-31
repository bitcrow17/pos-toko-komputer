import {
  createNextBrgCode,
  generateRandomBarcode,
} from "@/lib/admin-product";
import type { Product, ProductCategory } from "@/types/product";

type ProductInput = Omit<Product, "id">;

export const CSV_HEADERS = [
  "Barcode",
  "Nama Produk",
  "Kategori",
  "Harga Beli (Modal)",
  "Harga Jual (Price)",
  "Stok",
  "Minimum Stok",
] as const;

const VALID_CATEGORIES = new Set<ProductCategory>([
  "laptop",
  "desktop",
  "monitor",
  "keyboard",
  "mouse",
  "storage",
  "ram",
  "gpu",
  "cpu",
  "accessory",
  "other",
]);

const HEADER_KEYS: Record<string, keyof CsvRowShape> = {
  barcode: "barcode",
  "nama produk": "name",
  kategori: "category",
  "harga beli (modal)": "purchasePrice",
  "harga beli": "purchasePrice",
  modal: "purchasePrice",
  "harga jual (price)": "sellingPrice",
  "harga jual": "sellingPrice",
  price: "sellingPrice",
  stok: "stock",
  stock: "stock",
  "minimum stok": "minimumStock",
};

interface CsvRowShape {
  barcode: string;
  name: string;
  category: string;
  purchasePrice: string;
  sellingPrice: string;
  stock: string;
  minimumStock: string;
}

function escapeCsvField(value: string | number): string {
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }

  fields.push(current);
  return fields;
}

export function parseCsv(text: string): string[][] {
  const normalized = text.replace(/^\uFEFF/, "").trim();
  if (!normalized) return [];
  return normalized.split(/\r?\n/).map(parseCsvLine);
}

export function parseCsvNumber(value: string): number {
  const cleaned = value.trim().replace(/[^\d,-]/g, "").replace(",", ".");
  const parsed = Number.parseFloat(cleaned);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round(parsed));
}

function normalizeCategory(raw: string): ProductCategory {
  const value = raw.trim().toLowerCase();
  if (VALID_CATEGORIES.has(value as ProductCategory)) {
    return value as ProductCategory;
  }
  return "other";
}

export function downloadCsvFile(content: string, filename: string): void {
  const blob = new Blob([`\uFEFF${content}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function getProductExportFilename(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `data-produk-${y}-${m}-${d}.csv`;
}

export function buildProductExportCsv(
  products: Product[],
  defaultMinimumStock: number,
): string {
  const rows = [
    CSV_HEADERS.join(","),
    ...products.map((product) =>
      [
        escapeCsvField(product.barcode ?? ""),
        escapeCsvField(product.name),
        escapeCsvField(product.category),
        escapeCsvField(product.purchasePrice),
        escapeCsvField(product.sellingPrice),
        escapeCsvField(product.stock),
        escapeCsvField(product.minimumStock ?? defaultMinimumStock),
      ].join(","),
    ),
  ];
  return rows.join("\n");
}

export function buildProductTemplateCsv(): string {
  return [
    CSV_HEADERS.join(","),
    [
      "8991234567890",
      "Contoh Produk Mouse Gaming",
      "mouse",
      "195000",
      "250000",
      "20",
      "5",
    ].join(","),
  ].join("\n");
}

export interface ImportProductsResult {
  items: ProductInput[];
  skipped: number;
  errors: string[];
}

export function parseImportedProducts(
  csvText: string,
  existingProducts: Product[],
  defaultMinimumStock: number,
): ImportProductsResult {
  const rows = parseCsv(csvText);
  if (rows.length < 2) {
    return { items: [], skipped: 0, errors: ["File CSV kosong atau hanya berisi header."] };
  }

  const header = rows[0].map((cell) => cell.trim().toLowerCase());
  const columnIndex = new Map<keyof CsvRowShape, number>();

  header.forEach((label, index) => {
    const key = HEADER_KEYS[label];
    if (key) columnIndex.set(key, index);
  });

  if (!columnIndex.has("name")) {
    return {
      items: [],
      skipped: 0,
      errors: ['Kolom "Nama Produk" wajib ada di baris header CSV.'],
    };
  }

  const items: ProductInput[] = [];
  const errors: string[] = [];
  let skipped = 0;
  const workingProducts = [...existingProducts];

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const cells = rows[rowIndex];
    if (cells.every((cell) => !cell.trim())) {
      skipped += 1;
      continue;
    }

    const getCell = (key: keyof CsvRowShape): string => {
      const index = columnIndex.get(key);
      if (index === undefined) return "";
      return cells[index]?.trim() ?? "";
    };

    const name = getCell("name");
    if (!name) {
      skipped += 1;
      errors.push(`Baris ${rowIndex + 1}: nama produk kosong, dilewati.`);
      continue;
    }

    const barcodeRaw = getCell("barcode");
    const pendingAsProducts: Product[] = items.map((item, index) => ({
      id: `IMPORT-PENDING-${index}`,
      ...item,
    }));
    const barcodeContext = [...workingProducts, ...pendingAsProducts];
    const barcode =
      barcodeRaw || generateRandomBarcode(barcodeContext);

    const category = normalizeCategory(getCell("category"));
    const purchasePrice = parseCsvNumber(getCell("purchasePrice"));
    const sellingPrice = parseCsvNumber(getCell("sellingPrice"));
    const stock = parseCsvNumber(getCell("stock"));
    const minimumStockRaw = getCell("minimumStock");
    const minimumStock = minimumStockRaw
      ? parseCsvNumber(minimumStockRaw)
      : defaultMinimumStock;

    const serialNumber = createNextBrgCode(barcodeContext);

    items.push({
      name,
      category,
      purchasePrice,
      sellingPrice,
      stock,
      barcode,
      minimumStock,
      serialNumber,
    });
  }

  return { items, skipped, errors };
}
