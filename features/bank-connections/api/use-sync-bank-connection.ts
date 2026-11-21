import { toast } from "sonner";
import { InferResponseType } from "hono";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { client } from "@/lib/hono";

type ResponseType = InferResponseType<typeof client.api["bank-connections"]["sync"]["$post"], 200>;

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

export const useSyncBankConnection = () => {
    const queryClient = useQueryClient();

    const mutation = useMutation<
      ResponseType,
      Error
    >({
        mutationFn: async () => {
            const response = await client.api["bank-connections"].sync.$post();

            if (!response.ok) {
                throw new Error("Failed to sync transactions");
            }

            return await response.json();
        },
        onSuccess: ({ data }) => {
            if (data.imported === 0) {
                toast.success(
                    data.skipped
                      ? `Already up to date (${plural(data.skipped, "transaction")} checked)`
                      : "No transactions found for this period"
                );
            } else {
                toast.success(
                    `Imported ${plural(data.imported, "transaction")}` +
                    (data.skipped ? `, ${data.skipped} already up to date` : "")
                );
            }

            queryClient.invalidateQueries({ queryKey: ["bank-connection"] });
            queryClient.invalidateQueries({ queryKey: ["transactions"] });
            queryClient.invalidateQueries({ queryKey: ["summary"] });
        },
        onError: () => {
            toast.error("Failed to sync transactions");
        },
    });

    return mutation;
};
