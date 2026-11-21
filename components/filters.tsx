"use client";

import { usePathname } from "next/navigation";

import { AccountFilter } from "@/components/account-filter";
import { DateFilter } from "@/components/date-filter";

// Pages whose data depends on the date range.
const FILTER_ROUTES = ["/", "/transactions"];

export const Filters = () => {
    const pathname = usePathname();

    if (!FILTER_ROUTES.includes(pathname)) {
        return null;
    }

    return (
        <div className="flex flex-col lg:flex-row items-center gap-y-2 lg:gap-y-0 lg:gap-x-2">
            <AccountFilter />
            <DateFilter />
        </div>
    );
};
