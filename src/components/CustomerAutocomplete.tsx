"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { searchCustomers as searchCustomersInDb } from "@/lib/supabase-db";
import { dedupeCustomers } from "@/lib/customer";
import { INPUT_CLASS } from "@/lib/ui-classes";
import { useApp } from "@/src/context/AppContext";
import type { Customer } from "@/types/customer";

interface CustomerAutocompleteProps {
  name: string;
  phone: string;
  onNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onCustomerSelect?: (customer: Customer) => void;
  nameLabel?: string;
  phoneLabel?: string;
  namePlaceholder?: string;
  phonePlaceholder?: string;
  nameRequired?: boolean;
  phoneRequired?: boolean;
  inputClassName?: string;
  labelClassName?: string;
  layout?: "stack" | "grid";
}

export default function CustomerAutocomplete({
  name,
  phone,
  onNameChange,
  onPhoneChange,
  onCustomerSelect,
  nameLabel = "Nama Pelanggan",
  phoneLabel = "No. HP",
  namePlaceholder = "Nama lengkap pelanggan",
  phonePlaceholder = "08xxxxxxxxxx",
  nameRequired = false,
  phoneRequired = false,
  inputClassName = INPUT_CLASS,
  labelClassName = "text-xs font-medium text-slate-600",
  layout = "stack",
}: CustomerAutocompleteProps) {
  const { customers, rememberCustomer } = useApp();
  const [activeField, setActiveField] = useState<"name" | "phone" | null>(
    null,
  );
  const [remoteResults, setRemoteResults] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const query =
    activeField === "name" ? name : activeField === "phone" ? phone : "";

  const localResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return customers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q),
      )
      .slice(0, 10);
  }, [customers, query]);

  const suggestions = useMemo(
    () => dedupeCustomers([...localResults, ...remoteResults]).slice(0, 10),
    [localResults, remoteResults],
  );
  const showDropdown =
    activeField !== null && query.trim().length >= 2 && suggestions.length > 0;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = query.trim();
    if (q.length < 2) {
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
  }, [query]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [suggestions]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setActiveField(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectCustomer = useCallback(
    (customer: Customer) => {
      rememberCustomer(customer);
      onNameChange(customer.name);
      onPhoneChange(customer.phone);
      onCustomerSelect?.(customer);
      setActiveField(null);
      setRemoteResults([]);
    },
    [rememberCustomer, onNameChange, onPhoneChange, onCustomerSelect],
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && suggestions[highlightIndex]) {
      e.preventDefault();
      selectCustomer(suggestions[highlightIndex]);
    } else if (e.key === "Escape") {
      setActiveField(null);
    }
  }

  const suggestionList = showDropdown ? (
    <div
      role="listbox"
      className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg"
    >
      {isSearching && (
        <p className="px-3 py-2 text-xs text-slate-400">Mencari…</p>
      )}
      {suggestions.map((customer, index) => (
        <button
          key={customer.id}
          type="button"
          role="option"
          aria-selected={index === highlightIndex}
          className={`flex w-full flex-col px-3 py-2 text-left text-sm transition hover:bg-indigo-50 ${
            index === highlightIndex ? "bg-indigo-50" : ""
          }`}
          onMouseDown={(e) => {
            e.preventDefault();
            selectCustomer(customer);
          }}
        >
          <span className="font-medium text-slate-800">{customer.name}</span>
          <span className="text-xs text-slate-500">{customer.phone}</span>
          {customer.address && (
            <span className="text-xs text-slate-400">{customer.address}</span>
          )}
        </button>
      ))}
    </div>
  ) : null;

  const nameField = (
    <label className={`relative block ${labelClassName}`}>
      {nameLabel}
      {nameRequired && " *"}
      <input
        type="text"
        className={`${inputClassName} mt-1`}
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        onFocus={() => setActiveField("name")}
        onKeyDown={handleKeyDown}
        placeholder={namePlaceholder}
        required={nameRequired}
        autoComplete="off"
      />
      {activeField === "name" ? suggestionList : null}
    </label>
  );

  const phoneField = (
    <label className={`relative block ${labelClassName}`}>
      {phoneLabel}
      {phoneRequired && " *"}
      <input
        type="tel"
        className={`${inputClassName} mt-1`}
        value={phone}
        onChange={(e) => onPhoneChange(e.target.value)}
        onFocus={() => setActiveField("phone")}
        onKeyDown={handleKeyDown}
        placeholder={phonePlaceholder}
        required={phoneRequired}
        autoComplete="off"
      />
      {activeField === "phone" ? suggestionList : null}
    </label>
  );

  return (
    <div
      ref={containerRef}
      className={
        layout === "grid" ? "grid gap-3 sm:grid-cols-2" : "space-y-3"
      }
    >
      {nameField}
      {phoneField}
    </div>
  );
}
