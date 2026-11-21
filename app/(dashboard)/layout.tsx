import { Suspense } from 'react';

import { Header } from '@/components/header';

type Props = {
    children: React.ReactNode;
};

const DashboardLayout = ({ children }: Props) => {
    return (
        <>
          <Header />
          {/* relative z-10 keeps page cards above the header, which they overlap by 6rem. */}
          <main className="relative z-10 px-3 lg:px-14">
            {/* Pages read filters with useSearchParams, which needs a Suspense boundary to build. */}
            <Suspense>
              {children}
            </Suspense>
          </main>
        </>
    );
}

export default DashboardLayout;