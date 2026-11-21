import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// "amount" can be picked on more than one column so statements that split
// money into separate Payments / Deposits columns can be summed together.
export const MULTI_COLUMN_OPTIONS = ["amount"];
export const OPTIONS = ["date", "payee", "amount", "notes"];

type Props = {
    columnIndex: number;
    selectedColumns: Record<string, string | null>;
    onChange: (columnIndex: number, value: string | null) => void;
};

export const TableHeadSelect = ({
    columnIndex,
    selectedColumns,
    onChange,
}: Props) => {
    const currentSelection = selectedColumns[`column_${columnIndex}`];

    return (
        <Select
          value={currentSelection || ""}
          onValueChange={(value) => onChange(columnIndex, value === "skip" ? null : value)}
        >
            <SelectTrigger
              className={cn(
                "border-none bg-transparent shadow-none capitalize focus-visible:ring-0 px-0",
                currentSelection && "text-blue-600",
              )}
            >
                <SelectValue placeholder="Skip" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="skip">Skip</SelectItem>
                {OPTIONS.map((option) => {
                    const takenElsewhere =
                      !MULTI_COLUMN_OPTIONS.includes(option) &&
                      Object.entries(selectedColumns).some(
                        ([key, value]) =>
                          value === option && key !== `column_${columnIndex}`
                      );

                    return (
                        <SelectItem
                          key={option}
                          value={option}
                          disabled={takenElsewhere}
                          className="capitalize"
                        >
                            {option}
                        </SelectItem>
                    );
                })}
            </SelectContent>
        </Select>
    );
};
