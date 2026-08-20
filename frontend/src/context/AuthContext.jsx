import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

function isTokenValid(token) {
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    const stored = localStorage.getItem("lg_token");
    if (stored && !isTokenValid(stored)) {
      localStorage.removeItem("lg_token");
      localStorage.removeItem("lg_user");
      return null;
    }
    return stored;
  });

  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("lg_user");
    if (!token) return null;
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    if (token && !isTokenValid(token)) {
      localStorage.removeItem("lg_token");
      localStorage.removeItem("lg_user");
      setToken(null);
      setUser(null);
    }
  }, [token]);

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
