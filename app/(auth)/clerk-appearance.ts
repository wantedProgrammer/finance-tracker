// Shared Clerk appearance for the sign-in and sign-up pages, matching Horizon's design system
// (app/globals.css). Clerk builds hover and focus shades from these colours, so they're hex
// values that mirror the CSS tokens.
//
// Elements use style objects, not Tailwind classes: Clerk's own styles win over utility classes,
// but style objects are applied after them, so they reliably override Clerk's defaults.

// --brand (logo blue)
const BRAND = "#1d4ed8";
// The orange --highlight (#f59e0b) is only 2.15:1 on white, too faint for link text.
// This darker orange (amber-700) keeps the highlight look and passes WCAG AA (5:1).
const HIGHLIGHT_TEXT = "#b45309";

const link = { color: HIGHLIGHT_TEXT, fontWeight: 500, "&:hover": { color: HIGHLIGHT_TEXT, textDecoration: "underline" } };

export const clerkAppearance = {
    variables: {
        colorPrimary: BRAND,
        colorText: "#0f172a",
        colorTextSecondary: "#64748b",
        colorBackground: "#ffffff",
        colorInputBackground: "#ffffff",
        colorInputText: "#0f172a",
        colorDanger: "#be123c",
        colorSuccess: "#047857",
        // Matches the app's --radius (0.625rem).
        borderRadius: "0.625rem",
        fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
    },
    elements: {
        // The page provides the card (with the heading inside it), so Clerk's own card is
        // stripped back to just the form: no border, shadow, background or padding.
        // Clerk gives the form a fixed ~400px width; let it fill the page's card instead, so it
        // fits narrow phones.
        rootBox: { width: "100%", maxWidth: "100%" },
        cardBox: { width: "100%", maxWidth: "100%", boxShadow: "none", border: "none", borderRadius: 0, background: "transparent", overflow: "visible" },
        card: { width: "100%", maxWidth: "100%", boxShadow: "none", border: "none", borderRadius: 0, background: "transparent", padding: 0, gap: "1.5rem" },
        // The page heading replaces Clerk's title ("Sign in to …").
        header: { display: "none" },
        // Clerk's footer (the "Don't have an account?" area) has its own grey panel; blend it in.
        footer: { background: "transparent", borderTop: "1px solid rgb(15 23 42 / 0.06)", marginTop: "0.5rem", paddingTop: "0.25rem" },
        footerAction: { justifyContent: "center" },
        socialButtonsBlockButton: { borderColor: "rgb(15 23 42 / 0.12)", boxShadow: "none" },
        formButtonPrimary: { textTransform: "none", fontSize: "0.875rem" },
        formFieldInput: { borderColor: "rgb(15 23 42 / 0.12)", boxShadow: "none" },
        // Links in the highlight orange ("Sign up", "Forgot password?", "Resend code", "Edit").
        footerActionLink: link,
        formFieldAction: link,
        formResendCodeLink: link,
        identityPreviewEditButton: { color: HIGHLIGHT_TEXT },
        // Phone sign-in isn't used.
        phoneNumberField: { display: "none" },
    },
    layout: {
        socialButtonsPlacement: "top" as const,
        // Hides Clerk's "Development mode" label while the app runs on a development instance
        // (pk_test_ keys). This only hides the label; it's still a development instance.
        // It has no effect on a production instance, which never shows the label.
        unsafe_disableDevelopmentModeWarnings: true,
    },
};
