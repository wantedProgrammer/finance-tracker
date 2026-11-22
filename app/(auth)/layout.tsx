import Image from "next/image";
import { FileUp, LineChart, RefreshCw } from "lucide-react";

type Props = {
    children: React.ReactNode;
};

const FEATURES = [
    {
        icon: LineChart,
        title: "Dashboard insights",
        description: "See where your money goes, by category and over time.",
    },
    {
        icon: FileUp,
        title: "CSV and PDF statement import",
        description: "Bring in months of transactions from your bank in seconds.",
    },
    {
        icon: RefreshCw,
        title: "Investec sync",
        description: "Keep your Investec transactions up to date automatically.",
    },
];

// Shared by sign-in and sign-up. One continuous Horizon sky (the dashboard header's gradient
// and horizon glow) with the form as a single card resting on it, the same way dashboard
// cards rise over the header. Brand copy sits beside the card on large screens; on small
// screens the logo sits above the card.
const AuthLayout = ({ children }: Props) => {
    return (
        <div className="relative isolate min-h-screen overflow-hidden bg-gradient-to-b from-brand to-brand-end">
            {/* Horizon: a warm line across the page and a sun rising behind the card. */}
            {/* Placed below the content so the line never runs through text. */}
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[82%] lg:top-[80%] -z-10">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-highlight/90 to-transparent mix-blend-screen" />
                <div className="absolute left-1/2 lg:left-3/4 top-0 h-56 w-[40rem] max-w-[95vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-highlight/50 blur-3xl mix-blend-screen" />
            </div>

            {/* minmax(0,1fr) stops a wide child (Clerk's form) from stretching the column past the screen. */}
            <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-[minmax(0,1fr)] items-center gap-12 px-4 py-10 lg:grid-cols-2 lg:gap-20 lg:px-10">
                <section className="hidden lg:block space-y-10 text-white">
                    <div className="flex items-center gap-x-3">
                        <Image src="/logo.svg" alt="" width={44} height={44} priority />
                        <span className="font-display text-3xl tracking-tight">Horizon</span>
                    </div>
                    <h2 className="font-display text-6xl leading-[1.05] tracking-tight">
                        Take control of your money.
                    </h2>
                    <ul className="space-y-6 max-w-md">
                        {FEATURES.map(({ icon: Icon, title, description }) => (
                            <li key={title} className="flex gap-x-4">
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/20">
                                    <Icon className="size-5" />
                                </div>
                                <div className="space-y-1">
                                    <p className="font-medium">{title}</p>
                                    <p className="text-sm text-white/75">{description}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>

                <section className="w-full min-w-0 max-w-md justify-self-center lg:justify-self-end">
                    <div className="mb-6 flex items-center justify-center gap-x-2 lg:hidden">
                        <Image src="/logo.svg" alt="" width={36} height={36} priority />
                        <span className="font-display text-2xl text-white tracking-tight">Horizon</span>
                    </div>
                    {/* One card: the heading and the Clerk form read as a single piece. */}
                    <div className="rounded-3xl bg-card p-6 sm:p-8 shadow-[0_1px_2px_rgb(15_23_42/0.06),0_32px_64px_-24px_rgb(15_23_42/0.45)] ring-1 ring-white/30">
                        <div className="mb-6 space-y-2 text-center">
                            <h1 className="font-display text-4xl tracking-tight text-foreground">
                                Welcome Back
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Log in or Create an account to get back to your dashboard
                            </p>
                        </div>
                        {children}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default AuthLayout;
