"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Plus, Upload } from "lucide-react";

import { useNewAccount } from "@/features/accounts/hooks/use-new-account";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const STEPS = [
    {
        title: "Add an account",
        description: "Your bank account, card or cash wallet.",
    },
    {
        title: "Bring in your transactions",
        description: "Import a bank statement CSV or add them by hand.",
    },
    {
        title: "See where it goes",
        description: "Horizon sorts your spending into categories for you.",
    },
];

// First-run screen for a new user, shown on the overview instead of empty cards and charts.
export const Onboarding = () => {
    const newAccount = useNewAccount();

    return (
        <Card className="overflow-hidden">
            <CardContent className="grid gap-10 lg:grid-cols-2 lg:items-center">
                <div className="space-y-6">
                    <Image src="/logo.svg" alt="" width={48} height={48} />
                    <div className="space-y-3">
                        <h1 className="font-display text-4xl lg:text-5xl tracking-tight">
                            Let&apos;s set up your Horizon.
                        </h1>
                        <p className="text-muted-foreground max-w-md">
                            Add your first account to start seeing where your money goes.
                            It takes about a minute.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Button onClick={newAccount.onOpen}>
                            <Plus className="size-4" />
                            Add an account
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href="/transactions">
                                <Upload className="size-4" />
                                Import a CSV
                            </Link>
                        </Button>
                    </div>
                </div>
                <ol className="space-y-4">
                    {STEPS.map((step, index) => (
                        <li key={step.title} className="flex gap-x-4 rounded-xl border p-4">
                            {/* Orange fill with dark text: orange text on white would fail contrast. */}
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-highlight text-highlight-foreground font-display text-lg tabular-nums">
                                {index + 1}
                            </span>
                            <div className="space-y-1">
                                <p className="font-medium flex items-center gap-x-1">
                                    {step.title}
                                    {index === 0 && <ArrowRight className="size-4 text-muted-foreground" />}
                                </p>
                                <p className="text-sm text-muted-foreground">{step.description}</p>
                            </div>
                        </li>
                    ))}
                </ol>
            </CardContent>
        </Card>
    );
};
