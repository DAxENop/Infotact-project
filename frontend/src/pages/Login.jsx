import { useNavigate } from "react-router-dom";

export default function Login() {
  const n = useNavigate();

  return (
    <div className="login-container">

      <div className="login-box">

        <h1>LedgerGuard</h1>

        <p>Enterprise Billing Platform</p>

        <input placeholder="Email" />

        <input
          type="password"
          placeholder="Password"
        />

        <button onClick={() => n("/dashboard")}>
          Login
        </button>

      </div>

    </div>
  );
}