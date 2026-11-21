"use client";

import { Suspense, useState } from "react";
import{ useMedia } from "react-use";

import { Menu } from "lucide-react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import{
    Sheet,
    SheetContent,
    SheetTrigger,
} from "@/components/ui/sheet";

import { NavButton } from "./nav-button";
import { Button } from "@/components/ui/button";

const routes = [
    {
        href: "/",
        label: "Overview",
    },
    {
        href: "/transactions",
        label: "Transactions",
    },
    {
        href: "/accounts",
        label: "Accounts",
    },
    {
        href: "/categories",
        label: "Categories",
    },
    {
        href: "/settings",
        label: "Settings",
    }
]

// Params that should follow you between pages, so the selected period stays the same.
const SHARED_PARAMS = ["from", "to"];

export const Navigation = () => {
    return (
        <Suspense fallback={<NavigationLinks query="" />}>
            <NavigationWithParams />
        </Suspense>
    );
};

const NavigationWithParams = () => {
    const searchParams = useSearchParams();

    const params = new URLSearchParams();
    SHARED_PARAMS.forEach((key) => {
        const value = searchParams.get(key);
        if (value) params.set(key, value);
    });

    const query = params.toString();

    return <NavigationLinks query={query ? `?${query}` : ""} />;
};

const NavigationLinks = ({ query }: { query: string }) => {
    const [isOpen, setIsOpen] = useState(false);

    const router = useRouter();
    const pathname = usePathname();
    const isMobile = useMedia("(max-width: 1024px)", false);

    const onClick = (href: string) => {
        router.push(href);
        setIsOpen(false);
    };

    if(isMobile) {
        return(
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                    <div
                      className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 font-normal bg-white/10 hover:bg-white/20 hover:text-white border-none focus-visible:ring-offset-0 focus-visible:ring-transparent outline-none text-white focus:bg-white/30 transition"
                    >
                        <Menu className="size-4"/>
                    </div>
                </SheetTrigger>
                <SheetContent side="left" className="px-2">
                    <nav className="flex flex-col gap-y-2 pt-6">
                        {routes.map((route) => (
                            <Button
                              key={route.href}
                              variant={route.href == pathname ? "secondary" : "ghost"}
                              onClick={() => onClick(`${route.href}${query}`)}
                              className="w-full justify-start"
                            >
                                {route.label}
                            </Button>
                        ))}
                    </nav>
                </SheetContent>
            </Sheet>
        );
    }

    return(
        <nav className="hidden lg:flex items-center gap-x-2 overflow-x-auto">
            {routes.map((route) => (
                <NavButton
                  key={route.href}
                  href={`${route.href}${query}`}
                  label={route.label}
                  isActive={pathname === route.href}
                />
            ))}
        </nav>
    );
};
