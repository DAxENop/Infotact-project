import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { LayoutDashboard, Receipt, LogOut, Lock } from "lucide-react";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/ledger", label: "Billing Ledger", icon: Receipt },
];

export default function Sidebar() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate("/"); };

  return (
    <aside className="hidden md:flex w-64 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 px-6 py-5 border-b">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
          <Lock className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-bold text-lg">LedgerGuard</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t px-4 py-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
            {user?.name?.[0] || user?.email?.[0] || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name || "User"}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors w-full cursor-pointer">
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
