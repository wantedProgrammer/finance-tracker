import { useQuery } from "@tanstack/react-query";

import { client } from "@/lib/hono";

export const useGetInvestecAccounts = (enabled = true) => {
    const query = useQuery({
        queryKey: ["investec-accounts"],
        enabled,
        queryFn: async () => {
            const response = await client.api["bank-connections"].investec.accounts.$get();

            if (!response.ok) {
                throw new Error("Failed to fetch Investec accounts");
            }

            const { data } = await response.json();
            return data;
        },
    });

    return query;
};
