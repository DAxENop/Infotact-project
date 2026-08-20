import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { LayoutDashboard, Receipt, LogOut, Shield, Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/ledger", label: "Billing Ledger", icon: Receipt },
];

export default function Sidebar() {
  const { logout, user } = useAuth();
  const { mode, toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <aside className="hidden md:flex w-64 flex-col bg-base-100 border-r border-base-300">
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-3 px-5 py-5 border-b border-base-300"
      >
        <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
          <Shield className="h-5 w-5 text-primary-content" />
        </div>
        <span className="font-bold text-lg">LedgerGuard</span>
      </motion.div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ to, label, icon: Icon }, i) => (
          <NavLink
            key={to}
            to={to}
            className="relative block"
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-lg bg-primary/10"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive ? "text-primary" : "text-base-content/60 hover:bg-base-200"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </motion.div>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-base-300 px-4 py-4 space-y-3">
        <motion.button
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.98 }}
          onClick={toggleTheme}
          className="btn btn-ghost btn-sm w-full justify-start gap-3"
        >
          {mode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          <span className="text-sm">{mode === "dark" ? "Light mode" : "Dark mode"}</span>
        </motion.button>

        <div className="flex items-center gap-3 px-1">
          <motion.div whileHover={{ scale: 1.05 }} className="avatar placeholder">
            <div className="bg-primary text-primary-content rounded-full w-8 h-8">
              <span className="text-xs">{user?.name?.[0] || user?.email?.[0] || "U"}</span>
            </div>
          </motion.div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name || "User"}</p>
            <p className="text-xs text-base-content/50 truncate">{user?.email}</p>
          </div>
        </div>

        <motion.button
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { logout(); navigate("/"); }}
          className="btn btn-ghost btn-sm text-error w-full justify-start gap-3"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </motion.button>
      </div>
    </aside>
  );
}
