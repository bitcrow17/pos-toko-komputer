"use client";

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
import { mockCustomers, mockPartners, mockProducts, mockServices } from "@/src/data/mockData";
import { createNextProductId } from "@/lib/admin-product";
import {
  applyCustomerUpdate,
  buildCustomerFromInput,
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
import { generateServicePaymentInvoiceNumber } from "@/lib/transaction";

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
  transactions: Transaction[];
  debts: Debt[];
  customers: Customer[];
  currentUser: CurrentUser | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  addProduct: (product: ProductInput) => void;
  importProducts: (products: ProductInput[]) => void;
  updateProduct: (id: string, updates: ProductInput) => void;
  deleteProduct: (id: string) => void;
  deleteMultipleProducts: (ids: string[]) => void;
  clearAllProducts: () => void;
  reduceStock: (productId: string, quantity: number) => void;
  addTransaction: (transaction: Transaction) => void;
  addDebt: (debtData: DebtInput) => Debt;
  payDebt: (debtId: string, paymentAmount: number, note?: string) => void;
  addCustomer: (customerData: CustomerInput) => Customer;
  updateCustomer: (id: string, customerData: CustomerInput) => void;
  deleteCustomer: (id: string) => void;
  partners: Partner[];
  services: ServiceTicket[];
  addPartner: (partnerData: PartnerInput) => Partner;
  updatePartner: (id: string, partnerData: PartnerInput) => void;
  deletePartner: (id: string) => void;
  addService: (serviceData: ServiceTicketInput) => ServiceTicket;
  updateService: (id: string, updates: Partial<ServiceTicket>) => void;
  deleteService: (id: string) => void;
  sendServiceToPartner: (serviceId: string) => void;
  confirmPartnerReceived: (serviceId: string) => void;
  updateServicePartnerFee: (
    serviceId: string,
    partnerFee: number,
    status?: ServiceStatus,
  ) => void;
  markServiceRepaired: (serviceId: string) => void;
  sendServiceReturnToStore: (serviceId: string) => void;
  confirmServiceReturned: (serviceId: string) => void;
  /** Pelunasan pengambilan unit di kasir — catat kas SERVICE + tandai lunas */
  collectServicePayment: (
    serviceId: string,
    options: {
      paymentMethod: PaymentMethod;
      nominalBayar: number;
      customerFeeOverride?: number;
    },
  ) => Transaction;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(() =>
    mockProducts.map((p) => ({ ...p })),
  );
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const transactionsRef = useRef<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const debtsRef = useRef<Debt[]>([]);
  const [customers, setCustomers] = useState<Customer[]>(() =>
    mockCustomers.map((c) => ({ ...c })),
  );
  const customersRef = useRef<Customer[]>(customers);
  const [partners, setPartners] = useState<Partner[]>(() =>
    mockPartners.map((p) => ({ ...p })),
  );
  const partnersRef = useRef<Partner[]>(partners);
  const [services, setServices] = useState<ServiceTicket[]>(() =>
    mockServices.map((s) => ({ ...s })),
  );
  const servicesRef = useRef<ServiceTicket[]>(services);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

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

  const addProduct = useCallback((product: ProductInput) => {
    setProducts((prev) => [
      ...prev,
      { id: createNextProductId(prev), ...product },
    ]);
  }, []);

  const importProducts = useCallback((items: ProductInput[]) => {
    if (items.length === 0) return;
    setProducts((prev) => {
      const next = [...prev];
      for (const item of items) {
        next.push({ id: createNextProductId(next), ...item });
      }
      return next;
    });
  }, []);

  const updateProduct = useCallback((id: string, updates: ProductInput) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates, id } : p)),
    );
  }, []);

  const deleteProduct = useCallback((id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const deleteMultipleProducts = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    setProducts((prev) => prev.filter((p) => !idSet.has(p.id)));
  }, []);

  const clearAllProducts = useCallback(() => {
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

  const addCustomer = useCallback((customerData: CustomerInput): Customer => {
    const validationError = validateCustomerInput(customerData);
    if (validationError) {
      throw new Error(validationError);
    }

    const created = buildCustomerFromInput(customersRef.current, customerData);
    const next = [created, ...customersRef.current];
    customersRef.current = next;
    setCustomers(next);
    return created;
  }, []);

  const updateCustomer = useCallback(
    (id: string, customerData: CustomerInput) => {
      const validationError = validateCustomerInput(customerData);
      if (validationError) {
        throw new Error(validationError);
      }

      setCustomers((prev) => {
        const next = prev.map((customer) =>
          customer.id === id
            ? applyCustomerUpdate(customer, customerData)
            : customer,
        );
        customersRef.current = next;
        return next;
      });
    },
    [],
  );

  const deleteCustomer = useCallback((id: string) => {
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

    setCustomers((prev) => {
      const next = prev.filter((c) => c.id !== id);
      customersRef.current = next;
      return next;
    });
  }, []);

  const touchService = useCallback(
    (serviceId: string, updater: (ticket: ServiceTicket) => ServiceTicket) => {
      setServices((prev) => {
        const next = prev.map((ticket) =>
          ticket.id === serviceId ? updater(ticket) : ticket,
        );
        servicesRef.current = next;
        return next;
      });
    },
    [],
  );

  const addPartner = useCallback((partnerData: PartnerInput): Partner => {
    const validationError = validatePartnerInput(partnerData);
    if (validationError) {
      throw new Error(validationError);
    }

    const created = buildPartnerFromInput(partnersRef.current, partnerData);
    const next = [created, ...partnersRef.current];
    partnersRef.current = next;
    setPartners(next);
    return created;
  }, []);

  const updatePartner = useCallback((id: string, partnerData: PartnerInput) => {
    const validationError = validatePartnerInput(partnerData);
    if (validationError) {
      throw new Error(validationError);
    }

    setPartners((prev) => {
      const next = prev.map((partner) =>
        partner.id === id
          ? {
              ...partner,
              name: partnerData.name.trim(),
              phone: partnerData.phone.trim(),
              address: partnerData.address.trim(),
            }
          : partner,
      );
      partnersRef.current = next;
      return next;
    });
  }, []);

  const deletePartner = useCallback((id: string) => {
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

    setPartners((prev) => {
      const next = prev.filter((partner) => partner.id !== id);
      partnersRef.current = next;
      return next;
    });
  }, []);

  const addService = useCallback((serviceData: ServiceTicketInput): ServiceTicket => {
    const validationError = validateServiceInput(serviceData);
    if (validationError) {
      throw new Error(validationError);
    }

    const created = buildServiceFromInput(servicesRef.current, serviceData);
    const next = [created, ...servicesRef.current];
    servicesRef.current = next;
    setServices(next);
    return created;
  }, []);

  const updateService = useCallback(
    (id: string, updates: Partial<ServiceTicket>) => {
      touchService(id, (ticket) => {
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
    [touchService],
  );

  const deleteService = useCallback((id: string) => {
    setServices((prev) => {
      const next = prev.filter((ticket) => ticket.id !== id);
      servicesRef.current = next;
      return next;
    });
  }, []);

  const sendServiceToPartner = useCallback(
    (serviceId: string) => {
      const ticket = servicesRef.current.find((s) => s.id === serviceId);
      if (!ticket) throw new Error("Tiket servis tidak ditemukan.");
      if (ticket.handlingType !== "PARTNER") {
        throw new Error("Tiket ini bukan penanganan mitra.");
      }
      if (!ticket.partnerId) {
        throw new Error("Mitra belum dipilih.");
      }

      touchService(serviceId, (current) => ({
        ...current,
        partnerStatus: "IN_TRANSIT",
        status: current.status === "QUEUED" ? "PROCESSING" : current.status,
        updatedAt: new Date().toISOString(),
      }));
    },
    [touchService],
  );

  const confirmPartnerReceived = useCallback(
    (serviceId: string) => {
      const ticket = servicesRef.current.find((s) => s.id === serviceId);
      if (!ticket) throw new Error("Tiket servis tidak ditemukan.");
      if (ticket.partnerStatus !== "IN_TRANSIT") {
        throw new Error("Unit belum dalam status pengiriman.");
      }

      touchService(serviceId, (current) => ({
        ...current,
        partnerStatus: "RECEIVED_BY_PARTNER",
        status: "PROCESSING",
        updatedAt: new Date().toISOString(),
      }));
    },
    [touchService],
  );

  const updateServicePartnerFee = useCallback(
    (serviceId: string, partnerFee: number, status?: ServiceStatus) => {
      if (!Number.isFinite(partnerFee) || partnerFee < 0) {
        throw new Error("Biaya mitra harus angka ≥ 0.");
      }

      touchService(serviceId, (ticket) => {
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
    [touchService],
  );

  const markServiceRepaired = useCallback(
    (serviceId: string) => {
      touchService(serviceId, (ticket) => ({
        ...ticket,
        partnerStatus: "REPAIRED" as PartnerStatus,
        status: "PROCESSING",
        updatedAt: new Date().toISOString(),
      }));
    },
    [touchService],
  );

  const sendServiceReturnToStore = useCallback(
    (serviceId: string) => {
      const ticket = servicesRef.current.find((s) => s.id === serviceId);
      if (!ticket) throw new Error("Tiket servis tidak ditemukan.");
      if (
        ticket.partnerStatus !== "REPAIRED" &&
        ticket.partnerStatus !== "RECEIVED_BY_PARTNER"
      ) {
        throw new Error("Unit belum siap dikirim balik ke toko utama.");
      }

      touchService(serviceId, (current) => ({
        ...current,
        partnerStatus: "RETURN_IN_TRANSIT",
        updatedAt: new Date().toISOString(),
      }));
    },
    [touchService],
  );

  const confirmServiceReturned = useCallback(
    (serviceId: string) => {
      const ticket = servicesRef.current.find((s) => s.id === serviceId);
      if (!ticket) throw new Error("Tiket servis tidak ditemukan.");
      if (ticket.partnerStatus !== "RETURN_IN_TRANSIT") {
        throw new Error("Unit belum dalam pengembalian dari mitra.");
      }

      touchService(serviceId, (current) => ({
        ...current,
        partnerStatus: "RETURNED_TO_STORE",
        status: "COMPLETED",
        updatedAt: new Date().toISOString(),
      }));
    },
    [touchService],
  );

  const collectServicePayment = useCallback(
    (
      serviceId: string,
      options: {
        paymentMethod: PaymentMethod;
        nominalBayar: number;
        customerFeeOverride?: number;
      },
    ): Transaction => {
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
      const invoiceId = generateServicePaymentInvoiceNumber(
        transactionsRef.current,
      );
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

      const nextTransactions = [newTransaction, ...transactionsRef.current];
      transactionsRef.current = nextTransactions;
      setTransactions(nextTransactions);

      touchService(serviceId, (current) => ({
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

      return newTransaction;
    },
    [touchService],
  );

  const value = useMemo(
    () => ({
      products,
      transactions,
      debts,
      customers,
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
      payDebt,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      partners,
      services,
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
      transactions,
      debts,
      customers,
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
      payDebt,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      partners,
      services,
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
