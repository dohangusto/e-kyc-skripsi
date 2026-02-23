import { LandingPage } from "@/presentation/pages/landing-page";

export const routes = [
  {
    path: "/",
    element: <LandingPage />,
  },
  {
    path: "*",
    element: <LandingPage />,
  },
];
