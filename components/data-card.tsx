"use client";

import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import CountUp from "react-countup";

import { cn, formatCurrency, formatPercentage } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const boxVariant = cva(
    "shrink-0 rounded-full flex items-center justify-center",
    {
        variants: {
            variant: {
                default: "bg-brand/10",
                success: "bg-income/10",
                danger: "bg-expense/10",
                warning: "bg-yellow-500/10",
                highlight: "bg-highlight/15",
            },
            size: {
                default: "size-7",
                hero: "size-8",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    },
);

const iconVariant = cva(
    "size-4",
    {
        variants: {
            variant: {
                default: "text-brand",
                success: "text-income",
                danger: "text-expense",
                warning: "text-yellow-500",
                highlight: "text-highlight",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    },
);

type BoxVariants = VariantProps<typeof boxVariant>;
type IconVariants = VariantProps<typeof iconVariant>;

interface DataCardProps extends BoxVariants, IconVariants {
    icon: LucideIcon;
    title: string;
    value?: number;
    dateRange: string;
    percentageChange?: number;
    // For values where going up is bad (expenses): "up" shows red, "down" green.
    invertColors?: boolean;
    // When given, the hero card spells out the difference in rand instead of a percentage.
    previousValue?: number;
    // False when the previous period had no transactions, so a comparison would be meaningless
    // (everything would read "Up 100%").
    hasPreviousData?: boolean;
};

const NoPreviousData = () => (
    <p className="flex flex-wrap items-center gap-x-1 text-sm text-muted-foreground">
        <Minus className="size-4 shrink-0" />
        No activity in the previous period
    </p>
);

// "R 1,200.00 more than the previous period" for the hero card.
const Comparison = ({
    value,
    previousValue,
    invertColors,
}: {
    value: number;
    previousValue: number;
    invertColors: boolean;
}) => {
    // Round to cents so floating point noise doesn't read as a change.
    const difference = Math.round((value - previousValue) * 100) / 100;

    const isGood = invertColors ? difference < 0 : difference > 0;
    const isBad = invertColors ? difference > 0 : difference < 0;
    const Icon = difference > 0 ? ArrowUpRight : difference < 0 ? ArrowDownRight : Minus;

    return (
        <p className="flex flex-wrap items-center gap-x-1 text-sm">
            <span className={cn(
                "inline-flex items-center gap-x-0.5 font-medium tabular-nums",
                isGood && "text-income-strong",
                isBad && "text-expense-strong",
                !isGood && !isBad && "text-muted-foreground",
            )}>
                <Icon className="size-4 shrink-0" />
                {difference === 0
                  ? "Same"
                  : `${formatCurrency(Math.abs(difference))} ${difference > 0 ? "more" : "less"}`}
            </span>
            <span className="text-muted-foreground">
                {difference === 0 ? "as the previous period" : "than the previous period"}
            </span>
        </p>
    );
};

// "Up 12% vs previous period" reads faster than "+12% from last period".
const Delta = ({
    percentageChange,
    invertColors,
}: {
    percentageChange: number;
    invertColors: boolean;
}) => {
    const isGood = invertColors ? percentageChange < 0 : percentageChange > 0;
    const isBad = invertColors ? percentageChange > 0 : percentageChange < 0;

    const Icon = percentageChange > 0 ? ArrowUpRight : percentageChange < 0 ? ArrowDownRight : Minus;
    const label = percentageChange > 0 ? "Up" : percentageChange < 0 ? "Down" : "No change";

    return (
        <p className="flex flex-wrap items-center gap-x-1 text-sm">
            <span className={cn(
                "inline-flex items-center gap-x-0.5 font-medium",
                isGood && "text-income-strong",
                isBad && "text-expense-strong",
                !isGood && !isBad && "text-muted-foreground",
            )}>
                <Icon className="size-4 shrink-0" />
                {label}
                {percentageChange !== 0 && ` ${formatPercentage(Math.abs(percentageChange))}`}
            </span>
            <span className="text-muted-foreground">vs previous period</span>
        </p>
    );
};

export const DataCard = ({
    icon: Icon,
    title,
    value = 0,
    variant,
    size,
    dateRange,
    percentageChange = 0,
    invertColors = false,
    previousValue,
    hasPreviousData = true,
}: DataCardProps) => {
    const isHero = size === "hero";

    return (
        <Card className="h-full">
            <CardContent className="flex flex-col h-full justify-between gap-y-6">
                <div className="flex items-center justify-between gap-x-4">
                    <div className="flex items-center gap-x-2 min-w-0">
                        <div className={cn(boxVariant({ variant, size }))}>
                            <Icon className={cn(iconVariant({ variant }))} />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground line-clamp-1">
                            {title}
                        </p>
                    </div>
                    {isHero && (
                        <p className="text-xs text-muted-foreground line-clamp-1 shrink-0">
                            {dateRange}
                        </p>
                    )}
                </div>
                <div className="space-y-2 min-w-0">
                    <p className={cn(
                        "font-display tracking-tight tabular-nums line-clamp-1 break-all",
                        isHero ? "text-4xl sm:text-5xl lg:text-6xl" : "text-3xl sm:text-4xl",
                    )}>
                        <CountUp
                          preserveValue
                          start={0}
                          end={value}
                          decimals={2}
                          formattingFn={formatCurrency}
                        />
                    </p>
                    {!hasPreviousData ? (
                        <NoPreviousData />
                    ) : isHero && previousValue !== undefined ? (
                        <Comparison value={value} previousValue={previousValue} invertColors={invertColors} />
                    ) : (
                        <Delta percentageChange={percentageChange} invertColors={invertColors} />
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export const DataCardLoading = ({ size }: { size?: "default" | "hero" }) => {
    const isHero = size === "hero";

    return (
        <Card className="h-full">
            <CardContent className="flex flex-col h-full justify-between gap-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-x-2">
                        <Skeleton className="size-7 rounded-full" />
                        <Skeleton className="h-4 w-20" />
                    </div>
                    {isHero && <Skeleton className="h-3 w-28" />}
                </div>
                <div className="space-y-2">
                    <Skeleton className={isHero ? "h-14 w-56" : "h-10 w-36"} />
                    <Skeleton className="h-4 w-44" />
                </div>
            </CardContent>
        </Card>
    );
};
