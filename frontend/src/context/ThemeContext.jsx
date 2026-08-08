import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => localStorage.getItem("lg_theme") || "dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", mode === "dark" ? "business" : "corporate");
    localStorage.setItem("lg_theme", mode);
  }, [mode]);

  const toggleTheme = () => setMode((m) => (m === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
