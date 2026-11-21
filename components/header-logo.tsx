import React from "react";
import Link from "next/link";
import Image from "next/image";
import type { JSX } from "react";

export const HeaderLogo = (): JSX.Element => {
    return(
        <Link href="/">
            <div className="items-center hidden lg:flex">
                <Image src="/logo.svg" alt="Logo" width={40} height={40} className="mr-2" />
                <p className="font-display text-white text-3xl ml-2.5 tracking-tight">
                    Horizon
                </p>
            </div>
        </Link>
    );
};