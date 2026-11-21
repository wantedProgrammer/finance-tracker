import {
    PolarAngleAxis,
    PolarGrid,
    PolarRadiusAxis,
    Radar,
    RadarChart,
    ResponsiveContainer,
    Tooltip,
} from "recharts";

import { CATEGORY_COLORS, CategoryTooltip, type CategoryData } from "@/components/category-tooltip";

type Props = {
    data: CategoryData[];
};

export const RadarVariant = ({ data }: Props) => {
    return (
        <ResponsiveContainer width="100%" height={350}>
            <RadarChart cx="50%" cy="50%" outerRadius="60%" data={data}>
                <PolarGrid />
                <PolarAngleAxis dataKey="name" style={{ fontSize: "12px" }} />
                <PolarRadiusAxis tick={false} axisLine={false} />
                <Tooltip content={CategoryTooltip} />
                <Radar
                  dataKey="value"
                  stroke={CATEGORY_COLORS[0]}
                  fill={CATEGORY_COLORS[0]}
                  fillOpacity={0.6}
                />
            </RadarChart>
        </ResponsiveContainer>
    );
};
