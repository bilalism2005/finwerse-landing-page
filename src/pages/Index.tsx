import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import SolutionSection from "@/components/SolutionSection";
import PreFooter from "@/components/PreFooter";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (session) navigate("/broker-connect", { replace: true });
  }, [session, navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground scroll-smooth">
      <Header />
      <HeroSection />
      <SolutionSection />
      <PreFooter />
      <Footer />
    </div>
  );
};

export default Index;
