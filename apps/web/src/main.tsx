import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initSupabase } from "@finwerse/shared";

initSupabase(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

createRoot(document.getElementById("root")!).render(<App />);
