import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useEffect } from "react";
import Dashboard from "@/pages/Dashboard";
import Swap from "@/pages/Swap";
import SpotTrading from "@/pages/SpotTrading";
import Portfolio from "@/pages/Portfolio";
import TransactionHistory from "@/pages/TransactionHistory";
import NotFound from "@/pages/not-found";
import Layout from "@/components/Layout";
import { Web3Provider } from "@/lib/web3Context";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/swap" component={Swap} />
        <Route path="/trade" component={SpotTrading} />
        <Route path="/portfolio" component={Portfolio} />
        <Route path="/history" component={TransactionHistory} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  // Add custom font styles to match design
  useEffect(() => {
    document.body.className = "font-sans text-neutral-50 bg-neutral-900 min-h-screen";

    // Add custom scrollbar styles
    const style = document.createElement('style');
    style.textContent = `
      ::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      ::-webkit-scrollbar-track {
        background: #1F2937;
      }
      ::-webkit-scrollbar-thumb {
        background: #4B5563;
        border-radius: 3px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: #6B7280;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <Web3Provider>
      <QueryClientProvider client={queryClient}>
        <Router />
        <Toaster />
      </QueryClientProvider>
    </Web3Provider>
  );
}

export default App;