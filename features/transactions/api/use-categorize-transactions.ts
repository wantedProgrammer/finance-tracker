import { toast } from "sonner";
import { InferResponseType } from "hono";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { client } from "@/lib/hono";

type ResponseType = InferResponseType<typeof client.api.transactions["categorize"]["$post"], 200>;

export const useCategorizeTransactions = () => {
    const queryClient = useQueryClient();

    const mutation = useMutation<
      ResponseType,
      Error
    >({
        mutationFn: async () => {
            const response = await client.api.transactions["categorize"]["$post"]();

            if (!response.ok) {
                throw new Error("Failed to categorize transactions");
            }

            return await response.json();
        },
        onSuccess: ({ data }) => {
            if (data.categorized === 0) {
                toast.info("No transactions matched a category");
            } else {
                toast.success(
                    `${data.categorized} ${data.categorized === 1 ? "transaction" : "transactions"} categorized` +
                    (data.remaining ? `, ${data.remaining} still uncategorized` : "")
                );
            }
            queryClient.invalidateQueries({ queryKey: ["transactions"] });
            queryClient.invalidateQueries({ queryKey: ["categories"] });
            queryClient.invalidateQueries({ queryKey: ["summary"] });
        },
        onError: () => {
            toast.error("Failed to categorize transactions");
        },
    });

    return mutation;
};
