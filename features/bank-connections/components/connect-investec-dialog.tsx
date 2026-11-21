"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select as AccountSelect } from "@/components/select";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useGetAccounts } from "@/features/accounts/api/use-get-accounts";
import { useCreateAccount } from "@/features/accounts/api/use-create-account";
import { useGetInvestecAccounts } from "@/features/bank-connections/api/use-get-investec-accounts";
import { useCreateBankConnection } from "@/features/bank-connections/api/use-create-bank-connection";

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export const ConnectInvestecDialog = ({ open, onOpenChange }: Props) => {
    const [externalAccountId, setExternalAccountId] = useState<string>();
    const [accountId, setAccountId] = useState<string>();

    // Only ask Investec for accounts once the dialog is opened.
    const investecAccountsQuery = useGetInvestecAccounts(open);
    const accountsQuery = useGetAccounts();
    const accountMutation = useCreateAccount();
    const createConnection = useCreateBankConnection();

    const accountOptions = (accountsQuery.data ?? []).map((account) => ({
        label: account.name,
        value: account.id,
    }));

    const selectedInvestecAccount = investecAccountsQuery.data?.find(
        (account) => account.id === externalAccountId
    );

    const onCreateAccount = (name: string) => accountMutation.mutate(
        { name },
        // Select the new account straight away.
        { onSuccess: (response) => { if ("data" in response) setAccountId(response.data.id); } },
    );

    const onClose = () => {
        setExternalAccountId(undefined);
        setAccountId(undefined);
        onOpenChange(false);
    };

    const onConnect = () => {
        if (!selectedInvestecAccount || !accountId) return;

        createConnection.mutate(
            {
                externalAccountId: selectedInvestecAccount.id,
                externalAccountName: selectedInvestecAccount.name,
                accountId,
            },
            { onSuccess: onClose },
        );
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Connect Investec</DialogTitle>
                    <DialogDescription>
                        Choose the Investec account to sync and where its transactions should go.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Investec account</Label>
                        {investecAccountsQuery.isError ? (
                            <p className="text-sm text-destructive">
                                Couldn&apos;t load your Investec accounts. Please try again.
                            </p>
                        ) : (
                            <Select
                              value={externalAccountId}
                              onValueChange={setExternalAccountId}
                              disabled={investecAccountsQuery.isLoading}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue
                                      placeholder={investecAccountsQuery.isLoading
                                        ? "Loading accounts..."
                                        : "Select an Investec account"}
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {investecAccountsQuery.data?.map((account) => (
                                        <SelectItem key={account.id} value={account.id}>
                                            {account.name}
                                            <span className="text-muted-foreground tabular-nums">
                                                {account.accountNumber}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label>Import into</Label>
                        <AccountSelect
                          placeholder="Select or create an account"
                          options={accountOptions}
                          value={accountId}
                          onChange={setAccountId}
                          onCreate={(value) => {
                            if (value) onCreateAccount(value);
                          }}
                          disabled={accountsQuery.isLoading || accountMutation.isPending}
                        />
                    </div>
                </div>
                <DialogFooter className="pt-2">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                      onClick={onConnect}
                      disabled={!selectedInvestecAccount || !accountId || createConnection.isPending}
                    >
                        {createConnection.isPending && <Loader2 className="size-4 animate-spin" />}
                        Connect
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
