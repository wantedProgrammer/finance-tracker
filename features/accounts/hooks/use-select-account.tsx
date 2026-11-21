import { useState, type JSX } from "react";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Select } from "@/components/select";
import { useGetAccounts } from "@/features/accounts/api/use-get-accounts";
import { useCreateAccount } from "@/features/accounts/api/use-create-account";

export const useSelectAccount = (): [
    () => JSX.Element,
    () => Promise<string | undefined>,
] => {
    const accountQuery = useGetAccounts();
    const accountMutation = useCreateAccount();

    const onCreateAccount = (name: string) => accountMutation.mutate({
        name,
    });

    const accountOptions = (accountQuery.data ?? []).map((account) => ({
        label: account.name,
        value: account.id,
    }));

    const [promise, setPromise] = useState<{ resolve: (value: string | undefined) => void } | null>(null);
    const [selectedValue, setSelectedValue] = useState<string | undefined>(undefined);

    const confirm = () => new Promise<string | undefined>((resolve) => {
        setPromise({ resolve });
    });

    const handleClose = () => {
        setPromise(null);
        setSelectedValue(undefined);
    };

    const handleConfirm = () => {
        promise?.resolve(selectedValue);
        handleClose();
    };

    const handleCancel = () => {
        promise?.resolve(undefined);
        handleClose();
    };

    const ConfirmDialog = () => (
        <Dialog open={promise !== null} onOpenChange={(open) => !open && handleCancel()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Select Account</DialogTitle>
                    <DialogDescription>
                        Please select an account to continue.
                    </DialogDescription>
                </DialogHeader>
                <Select
                  placeholder="Select an account"
                  options={accountOptions}
                  onCreate={(value) => {
                    if (value !== undefined) onCreateAccount(value);
                  }}
                  value={selectedValue}
                  onChange={setSelectedValue}
                  disabled={accountQuery.isLoading || accountMutation.isPending}
                />
                <DialogFooter className="pt-2">
                    <Button
                      variant="outline"
                      onClick={handleCancel}>
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm} disabled={!selectedValue}>
                        Confirm
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );

    return [ConfirmDialog, confirm];
};
