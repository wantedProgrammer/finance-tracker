import { toast } from "sonner";
import { InferRequestType, InferResponseType } from "hono";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { client } from "@/lib/hono";

type ResponseType = InferResponseType<typeof client.api.transactions[":id"]["$patch"]>;
type RequestType = InferRequestType<typeof client.api.transactions[":id"]["$patch"]>["json"];

export const useEditTransaction = (id?: string) => {
    const queryClient = useQueryClient();

    const mutation = useMutation<
      ResponseType,
      Error,
      RequestType
    >({
        mutationFn: async (json) => {
            const response = await client.api.transactions[":id"]["$patch"]({
                param: { id },
                json,
            });

            if (!response.ok) {
                throw new Error("Failed to update transaction");
            }

            return await response.json();
        },
        onSuccess: () => {
            toast.success("Transaction updated");
            queryClient.invalidateQueries({ queryKey: ["transaction", { id }] });
            // Picking a category also applies it to other transactions from the same payee.
            queryClient.invalidateQueries({ queryKey: ["transactions"] });
            queryClient.invalidateQueries({ queryKey: ["summary"] });
        },
        onError: () => {
            toast.error("Failed to edit transaction");
        },
    });

    return mutation;
};
