import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";


import Link from "next/link";


type Props = {
    href: string;
    label: string;
    isActive?: boolean;
};

export const NavButton = ({
    href,
    label,
    isActive,
}: Props) => {
    return(
        <Button
          asChild
          size="sm"
          variant="outline"
          className={cn(
            "w-full lg:w-auto justify-between font-normal hover:bg-white/20 hover:text-white border-none focus-visible:ring-offset-0 focus-visible:ring-transparent outline-none text-white focus:bg-white/30 transition",
            isActive ? "bg-white/10 text-white" : "bg-transparent",
            // Orange underline marks the current page; the text itself stays white.
            isActive && "relative after:absolute after:inset-x-3 after:bottom-0.5 after:h-0.5 after:rounded-full after:bg-highlight"
          )}
        >
            <Link href={href}>
                {label}
            </Link>
        </Button>
    );
};
