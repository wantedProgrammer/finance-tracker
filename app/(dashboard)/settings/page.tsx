"use client";

import { ProfileCard } from "@/components/settings/profile-card";
import { DataExportCard } from "@/components/settings/data-export-card";
import { BankConnections } from "@/components/settings/bank-connections";
import { DangerZone } from "@/components/settings/danger-zone";

const SettingsPage = () => {
    return (
        <div className="max-w-screen-2xl mx-auto w-full pb-10 -mt-24">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <ProfileCard />
                <DataExportCard />
                {/* empty:hidden removes the gap when the Investec card isn't shown. */}
                <div className="lg:col-span-2 empty:hidden">
                    <BankConnections />
                </div>
                <div className="lg:col-span-2">
                    <DangerZone />
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
