import { toast } from "sonner";
import { InferRequestType, InferResponseType } from "hono";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { client } from "@/lib/hono";

type ResponseType = InferResponseType<typeof client.api["bank-connections"]["$post"], 200>;
type RequestType = InferRequestType<typeof client.api["bank-connections"]["$post"]>["json"];

export const useCreateBankConnection = () => {
    const queryClient = useQueryClient();

    const mutation = useMutation<
      ResponseType,
      Error,
      RequestType
    >({
        mutationFn: async (json) => {
            const response = await client.api["bank-connections"].$post({ json });

            if (!response.ok) {
                throw new Error("Failed to connect Investec");
            }

            return await response.json();
        },
        onSuccess: () => {
            toast.success("Investec connected");
            queryClient.invalidateQueries({ queryKey: ["bank-connection"] });
        },
        onError: () => {
            toast.error("Failed to connect Investec");
        },
    });

    return mutation;
};
