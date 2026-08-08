import { useState, useEffect } from "react";
import { ledgerAPI } from "@/lib/api";
import { DollarSign, Receipt, Activity, Database } from "lucide-react";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler } from "chart.js";
import { Bar, Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, entries: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ledgerAPI
      .list(1, 100)
      .then((res) => setStats({ total: res.data.total || 0, entries: res.data.entries || [] }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalRevenue = stats.entries.reduce((sum, e) => sum + (e.amount || 0), 0);
  const avgAmount = stats.entries.length ? totalRevenue / stats.entries.length : 0;

  const statCards = [
    { title: "Total Revenue", value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, accent: "text-success", bg: "bg-success/10" },
    { title: "Transactions", value: stats.total, icon: Receipt, accent: "text-info", bg: "bg-info/10" },
    { title: "Avg. Amount", value: `$${avgAmount.toFixed(2)}`, icon: Activity, accent: "text-warning", bg: "bg-warning/10" },
    { title: "Active DBs", value: "1", icon: Database, accent: "text-secondary", bg: "bg-secondary/10" },
  ];

  const byDate = {};
  stats.entries.forEach((e) => {
    const day = new Date(e.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (!byDate[day]) byDate[day] = { count: 0, total: 0 };
    byDate[day].count++;
    byDate[day].total += e.amount;
  });
  const labels = Object.keys(byDate).slice(-7);

  const barData = {
    labels,
    datasets: [{
      label: "Transactions",
      data: labels.map((l) => byDate[l].count),
      backgroundColor: "rgba(59, 130, 246, 0.6)",
      borderColor: "rgb(59, 130, 246)",
      borderWidth: 2,
      borderRadius: 6,
    }],
  };

  const lineData = {
    labels,
    datasets: [{
      label: "Revenue",
      data: labels.map((l) => byDate[l].total),
      fill: true,
      borderColor: "rgb(16, 185, 129)",
      backgroundColor: "rgba(16, 185, 129, 0.08)",
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6,
    }],
  };

  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true },
    },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-base-content/50 text-sm">Overview of your billing activity</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((c) => (
          <div key={c.title} className="stat bg-base-100 rounded-box border border-base-300">
            <div className={`stat-figure ${c.accent}`}>
              <div className={`h-10 w-10 rounded-lg ${c.bg} flex items-center justify-center`}>
                <c.icon className="h-5 w-5" />
              </div>
            </div>
            <div className="stat-title">{c.title}</div>
            <div className="stat-value text-2xl">{loading ? "—" : c.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body">
            <h3 className="card-title text-sm">Transactions by Day</h3>
            <div className="h-64 mt-2">
              {labels.length ? <Bar data={barData} options={chartOpts} /> : <p className="text-base-content/30 text-sm text-center pt-20">No data yet</p>}
            </div>
          </div>
        </div>
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body">
            <h3 className="card-title text-sm">Revenue Trend</h3>
            <div className="h-64 mt-2">
              {labels.length ? <Line data={lineData} options={chartOpts} /> : <p className="text-base-content/30 text-sm text-center pt-20">No data yet</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 border border-base-300">
        <div className="card-body">
          <h3 className="card-title text-sm">Recent Transactions</h3>
          {loading ? (
            <div className="flex justify-center py-8"><span className="loading loading-spinner loading-sm"></span></div>
          ) : stats.entries.length === 0 ? (
            <p className="text-base-content/30 text-sm text-center py-8">No transactions yet. Create one from the Ledger page.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th className="text-xs">Entry ID</th>
                    <th className="text-xs">Amount</th>
                    <th className="text-xs">Date</th>
                    <th className="text-xs">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.entries.slice(0, 5).map((e) => (
                    <tr key={e._id}>
                      <td className="font-mono text-xs">{e.entryId}</td>
                      <td className="font-semibold">${e.amount.toFixed(2)}</td>
                      <td className="text-base-content/50">{new Date(e.createdAt).toLocaleDateString()}</td>
                      <td><span className="badge badge-success badge-sm">posted</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
