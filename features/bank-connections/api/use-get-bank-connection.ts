import { useQuery } from "@tanstack/react-query";

import { client } from "@/lib/hono";

export const useGetBankConnection = () => {
    const query = useQuery({
        queryKey: ["bank-connection"],
        queryFn: async () => {
            const response = await client.api["bank-connections"].$get();

            if (!response.ok) {
                throw new Error("Failed to fetch bank connection");
            }

            const { data } = await response.json();
            return data;
        },
    });

    return query;
};
