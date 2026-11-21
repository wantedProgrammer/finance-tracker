import { toast } from "sonner";
import { InferRequestType, InferResponseType } from "hono";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { client } from "@/lib/hono";

type ResponseType = InferResponseType<typeof client.api.transactions["bulk-create"]["$post"]>;
type RequestType = InferRequestType<typeof client.api.transactions["bulk-create"]["$post"]>["json"];

export const useBulkCreateTransactions = () => {
    const queryClient = useQueryClient();

    const mutation = useMutation<
      ResponseType,
      Error,
      RequestType
    >({
        mutationFn: async (json) => {
            const response = await client.api.transactions["bulk-create"]["$post"]({ 
                json });
            return await response.json();
        },
        onSuccess: (data, transactions) => {
            const skipped = "skipped" in data ? data.skipped : 0;
            const imported = "imported" in data ? data.imported : transactions.length;

            if (skipped === 0) {
                toast.success(transactions.length === 1 ? "Transaction created" : "Transactions created");
            } else if (imported === 0) {
                // Re-importing a statement: everything was already there.
                toast.success(`Nothing new: all ${skipped} transactions already existed`);
            } else {
                toast.success(
                    `Imported ${imported} ${imported === 1 ? "transaction" : "transactions"}, ` +
                    `${skipped} already existed`
                );
            }

            queryClient.invalidateQueries({ queryKey: ["transactions"] });
            // Auto-categorize may have created new categories.
            queryClient.invalidateQueries({ queryKey: ["categories"] });
            queryClient.invalidateQueries({ queryKey: ["summary"] });
        },
        onError: () => {
            toast.error("Failed to create transactions");
        },     
    });

    return mutation
};
