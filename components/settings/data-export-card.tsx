"use client";

import { Download, Loader2 } from "lucide-react";

import { useExportTransactions } from "@/features/settings/api/use-export-transactions";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

export const DataExportCard = () => {
    const exportTransactions = useExportTransactions();

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-2xl">Data export</CardTitle>
                <CardDescription>
                    Download all your transactions as a CSV file. Filters are ignored.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button
                  size="sm"
                  onClick={() => exportTransactions.mutate()}
                  disabled={exportTransactions.isPending}
                  className="w-full sm:w-auto"
                >
                    {exportTransactions.isPending
                      ? <Loader2 className="size-4 animate-spin" />
                      : <Download className="size-4" />}
                    Export transactions
                </Button>
            </CardContent>
        </Card>
    );
};
