import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

import { TableHeadSelect } from "./table-head-select";

type Props = {
    headers: string[];
    body: string[][];
    selectedColumns: Record<string, string | null>;
    onTableHeadSelectChange: (columnIndex: number, value: string | null) => void;
};

export const ImportTable = ({
    headers,
    body,
    selectedColumns,
    onTableHeadSelectChange,
}: Props) => {
    return (
        <div className="rounded-md border overflow-hidden">
            <Table>
                <TableHeader className="bg-muted">
                    <TableRow>
                        {headers.map((header, index) => (
                            <TableHead key={index}>
                                <div className="flex flex-col py-1">
                                    <span className="text-xs text-muted-foreground font-normal">
                                        {header}
                                    </span>
                                    <TableHeadSelect
                                      columnIndex={index}
                                      selectedColumns={selectedColumns}
                                      onChange={onTableHeadSelectChange}
                                    />
                                </div>
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {body.map((row, index) => (
                        <TableRow key={index}>
                            {row.map((cell, cellIndex) => (
                                <TableCell key={cellIndex}>
                                    {cell}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};
