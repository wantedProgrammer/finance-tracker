"use client";

import { useState } from "react";
import { FileSearch, Loader2, PieChart, Radar, Target } from "lucide-react";

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

import { PieVariant } from "@/components/pie-variant";
import { RadarVariant } from "@/components/radar-variant";
import { RadialVariant } from "@/components/radial-variant";
import { type CategoryData } from "@/components/category-tooltip";

type ChartType = "pie" | "radar" | "radial";

type Props = {
    data?: CategoryData[];
};

export const SpendingPie = ({ data = [] }: Props) => {
    const [chartType, setChartType] = useState<ChartType>("pie");

    const hasData = data.some((category) => category.value > 0);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-x-4">
                <div className="space-y-1 min-w-0">
                    <CardTitle className="text-2xl line-clamp-1">
                        Categories
                    </CardTitle>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                        Spending by category
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
                        <SelectItem value="pie">
                            <PieChart className="size-4 mr-2 shrink-0" />
                            Pie chart
                        </SelectItem>
                        <SelectItem value="radar">
                            <Radar className="size-4 mr-2 shrink-0" />
                            Radar chart
                        </SelectItem>
                        <SelectItem value="radial">
                            <Target className="size-4 mr-2 shrink-0" />
                            Radial chart
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
                    // Theme tokens for grid lines, labels and bar tracks so they work in light and dark mode.
                    <div className="[&_.recharts-polar-grid_line]:stroke-border [&_.recharts-polar-grid_path]:stroke-border [&_.recharts-polar-grid_polygon]:stroke-border [&_.recharts-polar-angle-axis-tick_text]:fill-muted-foreground [&_.recharts-radial-bar-background-sector]:fill-muted">
                        {chartType === "pie" && <PieVariant data={data} />}
                        {chartType === "radar" && <RadarVariant data={data} />}
                        {chartType === "radial" && <RadialVariant data={data} />}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export const SpendingPieLoading = () => {
    return (
        <Card>
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
