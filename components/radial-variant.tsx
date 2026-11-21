import { RadialBar, RadialBarChart, ResponsiveContainer, Tooltip } from "recharts";

import { formatCurrency } from "@/lib/utils";
import { CategoryTooltip, withColors, type CategoryData } from "@/components/category-tooltip";

type Props = {
    data: CategoryData[];
};

export const RadialVariant = ({ data }: Props) => {
    const coloredData = withColors(data);

    return (
        <div className="flex flex-col h-[350px]">
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                      cx="50%"
                      cy="50%"
                      barSize={10}
                      innerRadius="30%"
                      outerRadius="100%"
                      data={coloredData}
                    >
                        <Tooltip content={CategoryTooltip} />
                        <RadialBar
                          dataKey="value"
                          background
                          cornerRadius={5}
                        />
                    </RadialBarChart>
                </ResponsiveContainer>
            </div>
            <ul className="flex flex-col gap-y-2 pt-2">
                {coloredData.map((item) => (
                    <li key={item.name} className="flex items-center gap-x-2 text-sm">
                        <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: item.fill }} />
                        <span className="text-muted-foreground truncate">{item.name}</span>
                        <span className="ml-auto font-medium">
                            {formatCurrency(item.value)}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
};
