"use client";

import { supabase } from "@/lib/supabase";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createNextProductId } from "@/lib/admin-product";
import {
  clearAllProductsFromDb,
  countServicesInDb,
  deleteCustomerFromDb,
  deletePartnerFromDb,
  deleteProductFromDb,
  deleteProductsFromDb,
  deleteServiceFromDb,
  fetchCustomers,
  fetchPartners,
  fetchProducts,
  fetchServices,
  fetchTransactions,
  generateServicePaymentInvoiceNumberFromDb,
  insertPartner as insertPartnerToDb,
  insertProduct as insertProductToDb,
  insertServiceTicket,
  getNextServiceTicketNo,
  saveRetailTransaction,
  updateCustomerInDb,
  updatePartnerInDb,
  updateProductInDb,
  updateServiceInDb,
  upsertCustomerByContact,
} from "@/lib/supabase-db";
import {
  applyCustomerUpdate,
  validateCustomerInput,
} from "@/lib/customer";
import type { Product } from "@/types/product";
import type { Transaction } from "@/types/transaction";
import type { Customer, CustomerInput } from "@/types/customer";
import type { Debt, DebtInput, DebtPaymentLog, DebtStatus } from "@/types/debt";
import {
  buildDebtFromInput,
  computeDebtStatus,
  generatePaymentLogId,
  validateDebtInput,
} from "@/lib/debt";
import {
  buildPartnerFromInput,
  buildServiceFromInput,
  computeServiceNetProfit,
  validatePartnerInput,
  validateServiceInput,
} from "@/lib/service";
import type {
  Partner,
  PartnerInput,
  PartnerStatus,
  ServiceStatus,
  ServiceTicket,
  ServiceTicketInput,
} from "@/types/service";
import type { PaymentMethod } from "@/types/transaction";

export type { Debt, DebtInput, DebtPaymentLog, DebtStatus };
export type { Customer, CustomerInput };
export type {
  Partner,
  PartnerInput,
  PartnerStatus,
  ServiceStatus,
  ServiceTicket,
  ServiceTicketInput,
};

export type ProductInput = Omit<Product, "id">;

export type UserRole = "admin" | "kasir";

export interface CurrentUser {
  username: string;
  role: UserRole;
}

const HARDCODED_ACCOUNTS: {
  username: string;
  password: string;
  role: UserRole;
}[] = [
  { username: "admin", password: "admin123", role: "admin" },
  { username: "kasir", password: "kasir123", role: "kasir" },
];

