import { format } from "date-fns";
import type { TooltipContentProps } from "recharts";

import { formatCurrency } from "@/lib/utils";

export const INCOME_COLOR = "#3b82f6";
export const EXPENSES_COLOR = "#f43f5e";

// Recharts v3 passes TooltipContentProps to custom tooltip content.
export const CustomTooltip = ({
    active,
    payload,
}: TooltipContentProps) => {
    if (!active || !payload?.length) return null;

    const date = payload[0].payload.date;
    const isWeek = payload[0].payload.period === "week";
    const income = Number(payload.find((item) => item.dataKey === "income")?.value ?? 0);
    const expenses = Number(payload.find((item) => item.dataKey === "expenses")?.value ?? 0);

    return (
        <div className="rounded-sm bg-background text-foreground shadow-sm border overflow-hidden">
            <div className="text-sm p-2 px-3 bg-muted text-muted-foreground border-b">
                {isWeek && "Week of "}{format(new Date(date), "dd MMM yyyy")}
            </div>
            <div className="p-2 px-3 space-y-1">
                <div className="flex items-center justify-between gap-x-4">
                    <div className="flex items-center gap-x-2">
                        <div className="size-1.5 rounded-full" style={{ backgroundColor: INCOME_COLOR }} />
                        <p className="text-sm text-muted-foreground">Income</p>
                    </div>
                    <p className="text-sm text-right font-medium">
                        {formatCurrency(income)}
                    </p>
                </div>
                <div className="flex items-center justify-between gap-x-4">
                    <div className="flex items-center gap-x-2">
                        <div className="size-1.5 rounded-full" style={{ backgroundColor: EXPENSES_COLOR }} />
                        <p className="text-sm text-muted-foreground">Expenses</p>
                    </div>
                    <p className="text-sm text-right font-medium">
                        {formatCurrency(expenses * -1)}
                    </p>
                </div>
            </div>
        </div>
    );
};
