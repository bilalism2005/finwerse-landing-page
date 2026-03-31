import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { supabase } from "@/lib/supabase";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Auth from "./pages/Auth.tsx";
import AuthCallback from "./pages/AuthCallback.tsx";
import WhatsApp from "./pages/WhatsApp.tsx";
import BrokerConnect from "./pages/BrokerConnect.tsx";
import AppLayout from "./components/AppLayout.tsx";
import Discover from "./pages/Discover.tsx";
import StockDetail from "./pages/StockDetail.tsx";
import Portfolio from "./pages/Portfolio.tsx";
import AskAI from "./pages/AskAI.tsx";
import Feed from "./pages/Feed.tsx";
import Alerts from "./pages/Alerts.tsx";
import ImpulseAnalyzer from "./pages/ImpulseAnalyzer.tsx";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(!!session);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthenticated(!!session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <span className="text-4xl font-bebas tracking-wide">
          <span className="text-[#F0F0F0]">FIN</span>
          <span className="text-[#B5FF3C]">WERSE</span>
        </span>
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/whatsapp" element={<ProtectedRoute><WhatsApp /></ProtectedRoute>} />
          <Route path="/broker-connect" element={<ProtectedRoute><BrokerConnect /></ProtectedRoute>} />
          <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="discover" element={<Discover />} />
            <Route path="stock/:symbol" element={<StockDetail />} />
            <Route path="portfolio" element={<Portfolio />} />
            <Route path="ask-ai" element={<AskAI />} />
            <Route path="feed" element={<Feed />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="impulse-analyzer" element={<ImpulseAnalyzer />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
