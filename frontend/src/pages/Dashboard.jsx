import { useState, useEffect, useCallback, useRef } from "react";
import { ledgerAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useTenantSocket } from "@/hooks/useTenantSocket";
import { DollarSign, Receipt, Activity, Database } from "lucide-react";
import { motion } from "framer-motion";
import { FadeIn, StaggerChildren, StaggerItem, HoverLift } from "@/components/Motion";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Line, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale, LinearScale, BarElement, PointElement,
  LineElement, ArcElement, Title, Tooltip, Legend, Filler
);

const STATUS_COLORS = {
  posted: { bg: "bg-success/10", text: "text-success", hex: "rgb(16, 185, 129)" },
  pending: { bg: "bg-warning/10", text: "text-warning", hex: "rgb(245, 158, 11)" },
  failed: { bg: "bg-error/10", text: "text-error", hex: "rgb(239, 68, 68)" },
  processing: { bg: "bg-info/10", text: "text-info", hex: "rgb(59, 130, 246)" },
};

function useAnimatedNumber(target, duration = 600) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(null);
  const startRef = useRef(null);
  const fromRef = useRef(0);

  useEffect(() => {
    fromRef.current = display;
    startRef.current = null;
    const animate = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = fromRef.current + (target - fromRef.current) * eased;
      setDisplay(current);
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return display;
}

function StatCard({ title, value, icon: Icon, accent, bg, isNumber }) {
  const animated = useAnimatedNumber(isNumber ? value : 0);
  return (
    <HoverLift>
      <div className="stat bg-base-100 rounded-box border border-base-300 transition-shadow hover:shadow-lg">
        <div className={`stat-figure ${accent}`}>
          <div className={`h-10 w-10 rounded-lg ${bg} flex items-center justify-center`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div className="stat-title">{title}</div>
        <div className="stat-value text-2xl">{isNumber ? animated.toLocaleString() : value}</div>
      </div>
    </HoverLift>
  );
}

export default function Dashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState("30d");

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [statsRes, listRes] = await Promise.all([
        ledgerAPI.stats(),
        ledgerAPI.list(1, 100),
      ]);
      setStats(statsRes.data);
      setEntries(listRes.data.entries || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSocketCreated = useCallback((doc) => {
    setEntries((prev) => [doc, ...prev].slice(0, 100));
    fetchData();
  }, [fetchData]);

  const handleSocketUpdated = useCallback((doc) => {
    setEntries((prev) => prev.map((e) => (e._id === doc._id ? { ...e, ...doc } : e)));
    fetchData();
  }, [fetchData]);

  useTenantSocket(handleSocketCreated, handleSocketUpdated);

  const filterByRange = useCallback((range) => {
    const now = Date.now();
    const ms = { "7d": 7, "30d": 30, "90d": 90 }[range] || 30;
    const cutoff = new Date(now - ms * 24 * 60 * 60 * 1000);
    return entries.filter((e) => new Date(e.createdAt) >= cutoff);
  }, [entries]);

  const filtered = filterByRange(dateRange);
  const totalRevenue = filtered.reduce((sum, e) => sum + (e.amount || 0), 0);

  const statusMap = {};
  if (stats?.byStatus) {
    stats.byStatus.forEach((s) => { statusMap[s._id || "posted"] = s; });
  } else {
    filtered.forEach((e) => {
      const st = e.status || "posted";
      if (!statusMap[st]) statusMap[st] = { count: 0, total: 0 };
      statusMap[st].count++;
      statusMap[st].total += e.amount;
    });
  }

  const pendingCount = statusMap.pending?.count || 0;
  const failedCount = statusMap.failed?.count || 0;
  const postedCount = statusMap.posted?.count || 0;
  const processingCount = statusMap.processing?.count || 0;
  const totalCount = pendingCount + failedCount + postedCount + processingCount;
  const successRate = totalCount ? ((postedCount + processingCount) / totalCount * 100).toFixed(0) : 0;

  const statCards = [
    { title: "Total Revenue", value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, accent: "text-success", bg: "bg-success/10" },
    { title: "Transactions", value: filtered.length, icon: Receipt, accent: "text-info", bg: "bg-info/10" },
    { title: "Success Rate", value: `${successRate}%`, icon: Activity, accent: "text-success", bg: "bg-success/10" },
    { title: "Failed", value: failedCount, icon: Database, accent: "text-error", bg: "bg-error/10" },
  ];

  const byDate = {};
  filtered.forEach((e) => {
    const day = new Date(e.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const st = e.status || "posted";
    if (!byDate[day]) byDate[day] = { count: 0, total: 0, statuses: {} };
    byDate[day].count++;
    byDate[day].total += e.amount;
    byDate[day].statuses[st] = (byDate[day].statuses[st] || 0) + 1;
  });
  const labels = Object.keys(byDate).slice(-7);

  const statusKeys = ["posted", "pending", "processing", "failed"];
  const barData = {
    labels,
    datasets: statusKeys.map((st) => ({
      label: st.charAt(0).toUpperCase() + st.slice(1),
      data: labels.map((l) => byDate[l]?.statuses[st] || 0),
      backgroundColor: STATUS_COLORS[st].hex,
      borderRadius: 4,
    })),
  };

  const lineData = {
    labels,
    datasets: [{
      label: "Revenue",
      data: labels.map((l) => byDate[l]?.total || 0),
      fill: true,
      borderColor: "rgb(16, 185, 129)",
      backgroundColor: "rgba(16, 185, 129, 0.08)",
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6,
    }],
  };

  const statusLabels = Object.keys(statusMap);
  const doughnutData = {
    labels: statusLabels.map((s) => s.charAt(0).toUpperCase() + s.slice(1)),
    datasets: [{
      data: statusLabels.map((s) => statusMap[s].count),
      backgroundColor: statusLabels.map((s) => STATUS_COLORS[s]?.hex || "rgb(107,114,128)"),
      borderWidth: 0,
    }],
  };

  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: "bottom", labels: { padding: 12, usePointStyle: true } } },
    scales: {
      x: { stacked: true, grid: { display: false } },
      y: { stacked: true, beginAtZero: true },
    },
  };

  const doughnutOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom", labels: { padding: 16, usePointStyle: true } },
    },
    cutout: "60%",
  };

  const getStatusStyle = (status) => {
    const s = STATUS_COLORS[status] || STATUS_COLORS.posted;
    return s;
  };

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-base-content/50 text-sm">Overview of your billing activity</p>
          </div>
          <div className="join">
            {["7d", "30d", "90d"].map((r) => (
              <motion.button
                key={r}
                whileTap={{ scale: 0.95 }}
                className={`join-item btn btn-sm ${dateRange === r ? "btn-active" : ""}`}
                onClick={() => setDateRange(r)}
              >
                {r}
              </motion.button>
            ))}
          </div>
        </div>
      </FadeIn>

      {error && (
        <FadeIn>
          <div className="alert alert-error">
            <span>{error}</span>
            <button className="btn btn-sm btn-ghost" onClick={fetchData}>Retry</button>
          </div>
        </FadeIn>
      )}

      <StaggerChildren className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((c) => (
          <StaggerItem key={c.title}>
            <StatCard {...c} isNumber={typeof c.value === "number"} />
          </StaggerItem>
        ))}
      </StaggerChildren>

      <StaggerChildren className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <StaggerItem>
          <HoverLift>
            <div className="card bg-base-100 border border-base-300 transition-shadow hover:shadow-lg">
              <div className="card-body">
                <h3 className="card-title text-sm">Transactions by Status</h3>
                <div className="h-64 mt-2">
                  {labels.length ? <Bar data={barData} options={chartOpts} /> : <p className="text-base-content/30 text-sm text-center pt-20">No data yet</p>}
                </div>
              </div>
            </div>
          </HoverLift>
        </StaggerItem>
        <StaggerItem>
          <HoverLift>
            <div className="card bg-base-100 border border-base-300 transition-shadow hover:shadow-lg">
              <div className="card-body">
                <h3 className="card-title text-sm">Revenue Trend</h3>
                <div className="h-64 mt-2">
                  {labels.length ? <Line data={lineData} options={chartOpts} /> : <p className="text-base-content/30 text-sm text-center pt-20">No data yet</p>}
                </div>
              </div>
            </div>
          </HoverLift>
        </StaggerItem>
        <StaggerItem>
          <HoverLift>
            <div className="card bg-base-100 border border-base-300 transition-shadow hover:shadow-lg">
              <div className="card-body">
                <h3 className="card-title text-sm">Status Breakdown</h3>
                <div className="h-64 mt-2">
                  {statusLabels.length ? <Doughnut data={doughnutData} options={doughnutOpts} /> : <p className="text-base-content/30 text-sm text-center pt-20">No data yet</p>}
                </div>
              </div>
            </div>
          </HoverLift>
        </StaggerItem>
      </StaggerChildren>

      <FadeIn delay={0.3}>
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body">
            <h3 className="card-title text-sm">Recent Transactions</h3>
            {loading ? (
              <div className="flex justify-center py-8"><span className="loading loading-spinner loading-sm"></span></div>
            ) : filtered.length === 0 ? (
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
                    {filtered.slice(0, 5).map((e, i) => (
                      <motion.tr
                        key={e._id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + i * 0.05 }}
                        whileHover={{ backgroundColor: "rgba(99, 102, 241, 0.04)" }}
                        className="cursor-default"
                      >
                        <td className="font-mono text-xs">{e.entryId}</td>
                        <td className="font-semibold">${e.amount.toFixed(2)}</td>
                        <td className="text-base-content/50">{new Date(e.createdAt).toLocaleDateString()}</td>
                        <td>
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusStyle(e.status).bg} ${getStatusStyle(e.status).text}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${getStatusStyle(e.status).dot}`}></span>
                            {e.status || "posted"}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
