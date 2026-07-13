import { useState } from "react";
import LedgerTable from "../components/LedgerTable";
import AddTransactionModal from "../components/AddTransactionModal";
import Toast from "../components/Toast";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import "../styles/ledger.css";

const initialTransactions = [
  {
    id: "TXN1001",
    tenant: "Company A",
    amount: 2500,
    status: "Success",
    date: "13 Jul 2026",
  },
  {
    id: "TXN1002",
    tenant: "Company B",
    amount: 1800,
    status: "Failed",
    date: "13 Jul 2026",
  },
  {
    id: "TXN1003",
    tenant: "Company C",
    amount: 3500,
    status: "Pending",
    date: "13 Jul 2026",
  },
];

export default function Ledger() {
  const [transactions, setTransactions] = useState(initialTransactions);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const [showModal, setShowModal] = useState(false);

  const [showToast, setShowToast] = useState(false);

  const [toastMessage, setToastMessage] = useState("");

  const addTransaction = (transaction) => {
    setTransactions((prev) => [...prev, transaction]);

    setToastMessage("Transaction Added Successfully");

    setShowToast(true);
  };

  const filteredTransactions = transactions.filter((t) => {
    const searchMatch =
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.tenant.toLowerCase().includes(search.toLowerCase());

    const filterMatch =
      filter === "All" || t.status === filter;

    return searchMatch && filterMatch;
  });

  const success = transactions.filter(
    (t) => t.status === "Success"
  ).length;

  const failed = transactions.filter(
    (t) => t.status === "Failed"
  ).length;

  const pending = transactions.filter(
    (t) => t.status === "Pending"
  ).length;

  const revenue = transactions
    .filter((t) => t.status === "Success")
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="dashboard ledger-dashboard">
      <Sidebar />

      <div className="content">
        <Navbar />

        <div className="ledger-page">

          <h2>Billing Ledger</h2>

          <div className="cards ledger-cards">

            <div className="ledger-card">
              <h3>Successful</h3>
              <p>{success}</p>
            </div>

            <div className="ledger-card">
              <h3>Failed</h3>
              <p>{failed}</p>
            </div>

            <div className="ledger-card">
              <h3>Pending</h3>
              <p>{pending}</p>
            </div>

            <div className="ledger-card">
              <h3>Revenue</h3>
              <p>₹{revenue}</p>
            </div>

          </div>

          <div className="toolbar">

            <input
              type="text"
              placeholder="Search Transaction..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option>All</option>
              <option>Success</option>
              <option>Failed</option>
              <option>Pending</option>
            </select>

            <button
              className="add-btn"
              onClick={() => setShowModal(true)}
            >
              + Add Transaction
            </button>

          </div>

          <LedgerTable transactions={filteredTransactions} />

          <AddTransactionModal
            show={showModal}
            onClose={() => setShowModal(false)}
            onAdd={addTransaction}
          />

          <Toast
            show={showToast}
            message={toastMessage}
            onClose={() => setShowToast(false)}
          />
        </div>
      </div>

    </div>
  );
}