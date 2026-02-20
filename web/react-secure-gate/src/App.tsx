import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { routes } from "@/presentation/routes/routes";
import { RoleProvider } from "@/presentation/components/role-context";

const queryClient = new QueryClient();
const router = createBrowserRouter(routes);

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <RoleProvider>
        <RouterProvider router={router} />
      </RoleProvider>
    </QueryClientProvider>
  );
};

export default App;
