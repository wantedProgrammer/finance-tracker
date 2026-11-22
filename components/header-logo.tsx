import React from "react";
import Link from "next/link";
import Image from "next/image";
import type { JSX } from "react";

export const HeaderLogo = (): JSX.Element => {
    return(
        <Link href="/">
            <div className="flex items-center">
                <Image src="/logo.svg" alt="Horizon" width={40} height={40} className="size-9 lg:size-10 lg:mr-2" />
                <p className="hidden lg:block font-display text-white text-3xl ml-2.5 tracking-tight">
                    Horizon
                </p>
            </div>
        </Link>
    );
};