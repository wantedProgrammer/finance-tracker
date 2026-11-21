import { format } from "date-fns";
import {
    CartesianGrid,
    Line,
    LineChart,
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

export const LineVariant = ({ data }: Props) => {
    return (
        <ResponsiveContainer width="100%" height={350}>
            <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  axisLine={false}
                  tickLine={false}
                  dataKey="date"
                  tickFormatter={(value) => format(new Date(value), "dd MMM")}
                  style={{ fontSize: "12px" }}
                  tickMargin={16}
                />
                <Tooltip content={CustomTooltip} />
                <Line
                  dot={false}
                  type="monotone"
                  dataKey="income"
                  stroke={INCOME_COLOR}
                  strokeWidth={2}
                  className="drop-shadow-sm"
                />
                <Line
                  dot={false}
                  type="monotone"
                  dataKey="expenses"
                  stroke={EXPENSES_COLOR}
                  strokeWidth={2}
                  className="drop-shadow-sm"
                />
            </LineChart>
        </ResponsiveContainer>
    );
};
