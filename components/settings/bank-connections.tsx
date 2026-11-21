"use client";

import { Landmark } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

// Placeholder for the Investec integration. Replace this component when it's built.
export const BankConnections = () => {
    return (
        <Card className="border-none drop-shadow-sm">
            <CardHeader>
                <CardTitle className="text-xl">Bank connections</CardTitle>
                <CardDescription>Connect a bank to import transactions automatically</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-lg border p-4">
                    <div className="flex items-center gap-x-4 flex-1 min-w-0">
                        <div className="shrink-0 rounded-md bg-muted p-3">
                            <Landmark className="size-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-x-2">
                                <p className="font-medium">Investec</p>
                                <Badge variant="secondary">Coming soon</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Sync transactions from your Investec account
                            </p>
                        </div>
                    </div>
                    <Button size="sm" variant="outline" disabled className="w-full sm:w-auto">
                        Connect
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};
