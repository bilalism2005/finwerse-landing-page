import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Search, Briefcase, Sparkles, Newspaper, Menu, X, User, Bell, BarChart3, Settings, Link2, LogOut } from "lucide-react";
import { alerts } from "@/lib/dummyData";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const navItems = [
  { label: "Discover", path: "/app/discover", icon: Search },
  { label: "Portfolio", path: "/app/portfolio", icon: Briefcase },
  { label: "Ask AI", path: "/app/ask-ai", icon: Sparkles },
  { label: "Feed", path: "/app/feed", icon: Newspaper },
];

const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const isAskAI = location.pathname === "/app/ask-ai";
  const unreadAlerts = alerts.filter((a) => a.active).length;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#F0F0F0] font-dm relative">
      {/* Desktop Header */}
      <header className="hidden md:flex fixed top-0 left-0 right-0 z-50 h-14 items-center justify-between px-6 bg-[#0D0D0D]/95 backdrop-blur-md border-b border-[#1a1a1a]">
        <div className="flex items-center gap-6">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 hover:bg-[#1a1a1a] rounded-lg transition-colors">
            <Menu size={20} />
          </button>
          <span className="text-xl font-bebas tracking-wide cursor-pointer" onClick={() => navigate("/")}>Finwerse</span>
          <nav className="flex items-center gap-1 ml-4">
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${active ? "bg-[#1a1a1a] text-primary" : "text-[#999] hover:text-[#F0F0F0] hover:bg-[#111]"}`}
                >
                  <item.icon size={16} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
        <button className="p-2 hover:bg-[#1a1a1a] rounded-full transition-colors">
          <User size={20} />
        </button>
      </header>

      {/* Mobile Header */}
      <header className="flex md:hidden fixed top-0 left-0 right-0 z-50 h-12 items-center justify-between px-4 bg-[#0D0D0D]/95 backdrop-blur-md border-b border-[#1a1a1a]">
        <button onClick={() => setSidebarOpen(true)} className="p-1.5">
          <Menu size={20} />
        </button>
        <span className="text-lg font-bebas tracking-wide">Finwerse</span>
        <button className="p-1.5">
          <User size={18} />
        </button>
      </header>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Left Sidebar */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-[70] w-72 bg-[#111111] border-r border-[#1a1a1a] transform transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between p-5 border-b border-[#1a1a1a]">
          <span className="text-lg font-bebas tracking-wide">Finwerse</span>
          <button onClick={() => setSidebarOpen(false)} className="p-1 hover:bg-[#1a1a1a] rounded-lg">
            <X size={18} />
          </button>
        </div>
        <nav className="p-4 flex flex-col gap-1">
          <button
            onClick={() => { navigate("/app/alerts"); setSidebarOpen(false); }}
            className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-[#1a1a1a] transition-colors text-sm"
          >
            <div className="flex items-center gap-3">
              <Bell size={18} />
              <span>Alerts</span>
            </div>
            {unreadAlerts > 0 && (
              <span className="bg-[#FF5050] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{unreadAlerts}</span>
            )}
          </button>
          <button
            onClick={() => { navigate("/app/impulse-analyzer"); setSidebarOpen(false); }}
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[#1a1a1a] transition-colors text-sm"
          >
            <BarChart3 size={18} />
            <span>Impulse Analyzer</span>
          </button>
          <button className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[#1a1a1a] transition-colors text-sm">
            <Settings size={18} />
            <span>Settings</span>
          </button>

          <div className="mt-1">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[#1a1a1a] transition-colors text-sm text-red-400">
                  <LogOut size={18} />
                  <span>Sign Out</span>
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-[#111111] border-[#2a2a2a] text-[#F0F0F0]">
                <AlertDialogHeader>
                  <AlertDialogTitle>Sign out?</AlertDialogTitle>
                  <AlertDialogDescription className="text-[#666]">
                    You'll need to sign in again to access your account.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-transparent border-[#2a2a2a] text-[#F0F0F0] hover:bg-[#1a1a1a]">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleSignOut}
                    className="bg-red-500 hover:bg-red-600 text-white"
                  >
                    Sign Out
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="mt-4 mx-4 p-3 rounded-lg bg-[#0D0D0D] border border-[#1a1a1a]">
            <div className="flex items-center gap-2 text-xs text-[#666]">
              <Link2 size={14} />
              <span>Connected Broker</span>
            </div>
            <p className="text-sm font-medium mt-1">Zerodha — Kite API</p>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="pt-12 md:pt-14 pb-20 md:pb-6">
        <Outlet />
      </main>

      {/* Floating Ask AI Button */}
      {!isAskAI && (
        <button
          onClick={() => navigate("/app/ask-ai")}
          className="fixed bottom-24 md:bottom-8 right-5 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
        >
          <Sparkles size={22} />
        </button>
      )}

      {/* Mobile Bottom Tabs */}
      <nav className="flex md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 bg-[#0D0D0D]/95 backdrop-blur-md border-t border-[#1a1a1a] items-center justify-around px-2">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors ${active ? "text-primary" : "text-[#666]"}`}
            >
              <item.icon size={20} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default AppLayout;
