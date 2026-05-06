import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// FALTA DEVTOOLS, importante!

const queryClient = new QueryClient();

export const withReactQuery = (children: React.ReactNode) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

