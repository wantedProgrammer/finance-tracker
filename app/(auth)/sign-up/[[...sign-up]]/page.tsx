import { Loader2 } from "lucide-react";
import { SignUp, ClerkLoaded, ClerkLoading } from '@clerk/nextjs';

import { clerkAppearance } from "../../clerk-appearance";

export default function Page() {
  return (
    <>
      <ClerkLoaded>
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
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
