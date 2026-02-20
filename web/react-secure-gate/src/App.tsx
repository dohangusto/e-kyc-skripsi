import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { routes } from "@/presentation/routes/routes";
import { RoleProvider } from "@/presentation/components/role-context";
import { Toaster } from "@/presentation/components/ui/sonner";
import { ErrorBoundary } from "@/presentation/components/error-boundary";

const queryClient = new QueryClient();
const router = createBrowserRouter(routes);

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <RoleProvider>
        <ErrorBoundary>
          <RouterProvider router={router} />
          <Toaster />
        </ErrorBoundary>
      </RoleProvider>
    </QueryClientProvider>
  );
};

export default App;
