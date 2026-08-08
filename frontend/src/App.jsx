import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Ledger from "@/pages/Ledger";

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/" />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/ledger" element={<Ledger />} />
      </Route>
    </Routes>
  );
}
