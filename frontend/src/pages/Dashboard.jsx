import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Receipt, Database, Activity } from "lucide-react";
import { ledgerAPI } from "@/lib/api";
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

  const cards = [
    { title: "Total Revenue", value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-emerald-600" },
    { title: "Transactions", value: stats.total, icon: Receipt, color: "text-blue-600" },
    { title: "Avg. Amount", value: `$${avgAmount.toFixed(2)}`, icon: Activity, color: "text-amber-600" },
    { title: "Active DBs", value: "1", icon: Database, color: "text-purple-600" },
  ];

  // Group entries by date for charts
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
      backgroundColor: "rgba(59, 130, 246, 0.5)",
      borderColor: "rgb(59, 130, 246)",
      borderWidth: 1,
    }],
  };

  const lineData = {
    labels,
    datasets: [{
      label: "Revenue",
      data: labels.map((l) => byDate[l].total),
      fill: true,
      borderColor: "rgb(16, 185, 129)",
      backgroundColor: "rgba(16, 185, 129, 0.1)",
      tension: 0.4,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, grid: { color: "rgba(0,0,0,0.05)" } },
    },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Overview of your billing activity</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "—" : card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Transactions by Day</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {labels.length ? <Bar data={barData} options={chartOptions} /> : <p className="text-sm text-muted-foreground text-center pt-20">No data yet</p>}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {labels.length ? <Line data={lineData} options={chartOptions} /> : <p className="text-sm text-muted-foreground text-center pt-20">No data yet</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : stats.entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transactions yet. Create one from the Ledger page.</p>
          ) : (
            <div className="space-y-2">
              {stats.entries.slice(0, 5).map((entry) => (
                <div key={entry._id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{entry.entryId}</p>
                    <p className="text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleDateString()}</p>
                  </div>
                  <Badge variant="success">${entry.amount.toFixed(2)}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
