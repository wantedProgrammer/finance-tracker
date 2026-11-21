"use client";

import { useClerk, useUser } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

const getInitials = (name?: string | null) =>
    (name ?? "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?";

export const ProfileCard = () => {
    const { user, isLoaded } = useUser();
    const { openUserProfile } = useClerk();

    const name = user?.fullName || user?.username || "Your account";
    const email = user?.primaryEmailAddress?.emailAddress;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-2xl">Profile</CardTitle>
                <CardDescription>Your account details</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row sm:items-center gap-4">
                {!isLoaded ? (
                    <div className="flex items-center gap-x-4 flex-1">
                        <Skeleton className="size-14 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-5 w-40" />
                            <Skeleton className="h-4 w-56" />
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-x-4 flex-1 min-w-0">
                        <Avatar className="size-14">
                            <AvatarImage src={user?.imageUrl} alt={name} />
                            <AvatarFallback>{getInitials(user?.fullName)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                            <p className="font-medium truncate">{name}</p>
                            {email && (
                                <p className="text-sm text-muted-foreground truncate">{email}</p>
                            )}
                        </div>
                    </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openUserProfile()}
                  disabled={!isLoaded}
                  className="w-full sm:w-auto"
                >
                    Manage account
                </Button>
            </CardContent>
        </Card>
    );
};
