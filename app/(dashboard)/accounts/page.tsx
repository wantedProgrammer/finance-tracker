"use client";

import { 
    Card, 
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useNewAccount } from "@/features/accounts/hooks/use-new-account";

import { columns, Payment } from "./columns"
import { DataTable } from "@/components/data-table"



const data: Payment[] = [
    {
      id: "728ed52f",
      amount: 100,
      status: "pending",
      email: "m@example.com",
    },
    {
      id: "728ed52f",
      amount: 50,
      status: "success",
      email: "a@example.com",
    },
    // ...
  ];


const AccountsPage = () => {
    const newAccount = useNewAccount();
  return (
    <div className="max-w-screen-2xl mx-auto w-full pb-10 -mt-24">
        <Card className="border-none drop-shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-x-2">
                <CardTitle className="text-xl line-clamp-1 min-w-0">
                    Accounts Page
                </CardTitle>
                <Button onClick={newAccount.onOpen} size="sm" className="shrink-0"> 
                    <Plus className="size-4" />  
                    Add New
                </Button>
            </CardHeader>
            <CardContent>
                <DataTable 
                columns={columns} 
                data={data} 
                filterKey="email"
                onDelete={() => {}}
                disabled={false}
                />
            </CardContent>
        </Card>
    </div>
  );
}; 

export default AccountsPage;