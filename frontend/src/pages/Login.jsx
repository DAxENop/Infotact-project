import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { authAPI } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { useTheme } from "@/context/ThemeContext";
import { Shield, Sun, Moon } from "lucide-react";

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
      toast(err.response?.data?.error || "Something went wrong", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 px-4">
      <button onClick={toggleTheme} className="btn btn-ghost btn-sm btn-circle fixed top-4 right-4 z-10">
        {mode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-2">
            <div className="h-11 w-11 rounded-xl bg-primary flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary-content" />
            </div>
            <h1 className="text-3xl font-bold">LedgerGuard</h1>
          </div>
          <p className="text-base-content/50 text-sm">Zero-knowledge multi-tenant billing engine</p>
        </div>

        <div className="card bg-base-100 border border-base-300">
          <div className="card-body">
            <h2 className="card-title">{isRegister ? "Create account" : "Sign in"}</h2>
            <p className="text-base-content/50 text-sm mb-2">
              {isRegister ? "Register a new tenant account" : "Enter your credentials to continue"}
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              {isRegister && (
                <>
                  <div className="form-control">
                    <label className="label"><span className="label-text font-medium">Name</span></label>
                    <input type="text" placeholder="Acme Corp" className="input input-bordered w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div className="form-control">
                    <label className="label"><span className="label-text font-medium">Tenant ID</span></label>
                    <input type="text" placeholder="company_a" className="input input-bordered w-full" value={form.tenantId} onChange={(e) => setForm({ ...form, tenantId: e.target.value })} required />
                  </div>
                </>
              )}
              <div className="form-control">
                <label className="label"><span className="label-text font-medium">Email</span></label>
                <input type="email" placeholder="you@company.com" className="input input-bordered w-full" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text font-medium">Password</span></label>
                <input type="password" placeholder="••••••" className="input input-bordered w-full" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              </div>
              <button type="submit" className={`btn btn-primary w-full mt-2 ${loading ? "loading" : ""}`}>
                {loading ? "Please wait..." : isRegister ? "Create account" : "Sign in"}
              </button>
            </form>

            <div className="divider text-xs">OR</div>

            <p className="text-center text-sm text-base-content/50">
              {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
              <button onClick={() => setIsRegister(!isRegister)} className="link link-primary font-medium">
                {isRegister ? "Sign in" : "Register"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
