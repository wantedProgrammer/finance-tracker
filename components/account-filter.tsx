"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useGetAccounts } from "@/features/accounts/api/use-get-accounts";
import { useGetSummary } from "@/features/summary/api/use-get-summary";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// "all" is only used inside the Select; in the URL "All accounts" means no accountId.
const ALL_ACCOUNTS = "all";

export const AccountFilter = () => {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const accountId = searchParams.get("accountId") || ALL_ACCOUNTS;

    const { data: accounts, isLoading: isLoadingAccounts } = useGetAccounts();
    const { isLoading: isLoadingSummary } = useGetSummary();

    const onChange = (newValue: string) => {
        // Copy the current params so from and to are kept.
        const params = new URLSearchParams(searchParams.toString());

        if (newValue === ALL_ACCOUNTS) {
            params.delete("accountId");
        } else {
            params.set("accountId", newValue);
        }

        const query = params.toString();
        router.push(query ? `${pathname}?${query}` : pathname);
    };

    return (
        <Select
          value={accountId}
          onValueChange={onChange}
          disabled={isLoadingAccounts || isLoadingSummary}
        >
            <SelectTrigger
              size="sm"
              className="w-full lg:w-auto font-normal bg-white/10 hover:bg-white/20 hover:text-white border-none focus-visible:ring-offset-0 focus-visible:ring-transparent outline-none text-white focus:bg-white/30 transition dark:bg-white/10 [&_svg:not([class*='text-'])]:text-white data-[placeholder]:text-white"
            >
                <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value={ALL_ACCOUNTS}>
                    All accounts
                </SelectItem>
                {accounts?.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                        {account.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
};
