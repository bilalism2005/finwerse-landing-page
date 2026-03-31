import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/whatsapp", { replace: true });
      } else {
        navigate("/auth", { replace: true });
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
      <span className="text-4xl font-bebas tracking-wide">
        <span className="text-[#F0F0F0]">FIN</span>
        <span className="text-[#B5FF3C]">WERSE</span>
      </span>
    </div>
  );
};

export default AuthCallback;
