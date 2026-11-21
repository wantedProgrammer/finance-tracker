"use client";

import { useSyncExternalStore } from "react";
import { useUser } from "@clerk/nextjs";

const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
};

// The server doesn't know the visitor's local time, so it renders a neutral
// greeting and the browser swaps in the time-based one without a hydration mismatch.
const useGreeting = () =>
    useSyncExternalStore(
        () => () => {},
        getGreeting,
        () => "Welcome back",
    );

export const WelcomeMsg = () => {
    const { user, isLoaded } = useUser();
    const greeting = useGreeting();

    return (
        <div className="space-y-2 mb-4">
            <h2 className="font-display text-4xl lg:text-5xl text-white tracking-tight">
                {greeting}{isLoaded && user?.firstName ? `, ${user.firstName}` : ""}.
            </h2>
            <p className="text-sm lg:text-base text-white/70">
                Here&apos;s where your money stands.
            </p>
        </div>
    );
};
