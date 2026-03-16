import { UserButton } from '@clerk/clerk-react';

export default function Home() {
  return (
    <UserButton afterSignOutUrl="/" />
  );
}
