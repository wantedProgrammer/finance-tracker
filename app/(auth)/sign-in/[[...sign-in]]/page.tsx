import { Loader2 } from "lucide-react";
import { SignIn, ClerkLoaded, ClerkLoading } from '@clerk/nextjs';

import { clerkAppearance } from "../../clerk-appearance";

export default function Page() {
  return (
    <>
      <ClerkLoaded>
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          appearance={clerkAppearance}
        />
      </ClerkLoaded>
      <ClerkLoading>
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </ClerkLoading>
    </>
  );
}
