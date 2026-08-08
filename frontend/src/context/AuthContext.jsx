import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("lg_token"));
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("lg_user");
    return stored ? JSON.parse(stored) : null;
  });

  const login = (token, user) => {
    localStorage.setItem("lg_token", token);
    localStorage.setItem("lg_user", JSON.stringify(user));
    setToken(token);
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem("lg_token");
    localStorage.removeItem("lg_user");
    setToken(null);
    setUser(null);
  };

  const tenantId = user?.tenantId || user?.tid || null;

  return (
    <AuthContext.Provider value={{ token, user, tenantId, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
