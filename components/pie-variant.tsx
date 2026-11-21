import { Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { formatPercentage } from "@/lib/utils";
import { CategoryTooltip, withColors, type CategoryData } from "@/components/category-tooltip";

type Props = {
    data: CategoryData[];
};

// Rounds each share to one decimal so the shares always add up to exactly 100%
// (largest remainder method). Plain rounding can give 99.9% or 100.1%.
const getShares = (values: number[]) => {
    const total = values.reduce((sum, value) => sum + value, 0);
    if (!total) return values.map(() => 0);

    const tenths = values.map((value) => (value / total) * 1000);
    const floored = tenths.map(Math.floor);
    let leftover = 1000 - floored.reduce((sum, value) => sum + value, 0);

    tenths
      .map((value, index) => ({ index, remainder: value - floored[index] }))
      .sort((a, b) => b.remainder - a.remainder)
      .forEach(({ index }) => {
          if (leftover > 0) {
              floored[index] += 1;
              leftover -= 1;
          }
      });

    return floored.map((value) => value / 10);
};

export const PieVariant = ({ data }: Props) => {
    const coloredData = withColors(data);
    const shares = getShares(data.map((item) => item.value));

    return (
        <div className="flex flex-col h-[350px]">
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Tooltip content={CategoryTooltip} />
                        <Pie
                          data={coloredData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={2}
                          stroke="none"
                          labelLine={false}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <ul className="flex flex-col gap-y-2 pt-2">
                {coloredData.map((item, index) => (
                    <li key={item.name} className="flex items-center gap-x-2 text-sm">
                        <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: item.fill }} />
                        <span className="text-muted-foreground truncate">{item.name}</span>
                        <span className="ml-auto font-medium">
                            {formatPercentage(shares[index])}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
};
