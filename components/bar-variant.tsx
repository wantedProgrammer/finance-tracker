import { format } from "date-fns";
import {
    Bar,
    BarChart,
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

export const BarVariant = ({ data }: Props) => {
    return (
        <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data} maxBarSize={32}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  axisLine={false}
                  tickLine={false}
                  dataKey="date"
                  tickFormatter={(value) => format(new Date(value), "dd MMM")}
                  style={{ fontSize: "12px" }}
                  tickMargin={16}
                />
                <Tooltip content={CustomTooltip} cursor={{ fillOpacity: 0.1 }} />
                <Bar
                  dataKey="income"
                  fill={INCOME_COLOR}
                  radius={[2, 2, 0, 0]}
                  className="drop-shadow-sm"
                />
                <Bar
                  dataKey="expenses"
                  fill={EXPENSES_COLOR}
                  radius={[2, 2, 0, 0]}
                  className="drop-shadow-sm"
                />
            </BarChart>
        </ResponsiveContainer>
    );
};
