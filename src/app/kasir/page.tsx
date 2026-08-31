"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import KasirServicePanel from "@/src/components/KasirServicePanel";
import CustomerFormModal from "@/src/components/CustomerFormModal";
import KasirCreditDebtModal, {
  type CreditDebtFormValues,
} from "@/src/components/KasirCreditDebtModal";
import SearchInput from "@/src/components/ui/SearchInput";
import ModeBadge from "@/src/components/ui/ModeBadge";
import {
  INPUT_CLASS,
  SELECT_CLASS,
  TAB_GROUP_CLASS,
  tabButtonClass,
} from "@/lib/ui-classes";

type KasirMode = "sale" | "debt" | "service";

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
  const [creditNote, setCreditNote] = useState("");
  const [isCreditDebtModalOpen, setIsCreditDebtModalOpen] = useState(false);

  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [qtyDraftByProduct, setQtyDraftByProduct] = useState<
    Record<string, string>
  >({});
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
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

  const canCompleteExactPayment = cartItems.length > 0;

  const canCompletePayment =
    paymentMethod === "CASH"
      ? canCompleteCashPayment
      : paymentMethod === "CREDIT"
        ? canCompleteCreditPayment
        : canCompleteExactPayment;

  function setExactCashPayment() {
    setCashPaidInput(String(totals.grandTotal));
  }

  function openCreditDebtModal() {
    if (selectedCustomer && !creditCustomerName.trim()) {
      setCreditCustomerName(selectedCustomer.name);
      setCreditCustomerPhone(selectedCustomer.phone);
    }
    setIsCreditDebtModalOpen(true);
  }

  function handleCreditDebtConfirm(values: CreditDebtFormValues) {
    setCreditCustomerName(values.customerName);
    setCreditCustomerPhone(values.customerPhone);
    setDueDateInput(values.dueDate);
    setCreditNote(values.note);
    setDownPaymentInput(values.downPayment || "0");
    setPaymentMethod("CREDIT");
  }

  function clearCreditPayment() {
    setPaymentMethod("CASH");
    setCreditCustomerName("");
    setCreditCustomerPhone("");
    setCreditNote("");
    setDownPaymentInput("0");
  }

  const creditDebtInitialValues: CreditDebtFormValues = {
    customerName: creditCustomerName,
    customerPhone: creditCustomerPhone,
    dueDate: dueDateInput,
    note: creditNote,
    downPayment: downPaymentInput,
  };

  function showAlert(message: string) {
    window.alert(message);
    setAlertMessage(message);
  }

  function closeSearchDropdown() {
    setIsSearchDropdownOpen(false);
  }

  function updateSearchQuery(value: string) {
    setSearchQuery(value);
    setIsSearchDropdownOpen(value.trim().length > 0);
  }

  const showSearchDropdown =
    isSearchDropdownOpen && searchQuery.trim().length > 0;

  function selectProductFromSearch(product: CatalogProduct) {
    const result = addToCartLogic(cartItems, product);
    if (result.alert) {
      showAlert(result.alert.message);
      return;
    }
    setCartItems(result.items);
    setAlertMessage(null);
    setSearchQuery("");
    closeSearchDropdown();
    window.setTimeout(() => searchInputRef.current?.focus(), 0);
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
        closeSearchDropdown();
        window.setTimeout(() => searchInputRef.current?.focus(), 0);
        return;
      }
    }

    addTopFilteredProductToCart();
  }

  useEffect(() => {
    if (kasirMode === "sale") {
      window.setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [kasirMode]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (kasirMode !== "sale") return;
      if (e.key === "F2") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === "Escape" && showSearchDropdown) {
        closeSearchDropdown();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showSearchDropdown, kasirMode]);

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
    setCreditNote("");
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

    if (paymentMethod === "QRIS" || paymentMethod === "TRANSFER") {
      finalizeTransaction({
        paymentMethod,
        nominalBayar: totals.grandTotal,
        kembalian: 0,
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
      type: "RETAIL",
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
    setCreditNote("");
    setDownPaymentInput("0");
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
      type: "RETAIL",
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

  function getProductDisplayCode(productId: string): string {
    const product = catalogProducts.find((p) => p.id === productId);
    if (!product) return "—";
    return product.barcode || product.productCode;
  }

  const modeBadgeMap = {
    sale: "retail" as const,
    service: "service" as const,
    debt: "debt" as const,
  };

  const inlinePaymentMethods: {
    value: Exclude<PaymentMethod, "CREDIT">;
    label: string;
    activeClass: string;
  }[] = [
    { value: "CASH", label: "Tunai", activeClass: "bg-indigo-600 text-white" },
    { value: "QRIS", label: "QRIS", activeClass: "bg-violet-600 text-white" },
    { value: "TRANSFER", label: "Transfer", activeClass: "bg-sky-600 text-white" },
  ];

  const isCreditActive = paymentMethod === "CREDIT";

  return (
    <>
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50 print:hidden lg:pt-0 pt-14">
      <header
        data-app-chrome
        className="relative z-50 shrink-0 border-b border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-6 print:hidden"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-600">
                Retail Komputer
              </p>
              <h1 className="text-xl font-bold text-slate-800">Kasir / POS</h1>
            </div>
            <ModeBadge mode={modeBadgeMap[kasirMode]} />
            <div className={`${TAB_GROUP_CLASS}`} role="tablist" aria-label="Mode kasir">
              <button
                type="button"
                role="tab"
                aria-selected={kasirMode === "sale"}
                onClick={() => setKasirMode("sale")}
                className={tabButtonClass(kasirMode === "sale", "indigo")}
              >
                Retail
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={kasirMode === "service"}
                onClick={() => {
                  setKasirMode("service");
                  closeSearchDropdown();
                }}
                className={tabButtonClass(kasirMode === "service", "violet")}
              >
                Servis
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={kasirMode === "debt"}
                onClick={() => {
                  setKasirMode("debt");
                  closeSearchDropdown();
                }}
                className={tabButtonClass(kasirMode === "debt", "amber")}
              >
                Bayar Utang
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {kasirMode === "sale" && (
              <>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  Pelanggan
                  <select
                    className={SELECT_CLASS}
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
                  className="rounded-xl border border-indigo-200 px-3 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-50"
                >
                  + Pelanggan Baru
                </button>
              </>
            )}
            {kasirMode === "debt" && (
              <button
                type="button"
                onClick={() => setIsQuickCustomerModalOpen(true)}
                className="rounded-xl border border-amber-200 px-3 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-50"
              >
                + Pelanggan Baru
              </button>
            )}
          </div>
        </div>

        {alertMessage && (
          <p
            role="status"
            className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-800"
          >
            {alertMessage}
          </p>
        )}
      </header>

      {kasirMode === "debt" ? (
        <KasirDebtPaymentPanel
          debts={debts}
          customers={customers}
          onPay={handlePayDebtInKasir}
        />
      ) : kasirMode === "service" ? (
        <KasirServicePanel />
      ) : (
        <div className="grid h-[calc(100vh-80px)] min-h-0 grid-cols-1 gap-4 overflow-hidden p-4 lg:grid-cols-[minmax(0,62%)_minmax(0,38%)]">
          {/* Kolom kiri: pencarian + tabel belanjaan */}
          <section className="flex min-h-0 flex-col gap-3">
            <div className="relative shrink-0">
              <SearchInput
                id="kasir-search"
                ref={searchInputRef}
                autoFocus
                value={searchQuery}
                onKeyDown={handleSearchKeyDown}
                onChange={(e) => updateSearchQuery(e.target.value)}
                onClear={() => updateSearchQuery("")}
                placeholder="Scan barcode atau ketik nama barang — Enter untuk tambah"
                aria-expanded={showSearchDropdown}
                aria-controls="search-autocomplete"
                autoComplete="off"
                className="[&_input]:py-3.5 [&_input]:text-base [&_input]:font-semibold"
              />

              {showSearchDropdown && (
                <div
                  id="search-autocomplete"
                  role="listbox"
                  className="absolute left-0 right-0 top-full z-50 mt-2 flex max-h-[min(36vh,18rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
                    <p className="text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">
                        {filteredProducts.length} hasil
                      </span>
                      {" · "}Enter untuk tambah
                    </p>
                    <button
                      type="button"
                      onClick={closeSearchDropdown}
                      className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
                    >
                      Tutup
                    </button>
                  </div>
                  <div className="min-h-0 flex-1 overflow-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
                        <tr className="border-b border-slate-200">
                          <th className="px-3 py-2">Kode</th>
                          <th className="px-3 py-2">Nama</th>
                          <th className="px-3 py-2 text-right">Harga</th>
                          <th className="px-3 py-2 text-center">Stok</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProducts.length === 0 ? (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-3 py-6 text-center text-slate-500"
                            >
                              Produk tidak ditemukan.
                            </td>
                          </tr>
                        ) : (
                          filteredProducts.slice(0, 50).map((product) => {
                            const outOfStock = product.stock <= 0;
                            const available = getAvailableStock(
                              catalogProducts,
                              product.id,
                              cartItems,
                            );
                            const cannotAdd = outOfStock || available <= 0;
                            const isTopPick =
                              !cannotAdd &&
                              product.id === getFirstSelectableProduct()?.id;
                            return (
                              <tr
                                key={product.id}
                                role="option"
                                aria-selected={isTopPick}
                                className={`border-b border-slate-100 ${
                                  cannotAdd
                                    ? "bg-slate-50 text-slate-400"
                                    : "cursor-pointer hover:bg-indigo-50/50"
                                } ${isTopPick ? "bg-indigo-50" : ""}`}
                                onClick={() => {
                                  if (!cannotAdd) selectProductFromSearch(product);
                                }}
                              >
                                <td className="px-3 py-2 font-mono text-xs">
                                  {product.productCode}
                                </td>
                                <td className="max-w-[200px] px-3 py-2">
                                  <span className="line-clamp-2">{product.name}</span>
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums font-medium text-indigo-700">
                                  {formatRupiah(product.sellingPrice)}
                                </td>
                                <td className="px-3 py-2 text-center tabular-nums">
                                  {available}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-800">
                    Daftar Belanjaan
                  </h2>
                  <p className="text-xs text-slate-500">
                    {cartItemCount} unit · {cartItems.length} item
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearCart}
                  disabled={cartItems.length === 0}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Kosongkan
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-slate-100">
                {cartItems.length === 0 ? (
                  <div className="flex h-full min-h-[12rem] flex-col items-center justify-center px-6 text-center">
                    <p className="text-sm font-medium text-slate-600">
                      Belum ada barang
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Scan atau cari barang di atas
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <tr className="border-b border-slate-200">
                        <th className="px-3 py-2.5">Kode</th>
                        <th className="px-3 py-2.5">Nama</th>
                        <th className="px-3 py-2.5 text-right">Harga</th>
                        <th className="px-3 py-2.5 text-center">Qty</th>
                        <th className="px-3 py-2.5 text-right">Subtotal</th>
                        <th className="px-3 py-2.5 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cartItems.map((item) => {
                        const product = catalogProducts.find(
                          (p) => p.id === item.productId,
                        );
                        const maxStock = product?.stock ?? item.quantity;
                        return (
                          <tr
                            key={item.id}
                            className="bg-white text-slate-800 hover:bg-slate-50"
                          >
                            <td className="px-3 py-2.5 font-mono text-xs text-slate-500">
                              {getProductDisplayCode(item.productId)}
                            </td>
                            <td className="max-w-[180px] px-3 py-2.5 font-medium">
                              <span className="line-clamp-2">{item.productName}</span>
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">
                              {formatRupiah(item.unitSellingPrice)}
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateQuantity(item.productId, item.quantity - 1)
                                  }
                                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                                  aria-label="Kurangi"
                                >
                                  −
                                </button>
                                <input
                                  type="number"
                                  min={1}
                                  max={maxStock}
                                  className="w-12 rounded-lg border border-slate-200 bg-white py-1 text-center text-sm tabular-nums text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
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
                                  onBlur={() => {
                                    const parsed = Number(
                                      qtyDraftByProduct[item.productId] ??
                                        item.quantity,
                                    );
                                    updateQuantity(item.productId, parsed);
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateQuantity(item.productId, item.quantity + 1)
                                  }
                                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                                  aria-label="Tambah"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-indigo-700">
                              {formatRupiah(getCartItemSubtotal(item))}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => removeFromCart(item.productId)}
                                className="rounded-lg border border-red-200 px-2 py-0.5 text-xs font-medium text-red-600 hover:bg-red-50"
                              >
                                Hapus
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {holdTransactions.length > 0 && (
                <div className="mt-3 shrink-0 rounded-xl border border-amber-200 bg-amber-50 p-2.5">
                  <h3 className="text-[11px] font-semibold uppercase text-amber-800">
                    Tertunda ({holdTransactions.length})
                  </h3>
                  <ul className="mt-1.5 flex flex-wrap gap-1.5">
                    {holdTransactions.map((hold) => (
                      <li key={hold.id}>
                        <button
                          type="button"
                          onClick={() => resumeHold(hold.id)}
                          className="rounded-lg bg-amber-600 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-amber-500"
                        >
                          {hold.id}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>

          {/* Kolom kanan: panel pembayaran full height */}
          <aside className="flex min-h-0 flex-col">
            <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Total Bayar
                  </p>
                  <p className="mt-1 text-4xl font-black tabular-nums text-indigo-600 sm:text-5xl">
                    {formatRupiah(totals.grandTotal)}
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Metode Pembayaran
                  </p>
                  <div className="flex gap-1.5">
                    {inlinePaymentMethods.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setPaymentMethod(option.value);
                          if (isCreditActive) clearCreditPayment();
                        }}
                        className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                          paymentMethod === option.value
                            ? option.activeClass
                            : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={openCreditDebtModal}
                  className={`w-full rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    isCreditActive
                      ? "border-amber-300 bg-amber-50 text-amber-800"
                      : "border-slate-200 bg-white text-slate-600 hover:border-amber-200 hover:bg-amber-50/50"
                  }`}
                >
                  {isCreditActive
                    ? `Utang: ${creditCustomerName || "—"} · Ubah`
                    : "Bayar via Utang / Piutang"}
                </button>

                {isCreditActive && (
                  <button
                    type="button"
                    onClick={clearCreditPayment}
                    className="text-xs font-medium text-slate-500 underline hover:text-slate-700"
                  >
                    Batalkan mode utang
                  </button>
                )}

                {isCreditActive && creditCustomerName && (
                  <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    Jatuh tempo: {dueDateInput}
                    {creditNote ? ` · ${creditNote}` : ""}
                  </p>
                )}

                <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span className="tabular-nums font-medium text-slate-800">
                      {formatRupiah(totals.subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Diskon</span>
                    <span className="tabular-nums text-red-600">
                      − {formatRupiah(totals.discountAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>PPN</span>
                    <span className="tabular-nums">{formatRupiah(totals.taxAmount)}</span>
                  </div>
                  <div className="flex gap-2 border-t border-slate-200 pt-2">
                    <select
                      className={`${SELECT_CLASS} flex-1 py-2 text-xs`}
                      value={discountType}
                      onChange={(e) =>
                        setDiscountType(e.target.value as DiscountType)
                      }
                    >
                      <option value="NOMINAL">Diskon Rp</option>
                      <option value="PERSEN">Diskon %</option>
                    </select>
                    <input
                      type="number"
                      min={0}
                      className={`${INPUT_CLASS} w-16 py-2 text-xs`}
                      value={discountValue}
                      onChange={(e) =>
                        setDiscountValue(Number(e.target.value) || 0)
                      }
                    />
                    <label className="flex items-center gap-1.5 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={isTaxEnabled}
                        onChange={(e) => setIsTaxEnabled(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600"
                      />
                      PPN
                    </label>
                  </div>
                </div>

                {paymentMethod === "CASH" && (
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-slate-600">
                      Nominal Bayar
                      <div className="mt-1.5 flex gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          className={`${INPUT_CLASS} flex-1 text-lg font-bold tabular-nums`}
                          value={cashPaidInput}
                          onChange={(e) => setCashPaidInput(e.target.value)}
                          placeholder="Rp 0"
                        />
                        <button
                          type="button"
                          onClick={setExactCashPayment}
                          disabled={cartItems.length === 0}
                          className="shrink-0 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-40"
                        >
                          Pas
                        </button>
                      </div>
                    </label>
                    <div
                      className={`flex items-center justify-between rounded-xl px-3 py-2.5 ${
                        cartItems.length > 0 && cashPaid < totals.grandTotal
                          ? "bg-red-50 text-red-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      <span className="text-sm font-semibold">Kembalian</span>
                      <span className="text-lg font-black tabular-nums">
                        {cartItems.length === 0
                          ? formatRupiah(0)
                          : cashPaid < totals.grandTotal
                            ? `Kurang ${formatRupiah(totals.grandTotal - cashPaid)}`
                            : formatRupiah(Math.max(0, changeAmount))}
                      </span>
                    </div>
                  </div>
                )}

                {(paymentMethod === "QRIS" || paymentMethod === "TRANSFER") && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
                    Pembayaran {paymentMethod === "QRIS" ? "QRIS" : "Transfer"} —{" "}
                    <span className="font-bold text-slate-800">
                      {formatRupiah(totals.grandTotal)}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-4 shrink-0 space-y-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={completePayment}
                  disabled={!canCompletePayment}
                  className="w-full rounded-xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >
                  {isCreditActive
                    ? "Simpan Utang & Cetak Struk"
                    : "Selesaikan & Cetak Struk"}
                </button>
                <button
                  type="button"
                  onClick={holdCurrentTransaction}
                  disabled={cartItems.length === 0}
                  className="w-full rounded-xl border border-amber-200 bg-amber-50 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Tunda Transaksi
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

      <KasirCreditDebtModal
        open={isCreditDebtModalOpen}
        initialValues={creditDebtInitialValues}
        onClose={() => setIsCreditDebtModalOpen(false)}
        onConfirm={handleCreditDebtConfirm}
      />
    </>
  );
}
