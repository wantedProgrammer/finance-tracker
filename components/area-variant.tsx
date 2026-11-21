import { format } from "date-fns";
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
} from "recharts";

import { CustomTooltip, EXPENSES_COLOR, INCOME_COLOR } from "@/components/custom-tooltip";

type Props = {
    data: {
        date: string;
        income: number;
        expenses: number;
    }[];
};

export const AreaVariant = ({ data }: Props) => {
    return (
        <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <defs>
                    <linearGradient id="income" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="2%" stopColor={INCOME_COLOR} stopOpacity={0.8} />
                        <stop offset="98%" stopColor={INCOME_COLOR} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expenses" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="2%" stopColor={EXPENSES_COLOR} stopOpacity={0.8} />
                        <stop offset="98%" stopColor={EXPENSES_COLOR} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <XAxis
                  axisLine={false}
                  tickLine={false}
                  dataKey="date"
                  tickFormatter={(value) => format(new Date(value), "dd MMM")}
                  style={{ fontSize: "12px" }}
                  tickMargin={16}
                />
                <Tooltip content={CustomTooltip} />
                <Area
                  type="monotone"
                  dataKey="income"
                  stackId="income"
                  strokeWidth={2}
                  stroke={INCOME_COLOR}
                  fill="url(#income)"
                  className="drop-shadow-sm"
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  stackId="expenses"
                  strokeWidth={2}
                  stroke={EXPENSES_COLOR}
                  fill="url(#expenses)"
                  className="drop-shadow-sm"
                />
            </AreaChart>
        </ResponsiveContainer>
    );
};
