import Papa from "papaparse";
import { format } from "date-fns";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

import { client } from "@/lib/hono";
import { convertAmountFromMiliUnits } from "@/lib/utils";

// Stops payees like "=HYPERLINK(...)" running as formulas in Excel. Unlike
// escapeFormulae: true, it leaves plain negative numbers ("-37.00") alone so
// amounts stay numeric, but still escapes "-" when it starts a formula.
const FORMULA_PATTERN = /^[=+@\t\r]|^-(?!\d+(\.\d+)?$)/;

const downloadFile =(content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();

    // Give the browser a moment to start the download before freeing the file.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const useExportTransactions = () => {
    const mutation = useMutation({
        mutationFn: async () => {
            const response = await client.api.transactions.export.$get();

            if (!response.ok) {
                throw new Error("Failed to export transactions");
            }

            const { data } = await response.json();
            return data;
        },
        onSuccess: (data) => {
            const rows = data.map((transaction) => ({
                date: format(new Date(transaction.date), "yyyy-MM-dd"),
                payee: transaction.payee,
                // Stored in miliunits; export plain rand so spreadsheets can add them up.
                amount: convertAmountFromMiliUnits(transaction.amount).toFixed(2),
                account: transaction.account,
                category: transaction.category ?? "",
                notes: transaction.notes ?? "",
            }));

            const csv = Papa.unparse(rows, {
                columns: ["date", "payee", "amount", "account", "category", "notes"],
                escapeFormulae: FORMULA_PATTERN,
            });

            downloadFile(csv, `finance-tracker-transactions-${format(new Date(), "yyyy-MM-dd")}.csv`);
            toast.success(rows.length === 1 ? "1 transaction exported" : `${rows.length} transactions exported`);
        },
        onError: () => {
            toast.error("Failed to export transactions");
        },
    });

    return mutation;
};
