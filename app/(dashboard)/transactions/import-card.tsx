import { useMemo, useState } from "react";
import { format, isValid, parse } from "date-fns";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { convertAmountToMiliUnits } from "@/lib/utils";

import { ImportTable } from "./import-table";

// The bank export writes dates as "20" + DD/MM/YY, e.g. "2015/05/26" is 15 May 2026.
// The other formats are fallbacks for statements from other banks.
const DATE_FORMATS = ["'20'dd/MM/yy", "yyyy-MM-dd", "dd/MM/yyyy"];

const REQUIRED_OPTIONS = ["date", "payee", "amount"];

// Pre-select columns based on the CSV header names.
const HEADER_GUESSES: Record<string, string> = {
    date: "date",
    description: "payee",
    payee: "payee",
    amount: "amount",
    payments: "amount",
    deposits: "amount",
    notes: "notes",
};

export type ImportedTransaction = {
    date: Date;
    payee: string;
    amount: number;
    notes: string | null;
    // Set for PDF statement rows so re-importing the same statement skips duplicates.
    externalId?: string;
};

type Props = {
    data: string[][];
    onCancel: () => void;
    onSubmit: (data: ImportedTransaction[]) => void;
    disabled?: boolean;
};

const parseDate = (value: string) => {
    for (const format of DATE_FORMATS) {
        const date = parse(value.trim(), format, new Date());
        if (isValid(date)) return date;
    }
    return null;
};

const parseAmount = (value: string) => {
    const cleaned = value.replace(/[,\sR]/g, "");
    if (!cleaned) return null;
    const amount = parseFloat(cleaned);
    return isNaN(amount) ? null : amount;
};

export const ImportCard = ({
    data,
    onCancel,
    onSubmit,
    disabled,
}: Props) => {
    const headers = data[0] ?? [];
    const body = useMemo(() => data.slice(1), [data]);

    const [selectedColumns, setSelectedColumns] = useState<Record<string, string | null>>(() =>
        Object.fromEntries(
            headers.map((header, index) => [
                `column_${index}`,
                HEADER_GUESSES[header.trim().toLowerCase()] ?? null,
            ])
        )
    );

    const onTableHeadSelectChange = (columnIndex: number, value: string | null) => {
        setSelectedColumns((prev) => ({
            ...prev,
            [`column_${columnIndex}`]: value,
        }));
    };

    const selectedValues = Object.values(selectedColumns).filter(Boolean);
    const missingOptions = REQUIRED_OPTIONS.filter(
        (option) => !selectedValues.includes(option)
    );

    const transactions = useMemo(() => {
        const columnsFor = (option: string) =>
            Object.entries(selectedColumns)
              .filter(([, value]) => value === option)
              .map(([key]) => Number(key.replace("column_", "")));

        const dateColumns = columnsFor("date");
        const payeeColumns = columnsFor("payee");
        const amountColumns = columnsFor("amount");
        const notesColumns = columnsFor("notes");

        const result: ImportedTransaction[] = [];

        for (const row of body) {
            const date = dateColumns.length ? parseDate(row[dateColumns[0]] ?? "") : null;

            // Rows without a date continue the previous transaction
            // (e.g. "DEBIT CARD PURCHASE FROM"), so keep their text as notes.
            if (!date) {
                const previous = result[result.length - 1];
                const extra = row.map((cell) => cell.trim()).filter(Boolean).join(" ");
                if (previous && extra) {
                    previous.notes = previous.notes ? `${previous.notes} ${extra}` : extra;
                }
                continue;
            }

            const amounts = amountColumns
              .map((index) => parseAmount(row[index] ?? ""))
              .filter((amount): amount is number => amount !== null);

            if (!amounts.length) continue;

            const amount = amounts.reduce((sum, value) => sum + value, 0);
            const payee = payeeColumns.map((index) => row[index]?.trim()).filter(Boolean).join(" ");
            const notes = notesColumns.map((index) => row[index]?.trim()).filter(Boolean).join(" ");

            result.push({
                date,
                payee: payee || "Unknown",
                amount,
                notes: notes || null,
            });
        }

        return result;
    }, [body, selectedColumns]);

    // Show dates in the preview the way they will be saved, not the raw bank text.
    const displayBody = useMemo(() => {
        const dateColumns = Object.entries(selectedColumns)
          .filter(([, value]) => value === "date")
          .map(([key]) => Number(key.replace("column_", "")));

        return body.map((row) =>
            row.map((cell, index) => {
                if (!dateColumns.includes(index) || !cell.trim()) return cell;
                const date = parseDate(cell);
                return date ? format(date, "dd MMMM, yyyy") : cell;
            })
        );
    }, [body, selectedColumns]);

    const handleContinue = () => {
        onSubmit(
            transactions.map((transaction) => ({
                ...transaction,
                amount: convertAmountToMiliUnits(transaction.amount),
            }))
        );
    };

    const canContinue = missingOptions.length === 0 && transactions.length > 0;

    return (
        <div className="max-w-screen-2xl mx-auto w-full pb-10 -mt-24">
            <Card>
                <CardHeader className="flex flex-col gap-y-2 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-2xl line-clamp-1">
                            Import Transactions
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                            {missingOptions.length > 0
                              ? `Select a column for: ${missingOptions.join(", ")}`
                              : `${transactions.length} transactions ready to import`}
                        </p>
                    </div>
                    <div className="flex flex-col lg:flex-row items-center gap-2">
                        <Button
                          onClick={onCancel}
                          size="sm"
                          variant="outline"
                          className="w-full lg:w-auto"
                          disabled={disabled}
                        >
                            Cancel
                        </Button>
                        <Button
                          onClick={handleContinue}
                          size="sm"
                          className="w-full lg:w-auto"
                          disabled={!canContinue || disabled}
                        >
                            Continue ({REQUIRED_OPTIONS.length - missingOptions.length}/{REQUIRED_OPTIONS.length})
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <ImportTable
                      headers={headers}
                      body={displayBody}
                      selectedColumns={selectedColumns}
                      onTableHeadSelectChange={onTableHeadSelectChange}
                    />
                </CardContent>
            </Card>
        </div>
    );
};
