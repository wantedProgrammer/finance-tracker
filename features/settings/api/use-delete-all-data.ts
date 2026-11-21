import { toast } from "sonner";
import { InferResponseType } from "hono";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { client } from "@/lib/hono";

type ResponseType = InferResponseType<typeof client.api.data.$delete, 200>;

export const useDeleteAllData = () => {
    const queryClient = useQueryClient();

    const mutation = useMutation<
      ResponseType,
      Error
    >({
        mutationFn: async () => {
            const response = await client.api.data.$delete();

            if (!response.ok) {
                throw new Error("Failed to delete data");
            }

            return await response.json();
        },
        onSuccess: () => {
            toast.success("All data deleted");
            // Refresh everything: accounts, categories, transactions and the summary.
            queryClient.invalidateQueries();
        },
        onError: () => {
            toast.error("Failed to delete data");
        },
    });

    return mutation;
};
