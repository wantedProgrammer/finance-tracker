import { Suspense } from 'react';

import { Header } from '@/components/header';

type Props = {
    children: React.ReactNode;
};

const DashboardLayout = ({ children }: Props) => {
    return (
        <>
          <Header />
          <main className="px-3 lg:px-14">
            {/* Pages read filters with useSearchParams, which needs a Suspense boundary to build. */}
            <Suspense>
              {children}
            </Suspense>
          </main>
        </>
    );
}

export default DashboardLayout;