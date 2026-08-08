import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "./Sidebar";
import { Menu, LogOut } from "lucide-react";

export default function Layout() {
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    navigate("/");
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b px-6 py-3 bg-background">
          <div className="flex items-center gap-3 md:hidden">
            <Menu className="h-5 w-5" />
            <span className="font-bold">LedgerGuard</span>
          </div>
          <div />
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">{user?.tenantId}</span>
            <button onClick={() => { logout(); navigate("/"); }} className="md:hidden p-2 hover:bg-muted rounded-md cursor-pointer">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6 bg-muted/30">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
