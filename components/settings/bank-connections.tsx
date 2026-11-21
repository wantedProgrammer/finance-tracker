"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Landmark, Loader2, RefreshCw, Unplug } from "lucide-react";

import { useConfirm } from "@/hooks/use-confirm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { useGetBankConnection } from "@/features/bank-connections/api/use-get-bank-connection";
import { useSyncBankConnection } from "@/features/bank-connections/api/use-sync-bank-connection";
import { useDeleteBankConnection } from "@/features/bank-connections/api/use-delete-bank-connection";
import { ConnectInvestecDialog } from "@/features/bank-connections/components/connect-investec-dialog";

export const BankConnections = () => {
    const [isConnectOpen, setIsConnectOpen] = useState(false);

    const connectionQuery = useGetBankConnection();
    const syncConnection = useSyncBankConnection();
    const deleteConnection = useDeleteBankConnection();

    const [ConfirmDialog, confirm] = useConfirm(
        "Disconnect Investec?",
        "Syncing will stop. Transactions already imported will be kept in your account.",
    );

    const connection = connectionQuery.data?.connection;
    const isSandbox = connectionQuery.data?.isSandbox;
    const isBusy = syncConnection.isPending || deleteConnection.isPending;

    const onDisconnect = async () => {
        const ok = await confirm();

        if (ok) {
            deleteConnection.mutate();
        }
    };

    return (
        <>
            <ConfirmDialog />
            <ConnectInvestecDialog open={isConnectOpen} onOpenChange={setIsConnectOpen} />
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">Bank connections</CardTitle>
                    <CardDescription>Connect a bank to import transactions automatically</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-xl border p-4">
                        <div className="flex items-center gap-x-4 flex-1 min-w-0">
                            <div className="shrink-0 rounded-full bg-brand/10 p-3">
                                <Landmark className="size-5 text-brand" />
                            </div>
                            <div className="min-w-0 space-y-0.5">
                                <div className="flex items-center gap-x-2">
                                    <p className="font-medium">Investec</p>
                                    {isSandbox && <Badge variant="secondary">Sandbox</Badge>}
                                </div>
                                {connectionQuery.isLoading ? (
                                    <Skeleton className="h-4 w-56" />
                                ) : connection ? (
                                    <>
                                        <p className="text-sm text-muted-foreground truncate">
                                            {connection.externalAccountName} → {connection.accountName}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Last synced{" "}
                                            {connection.lastSyncedAt
                                              ? formatDistanceToNow(new Date(connection.lastSyncedAt), { addSuffix: true })
                                              : "never"}
                                        </p>
                                    </>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        Sync transactions from your Investec account
                                    </p>
                                )}
                            </div>
                        </div>
                        {connection ? (
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => syncConnection.mutate()}
                                  disabled={isBusy}
                                  className="w-full sm:w-auto"
                                >
                                    {syncConnection.isPending
                                      ? <Loader2 className="size-4 animate-spin" />
                                      : <RefreshCw className="size-4" />}
                                    {syncConnection.isPending ? "Syncing..." : "Sync now"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={onDisconnect}
                                  disabled={isBusy}
                                  className="w-full sm:w-auto"
                                >
                                    <Unplug className="size-4" />
                                    Disconnect
                                </Button>
                            </div>
                        ) : (
                            <Button
                              size="sm"
                              onClick={() => setIsConnectOpen(true)}
                              disabled={connectionQuery.isLoading}
                              className="w-full sm:w-auto"
                            >
                                Connect
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </>
    );
};
