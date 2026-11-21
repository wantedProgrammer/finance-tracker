import type { TooltipContentProps } from "recharts";

import { formatCurrency } from "@/lib/utils";

// The biggest category (first) gets the orange highlight. The old fourth colour
// (#FF9354) was also orange, so it's dropped to keep the highlight unique.
export const CATEGORY_COLORS = ["var(--highlight)", "#0062FF", "#12C6FF", "#FF647F"];

export type CategoryData = {
    name: string;
    value: number;
};

// Recharts v3 deprecates <Cell>, so each item carries its own colour in `fill`.
export const withColors = (data: CategoryData[]) =>
    data.map((item, index) => ({
        ...item,
        fill: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    }));

export const CategoryTooltip = ({
    active,
    payload,
}: TooltipContentProps) => {
    if (!active || !payload?.length) return null;

    const item = payload[0].payload as CategoryData & { fill?: string };

    return (
        <div className="rounded-sm bg-background text-foreground shadow-sm border overflow-hidden">
            <div className="text-sm p-2 px-3 bg-muted text-muted-foreground border-b">
                {item.name}
            </div>
            <div className="p-2 px-3">
                <div className="flex items-center justify-between gap-x-4">
                    <div className="flex items-center gap-x-2">
                        <div className="size-1.5 rounded-full" style={{ backgroundColor: item.fill }} />
                        <p className="text-sm text-muted-foreground">Expenses</p>
                    </div>
                    <p className="text-sm text-right font-medium">
                        {formatCurrency(item.value * -1)}
                    </p>
                </div>
            </div>
        </div>
    );
};
