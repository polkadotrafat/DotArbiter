import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createBrowserRouter } from "react-router-dom";

import { config, chains } from "./wagmi-config";

import "./index.css";
import App from "./App.tsx";
import { Proposals } from "./components/Proposals";
import { CreateProposal } from "./components/CreateProposal";
import { Delegates } from "./components/Delegates";
import { Profile } from "./components/Profile";
import { ProposalDetail } from "./components/ProposalDetail";
import { Root } from "./components/Root";

const queryClient = new QueryClient();

const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    children: [
      {
        index: true,
        element: <App />,
      },
      {
        path: "proposals",
        element: <Proposals />,
      },
      {
        path: "create-proposal",
        element: <CreateProposal />,
      },
      {
        path: "delegates",
        element: <Delegates />,
      },
      {
        path: "profile",
        element: <Profile />,
      },
      {
        path: "proposal/:id",
        element: <ProposalDetail />,
      },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>
);
