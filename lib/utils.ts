import { clsx, type ClassValue } from "clsx"
import { Currency } from "lucide-react";
import { twMerge } from "tailwind-merge"
import { eachDayOfInterval, format, isSameDay, parse, subDays } from "date-fns";

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
  // From zero, report a full 100% move in whichever direction the value went.
  if (previous === 0) {
    if (current === 0) return 0;
    return current > 0 ? 100 : -100;
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

export function formatPercentage(
  value: number,
  options: { addPrefix?: boolean } = { addPrefix: false },
) {
  const result = new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value / 100);

  if (options.addPrefix && value > 0) {
    return `+${result}`;
  }

  return result;
};

type Period = {
  from?: string | Date;
  to?: string | Date;
};

// "1 Nov – 30 Nov 2026". Defaults to the last 30 days, same as the API.
export function formatDateRange(period?: Period) {
  const toDate = (value: string | Date) =>
    typeof value === "string" ? parse(value, "yyyy-MM-dd", new Date()) : value;

  const defaultTo = new Date();
  const defaultFrom = subDays(defaultTo, 30);

  const from = period?.from ? toDate(period.from) : defaultFrom;
  const to = period?.to ? toDate(period.to) : defaultTo;

  if (from.getFullYear() === to.getFullYear()) {
    return `${format(from, "d MMM")} – ${format(to, "d MMM yyyy")}`;
  }

  return `${format(from, "d MMM yyyy")} – ${format(to, "d MMM yyyy")}`;
};
