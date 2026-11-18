"use client";

import { 
    Card, 
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Plus } from "lucide-react";
import { useNewTransaction } from "@/features/transactions/hooks/use-new-transaction";
import { useGetAccounts } from "@/features/accounts/api/use-get-accounts";

import { columns } from "./columns"
import { DataTable } from "@/components/data-table"
import { useBulkDeleteAccounts } from "@/features/accounts/api/use-bulk-delete";



const TransactionsPage = () => {
    const newTransaction = useNewTransaction();
    const deleteAccounts = useBulkDeleteAccounts();
    const accountQuery = useGetAccounts();
    const accounts = accountQuery.data || [];

    const isDisabled = 
      accountQuery.isLoading || 
      deleteAccounts.isPending;

if (accountQuery.isLoading) {
    return (
        <div className="max-w-screen-2xl mx-auto w-full pb-10 -mt-24">
            <Card className="border-none drop-shadow-sm">
                <CardHeader>
                    <Skeleton className="h-8 w-48" />
                </CardHeader>
                <CardContent>
                    <div className="h-[500px] w-full flex items-center justify-center">
                        <Loader2 className="size-6 text-slate-300 animate-spin" />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}



  return (
    <div className="max-w-screen-2xl mx-auto w-full pb-10 -mt-24">
        <Card className="border-none drop-shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-x-2">
                <CardTitle className="text-xl line-clamp-1 min-w-0">
                    Transaction History
                </CardTitle>
                <Button onClick={newTransaction.onOpen} size="sm" className="shrink-0"> 
                    <Plus className="size-4" />  
                    Add New
                </Button>
            </CardHeader>
            <CardContent>
                <DataTable 
                columns={columns} 
                data={accounts} 
                filterKey="name"
                label="account"
                onDelete={(row) => {
                    const ids = row.map((r) => r.original.id);
                    deleteAccounts.mutate({ ids });
                }}
                disabled={isDisabled}
                />
            </CardContent>
        </Card>
    </div>
  );
}; 

export default TransactionsPage;