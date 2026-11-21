"use client";

import { useState } from "react";
import { startOfWeek } from "date-fns";
import { AreaChart, BarChart3, FileSearch, LineChart, Loader2 } from "lucide-react";

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

import { AreaVariant } from "@/components/area-variant";
import { BarVariant } from "@/components/bar-variant";
import { LineVariant } from "@/components/line-variant";

type ChartType = "area" | "line" | "bar";

type ChartData = {
    date: string;
    income: number;
    expenses: number;
    period?: "day" | "week";
};

type Props = {
    data?: ChartData[];
};

// More days than this and the chart switches to weekly totals.
const MAX_DAILY_POINTS = 45;

const groupByWeek = (data: ChartData[]): ChartData[] => {
    const weeks = new Map<string, ChartData>();

    for (const day of data) {
        const weekStart = startOfWeek(new Date(day.date), { weekStartsOn: 1 }).toISOString();
        const week = weeks.get(weekStart) ?? { date: weekStart, income: 0, expenses: 0, period: "week" };

        week.income += day.income;
        week.expenses += day.expenses;
        weeks.set(weekStart, week);
    }

    return [...weeks.values()];
};

export const Chart = ({ data = [] }: Props) => {
    const [chartType, setChartType] = useState<ChartType>("area");

    // The API fills every day in the range with zeros, so "empty" means no money moved.
    const hasData = data.some((day) => day.income !== 0 || day.expenses !== 0);

    // Long ranges are mostly zero days with a few spikes, which makes area, line
    // and bar look identical. Weekly totals keep each chart type readable.
    const isWeekly = data.length > MAX_DAILY_POINTS;
    const chartData = isWeekly ? groupByWeek(data) : data;

    return (
        <Card className="border-none drop-shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-x-4">
                <div className="space-y-1 min-w-0">
                    <CardTitle className="text-xl line-clamp-1">
                        Transactions
                    </CardTitle>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                        {isWeekly ? "Weekly totals" : "Daily totals"}
                    </p>
                </div>
                <Select
                  value={chartType}
                  onValueChange={(value) => setChartType(value as ChartType)}
                >
                    <SelectTrigger className="lg:w-auto h-9 rounded-md px-3">
                        <SelectValue placeholder="Chart type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="area">
                            <AreaChart className="size-4 mr-2 shrink-0" />
                            Area chart
                        </SelectItem>
                        <SelectItem value="line">
                            <LineChart className="size-4 mr-2 shrink-0" />
                            Line chart
                        </SelectItem>
                        <SelectItem value="bar">
                            <BarChart3 className="size-4 mr-2 shrink-0" />
                            Bar chart
                        </SelectItem>
                    </SelectContent>
                </Select>
            </CardHeader>
            <CardContent>
                {!hasData ? (
                    <div className="flex flex-col gap-y-4 items-center justify-center h-[350px] w-full">
                        <FileSearch className="size-6 text-muted-foreground" />
                        <p className="text-muted-foreground text-sm">
                            No data for this period
                        </p>
                    </div>
                ) : (
                    // Theme tokens for the grid and axis text so they work in light and dark mode.
                    <div className="[&_.recharts-cartesian-grid_line]:stroke-border [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-tooltip-cursor]:stroke-border">
                        {chartType === "area" && <AreaVariant data={chartData} />}
                        {chartType === "line" && <LineVariant data={chartData} />}
                        {chartType === "bar" && <BarVariant data={chartData} />}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export const ChartLoading = () => {
    return (
        <Card className="border-none drop-shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-x-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-9 w-full lg:w-[120px]" />
            </CardHeader>
            <CardContent>
                <div className="h-[350px] w-full flex items-center justify-center">
                    <Loader2 className="size-6 text-slate-300 animate-spin" />
                </div>
            </CardContent>
        </Card>
    );
};
