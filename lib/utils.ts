import { clsx, type ClassValue } from "clsx"
import { Currency } from "lucide-react";
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function convertAmountFromMiliUnits(amount: number) {
  return amount/1000;
};

export function convertAmountToMiliUnits(amount: number) {
  return Math.round(amount * 1000);
};

export function formatCurrency(value: number) {
  return Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "ZAR",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 2,
  }).format(value);
};