import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { authAPI } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { useTheme } from "@/context/ThemeContext";
import { Shield, Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AnimatedGrid from "@/components/backgrounds/AnimatedGrid";

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", tenantId: "", name: "" });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { mode, toggleTheme } = useTheme();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = isRegister
        ? await authAPI.register(form)
        : await authAPI.login({ email: form.email, password: form.password });
      login(res.data.token, res.data.user);
      toast(isRegister ? "Account created!" : "Welcome back!");
      navigate("/dashboard");
    } catch (err) {
      const msg = err.response?.data?.error || "Something went wrong";
      const issues = err.response?.data?.issues?.fieldErrors;
      const detail = issues ? Object.entries(issues).map(([k, v]) => `${k}: ${v.join(", ")}`).join("; ") : "";
      toast(detail || msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-base-200 px-4 overflow-hidden">
      <AnimatedGrid />
      <button onClick={toggleTheme} className="btn btn-ghost btn-sm btn-circle fixed top-4 right-4 z-20">
        {mode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>

      <div className="relative z-10 w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-3 mb-2">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
              className="h-11 w-11 rounded-xl bg-primary flex items-center justify-center"
            >
              <Shield className="h-6 w-6 text-primary-content" />
            </motion.div>
            <h1 className="text-3xl font-bold">LedgerGuard</h1>
          </div>
          <p className="text-base-content/50 text-sm">Zero-knowledge multi-tenant billing engine</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="card bg-base-100/80 backdrop-blur-sm border border-base-300 shadow-xl"
        >
          <div className="card-body">
            <AnimatePresence mode="wait">
              <motion.h2
                key={isRegister ? "reg" : "login"}
                initial={{ opacity: 0, x: isRegister ? -10 : 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isRegister ? 10 : -10 }}
                transition={{ duration: 0.2 }}
                className="card-title"
              >
                {isRegister ? "Create account" : "Sign in"}
              </motion.h2>
            </AnimatePresence>
            <p className="text-base-content/50 text-sm mb-2">
              {isRegister ? "Register a new tenant account" : "Enter your credentials to continue"}
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <AnimatePresence>
                {isRegister && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden space-y-3"
                  >
                    <div className="form-control">
                      <label className="label"><span className="label-text font-medium">Name</span></label>
                      <input type="text" placeholder="Acme Corp" className="input input-bordered w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                    </div>
                    <div className="form-control">
                      <label className="label"><span className="label-text font-medium">Tenant ID</span></label>
                      <input type="text" placeholder="company_a" className="input input-bordered w-full" value={form.tenantId} onChange={(e) => setForm({ ...form, tenantId: e.target.value })} required />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="form-control">
                <label className="label"><span className="label-text font-medium">Email</span></label>
                <input type="email" placeholder="you@company.com" className="input input-bordered w-full" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text font-medium">Password</span></label>
                <input type="password" placeholder="••••••" className="input input-bordered w-full" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              </div>
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className={`btn btn-primary w-full mt-2 ${loading ? "loading" : ""}`}
              >
                {loading ? "Please wait..." : isRegister ? "Create account" : "Sign in"}
              </motion.button>
            </form>

            <div className="divider text-xs">OR</div>

            <p className="text-center text-sm text-base-content/50">
              {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
              <button onClick={() => setIsRegister(!isRegister)} className="link link-primary font-medium">
                {isRegister ? "Sign in" : "Register"}
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
