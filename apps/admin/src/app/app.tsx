import { RouterProvider } from 'react-router-dom';

import { PwaUpdatePrompt } from '@/components/layout/PwaUpdatePrompt';
import { AppProviders } from '@/app/providers';
import { router } from '@/app/router';

export function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
      <PwaUpdatePrompt />
    </AppProviders>
  );
}
