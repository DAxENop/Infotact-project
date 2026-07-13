import { Link } from "react-router-dom";

export default function Sidebar() {
  return (
    <div className="sidebar">
      <h1>LedgerGuard</h1>
      <p className="sidebar-subtitle">Multi-Tenant Billing</p>

      <ul>
        <li>
          <Link to="/dashboard">Dashboard</Link>
        </li>

        <li>
          <Link to="/ledger">Billing Ledger</Link>
        </li>

        <li>
          <Link to="/ledger">Usage Analytics</Link>
        </li>

        <li>
          <Link to="/">Logout</Link>
        </li>
      </ul>
    </div>
  );
}