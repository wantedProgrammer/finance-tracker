"use client";

import { useState } from "react";
import { format, parse, subDays } from "date-fns";
import { ChevronDown } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverClose,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

const URL_FORMAT = "yyyy-MM-dd";

// Same default range as the transactions API: the last 30 days.
const getDefaultRange = (): DateRange => {
    const to = new Date();
    return { from: subDays(to, 30), to };
};

const formatRange = (range?: DateRange) => {
    const { from, to } = range?.from ? range : getDefaultRange();
    if (!from) return "";
    if (!to) return format(from, "dd MMM yyyy");
    return `${format(from, "dd MMM yyyy")} - ${format(to, "dd MMM yyyy")}`;
};

export const DateFilter = () => {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    const currentRange: DateRange = fromParam && toParam
      ? {
          from: parse(fromParam, URL_FORMAT, new Date()),
          to: parse(toParam, URL_FORMAT, new Date()),
        }
      : getDefaultRange();

    const [date, setDate] = useState<DateRange | undefined>(currentRange);

    const pushToUrl = (range?: DateRange) => {
        const params = new URLSearchParams(searchParams.toString());

        if (range?.from && range?.to) {
            params.set("from", format(range.from, URL_FORMAT));
            params.set("to", format(range.to, URL_FORMAT));
        } else {
            params.delete("from");
            params.delete("to");
        }

        const query = params.toString();
        router.push(query ? `${pathname}?${query}` : pathname);
    };

    const onReset = () => {
        setDate(getDefaultRange());
        pushToUrl(undefined);
    };

    return (
        <Popover onOpenChange={(open) => open && setDate(currentRange)}>
            <PopoverTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full lg:w-auto font-normal bg-white/10 hover:bg-white/20 hover:text-white border-none focus-visible:ring-offset-0 focus-visible:ring-transparent outline-none text-white focus:bg-white/30 transition"
                >
                    <span>{formatRange(currentRange)}</span>
                    <ChevronDown className="size-4 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  defaultMonth={date?.from}
                  selected={date}
                  onSelect={setDate}
                  resetOnSelect
                  autoFocus
                />
                <div className="flex items-center gap-x-2 p-4 pt-0">
                    <PopoverClose asChild>
                        <Button
                          onClick={onReset}
                          variant="outline"
                          className="flex-1"
                        >
                            Reset
                        </Button>
                    </PopoverClose>
                    <PopoverClose asChild>
                        <Button
                          onClick={() => pushToUrl(date)}
                          disabled={!date?.from || !date?.to}
                          className="flex-1"
                        >
                            Apply
                        </Button>
                    </PopoverClose>
                </div>
            </PopoverContent>
        </Popover>
    );
};
