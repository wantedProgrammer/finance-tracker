"use client";

import { useState } from "react";
import { format } from "date-fns";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { cn, convertAmountToMiliUnits, formatCurrency } from "@/lib/utils";

import type { ImportedTransaction } from "./import-card";
import type { ParsedStatement } from "./pdf-upload-button";

type Props = {
    statement: ParsedStatement;
    onCancel: () => void;
    onSubmit: (data: ImportedTransaction[]) => void;
    disabled?: boolean;
};

// Preview for PDF statements. The parser already knows the columns, so unlike CSV import
// there's no column mapping step: just check the rows and continue.
export const PdfImportCard = ({
    statement,
    onCancel,
    onSubmit,
    disabled,
}: Props) => {
    const { bankName, rows, check, isGeneric } = statement;
    const [confirmed, setConfirmed] = useState(false);

    // Bank-specific parsers only warn. The fallback parser is stricter because nobody has
    // checked it against this bank's statements: rows that don't add up can't be imported,
    // and rows with nothing to check against need the user's confirmation.
    const blocked = isGeneric && !check.ok;
    const needsConfirmation = isGeneric && check.ok && !check.verified;
    const canImport = !disabled && !blocked && (!needsConfirmation || confirmed);

    const moneyIn = rows.filter((row) => row.amount > 0).reduce((sum, row) => sum + row.amount, 0);
    const moneyOut = rows.filter((row) => row.amount < 0).reduce((sum, row) => sum + row.amount, 0);
    const hasBalance = rows.some((row) => row.balance !== undefined);

    const handleContinue = () => {
        onSubmit(rows.map((row) => ({
            date: row.date,
            payee: row.payee,
            amount: convertAmountToMiliUnits(row.amount),
            notes: row.notes ?? null,
            externalId: row.externalId,
        })));
    };

    return (
        <div className="max-w-screen-2xl mx-auto w-full pb-10 -mt-24">
            <Card>
                <CardHeader className="flex flex-col gap-y-2 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-x-2">
                            <CardTitle className="text-2xl line-clamp-1">
                                {isGeneric ? "Import statement" : `Import ${bankName} statement`}
                            </CardTitle>
                            {isGeneric && <Badge variant="secondary">{bankName}</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {rows.length} {rows.length === 1 ? "transaction" : "transactions"} found
                            {" · "}
                            <span className="text-income-strong tabular-nums">+{formatCurrency(moneyIn)}</span>
                            {" in · "}
                            <span className="tabular-nums">{formatCurrency(moneyOut)}</span>
                            {" out"}
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
                          disabled={!canImport}
                        >
                            Continue
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {isGeneric && (
                        <p className="flex gap-x-2 text-sm text-muted-foreground">
                            <Info className="size-4 shrink-0 mt-0.5" />
                            Horizon doesn&apos;t have a reader built for this bank yet, so this statement
                            was read by the general reader. Check the rows before importing.
                        </p>
                    )}
                    {check.ok && check.verified && (
                        <p className="flex items-center gap-x-2 text-sm text-income-strong">
                            <CheckCircle2 className="size-4 shrink-0" />
                            Balances and totals match the statement.
                        </p>
                    )}
                    {check.ok && !check.verified && (
                        <div className="space-y-3 rounded-md border p-3 text-sm">
                            <p className="flex gap-x-2">
                                <AlertTriangle className="size-4 shrink-0 text-yellow-600 mt-0.5" />
                                This statement has no running balance or totals to check the rows against.
                            </p>
                            {needsConfirmation && (
                                <label className="flex items-center gap-x-2 cursor-pointer">
                                    <Checkbox
                                      checked={confirmed}
                                      onCheckedChange={(value) => setConfirmed(value === true)}
                                    />
                                    I&apos;ve checked these rows against my statement
                                </label>
                            )}
                        </div>
                    )}
                    {!check.ok && (
                        <div className="flex gap-x-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
                            <AlertTriangle className="size-4 shrink-0 text-destructive mt-0.5" />
                            <div className="space-y-1">
                                <p className="font-medium">
                                    {blocked
                                      ? "These rows don't add up, so they can't be imported safely."
                                      : "Some rows may not have been read correctly."}
                                </p>
                                {check.issues.map((issue) => (
                                    <p key={issue} className="text-muted-foreground">{issue}</p>
                                ))}
                                <p className="text-muted-foreground">
                                    {blocked
                                      ? "Try a CSV export from your online banking instead."
                                      : "Check the rows below before importing."}
                                </p>
                            </div>
                        </div>
                    )}
                    <div className="rounded-md border overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted">
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    {hasBalance && <TableHead className="text-right">Balance</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.map((row) => (
                                    <TableRow key={row.externalId}>
                                        <TableCell className="whitespace-nowrap">
                                            {format(row.date, "dd MMM yyyy")}
                                        </TableCell>
                                        <TableCell>
                                            <p>{row.payee}</p>
                                            {row.notes && (
                                                <p className="text-xs text-muted-foreground">{row.notes}</p>
                                            )}
                                        </TableCell>
                                        <TableCell className={cn(
                                            "text-right font-medium tabular-nums whitespace-nowrap",
                                            row.amount > 0 && "text-income-strong",
                                        )}>
                                            {row.amount > 0 && "+"}
                                            {formatCurrency(row.amount)}
                                        </TableCell>
                                        {hasBalance && (
                                            <TableCell className="text-right tabular-nums whitespace-nowrap text-muted-foreground">
                                                {row.balance !== undefined ? formatCurrency(row.balance) : ""}
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
