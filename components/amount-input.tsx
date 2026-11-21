import { Info, MinusCircle, PlusCircle } from "lucide-react";
import CurrencyInput from "react-currency-input-field";

import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

type Props = {
    value: string;
    onChange: (value: string | undefined) => void;
    placeholder?: string | number;
    disabled?: boolean;
}

export const AmountInput = ({
    value,
    onChange,
    placeholder,
    disabled,
}: Props) => {
    const parsedValue = parseFloat(value);
    const isIncome = parsedValue > 0;
    const isExpense = parsedValue < 0;

    const onReserveValue = () => {
        if (!value) return;

        const newValue = parseFloat(value) * -1;
        onChange(newValue.toString());
    };

    return (
        <div className="relative">
            <TooltipProvider>
                <Tooltip delayDuration={100}>   
                    <TooltipTrigger asChild>    
                        <button
                          type="button"
                          onClick={onReserveValue}
                          className={cn(
                            "bg-slate-400 hover:bg-slate-500 absolute top-1.5 left-1.5 rounded-md p-2 flex items-center justify-center transition",
                             isIncome && "bg-income hover:bg-income/90",
                             isExpense && "bg-expense hover:bg-expense/90",
                          )}>    
                            {!parsedValue && <Info className="size-3 text-white" />}
                            {isIncome && <PlusCircle className="size-3 text-white" />}
                            {isExpense && <MinusCircle className="size-3 text-white" />}
                        </button>
                    </TooltipTrigger>
                    <TooltipContent>    
                        Use [+] for income and [-] for expenses
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>   
            <CurrencyInput 
                prefix="R"
                className={cn(
                    "pl-10 h-9 w-full min-w-0 rounded-md border border-input bg-transparent pr-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
                    "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
                    "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
                )}
                placeholder={placeholder?.toString()}
                value={value}
                decimalSeparator="."
                groupSeparator=","
                decimalsLimit={2}
                decimalScale={2}
                onValueChange={onChange}
                disabled={disabled}
            />
            <p className="text-xs text-muted-foreground mt-2"> 
                {isIncome && "This will count as income"}
                {isExpense && "This will count as expense"}
            </p>
        </div>
    );
};