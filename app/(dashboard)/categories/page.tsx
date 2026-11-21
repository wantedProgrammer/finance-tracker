"use client";

import { 
    Card, 
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Plus } from "lucide-react";
import { useNewCategory } from "@/features/categories/hooks/use-new-category";
import { useBulkDeleteCategories } from "@/features/categories/api/use-bulk-delete-categories";
import { useGetCategories } from "@/features/categories/api/use-get-categories";


import { columns } from "./columns"
import { DataTable } from "@/components/data-table"




const CategoriesPage = () => {
    const newCategory = useNewCategory();
    const deleteCategories = useBulkDeleteCategories();
    const categoryQuery = useGetCategories();
    const categories = categoryQuery.data || [];

    const isDisabled = 
      categoryQuery.isLoading || 
      deleteCategories.isPending;

if (categoryQuery.isLoading) {
    return (
        <div className="max-w-screen-2xl mx-auto w-full pb-10 -mt-24">
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-48" />
                </CardHeader>
                <CardContent>
                    <div className="h-[500px] w-full flex items-center justify-center">
                        <Loader2 className="size-6 text-slate-300 animate-spin" />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}



  return (
    <div className="max-w-screen-2xl mx-auto w-full pb-10 -mt-24">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-x-2">
                <CardTitle className="text-2xl line-clamp-1 min-w-0">
                    Categories Page
                </CardTitle>
                <Button onClick={newCategory.onOpen} size="sm" className="shrink-0"> 
                    <Plus className="size-4" />  
                    Add New
                </Button>
            </CardHeader>
            <CardContent>
                <DataTable 
                columns={columns} 
                data={categories} 
                filterKey="name"
                label="category"
                onDelete={(row) => {
                    const ids = row.map((r) => r.original.id);
                    deleteCategories.mutate({ ids });
                }}
                disabled={isDisabled}
                />
            </CardContent>
        </Card>
    </div>
  );
}; 

export default CategoriesPage;