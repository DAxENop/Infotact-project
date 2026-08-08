import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import Sidebar from "./Sidebar";
import { Shield, Sun, Moon, LogOut } from "lucide-react";

export default function Layout() {
  const { isAuthenticated, logout, user } = useAuth();
  const { mode, toggleTheme } = useTheme();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    navigate("/");
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-base-200">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-base-300 px-6 py-3 bg-base-100">
          <div className="flex items-center gap-3 md:hidden">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-bold">LedgerGuard</span>
          </div>
          <div />
          <div className="flex items-center gap-2">
            <span className="badge badge-outline badge-sm hidden sm:inline-flex">{user?.tenantId}</span>
            <button onClick={toggleTheme} className="btn btn-ghost btn-sm btn-circle">
              {mode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button onClick={() => { logout(); navigate("/"); }} className="btn btn-ghost btn-sm btn-circle md:hidden">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
