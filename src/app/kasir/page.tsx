"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  addToCart as addToCartLogic,
  removeFromCart as removeFromCartLogic,
  updateQuantity as updateQuantityLogic,
} from "@/lib/kasir-cart";
import {
  calculateChange,
  calculateTransactionTotals,
  parseCashInput,
  type DiscountType,
} from "@/lib/kasir-calculations";
import { generateInvoiceNumber } from "@/lib/transaction";
import { useApp } from "@/src/context/AppContext";
import type { TransactionItem } from "@/types/transaction";
import {
  buildCatalog,
  filterCatalog,
  findProductByExactBarcode,
  generateProductCode,
  getAvailableStock,
  type CatalogProduct,
} from "@/lib/kasir-catalog";
import type { CartItem } from "@/types/cart";
import { getCartItemSubtotal } from "@/types/cart";
import type { Customer } from "@/types/customer";
import type { Transaction } from "@/types/transaction";
import type { PaymentMethod } from "@/types/transaction";
import type { Debt } from "@/types/debt";
import type {
  DebtPaymentReceipt,
  DebtSettlementMethod,
} from "@/types/debt-payment";
import ReceiptModal from "@/src/components/ReceiptModal";
import DebtPaymentReceiptModal from "@/src/components/DebtPaymentReceiptModal";
import KasirDebtPaymentPanel from "@/src/components/KasirDebtPaymentPanel";
import CustomerFormModal from "@/src/components/CustomerFormModal";

type KasirMode = "sale" | "debt";

interface HoldTransaction {
  id: string;
  items: CartItem[];
  customer: Customer | null;
  heldAt: string;
  isTaxEnabled: boolean;
  discountType: DiscountType;
  discountValue: number;
}

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function createHoldId(): string {
  return `HOLD-${Date.now()}`;
}

