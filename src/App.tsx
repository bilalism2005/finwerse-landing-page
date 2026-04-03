import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import BrokerConnect from "./pages/BrokerConnect.tsx";
import AppLayout from "./components/AppLayout.tsx";
import ProtectedRoute from "./components/ProtectedRoute.tsx";
import Auth from "./pages/Auth.tsx";
import Discover from "./pages/Discover.tsx";
import StockDetail from "./pages/StockDetail.tsx";
import Portfolio from "./pages/Portfolio.tsx";
import AskAI from "./pages/AskAI.tsx";
import Feed from "./pages/Feed.tsx";
import Alerts from "./pages/Alerts.tsx";
import ImpulseAnalyzer from "./pages/ImpulseAnalyzer.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/broker-connect" element={<BrokerConnect />} />
              <Route path="/app" element={<AppLayout />}>
                <Route path="discover" element={<Discover />} />
                <Route path="stock/:symbol" element={<StockDetail />} />
                <Route path="portfolio" element={<Portfolio />} />
                <Route path="ask-ai" element={<AskAI />} />
                <Route path="feed" element={<Feed />} />
                <Route path="alerts" element={<Alerts />} />
                <Route path="impulse-analyzer" element={<ImpulseAnalyzer />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
