"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { searchCustomers as searchCustomersInDb } from "@/lib/supabase-db";
import { dedupeCustomers } from "@/lib/customer";
import { INPUT_CLASS } from "@/lib/ui-classes";
import { useApp } from "@/src/context/AppContext";
import type { Customer } from "@/types/customer";

interface CustomerSearchPickerProps {
  selectedCustomerId: string;
  onSelect: (customer: Customer | null) => void;
  className?: string;
}

export default function CustomerSearchPicker({
  selectedCustomerId,
  onSelect,
  className = INPUT_CLASS,
}: CustomerSearchPickerProps) {
  const { customers, rememberCustomer } = useApp();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [remoteResults, setRemoteResults] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId],
  );

  useEffect(() => {
    if (selectedCustomer && !isOpen) {
      setQuery(selectedCustomer.name);
    } else if (!selectedCustomerId && !isOpen) {
      setQuery("");
    }
  }, [selectedCustomer, selectedCustomerId, isOpen]);

  const localResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 1) return customers.slice(0, 15);
    return customers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q),
      )
      .slice(0, 15);
  }, [customers, query]);

  const suggestions = useMemo(
    () => dedupeCustomers([...localResults, ...remoteResults]).slice(0, 15),
    [localResults, remoteResults],
  );
  const showDropdown = isOpen;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = query.trim();
    if (!isOpen || q.length < 2) {
      setRemoteResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(() => {
      void (async () => {
        try {
          const results = await searchCustomersInDb(q);
          setRemoteResults(results);
        } catch {
          setRemoteResults([]);
        } finally {
          setIsSearching(false);
        }
      })();
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, isOpen]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [suggestions]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        if (selectedCustomer) {
          setQuery(selectedCustomer.name);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedCustomer]);

  const pickCustomer = useCallback(
    (customer: Customer | null) => {
      if (customer) rememberCustomer(customer);
      onSelect(customer);
      setQuery(customer?.name ?? "");
      setIsOpen(false);
      setRemoteResults([]);
    },
    [onSelect, rememberCustomer],
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, suggestions.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIndex === 0) {
        pickCustomer(null);
      } else {
        pickCustomer(suggestions[highlightIndex - 1]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  }

  const dropdownItems: (Customer | null)[] = [null, ...suggestions];

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        className={className}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
          if (!e.target.value.trim()) {
            onSelect(null);
          }
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Cari pelanggan…"
        autoComplete="off"
        aria-expanded={showDropdown}
        aria-haspopup="listbox"
      />

      {showDropdown && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg"
        >
          {isSearching && (
            <p className="px-3 py-2 text-xs text-slate-400">Mencari…</p>
          )}
          {dropdownItems.map((customer, index) => (
            <button
              key={customer?.id ?? "general"}
              type="button"
              role="option"
              aria-selected={index === highlightIndex}
              className={`flex w-full flex-col px-3 py-2 text-left text-sm transition hover:bg-indigo-50 ${
                index === highlightIndex ? "bg-indigo-50" : ""
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                pickCustomer(customer);
              }}
            >
              {customer ? (
                <>
                  <span className="font-medium text-slate-800">
                    {customer.name}
                  </span>
                  <span className="text-xs text-slate-500">
                    {customer.phone}
                    {customer.address ? ` · ${customer.address}` : ""}
                  </span>
                </>
              ) : (
                <span className="font-medium text-slate-500">
                  Pelanggan Umum
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