export default function KasirPage() {
  const {
    products: globalProducts,
    transactions,
    debts,
    customers,
    reduceStock,
    addTransaction,
    addDebt,
    payDebt,
    addCustomer,
  } = useApp();

  const catalogProducts = useMemo(
    () => buildCatalog(globalProducts),
    [globalProducts],
  );
  const [kasirMode, setKasirMode] = useState<KasirMode>("sale");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [holdTransactions, setHoldTransactions] = useState<HoldTransaction[]>(
    [],
  );
  const [debtPaymentReceipt, setDebtPaymentReceipt] =
    useState<DebtPaymentReceipt | null>(null);
  const [isQuickCustomerModalOpen, setIsQuickCustomerModalOpen] =
    useState(false);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId],
  );

  const sortedCustomers = useMemo(
    () =>
      [...customers].sort((a, b) =>
        a.name.localeCompare(b.name, "id", { sensitivity: "base" }),
      ),
    [customers],
  );

  const [isTaxEnabled, setIsTaxEnabled] = useState(false);
  const [discountType, setDiscountType] = useState<DiscountType>("NOMINAL");
  const [discountValue, setDiscountValue] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [cashPaidInput, setCashPaidInput] = useState("");
  const [downPaymentInput, setDownPaymentInput] = useState("0");
  const [dueDateInput, setDueDateInput] = useState(() => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return formatDateInput(nextWeek);
  });
  const [creditCustomerName, setCreditCustomerName] = useState("");
  const [creditCustomerPhone, setCreditCustomerPhone] = useState("");

  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [qtyDraftByProduct, setQtyDraftByProduct] = useState<
    Record<string, string>
  >({});
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [completedTransaction, setCompletedTransaction] =
    useState<Transaction | null>(null);
  const [completedDebt, setCompletedDebt] = useState<Debt | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredProducts = useMemo(
    () => filterCatalog(catalogProducts, searchQuery),
    [catalogProducts, searchQuery],
  );

  const totals = useMemo(
    () =>
      calculateTransactionTotals(
        cartItems,
        isTaxEnabled,
        discountType,
        discountValue,
      ),
    [cartItems, isTaxEnabled, discountType, discountValue],
  );

  const cashPaid = useMemo(() => parseCashInput(cashPaidInput), [cashPaidInput]);
  const downPayment = useMemo(
    () => parseCashInput(downPaymentInput),
    [downPaymentInput],
  );
  const changeAmount = calculateChange(totals.grandTotal, cashPaid);

  const canCompleteCashPayment =
    cartItems.length > 0 && cashPaid >= totals.grandTotal;

  const canCompleteCreditPayment =
    cartItems.length > 0 &&
    creditCustomerName.trim().length > 0 &&
    creditCustomerPhone.trim().length > 0 &&
    dueDateInput.length > 0 &&
    downPayment >= 0 &&
    downPayment <= totals.grandTotal;

  const canCompletePayment =
    paymentMethod === "CASH" ? canCompleteCashPayment : canCompleteCreditPayment;

  function showAlert(message: string) {
    window.alert(message);
    setAlertMessage(message);
  }

  function addToCart(product: CatalogProduct) {
    const result = addToCartLogic(cartItems, product);
    if (result.alert) {
      showAlert(result.alert.message);
      return;
    }
    setCartItems(result.items);
    setAlertMessage(null);
  }

  function openCatalogModal() {
    setIsCatalogModalOpen(true);
    window.setTimeout(() => searchInputRef.current?.focus(), 0);
  }

  function closeCatalogModal() {
    setIsCatalogModalOpen(false);
  }

  function selectProductFromCatalog(product: CatalogProduct) {
    const result = addToCartLogic(cartItems, product);
    if (result.alert) {
      showAlert(result.alert.message);
      return;
    }
    setCartItems(result.items);
    setAlertMessage(null);
    closeCatalogModal();
  }

  function getFirstSelectableProduct(): CatalogProduct | undefined {
    return filteredProducts.find((product) => {
      const available = getAvailableStock(
        catalogProducts,
        product.id,
        cartItems,
      );
      return product.stock > 0 && available > 0;
    });
  }

  function addTopFilteredProductToCart() {
    const top = getFirstSelectableProduct();
    if (!top) return;

    const result = addToCartLogic(cartItems, top);
    if (result.alert) {
      showAlert(result.alert.message);
      return;
    }
    setCartItems(result.items);
    setAlertMessage(null);
    window.setTimeout(() => searchInputRef.current?.focus(), 0);
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();

    const scanned = searchQuery.trim();
    if (scanned) {
      const exactBarcodeMatch = findProductByExactBarcode(
        catalogProducts,
        scanned,
      );
      if (exactBarcodeMatch) {
        const result = addToCartLogic(cartItems, exactBarcodeMatch);
        if (result.alert) {
          showAlert(result.alert.message);
          return;
        }
        setCartItems(result.items);
        setAlertMessage(null);
        setSearchQuery("");
        closeCatalogModal();
        window.setTimeout(() => searchInputRef.current?.focus(), 0);
        return;
      }
    }

    addTopFilteredProductToCart();
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (kasirMode !== "sale") return;
      if (e.key === "F2") {
        e.preventDefault();
        openCatalogModal();
      }
      if (e.key === "Escape" && isCatalogModalOpen) {
        closeCatalogModal();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isCatalogModalOpen, kasirMode]);

  function updateQuantity(productId: string, newQty: number) {
    const result = updateQuantityLogic(
      cartItems,
      catalogProducts,
      productId,
      newQty,
    );
    if (result.alert) {
      showAlert(result.alert.message);
      return;
    }
    setCartItems(result.items);
    setQtyDraftByProduct((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  }

  function removeFromCart(productId: string) {
    setCartItems(removeFromCartLogic(cartItems, productId));
    setQtyDraftByProduct((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  }

  function clearCart() {
    setCartItems([]);
    setCashPaidInput("");
    setDownPaymentInput("0");
    setQtyDraftByProduct({});
  }

  function syncCreditCustomerFromSelection(customer: Customer | null) {
    if (!customer) {
      setCreditCustomerName("");
      setCreditCustomerPhone("");
      return;
    }
    setCreditCustomerName(customer.name);
    setCreditCustomerPhone(customer.phone);
  }

  function selectCustomerById(customerId: string) {
    setSelectedCustomerId(customerId);
    const customer =
      customers.find((c) => c.id === customerId) ?? null;
    if (paymentMethod === "CREDIT") {
      syncCreditCustomerFromSelection(customer);
    }
  }

  function holdCurrentTransaction() {
    if (cartItems.length === 0) {
      showAlert("Keranjang kosong — tidak bisa ditahan.");
      return;
    }

    const hold: HoldTransaction = {
      id: createHoldId(),
      items: cartItems,
      customer: selectedCustomer,
      heldAt: new Date().toISOString(),
      isTaxEnabled,
      discountType,
      discountValue,
    };

    setHoldTransactions((prev) => [...prev, hold]);
    clearCart();
    setIsTaxEnabled(false);
    setDiscountType("NOMINAL");
    setDiscountValue(0);
    showAlert(`Transaksi ditahan: ${hold.id}`);
  }

  function resumeHold(holdId: string) {
    const hold = holdTransactions.find((h) => h.id === holdId);
    if (!hold) return;

    if (cartItems.length > 0) {
      const ok = window.confirm(
        "Keranjang aktif akan diganti dengan transaksi tertunda. Lanjutkan?",
      );
      if (!ok) return;
    }

    setCartItems(hold.items);
    setSelectedCustomerId(hold.customer?.id ?? "");
    setIsTaxEnabled(hold.isTaxEnabled);
    setDiscountType(hold.discountType);
    setDiscountValue(hold.discountValue);
    setHoldTransactions((prev) => prev.filter((h) => h.id !== holdId));
    setCashPaidInput("");
    showAlert(`Transaksi ${holdId} dilanjutkan.`);
  }

  function completePayment() {
    if (cartItems.length === 0) {
      showAlert("Keranjang kosong.");
      return;
    }

    if (paymentMethod === "CASH") {
      if (cashPaid < totals.grandTotal) {
        showAlert(
          `Uang bayar kurang ${formatRupiah(totals.grandTotal - cashPaid)}.`,
        );
        return;
      }
      finalizeTransaction({
        paymentMethod: "CASH",
        nominalBayar: cashPaid,
        kembalian: changeAmount,
        customerId: selectedCustomer?.id,
        customerName: selectedCustomer?.name,
        customerPhone: selectedCustomer?.phone,
      });
      return;
    }

    const name = creditCustomerName.trim();
    const phone = creditCustomerPhone.trim();
    if (!name || !phone) {
      showAlert("Nama dan No. HP pelanggan wajib diisi untuk transaksi tempo.");
      return;
    }
    if (!dueDateInput) {
      showAlert("Tanggal jatuh tempo wajib diisi.");
      return;
    }
    if (downPayment > totals.grandTotal) {
      showAlert("Uang muka tidak boleh melebihi total belanja.");
      return;
    }

    const customerId =
      selectedCustomer?.id ?? `CUS-CR-${Date.now()}`;

    finalizeTransaction({
      paymentMethod: "CREDIT",
      nominalBayar: downPayment,
      kembalian: 0,
      customerId,
      customerName: name,
      customerPhone: phone,
      dueDate: dueDateInput,
    });
  }

  function finalizeTransaction(options: {
    paymentMethod: PaymentMethod;
    nominalBayar: number;
    kembalian: number;
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    dueDate?: string;
  }) {
    const items: TransactionItem[] = cartItems.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitSellingPrice,
    }));

    const invoiceId = generateInvoiceNumber(transactions);
    const now = new Date().toISOString();

    let linkedDebt: Debt | null = null;

    if (options.paymentMethod === "CREDIT") {
      const customerId = options.customerId?.trim();
      const customerName = options.customerName?.trim();
      const customerPhone = options.customerPhone?.trim();
      const dueDate = options.dueDate?.trim();

      if (!customerId || !customerName || !customerPhone || !dueDate) {
        showAlert(
          "Data pelanggan dan tanggal jatuh tempo wajib diisi untuk transaksi tempo.",
        );
        return;
      }

      try {
        linkedDebt = addDebt({
          transactionId: invoiceId,
          customerId,
          customerName,
          customerPhone,
          totalAmount: totals.grandTotal,
          paidAmount: options.nominalBayar,
          dueDate,
          createdAt: now,
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Gagal membuat data utang. Transaksi dibatalkan.";
        showAlert(message);
        return;
      }
    }

    const newTransaction: Transaction = {
      id: invoiceId,
      timestamp: now,
      items,
      totalHarga: totals.grandTotal,
      nominalBayar: options.nominalBayar,
      kembalian: options.kembalian,
      paymentMethod: options.paymentMethod,
      customerId: options.customerId?.trim(),
      customerName: options.customerName?.trim(),
      customerPhone: options.customerPhone?.trim(),
      debtId: linkedDebt?.id,
    };

    addTransaction(newTransaction);

    cartItems.forEach((item) =>
      reduceStock(item.productId, item.quantity),
    );

    setCompletedTransaction(newTransaction);
    setCompletedDebt(linkedDebt);
    setAlertMessage(null);
    clearCart();
    setIsTaxEnabled(false);
    setDiscountType("NOMINAL");
    setDiscountValue(0);
    setPaymentMethod("CASH");
    setCreditCustomerName("");
    setCreditCustomerPhone("");
    setDownPaymentInput("0");
  }

  /** Demo: generate kode untuk urutan berikutnya */
  function demoGenerateNextCode() {
    const nextSeq = catalogProducts.length + 1;
    showAlert(`Kode barang berikutnya: ${generateProductCode(nextSeq)}`);
  }

  function generateDebtPaymentReceiptId(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const prefix = `PAY-${y}${m}${d}`;
    const count = transactions.filter((t) => t.id.startsWith(prefix)).length;
    return `${prefix}-${String(count + 1).padStart(3, "0")}`;
  }

  function handlePayDebtInKasir(payload: {
    customerId: string;
    customerName: string;
    customerPhone: string;
    openDebts: Debt[];
    paymentAmount: number;
    paymentMethod: DebtSettlementMethod;
    note?: string;
  }): DebtPaymentReceipt | null {
    const {
      customerId,
      customerName,
      customerPhone,
      openDebts,
      paymentAmount,
      paymentMethod,
      note,
    } = payload;

    if (paymentAmount <= 0) {
      showAlert("Nominal pembayaran harus lebih dari 0.");
      return null;
    }

    const totalRemaining = openDebts.reduce(
      (sum, d) => sum + d.remainingAmount,
      0,
    );
    if (paymentAmount > totalRemaining) {
      showAlert(
        `Nominal melebihi sisa utang (${formatRupiah(totalRemaining)}).`,
      );
      return null;
    }

    const sorted = [...openDebts].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    let leftover = paymentAmount;
    const paidDebtIds: string[] = [];
    const methodLabel =
      paymentMethod === "CASH"
        ? "Tunai"
        : paymentMethod === "QRIS"
          ? "QRIS"
          : "Transfer";
    const paymentNote = note
      ? `[${methodLabel}] ${note}`
      : `[${methodLabel}] Pembayaran utang via Kasir`;

    for (const debt of sorted) {
      if (leftover <= 0) break;
      const apply = Math.min(leftover, debt.remainingAmount);
      if (apply <= 0) continue;
      payDebt(debt.id, apply, paymentNote);
      paidDebtIds.push(debt.id);
      leftover -= apply;
    }

    const remainingAfter = Math.max(0, totalRemaining - paymentAmount);
    const now = new Date().toISOString();
    const receiptId = generateDebtPaymentReceiptId();

    const cashInTransaction: Transaction = {
      id: receiptId,
      timestamp: now,
      items: [
        {
          productId: "DEBT-PAY",
          productName: `Pembayaran Utang — ${customerName}`,
          quantity: 1,
          unitPrice: paymentAmount,
        },
      ],
      totalHarga: paymentAmount,
      nominalBayar: paymentAmount,
      kembalian: 0,
      paymentMethod,
      customerId,
      customerName,
      customerPhone,
    };

    addTransaction(cashInTransaction);

    const receipt: DebtPaymentReceipt = {
      id: receiptId,
      timestamp: now,
      customerId,
      customerName,
      customerPhone,
      paymentAmount,
      paymentMethod,
      note,
      remainingAfter,
      debtIds: paidDebtIds,
    };

    setDebtPaymentReceipt(receipt);
    setAlertMessage(null);
    return receipt;
  }

  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const inputClass =
    "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500";
  const selectClass =
    "rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500";

  return (
    <>
    <div className="flex h-screen flex-col overflow-hidden bg-slate-950 text-slate-100 print:hidden">
      {/* Header + pencarian utama (lapisan depan) */}
      <header className="relative z-50 shrink-0 border-b border-slate-800 bg-slate-900 px-5 py-3 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-slate-500">
              Retail Komputer
            </p>
            <h1 className="text-lg font-semibold text-white">Kasir / POS</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {kasirMode === "sale" && (
              <>
                <label className="flex items-center gap-2 text-xs text-slate-400">
                  Pelanggan
                  <select
                    className={selectClass}
                    value={selectedCustomerId}
                    onChange={(e) => selectCustomerById(e.target.value)}
                  >
                    <option value="">Pelanggan Umum</option>
                    {sortedCustomers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {c.type === "CORPORATE" ? " (Instansi)" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => setIsQuickCustomerModalOpen(true)}
                  className="rounded-lg border border-cyan-500/40 px-3 py-2 text-sm font-medium text-cyan-300 hover:bg-cyan-500/10"
                >
                  + Pelanggan Baru
                </button>
                <button
                  type="button"
                  onClick={openCatalogModal}
                  className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500"
                >
                  Cari Produk (F2)
                </button>
              </>
            )}
            {kasirMode === "debt" && (
              <button
                type="button"
                onClick={() => setIsQuickCustomerModalOpen(true)}
                className="rounded-lg border border-amber-500/40 px-3 py-2 text-sm font-medium text-amber-200 hover:bg-amber-500/10"
              >
                + Pelanggan Baru
              </button>
            )}
            <Link
              href="/"
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
            >
              Dashboard
            </Link>
          </div>
        </div>

        <div
          className="mt-3 inline-flex flex-wrap rounded-xl border border-slate-700 bg-slate-950 p-1"
          role="tablist"
          aria-label="Mode kasir"
        >
          <button
            type="button"
            role="tab"
            aria-selected={kasirMode === "sale"}
            onClick={() => setKasirMode("sale")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              kasirMode === "sale"
                ? "bg-cyan-600 text-white shadow-sm shadow-cyan-900/40"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            Penjualan / Kasir
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={kasirMode === "debt"}
            onClick={() => {
              setKasirMode("debt");
              closeCatalogModal();
            }}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              kasirMode === "debt"
                ? "bg-amber-600 text-white shadow-sm shadow-amber-900/40"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            Pembayaran Utang
          </button>
        </div>

        {alertMessage && (
          <p
            role="status"
            className="mt-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-200"
          >
            {alertMessage}
          </p>
        )}

        {kasirMode === "sale" && (
        /* Container pencarian: input selalu di depan, dropdown di bawahnya */
        <div className="relative z-50 mt-3">
          <div className="relative flex gap-2">
            <input
              ref={searchInputRef}
              type="search"
              className={`${inputClass} relative z-50 flex-1 py-3 text-base shadow-lg shadow-slate-950/50`}
              value={searchQuery}
              onFocus={openCatalogModal}
              onKeyDown={handleSearchKeyDown}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsCatalogModalOpen(true);
              }}
              placeholder="Scan barcode atau ketik nama / ID — Enter untuk tambah"
              aria-expanded={isCatalogModalOpen}
              aria-controls="catalog-dropdown"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="relative z-50 shrink-0 rounded-lg border border-slate-700 bg-slate-950 px-4 text-sm text-slate-400 hover:bg-slate-800"
            >
              Reset
            </button>
          </div>

          {isCatalogModalOpen && (
            <>
              {/* Backdrop: di bawah header, tidak menutupi kotak pencarian */}
              <button
                type="button"
                aria-label="Tutup daftar produk"
                className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-[1px]"
                onClick={closeCatalogModal}
              />

              <div
                id="catalog-dropdown"
                role="listbox"
                className="absolute left-0 right-0 top-full z-40 mt-2 flex max-h-[min(55vh,28rem)] flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/50"
              >
                <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2">
                  <p className="text-xs text-slate-400">
                    <span className="font-medium text-slate-200">
                      {filteredProducts.length} hasil
                    </span>
                    {" · "}
                    Enter = scan barcode / tambah item teratas · Esc = tutup
                  </p>
                  <button
                    type="button"
                    onClick={closeCatalogModal}
                    className="rounded border border-slate-700 px-2 py-0.5 text-xs text-slate-400 hover:bg-slate-800"
                  >
                    Tutup
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-slate-900 text-xs uppercase text-slate-500">
                      <tr className="border-b border-slate-800">
                        <th className="px-3 py-2">Kode</th>
                        <th className="px-3 py-2">Nama</th>
                        <th className="px-3 py-2">Barcode / Serial</th>
                        <th className="px-3 py-2 text-right">Harga</th>
                        <th className="px-3 py-2 text-center">Stok</th>
                        <th className="px-3 py-2 text-center">Sisa</th>
                        <th className="px-3 py-2 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-3 py-8 text-center text-slate-500"
                          >
                            Produk tidak ditemukan.
                          </td>
                        </tr>
                      ) : (
                        filteredProducts.map((product) => {
                          const outOfStock = product.stock <= 0;
                          const available = getAvailableStock(
                            catalogProducts,
                            product.id,
                            cartItems,
                          );
                          const cannotAdd = outOfStock || available <= 0;
                          const topPickId = getFirstSelectableProduct()?.id;
                          const isTopPick =
                            !cannotAdd && product.id === topPickId;

                          return (
                            <tr
                              key={product.id}
                              className={`border-b border-slate-800/80 ${
                                cannotAdd
                                  ? "bg-slate-900/50 text-slate-500"
                                  : "cursor-pointer hover:bg-slate-800/60"
                              } ${isTopPick ? "bg-cyan-500/10" : ""}`}
                              onClick={() => {
                                if (!cannotAdd)
                                  selectProductFromCatalog(product);
                              }}
                            >
                              <td className="px-3 py-2 font-mono text-xs">
                                {product.productCode}
                                {isTopPick && (
                                  <span className="ml-1 text-[10px] text-cyan-400">
                                    ↵
                                  </span>
                                )}
                              </td>
                              <td className="max-w-[240px] px-3 py-2">
                                <span className="line-clamp-2">
                                  {product.name}
                                </span>
                                {outOfStock && (
                                  <span className="text-xs font-medium text-red-400">
                                    Stok Habis
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 font-mono text-xs text-slate-500">
                                {product.barcode}
                                {product.serialNumber
                                  ? ` / ${product.serialNumber}`
                                  : ""
                                }
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums text-cyan-300">
                                {formatRupiah(product.sellingPrice)}
                              </td>
                              <td className="px-3 py-2 text-center tabular-nums">
                                {product.stock}
                              </td>
                              <td className="px-3 py-2 text-center tabular-nums">
                                {available}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <button
                                  type="button"
                                  disabled={cannotAdd}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    selectProductFromCatalog(product);
                                  }}
                                  className="rounded-md bg-cyan-600 px-3 py-1 text-xs font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-600 enabled:hover:bg-cyan-500"
                                >
                                  Pilih
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
        )}
      </header>

      {kasirMode === "debt" ? (
        <KasirDebtPaymentPanel
          debts={debts}
          customers={customers}
          onPay={handlePayDebtInKasir}
        />
      ) : (
      /* Main: keranjang 78% + pembayaran 22% */
      <div className="flex min-h-0 flex-1">
        <section className="flex w-[78%] min-w-0 flex-col border-r border-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Keranjang Belanja
              </h2>
              <p className="text-xs text-slate-500">
                {cartItemCount} unit · {cartItems.length} baris
              </p>
            </div>
            <button
              type="button"
              onClick={clearCart}
              disabled={cartItems.length === 0}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 disabled:opacity-40 hover:bg-slate-800"
            >
              Kosongkan Keranjang
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-[1] bg-slate-950 text-xs uppercase text-slate-500">
                <tr className="border-b border-slate-800">
                  <th className="px-4 py-3 text-left">Produk</th>
                  <th className="px-4 py-3 text-center">Qty</th>
                  <th className="px-4 py-3 text-right">Harga/Unit</th>
                  <th className="px-4 py-3 text-right">Subtotal</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {cartItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-24 text-center text-slate-500"
                    >
                      Keranjang kosong. Tekan{" "}
                      <strong className="text-slate-300">F2</strong> atau klik
                      kolom pencarian untuk menambah barang.
                    </td>
                  </tr>
                ) : (
                  cartItems.map((item) => {
                    const product = catalogProducts.find(
                      (p) => p.id === item.productId,
                    );
                    const maxStock = product?.stock ?? item.quantity;

                    return (
                      <tr
                        key={item.id}
                        className="border-b border-slate-800/80 hover:bg-slate-900/50"
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-100">
                            {item.productName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {item.productId}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(
                                  item.productId,
                                  item.quantity - 1,
                                )
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min={1}
                              max={maxStock}
                              className="w-14 rounded-lg border border-slate-700 bg-slate-950 py-1 text-center tabular-nums"
                              value={
                                qtyDraftByProduct[item.productId] ??
                                String(item.quantity)
                              }
                              onChange={(e) =>
                                setQtyDraftByProduct((prev) => ({
                                  ...prev,
                                  [item.productId]: e.target.value,
                                }))
                              }
                            />
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(
                                  item.productId,
                                  item.quantity + 1,
                                )
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800"
                            >
                              +
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const parsed = Number(
                                  qtyDraftByProduct[item.productId] ??
                                    item.quantity,
                                );
                                updateQuantity(item.productId, parsed);
                              }}
                              className="rounded border border-slate-700 px-2 py-1 text-[10px] text-slate-500 hover:bg-slate-800"
                            >
                              Set
                            </button>
                          </div>
                          <p className="mt-1 text-center text-[10px] text-slate-600">
                            max {maxStock}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-300">
                          {formatRupiah(item.unitSellingPrice)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold text-cyan-300">
                          {formatRupiah(getCartItemSubtotal(item))}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.productId)}
                            className="text-xs text-red-400 hover:text-red-300"
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {holdTransactions.length > 0 && (
              <div className="border-t border-slate-800 p-4">
                <h3 className="text-xs font-semibold uppercase text-amber-200/80">
                  Transaksi Tertunda ({holdTransactions.length})
                </h3>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {holdTransactions.map((hold) => (
                    <li
                      key={hold.id}
                      className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs"
                    >
                      <span className="text-amber-100">{hold.id}</span>
                      <span className="text-slate-500">
                        {hold.items.reduce((s, i) => s + i.quantity, 0)} unit
                      </span>
                      <button
                        type="button"
                        onClick={() => resumeHold(hold.id)}
                        className="rounded bg-amber-600 px-2 py-0.5 font-medium text-white hover:bg-amber-500"
                      >
                        Lanjutkan
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        <aside className="flex w-[22%] min-w-[280px] flex-col overflow-y-auto bg-slate-900/60">
          <div className="shrink-0 border-b border-slate-800 p-4">
            <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/80 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Metode Pembayaran
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("CASH")}
                  className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                    paymentMethod === "CASH"
                      ? "bg-cyan-600 text-white"
                      : "border border-slate-700 text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  Tunai
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod("CREDIT");
                    syncCreditCustomerFromSelection(selectedCustomer);
                  }}
                  className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                    paymentMethod === "CREDIT"
                      ? "bg-amber-600 text-white"
                      : "border border-slate-700 text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  Tempo / Utang
                </button>
              </div>
            </div>

            <div className="mt-3 space-y-3 rounded-xl border border-slate-800 bg-slate-950/80 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Diskon & Pajak
              </p>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={isTaxEnabled}
                  onChange={(e) => setIsTaxEnabled(e.target.checked)}
                  className="rounded border-slate-600"
                />
                PPN 11%
              </label>
              <div className="flex gap-2">
                <select
                  className={`${selectClass} flex-1`}
                  value={discountType}
                  onChange={(e) =>
                    setDiscountType(e.target.value as DiscountType)
                  }
                >
                  <option value="NOMINAL">Nominal (Rp)</option>
                  <option value="PERSEN">Persen (%)</option>
                </select>
                <input
                  type="number"
                  min={0}
                  className={`${inputClass} w-24`}
                  value={discountValue}
                  onChange={(e) =>
                    setDiscountValue(Number(e.target.value) || 0)
                  }
                />
              </div>
              <button
                type="button"
                onClick={() => setDiscountValue(0)}
                className="text-xs text-slate-500 hover:text-slate-300"
              >
                Reset diskon
              </button>
            </div>

            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between text-slate-400">
                <dt>Subtotal</dt>
                <dd className="tabular-nums text-slate-200">
                  {formatRupiah(totals.subtotal)}
                </dd>
              </div>
              <div className="flex justify-between text-slate-400">
                <dt>Diskon</dt>
                <dd className="tabular-nums text-red-300">
                  − {formatRupiah(totals.discountAmount)}
                </dd>
              </div>
              <div className="flex justify-between text-slate-400">
                <dt>PPN</dt>
                <dd className="tabular-nums text-slate-200">
                  {formatRupiah(totals.taxAmount)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-2 text-base font-semibold">
                <dt className="text-slate-200">Grand Total</dt>
                <dd className="tabular-nums text-white">
                  {formatRupiah(totals.grandTotal)}
                </dd>
              </div>
            </dl>

            {paymentMethod === "CASH" ? (
              <>
                <label className="mt-4 block text-xs text-slate-400">
                  Uang Bayar
                  <input
                    type="text"
                    inputMode="numeric"
                    className={`${inputClass} mt-1 text-lg font-semibold tabular-nums`}
                    value={cashPaidInput}
                    onChange={(e) => setCashPaidInput(e.target.value)}
                    placeholder="0"
                  />
                </label>

                <div
                  className={`mt-3 flex justify-between rounded-lg px-3 py-2 text-sm ${
                    cartItems.length > 0 && cashPaid < totals.grandTotal
                      ? "bg-red-500/10 text-red-300"
                      : "bg-emerald-500/10 text-emerald-300"
                  }`}
                >
                  <span>Uang Kembalian</span>
                  <span className="font-semibold tabular-nums">
                    {cartItems.length === 0
                      ? formatRupiah(0)
                      : cashPaid < totals.grandTotal
                        ? `Kurang ${formatRupiah(totals.grandTotal - cashPaid)}`
                        : formatRupiah(Math.max(0, changeAmount))}
                  </span>
                </div>
              </>
            ) : (
              <div className="mt-4 space-y-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                <p className="text-xs font-semibold uppercase text-amber-200/80">
                  Data Tempo / Utang
                </p>
                <label className="block text-xs text-slate-400">
                  Nama Pelanggan *
                  <input
                    type="text"
                    className={`${inputClass} mt-1`}
                    value={creditCustomerName}
                    onChange={(e) => setCreditCustomerName(e.target.value)}
                    placeholder="Nama lengkap"
                  />
                </label>
                <label className="block text-xs text-slate-400">
                  No. HP *
                  <input
                    type="tel"
                    className={`${inputClass} mt-1`}
                    value={creditCustomerPhone}
                    onChange={(e) => setCreditCustomerPhone(e.target.value)}
                    placeholder="08xxxxxxxxxx"
                  />
                </label>
                <label className="block text-xs text-slate-400">
                  Uang Muka / DP (opsional)
                  <input
                    type="text"
                    inputMode="numeric"
                    className={`${inputClass} mt-1 tabular-nums`}
                    value={downPaymentInput}
                    onChange={(e) => setDownPaymentInput(e.target.value)}
                    placeholder="0"
                  />
                </label>
                <label className="block text-xs text-slate-400">
                  Tanggal Jatuh Tempo *
                  <input
                    type="date"
                    className={`${inputClass} mt-1 [color-scheme:dark]`}
                    value={dueDateInput}
                    onChange={(e) => setDueDateInput(e.target.value)}
                  />
                </label>
                <div className="rounded-lg bg-slate-900/80 px-3 py-2 text-xs text-slate-400">
                  <div className="flex justify-between">
                    <span>Sisa Utang</span>
                    <span className="font-semibold tabular-nums text-amber-200">
                      {formatRupiah(
                        Math.max(0, totals.grandTotal - downPayment),
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={holdCurrentTransaction}
                disabled={cartItems.length === 0}
                className="rounded-xl bg-amber-600 py-3.5 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-600"
              >
                Tunda
              </button>
              <button
                type="button"
                onClick={completePayment}
                disabled={!canCompletePayment}
                className={`rounded-xl py-3.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-600 ${
                  paymentMethod === "CREDIT"
                    ? "bg-amber-600 hover:bg-amber-500"
                    : "bg-emerald-600 hover:bg-emerald-500"
                }`}
              >
                {paymentMethod === "CREDIT" ? "Simpan Tempo" : "Bayar"}
              </button>
            </div>
          </div>
        </aside>
      </div>
      )}
    </div>

      {completedTransaction && (
        <ReceiptModal
          transaction={completedTransaction}
          variant="success"
          debt={completedDebt}
          onClose={() => {
            setCompletedTransaction(null);
            setCompletedDebt(null);
          }}
        />
      )}

      {debtPaymentReceipt && (
        <DebtPaymentReceiptModal
          receipt={debtPaymentReceipt}
          onClose={() => setDebtPaymentReceipt(null)}
        />
      )}

      <CustomerFormModal
        open={isQuickCustomerModalOpen}
        title="Tambah Pelanggan Cepat"
        submitLabel="Simpan & Pilih"
        onClose={() => setIsQuickCustomerModalOpen(false)}
        onSubmit={(input) => {
          const created = addCustomer(input);
          setSelectedCustomerId(created.id);
          if (paymentMethod === "CREDIT") {
            syncCreditCustomerFromSelection(created);
          }
        }}
      />
    </>
  );
}
