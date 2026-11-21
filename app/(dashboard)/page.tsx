"use client";

import { DataGrid } from "@/components/data-grid";
import { DataCharts } from "@/components/data-charts";
import { Onboarding } from "@/components/onboarding";
import { useGetAccounts } from "@/features/accounts/api/use-get-accounts";

export default function DashboardPage() {
  const accountsQuery = useGetAccounts();

  // A brand-new user gets a guided start instead of zeros and empty charts.
  const isNewUser = accountsQuery.isSuccess && accountsQuery.data.length === 0;

  return (
    <div className="max-w-screen-2xl mx-auto w-full pb-10 -mt-24">
      {isNewUser ? (
        <Onboarding />
      ) : (
        <>
          <DataGrid />
          <DataCharts />
        </>
      )}
    </div>
  );
};
