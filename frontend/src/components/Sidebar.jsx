import { Link } from "react-router-dom";

export default function Sidebar() {
  return (
    <div className="sidebar">
      <h1>LedgerGuard</h1>

      <ul>
        <li>
          <Link to="/dashboard">Dashboard</Link>
        </li>

        <li>
          <Link to="/ledger">Billing Ledger</Link>
        </li>

        <li>
          <a href="#">Analytics</a>
        </li>

        <li>
          <a href="#">Settings</a>
        </li>
      </ul>
    </div>
  );
}