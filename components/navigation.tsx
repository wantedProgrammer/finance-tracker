"use client";

import { Suspense, useState } from "react";

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
const SHARED_PARAMS = ["from", "to", "accountId"];

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

    const onClick = (href: string) => {
        router.push(href);
        setIsOpen(false);
    };

    // Both menus are rendered and CSS picks one (menu button below lg, links from lg), so phones
    // get the menu button immediately instead of after JavaScript measures the screen.
    return (
        <>
        <div className="lg:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                    <button
                      type="button"
                      aria-label="Open menu"
                      className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 h-9 px-3 rounded-md bg-white/10 hover:bg-white/20 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus:bg-white/30"
                    >
                        <Menu className="size-4"/>
                    </button>
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
                                {route.href == pathname && (
                                    <span className="ml-auto size-1.5 rounded-full bg-highlight" />
                                )}
                            </Button>
                        ))}
                    </nav>
                </SheetContent>
            </Sheet>
        </div>
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
        </>
    );
};
