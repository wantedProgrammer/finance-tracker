"use client";

import { 
    Card, 
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Plus, Wand2 } from "lucide-react";
import { useNewTransaction } from "@/features/transactions/hooks/use-new-transaction";
import { useGetTransactions } from "@/features/transactions/api/use-get-transactions";

import { useState } from "react";
import { columns } from "./columns"
import { DataTable } from "@/components/data-table"
import { useBulkDeleteTransactions } from "@/features/transactions/api/use-bulk-delete-transactions";
import { transactions } from '../../../db/schema';
import { UploadButton } from "./upload-button";
import { ImportCard, type ImportedTransaction } from "./import-card";
import { useSelectAccount } from "@/features/accounts/hooks/use-select-account";
import { useBulkCreateTransactions } from "@/features/transactions/api/use-bulk-create-transactions";
import { toast } from "sonner";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { DateFilter } from "@/components/date-filter";
import { useCategorizeTransactions } from "@/features/transactions/api/use-categorize-transactions";

enum VARIANTS {
    LIST="LIST",
    IMPORT="IMPORT"
};

const INTIAL_IMPORT_RESULTS = {
    data: [],
    errors: [],
    meta: {},
};

const TransactionsPage = () => {
    const [variant, setVariant] = useState<VARIANTS>(VARIANTS.LIST);
    const [importResults, setImportResults] = useState
    (INTIAL_IMPORT_RESULTS); 


    const onUpload = (results: typeof INTIAL_IMPORT_RESULTS) => {
        console.log({ results });
        setImportResults(results);
        setVariant(VARIANTS.IMPORT);
    }

    const onCancelImport = () => {
        setImportResults(INTIAL_IMPORT_RESULTS);
        setVariant(VARIANTS.LIST);
    }

    const router = useRouter();
    const [AccountDialog, confirmAccount] = useSelectAccount();
    const createTransactions = useBulkCreateTransactions();

    const onSubmitImport = async (values: ImportedTransaction[]) => {
        const accountId = await confirmAccount();

        if (!accountId) {
            return toast.error("Please select an account to continue.");
        }

        const data = values.map((value) => ({
            ...value,
            accountId,
        }));

        createTransactions.mutate(data, {
            onSuccess: () => {
                onCancelImport();

                // Jump the date filter to the imported range so the new rows are visible.
                const times = values.map((value) => value.date.getTime());
                const from = format(new Date(Math.min(...times)), "yyyy-MM-dd");
                const to = format(new Date(Math.max(...times)), "yyyy-MM-dd");
                router.push(`/transactions?from=${from}&to=${to}`);
            },
        });
    };

    const newTransaction = useNewTransaction();
    const deleteTransactions = useBulkDeleteTransactions();
    const categorizeTransactions = useCategorizeTransactions();
    const transactionsQuery = useGetTransactions();
    const transactions = transactionsQuery.data || [];

    const isDisabled = 
      transactionsQuery.isLoading || 
      deleteTransactions.isPending;

if (transactionsQuery.isLoading) {
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

  if(variant == VARIANTS.IMPORT) {
    return (
        <>  
            <AccountDialog />
            <ImportCard
                data={importResults.data}
                onCancel={onCancelImport}
                onSubmit={onSubmitImport}
                disabled={createTransactions.isPending}
            />
        </>
    );
  }



  return (
    <div className="max-w-screen-2xl mx-auto w-full pb-10 -mt-24">
        <Card className="border-none drop-shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-x-2">
                <CardTitle className="text-xl line-clamp-1 min-w-0">
                    Transaction History
                </CardTitle>
                <div className="flex flex-wrap items-center justify-end gap-2">
                    <DateFilter />
                    <Button
                      onClick={() => categorizeTransactions.mutate()}
                      disabled={categorizeTransactions.isPending}
                      size="sm"
                      variant="outline"
                    >
                        <Wand2 className="size-4" />
                        Categorize
                    </Button>
                    <Button onClick={newTransaction.onOpen} size="sm">
                        <Plus className="size-4" />
                        Add New
                    </Button>
                    <UploadButton onUpload={onUpload} />
                </div>
            </CardHeader>
            <CardContent>
                <DataTable 
                columns={columns} 
                data={transactions} 
                filterKey="payee"
                label="transaction"
                onDelete={(row) => {
                    const ids = row.map((r) => r.original.id);
                    deleteTransactions.mutate({ ids });
                }}
                disabled={isDisabled}
                />
            </CardContent>
        </Card>
    </div>
  );
}; 

export default TransactionsPage;