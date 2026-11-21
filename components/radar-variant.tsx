import {
    PolarAngleAxis,
    PolarGrid,
    PolarRadiusAxis,
    Radar,
    RadarChart,
    ResponsiveContainer,
    Tooltip,
} from "recharts";

import { CategoryTooltip, type CategoryData } from "@/components/category-tooltip";

// The radar is one shape, so the orange highlight would cover the whole chart.
// Brand blue keeps the accent for the pie and radial charts' top category.
const RADAR_COLOR = "var(--brand)";

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
                  stroke={RADAR_COLOR}
                  fill={RADAR_COLOR}
                  fillOpacity={0.6}
                />
            </RadarChart>
        </ResponsiveContainer>
    );
};
