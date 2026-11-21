"use client";

import { useRef, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { extractPdfLines, PdfPasswordError, validatePdfFile } from "@/lib/pdf/extract-lines";
import { parseStatement, type StatementCheck } from "@/lib/statement-parsers";
import { createStatementExternalId } from "@/lib/statement-parsers/helpers";

export type ParsedStatementRow = {
    date: Date;
    payee: string;
    amount: number;
    balance?: number;
    notes?: string;
    externalId: string;
};

export type ParsedStatement = {
    bankName: string;
    rows: ParsedStatementRow[];
    // Whether the rows add up to the statement's own balances and totals.
    check: StatementCheck;
    // Read by the fallback parser rather than one built for this bank.
    isGeneric: boolean;
};

type Props = {
    onParsed: (statement: ParsedStatement) => void;
};

// Everything happens in the browser: the PDF and its password are never uploaded, logged
// or stored. Only the parsed rows leave this component.
export const PdfUploadButton = ({ onParsed }: Props) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isReading, setIsReading] = useState(false);
    const [lockedFile, setLockedFile] = useState<File | null>(null);
    const [password, setPassword] = useState("");
    const [passwordError, setPasswordError] = useState<string | null>(null);

    const closePasswordDialog = () => {
        setLockedFile(null);
        setPassword("");
        setPasswordError(null);
    };

    const readStatement = async (file: File, filePassword?: string) => {
        setIsReading(true);

        try {
            const lines = await extractPdfLines(file, filePassword);
            const { bankName, rows, check, isGeneric } = parseStatement(lines);

            const rowsWithIds = await Promise.all(rows.map(async (row) => ({
                ...row,
                externalId: await createStatementExternalId(row),
            })));

            closePasswordDialog();
            onParsed({ bankName, rows: rowsWithIds, check, isGeneric });
        } catch (error) {
            if (error instanceof PdfPasswordError) {
                setLockedFile(file);
                setPassword("");
                setPasswordError(error.incorrect ? "That password didn't work. Try again." : null);
                return;
            }

            closePasswordDialog();
            toast.error(error instanceof Error ? error.message : "Couldn't read this PDF.");
        } finally {
            setIsReading(false);
        }
    };

    const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        // Reset so choosing the same file again still triggers a change.
        event.target.value = "";

        if (!file) return;

        try {
            validatePdfFile(file);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Please choose a PDF file.");
            return;
        }

        readStatement(file);
    };

    const onSubmitPassword = (event: React.FormEvent) => {
        event.preventDefault();
        if (lockedFile && password) {
            readStatement(lockedFile, password);
        }
    };

    return (
        <>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={onFileChange}
            />
            <Button
              size="sm"
              className="w-full lg:w-auto"
              onClick={() => inputRef.current?.click()}
              disabled={isReading}
            >
                {isReading ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
                Import PDF
            </Button>
            <Dialog open={lockedFile !== null} onOpenChange={(open) => !open && closePasswordDialog()}>
                <DialogContent>
                    <form onSubmit={onSubmitPassword} className="space-y-4">
                        <DialogHeader>
                            <DialogTitle>Password protected statement</DialogTitle>
                            <DialogDescription>
                                Enter the statement&apos;s password. It&apos;s only used to open the file
                                on this device and is never saved or sent anywhere.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-2">
                            <Label htmlFor="statement-password">Password</Label>
                            <Input
                              id="statement-password"
                              type="password"
                              autoComplete="off"
                              autoFocus
                              value={password}
                              onChange={(event) => setPassword(event.target.value)}
                              disabled={isReading}
                            />
                            {passwordError && (
                                <p className="text-sm text-destructive">{passwordError}</p>
                            )}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={closePasswordDialog}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={!password || isReading}>
                                {isReading && <Loader2 className="size-4 animate-spin" />}
                                Open statement
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
};
