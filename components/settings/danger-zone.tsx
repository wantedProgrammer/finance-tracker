"use client";

import { Loader2, Trash } from "lucide-react";

import { useConfirm } from "@/hooks/use-confirm";
import { useDeleteAllData } from "@/features/settings/api/use-delete-all-data";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

export const DangerZone = () => {
    const deleteAllData = useDeleteAllData();
    const [ConfirmDialog, confirm] = useConfirm(
        "Delete all data?",
        "This permanently deletes all your accounts, categories and transactions. This can't be undone. Your login is not affected.",
    );

    const onDelete = async () => {
        const ok = await confirm();

        if (ok) {
            deleteAllData.mutate();
        }
    };

    return (
        <>
            <ConfirmDialog />
            <Card className="border border-rose-500/50 drop-shadow-sm">
                <CardHeader>
                    <CardTitle className="text-xl text-rose-500">Danger zone</CardTitle>
                    <CardDescription>
                        Permanently delete all your accounts, categories and transactions.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={onDelete}
                      disabled={deleteAllData.isPending}
                      className="w-full sm:w-auto"
                    >
                        {deleteAllData.isPending
                          ? <Loader2 className="size-4 animate-spin" />
                          : <Trash className="size-4" />}
                        Delete all data
                    </Button>
                </CardContent>
            </Card>
        </>
    );
};
