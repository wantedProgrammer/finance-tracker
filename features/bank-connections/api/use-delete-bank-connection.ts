import { toast } from "sonner";
import { InferResponseType } from "hono";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { client } from "@/lib/hono";

type ResponseType = InferResponseType<typeof client.api["bank-connections"]["$delete"], 200>;

export const useDeleteBankConnection = () => {
    const queryClient = useQueryClient();

    const mutation = useMutation<
      ResponseType,
      Error
    >({
        mutationFn: async () => {
            const response = await client.api["bank-connections"].$delete();

            if (!response.ok) {
                throw new Error("Failed to disconnect Investec");
            }

            return await response.json();
        },
        onSuccess: () => {
            toast.success("Investec disconnected");
            queryClient.invalidateQueries({ queryKey: ["bank-connection"] });
        },
        onError: () => {
            toast.error("Failed to disconnect Investec");
        },
    });

    return mutation;
};
