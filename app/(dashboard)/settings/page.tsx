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
                <div className="lg:col-span-2">
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
