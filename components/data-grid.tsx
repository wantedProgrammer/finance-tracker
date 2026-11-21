"use client";

import { useSearchParams } from "next/navigation";
import { PiggyBank, TrendingDown, TrendingUp } from "lucide-react";

import { formatDateRange } from "@/lib/utils";
import { useGetSummary } from "@/features/summary/api/use-get-summary";
import { DataCard, DataCardLoading } from "@/components/data-card";

export const DataGrid = () => {
    const { data, isLoading } = useGetSummary();

    const params = useSearchParams();
    const to = params.get("to") || undefined;
    const from = params.get("from") || undefined;

    const dateRangeLabel = formatDateRange({ to, from });

    // No money in or out last period: comparisons would all read "Up 100%", so skip them.
    const hasPreviousData =
      (data?.previousIncomeAmount ?? 0) !== 0 || (data?.previousExpensesAmount ?? 0) !== 0;

    // Remaining is the hero (half the row on desktop); income and expenses support it.
    const gridClass = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 lg:gap-8 pb-2 mb-8";
    const heroClass = "md:col-span-2 lg:col-span-6";
    const sideClass = "lg:col-span-3";

    if (isLoading) {
        return (
            <div className={gridClass}>
                <div className={heroClass}><DataCardLoading size="hero" /></div>
                <div className={sideClass}><DataCardLoading /></div>
                <div className={sideClass}><DataCardLoading /></div>
            </div>
        );
    }

    return (
        <div className={gridClass}>
            <div className={heroClass}>
                <DataCard
                  title="Remaining"
                  value={data?.remainingAmount}
                  percentageChange={data?.remainingChange}
                  previousValue={data?.previousRemainingAmount}
                  icon={PiggyBank}
                  variant="highlight"
                  size="hero"
                  dateRange={dateRangeLabel}
                  hasPreviousData={hasPreviousData}
                />
            </div>
            <div className={sideClass}>
                <DataCard
                  title="Income"
                  value={data?.incomeAmount}
                  percentageChange={data?.incomeChange}
                  icon={TrendingUp}
                  variant="success"
                  dateRange={dateRangeLabel}
                  hasPreviousData={hasPreviousData}
                />
            </div>
            <div className={sideClass}>
                {/* Shown as a positive amount: the label already says it's spending. */}
                <DataCard
                  title="Expenses"
                  value={Math.abs(data?.expensesAmount ?? 0)}
                  percentageChange={data?.expensesChange}
                  icon={TrendingDown}
                  variant="danger"
                  invertColors
                  dateRange={dateRangeLabel}
                  hasPreviousData={hasPreviousData}
                />
            </div>
        </div>
    );
};