export interface AppContextValue {
  products: Product[];
  productsLoading: boolean;
  productsError: string | null;
  refreshProducts: () => Promise<void>;
  transactions: Transaction[];
  transactionsLoading: boolean;
  transactionsError: string | null;
  refreshTransactions: () => Promise<void>;
  debts: Debt[];
  customers: Customer[];
  customersLoading: boolean;
  customersError: string | null;
  refreshCustomers: () => Promise<void>;
  currentUser: CurrentUser | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  addProduct: (product: ProductInput) => Promise<Product>;
  importProducts: (products: ProductInput[]) => Promise<void>;
  updateProduct: (id: string, updates: ProductInput) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  deleteMultipleProducts: (ids: string[]) => Promise<void>;
  clearAllProducts: () => Promise<void>;
  reduceStock: (productId: string, quantity: number) => void;
  addTransaction: (transaction: Transaction) => void;
  addDebt: (debtData: DebtInput) => Debt;
  registerDebt: (debt: Debt) => void;
  payDebt: (debtId: string, paymentAmount: number, note?: string) => void;
  addCustomer: (customerData: CustomerInput) => Promise<Customer>;
  updateCustomer: (id: string, customerData: CustomerInput) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  upsertCustomerFromContact: (
    name: string,
    phone: string,
    options?: { address?: string },
  ) => Promise<Customer>;
  rememberCustomer: (customer: Customer) => void;
  partners: Partner[];
  partnersLoading: boolean;
  partnersError: string | null;
  refreshPartners: () => Promise<void>;
  services: ServiceTicket[];
  servicesLoading: boolean;
  servicesError: string | null;
  refreshServices: () => Promise<void>;
  addPartner: (partnerData: PartnerInput) => Promise<Partner>;
  updatePartner: (id: string, partnerData: PartnerInput) => Promise<void>;
  deletePartner: (id: string) => Promise<void>;
  addService: (serviceData: ServiceTicketInput) => Promise<ServiceTicket>;
  updateService: (
    id: string,
    updates: Partial<ServiceTicket>,
  ) => Promise<void>;
  deleteService: (id: string) => Promise<void>;
  sendServiceToPartner: (serviceId: string) => Promise<void>;
  confirmPartnerReceived: (serviceId: string) => Promise<void>;
  updateServicePartnerFee: (
    serviceId: string,
    partnerFee: number,
    status?: ServiceStatus,
  ) => Promise<void>;
  markServiceRepaired: (serviceId: string) => Promise<void>;
  sendServiceReturnToStore: (serviceId: string) => Promise<void>;
  confirmServiceReturned: (serviceId: string) => Promise<void>;
  /** Pelunasan pengambilan unit di kasir — catat kas SERVICE + tandai lunas */
  collectServicePayment: (
    serviceId: string,
    options: {
      paymentMethod: PaymentMethod;
      nominalBayar: number;
      customerFeeOverride?: number;
    },
  ) => Promise<Transaction>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [transactionsError, setTransactionsError] = useState<string | null>(
    null,
  );
  const transactionsRef = useRef<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const debtsRef = useRef<Debt[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [customersError, setCustomersError] = useState<string | null>(null);
  const customersRef = useRef<Customer[]>(customers);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [partnersLoading, setPartnersLoading] = useState(true);
  const [partnersError, setPartnersError] = useState<string | null>(null);
  const partnersRef = useRef<Partner[]>([]);
  const [services, setServices] = useState<ServiceTicket[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const servicesRef = useRef<ServiceTicket[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const refreshProducts = useCallback(async () => {
    setProductsLoading(true);
    setProductsError(null);
    try {
      const loaded = await fetchProducts();
      setProducts(loaded);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal memuat produk.";
      setProductsError(message);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshProducts();
  }, [refreshProducts]);

  const refreshCustomers = useCallback(async () => {
    setCustomersLoading(true);
    setCustomersError(null);
    try {
      const loaded = await fetchCustomers();
      setCustomers(loaded);
      customersRef.current = loaded;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal memuat pelanggan.";
      setCustomersError(message);
    } finally {
      setCustomersLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshCustomers();
  }, [refreshCustomers]);

  const refreshPartners = useCallback(async () => {
    setPartnersLoading(true);
    setPartnersError(null);
    try {
      const loaded = await fetchPartners();
      setPartners(loaded);
      partnersRef.current = loaded;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal memuat mitra.";
      setPartnersError(message);
    } finally {
      setPartnersLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshPartners();
  }, [refreshPartners]);

  const refreshServices = useCallback(async () => {
    setServicesLoading(true);
    setServicesError(null);
    try {
      const loaded = await fetchServices();
      setServices(loaded);
      servicesRef.current = loaded;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal memuat tiket servis.";
      setServicesError(message);
    } finally {
      setServicesLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshServices();
  }, [refreshServices]);

  const refreshTransactions = useCallback(async () => {
    setTransactionsLoading(true);
    setTransactionsError(null);
    try {
      const loaded = await fetchTransactions();
      setTransactions(loaded);
      transactionsRef.current = loaded;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal memuat riwayat transaksi.";
      setTransactionsError(message);
    } finally {
      setTransactionsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshTransactions();
  }, [refreshTransactions]);

  useEffect(() => {
    transactionsRef.current = transactions;
  }, [transactions]);

  useEffect(() => {
    debtsRef.current = debts;
  }, [debts]);

  useEffect(() => {
    customersRef.current = customers;
  }, [customers]);

  useEffect(() => {
    partnersRef.current = partners;
  }, [partners]);

  useEffect(() => {
    servicesRef.current = services;
  }, [services]);

  const login = useCallback((username: string, password: string): boolean => {
    const account = HARDCODED_ACCOUNTS.find(
      (entry) =>
        entry.username === username.trim() && entry.password === password,
    );
    if (!account) return false;

    setCurrentUser({
      username: account.username,
      role: account.role,
    });
    return true;
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
  }, []);

  const addProduct = useCallback(async (product: ProductInput): Promise<Product> => {
    const id = createNextProductId(products);
    const created = await insertProductToDb({ id, ...product });
    setProducts((prev) => [...prev, created]);
    return created;
  }, [products]);

  const importProducts = useCallback(async (items: ProductInput[]) => {
    if (items.length === 0) return;
    const created: Product[] = [];
    let nextProducts = [...products];
    for (const item of items) {
      const id = createNextProductId(nextProducts);
      const row = await insertProductToDb({ id, ...item });
      created.push(row);
      nextProducts = [...nextProducts, row];
    }
    setProducts((prev) => [...prev, ...created]);
  }, [products]);

  const updateProduct = useCallback(async (id: string, updates: ProductInput) => {
    const updated = await updateProductInDb(id, updates);
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? updated : p)),
    );
  }, []);

  const deleteProduct = useCallback(async (id: string) => {
    await deleteProductFromDb(id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const deleteMultipleProducts = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    await deleteProductsFromDb(ids);
    const idSet = new Set(ids);
    setProducts((prev) => prev.filter((p) => !idSet.has(p.id)));
  }, []);

  const clearAllProducts = useCallback(async () => {
    await clearAllProductsFromDb();
    setProducts([]);
  }, []);

  const reduceStock = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) return;
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? { ...p, stock: Math.max(0, p.stock - quantity) }
          : p,
      ),
    );
  }, []);

  const addTransaction = useCallback((transaction: Transaction) => {
    setTransactions((prev) => {
      const next = [transaction, ...prev];
      transactionsRef.current = next;
      return next;
    });
  }, []);

  const addDebt = useCallback((debtData: DebtInput): Debt => {
    const validationError = validateDebtInput(debtData);
    if (validationError) {
      throw new Error(validationError);
    }

    const created = buildDebtFromInput(debtsRef.current, debtData);
    const nextDebts = [created, ...debtsRef.current];
    debtsRef.current = nextDebts;
    setDebts(nextDebts);
    return created;
  }, []);

  const registerDebt = useCallback((debt: Debt) => {
    const nextDebts = [debt, ...debtsRef.current];
    debtsRef.current = nextDebts;
    setDebts(nextDebts);
  }, []);

  const payDebt = useCallback(
    (debtId: string, paymentAmount: number, note?: string) => {
      if (paymentAmount <= 0) return;

      let appliedAmount = 0;

      setDebts((prev) => {
        const next = prev.map((debt) => {
          if (debt.id !== debtId) return debt;

          const amount = Math.min(paymentAmount, debt.remainingAmount);
          if (amount <= 0) return debt;

          appliedAmount = amount;
          const paidAmount = debt.paidAmount + amount;
          const remainingAmount = Math.max(0, debt.totalAmount - paidAmount);

          return {
            ...debt,
            paidAmount,
            remainingAmount,
            status: computeDebtStatus(debt.totalAmount, paidAmount),
            paymentHistory: [
              ...debt.paymentHistory,
              {
                id: generatePaymentLogId(),
                date: new Date().toISOString(),
                amount,
                note,
              },
            ],
          };
        });
        debtsRef.current = next;
        return next;
      });

      if (appliedAmount > 0) {
        setTransactions((prev) =>
          prev.map((tx) =>
            tx.debtId === debtId
              ? { ...tx, nominalBayar: tx.nominalBayar + appliedAmount }
              : tx,
          ),
        );
      }
    },
    [],
  );

  const rememberCustomer = useCallback((customer: Customer) => {
    setCustomers((prev) => {
      const idx = prev.findIndex((c) => c.id === customer.id);
      const next =
        idx >= 0
          ? prev.map((c, i) => (i === idx ? { ...c, ...customer } : c))
          : [customer, ...prev];
      customersRef.current = next;
      return next;
    });
  }, []);

  const addCustomer = useCallback(
    async (customerData: CustomerInput): Promise<Customer> => {
      const validationError = validateCustomerInput(customerData);
      if (validationError) {
        throw new Error(validationError);
      }

      const saved = await upsertCustomerByContact({
        name: customerData.name,
        phone: customerData.phone,
        address: customerData.address,
      });

      const merged: Customer = {
        ...saved,
        code: customerData.code?.trim() || saved.code,
        type: customerData.type,
        creditLimit:
          customerData.creditLimit != null &&
          Number.isFinite(customerData.creditLimit)
            ? Math.max(0, customerData.creditLimit)
            : saved.creditLimit,
      };

      rememberCustomer(merged);
      return merged;
    },
    [rememberCustomer],
  );

  const updateCustomer = useCallback(
    async (id: string, customerData: CustomerInput) => {
      const validationError = validateCustomerInput(customerData);
      if (validationError) {
        throw new Error(validationError);
      }

      const existing = customersRef.current.find((c) => c.id === id);
      if (!existing) {
        throw new Error("Pelanggan tidak ditemukan.");
      }

      const updated = applyCustomerUpdate(existing, customerData);
      const saved = await updateCustomerInDb(id, {
        name: updated.name,
        phone: updated.phone,
        address: updated.address,
      });

      const merged: Customer = {
        ...saved,
        code: updated.code,
        type: updated.type,
        creditLimit: updated.creditLimit,
      };

      setCustomers((prev) => {
        const next = prev.map((customer) =>
          customer.id === id ? merged : customer,
        );
        customersRef.current = next;
        return next;
      });
    },
    [],
  );

  const deleteCustomer = useCallback(async (id: string) => {
    const hasOpenDebt = debtsRef.current.some(
      (debt) =>
        debt.customerId === id &&
        debt.remainingAmount > 0 &&
        debt.status !== "PAID",
    );
    if (hasOpenDebt) {
      throw new Error(
        "Pelanggan masih memiliki sisa utang. Lunasi terlebih dahulu sebelum menghapus.",
      );
    }

    await deleteCustomerFromDb(id);

    setCustomers((prev) => {
      const next = prev.filter((c) => c.id !== id);
      customersRef.current = next;
      return next;
    });
  }, []);

  const upsertCustomerFromContact = useCallback(
    async (
      name: string,
      phone: string,
      options?: { address?: string },
    ): Promise<Customer> => {
      const saved = await upsertCustomerByContact({
        name,
        phone,
        address: options?.address,
      });

      rememberCustomer(saved);
      return saved;
    },
    [rememberCustomer],
  );

  const applyServiceChange = useCallback(
    async (
      serviceId: string,
      updater: (ticket: ServiceTicket) => ServiceTicket,
    ): Promise<ServiceTicket> => {
      const current = servicesRef.current.find((s) => s.id === serviceId);
      if (!current) throw new Error("Tiket servis tidak ditemukan.");

      const nextTicket = updater(current);
      const next = servicesRef.current.map((ticket) =>
        ticket.id === serviceId ? nextTicket : ticket,
      );
      servicesRef.current = next;
      setServices(next);

      try {
        await updateServiceInDb(nextTicket);
        await refreshServices();
      } catch (error) {
        await refreshServices();
        throw error;
      }

      return (
        servicesRef.current.find((s) => s.id === serviceId) ?? nextTicket
      );
    },
    [refreshServices],
  );

  const addPartner = useCallback(
    async (partnerData: PartnerInput): Promise<Partner> => {
      const validationError = validatePartnerInput(partnerData);
      if (validationError) {
        throw new Error(validationError);
      }

      const created = buildPartnerFromInput(partnersRef.current, partnerData);
      const saved = await insertPartnerToDb(created);
      await refreshPartners();
      return saved;
    },
    [refreshPartners],
  );

  const updatePartner = useCallback(
    async (id: string, partnerData: PartnerInput) => {
      const validationError = validatePartnerInput(partnerData);
      if (validationError) {
        throw new Error(validationError);
      }

      await updatePartnerInDb(id, {
        name: partnerData.name.trim(),
        phone: partnerData.phone.trim(),
        address: partnerData.address.trim(),
      });
      await refreshPartners();
    },
    [refreshPartners],
  );

  const deletePartner = useCallback(
    async (id: string) => {
      const hasActiveService = servicesRef.current.some(
        (ticket) =>
          ticket.partnerId === id &&
          ticket.handlingType === "PARTNER" &&
          ticket.status !== "COMPLETED" &&
          ticket.status !== "CANCELLED",
      );
      if (hasActiveService) {
        throw new Error(
          "Mitra masih memiliki tiket servis aktif. Selesaikan terlebih dahulu.",
        );
      }

      await deletePartnerFromDb(id);
      await refreshPartners();
    },
    [refreshPartners],
  );

  const addService = useCallback(
    async (serviceData: ServiceTicketInput): Promise<ServiceTicket> => {
      const validationError = validateServiceInput(serviceData);
      if (validationError) {
        throw new Error(validationError);
      }

      await upsertCustomerFromContact(
        serviceData.customerName,
        serviceData.customerPhone,
      );

      // Ambil nomor tiket baru secara dinamis dari database
      const ticketNo = await getNextServiceTicketNo();

      const built = buildServiceFromInput(servicesRef.current, serviceData, {
        ticketNo,
      });

      const created = await insertServiceTicket(built);
      await refreshServices();
      return created;
    },
    [refreshServices, upsertCustomerFromContact],
  );
  const updateService = useCallback(
    async (id: string, updates: Partial<ServiceTicket>) => {
      await applyServiceChange(id, (ticket) => {
        const next = {
          ...ticket,
          ...updates,
          id: ticket.id,
          ticketNo: ticket.ticketNo,
          createdAt: ticket.createdAt,
          updatedAt: new Date().toISOString(),
        };
        const sparepartCost = next.sparepartCost ?? 0;
        next.netProfit = computeServiceNetProfit(
          next.customerFee,
          next.partnerFee,
          sparepartCost,
        );
        return next;
      });
    },
    [applyServiceChange],
  );

  const deleteService = useCallback(
    async (id: string) => {
      await deleteServiceFromDb(id);
      await refreshServices();
    },
    [refreshServices],
  );

  const sendServiceToPartner = useCallback(
    async (serviceId: string) => {
      const ticket = servicesRef.current.find((s) => s.id === serviceId);
      if (!ticket) throw new Error("Tiket servis tidak ditemukan.");
      if (ticket.handlingType !== "PARTNER") {
        throw new Error("Tiket ini bukan penanganan mitra.");
      }
      if (!ticket.partnerId) {
        throw new Error("Mitra belum dipilih.");
      }

      await applyServiceChange(serviceId, (current) => ({
        ...current,
        partnerStatus: "IN_TRANSIT",
        status: current.status === "QUEUED" ? "PROCESSING" : current.status,
        updatedAt: new Date().toISOString(),
      }));
    },
    [applyServiceChange],
  );

  const confirmPartnerReceived = useCallback(
    async (serviceId: string) => {
      const ticket = servicesRef.current.find((s) => s.id === serviceId);
      if (!ticket) throw new Error("Tiket servis tidak ditemukan.");
      if (ticket.partnerStatus !== "IN_TRANSIT") {
        throw new Error("Unit belum dalam status pengiriman.");
      }

      await applyServiceChange(serviceId, (current) => ({
        ...current,
        partnerStatus: "RECEIVED_BY_PARTNER",
        status: "PROCESSING",
        updatedAt: new Date().toISOString(),
      }));
    },
    [applyServiceChange],
  );

  const updateServicePartnerFee = useCallback(
    async (serviceId: string, partnerFee: number, status?: ServiceStatus) => {
      if (!Number.isFinite(partnerFee) || partnerFee < 0) {
        throw new Error("Biaya mitra harus angka ≥ 0.");
      }

      await applyServiceChange(serviceId, (ticket) => {
        const sparepartCost = ticket.sparepartCost ?? 0;
        return {
          ...ticket,
          partnerFee,
          status: status ?? ticket.status,
          netProfit: computeServiceNetProfit(
            ticket.customerFee,
            partnerFee,
            sparepartCost,
          ),
          updatedAt: new Date().toISOString(),
        };
      });
    },
    [applyServiceChange],
  );

  const markServiceRepaired = useCallback(
    async (serviceId: string) => {
      await applyServiceChange(serviceId, (ticket) => ({
        ...ticket,
        partnerStatus: "REPAIRED" as PartnerStatus,
        status: "PROCESSING",
        updatedAt: new Date().toISOString(),
      }));
    },
    [applyServiceChange],
  );

  const sendServiceReturnToStore = useCallback(
    async (serviceId: string) => {
      const ticket = servicesRef.current.find((s) => s.id === serviceId);
      if (!ticket) throw new Error("Tiket servis tidak ditemukan.");
      if (
        ticket.partnerStatus !== "REPAIRED" &&
        ticket.partnerStatus !== "RECEIVED_BY_PARTNER"
      ) {
        throw new Error("Unit belum siap dikirim balik ke toko utama.");
      }

      await applyServiceChange(serviceId, (current) => ({
        ...current,
        partnerStatus: "RETURN_IN_TRANSIT",
        updatedAt: new Date().toISOString(),
      }));
    },
    [applyServiceChange],
  );

  const confirmServiceReturned = useCallback(
    async (serviceId: string) => {
      const ticket = servicesRef.current.find((s) => s.id === serviceId);
      if (!ticket) throw new Error("Tiket servis tidak ditemukan.");
      if (ticket.partnerStatus !== "RETURN_IN_TRANSIT") {
        throw new Error("Unit belum dalam pengembalian dari mitra.");
      }

      await applyServiceChange(serviceId, (current) => ({
        ...current,
        partnerStatus: "RETURNED_TO_STORE",
        status: "COMPLETED",
        updatedAt: new Date().toISOString(),
      }));
    },
    [applyServiceChange],
  );

  const collectServicePayment = useCallback(
    async (
      serviceId: string,
      options: {
        paymentMethod: PaymentMethod;
        nominalBayar: number;
        customerFeeOverride?: number;
      },
    ): Promise<Transaction> => {
      const ticket = servicesRef.current.find((s) => s.id === serviceId);
      if (!ticket) throw new Error("Tiket servis tidak ditemukan.");
      if (ticket.isPaid) {
        throw new Error("Unit ini sudah dilunasi dan diambil.");
      }
      if (ticket.status !== "COMPLETED") {
        throw new Error(
          "Unit belum berstatus Selesai / Siap Diambil. Selesaikan pengerjaan dulu.",
        );
      }

      const customerFee =
        options.customerFeeOverride != null
          ? options.customerFeeOverride
          : ticket.isComplaint
            ? 0
            : ticket.customerFee;

      if (ticket.isComplaint && customerFee > 0) {
        throw new Error(
          "Unit komplain/garansi tidak boleh dikenakan ongkos pelanggan (anti double-payment).",
        );
      }

      if (!Number.isFinite(customerFee) || customerFee < 0) {
        throw new Error("Biaya pelanggan tidak valid.");
      }

      if (
        options.paymentMethod === "CASH" &&
        customerFee > 0 &&
        options.nominalBayar < customerFee
      ) {
        throw new Error("Nominal bayar kurang dari biaya servis.");
      }

      const sparepartCost = ticket.sparepartCost ?? 0;
      const partnerFee = ticket.partnerFee;
      const netProfit = computeServiceNetProfit(
        customerFee,
        partnerFee,
        sparepartCost,
      );
      const now = new Date().toISOString();
      const invoiceId = await generateServicePaymentInvoiceNumberFromDb();
      const kembalian =
        options.paymentMethod === "CASH"
          ? Math.max(0, options.nominalBayar - customerFee)
          : 0;
      const nominalBayar =
        options.paymentMethod === "CASH"
          ? options.nominalBayar
          : customerFee;

      const newTransaction: Transaction = {
        id: invoiceId,
        timestamp: now,
        type: "SERVICE",
        items: [
          {
            productId: ticket.id,
            productName: ticket.isComplaint
              ? `Ambil Unit Komplain — ${ticket.deviceName} (${ticket.ticketNo})`
              : `Pelunasan Servis — ${ticket.deviceName} (${ticket.ticketNo})`,
            quantity: 1,
            unitPrice: customerFee,
          },
        ],
        totalHarga: customerFee,
        nominalBayar,
        kembalian,
        paymentMethod: options.paymentMethod,
        customerName: ticket.customerName,
        customerPhone: ticket.customerPhone,
        serviceTicketId: ticket.id,
        serviceTicketNo: ticket.ticketNo,
        servicePartnerFee: partnerFee,
        serviceSparepartCost: sparepartCost,
        serviceNetProfit: netProfit,
      };

      await saveRetailTransaction({
        transaction: newTransaction,
        items: newTransaction.items,
        stockUpdates: [],
      });

      await applyServiceChange(serviceId, (current) => ({
        ...current,
        customerFee,
        sparepartCost,
        netProfit,
        isPaid: true,
        paymentTransactionId: invoiceId,
        collectedAt: now,
        status: "COMPLETED",
        updatedAt: now,
      }));

      await refreshTransactions();
      return newTransaction;
    },
    [applyServiceChange, refreshTransactions],
  );

  const value = useMemo(
    () => ({
      products,
      productsLoading,
      productsError,
      refreshProducts,
      transactions,
      transactionsLoading,
      transactionsError,
      refreshTransactions,
      debts,
      customers,
      customersLoading,
      customersError,
      refreshCustomers,
      currentUser,
      login,
      logout,
      addProduct,
      importProducts,
      updateProduct,
      deleteProduct,
      deleteMultipleProducts,
      clearAllProducts,
      reduceStock,
      addTransaction,
      addDebt,
      registerDebt,
      payDebt,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      upsertCustomerFromContact,
      rememberCustomer,
      partners,
      partnersLoading,
      partnersError,
      refreshPartners,
      services,
      servicesLoading,
      servicesError,
      refreshServices,
      addPartner,
      updatePartner,
      deletePartner,
      addService,
      updateService,
      deleteService,
      sendServiceToPartner,
      confirmPartnerReceived,
      updateServicePartnerFee,
      markServiceRepaired,
      sendServiceReturnToStore,
      confirmServiceReturned,
      collectServicePayment,
    }),
    [
      products,
      productsLoading,
      productsError,
      refreshProducts,
      transactions,
      transactionsLoading,
      transactionsError,
      refreshTransactions,
      debts,
      customers,
      customersLoading,
      customersError,
      refreshCustomers,
      currentUser,
      login,
      logout,
      addProduct,
      importProducts,
      updateProduct,
      deleteProduct,
      deleteMultipleProducts,
      clearAllProducts,
      reduceStock,
      addTransaction,
      addDebt,
      registerDebt,
      payDebt,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      upsertCustomerFromContact,
      rememberCustomer,
      partners,
      partnersLoading,
      partnersError,
      refreshPartners,
      services,
      servicesLoading,
      servicesError,
      refreshServices,
      addPartner,
      updatePartner,
      deletePartner,
      addService,
      updateService,
      deleteService,
      sendServiceToPartner,
      confirmPartnerReceived,
      updateServicePartnerFee,
      markServiceRepaired,
      sendServiceReturnToStore,
      confirmServiceReturned,
      collectServicePayment,
    ],
  );

  return (
    <AppContext.Provider value={value}>{children}</AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp harus dipakai di dalam AppProvider");
  }
  return context;
}
