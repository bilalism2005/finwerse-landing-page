import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import PainSection from "@/components/PainSection";
import SolutionSection from "@/components/SolutionSection";
import PreFooter from "@/components/PreFooter";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground scroll-smooth">
      <Header />
      <HeroSection />
      <PainSection />
      <SolutionSection />
      <PreFooter />
      <Footer />
    </div>
  );
};

export default Index;
