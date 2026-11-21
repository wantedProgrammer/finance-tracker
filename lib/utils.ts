import { clsx, type ClassValue } from "clsx"
import { Currency } from "lucide-react";
import { twMerge } from "tailwind-merge"
import { eachDayOfInterval, isSameDay } from "date-fns";

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

export function calculatePercentageChange(
  current: number,
  previous: number,
) {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }

  // Divide by the absolute value so the sign shows the direction of change,
  // even when the previous value was negative.
  return ((current - previous) / Math.abs(previous)) * 100;
};

export function fillMissingDays(
  activeDays: {
    date: Date;
    income: number;
    expenses: number;
  }[],
  startDate: Date,
  endDate: Date,
) {
  const allDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  return allDays.map((day) => {
    const found = activeDays.find((d) => isSameDay(d.date, day));

    if (found) {
      return found;
    }

    return {
      date: day,
      income: 0,
      expenses: 0,
    };
  });
};
