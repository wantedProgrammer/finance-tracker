import { HeaderLogo } from "@/components/header-logo";
import { Navigation } from "@/components/navigation";
import { WelcomeMsg } from "@/components/welcome-msg";
import { Filters } from "@/components/filters";

import { Suspense } from "react";

import { UserButton, ClerkLoading, ClerkLoaded } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";


export const Header = () => {
    return(
        <header className="relative isolate overflow-hidden bg-gradient-to-b from-brand
        to-brand-end px-4 py-8 lg:px-14 pb-36">
            {/*
              Signature "horizon": a soft sun rising behind a thin warm line, placed where
              the page cards begin (they overlap the header by 6rem), echoing the logo's orange dot.
            */}
            <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-24 -z-10">
                {/* mix-blend-screen brightens the blue into warm light instead of mixing to olive. */}
                <div className="absolute left-1/2 top-0 h-32 w-[40rem] max-w-[90vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-highlight/60 blur-3xl mix-blend-screen" />
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-highlight to-transparent mix-blend-screen" />
            </div>
            <div className="max-w-screen-2xl mx-auto">
                <div className="w-full flex items-center justify-between mb-14">
                    <div className="flex items-center gap-x-3 lg:gap-x-16">
                        <HeaderLogo />
                        <Navigation />
                    </div>
                    <ClerkLoaded>
                        <UserButton afterSignOutUrl="/" />
                    </ClerkLoaded>
                    <ClerkLoading>
                        <Loader2 className="size-8 animate-spin text-slate-400" />
                    </ClerkLoading>
                </div>
                <WelcomeMsg />
                {/* Filters read the URL with useSearchParams, which needs a Suspense boundary. */}
                <Suspense>
                    <Filters />
                </Suspense>
            </div>
        </header>
    );
};