import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { authAPI } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Lock, Mail, Building2 } from "lucide-react";

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", tenantId: "", name: "" });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

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
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Lock className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">LedgerGuard</h1>
          </div>
          <p className="text-muted-foreground text-sm">Zero-knowledge billing engine</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isRegister ? "Create account" : "Sign in"}</CardTitle>
            <CardDescription>
              {isRegister ? "Register a new tenant account" : "Enter your credentials to continue"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <div className="relative">
                      <Input id="name" placeholder="Acme Corp" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tenantId">Tenant ID</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="tenantId" placeholder="company_a" className="pl-9" value={form.tenantId} onChange={(e) => setForm({ ...form, tenantId: e.target.value })} required />
                    </div>
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="email" type="email" placeholder="you@company.com" className="pl-9" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="password" type="password" placeholder="••••••" className="pl-9" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Please wait..." : isRegister ? "Create account" : "Sign in"}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
              <button onClick={() => setIsRegister(!isRegister)} className="text-primary underline hover:no-underline cursor-pointer">
                {isRegister ? "Sign in" : "Register"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
