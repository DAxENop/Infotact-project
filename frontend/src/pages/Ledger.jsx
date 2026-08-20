import { useState, useEffect, useCallback } from "react";
import { ledgerAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/toast";
import { useTenantSocket } from "@/hooks/useTenantSocket";
import { Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FadeIn } from "@/components/Motion";

const STATUS_COLORS = {
  posted: { bg: "bg-success/10", text: "text-success", dot: "bg-success" },
  pending: { bg: "bg-warning/10", text: "text-warning", dot: "bg-warning" },
  failed: { bg: "bg-error/10", text: "text-error", dot: "bg-error" },
  processing: { bg: "bg-info/10", text: "text-info", dot: "bg-info" },
};

export default function Ledger() {
  const { tenantId, token } = useAuth();
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ entryId: "", amount: "", status: "posted", meta: "" });
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const toast = useToast();

  const fetchEntries = useCallback(async (p = page) => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await ledgerAPI.list(p, 10);
      setEntries(res.data.entries || []);
      setTotal(res.data.total || 0);
      setPages(res.data.pages || 1);
    } catch {
      toast("Failed to load ledger", "error");
    } finally {
      setLoading(false);
    }
  }, [token, page, toast]);

  useEffect(() => { if (token) { fetchEntries(1); setPage(1); } }, [token]);

  const handleSocketCreated = useCallback((doc) => {
    setEntries((prev) => {
      if (prev.some((e) => e._id === doc._id)) return prev;
      return [doc, ...prev].slice(0, 100);
    });
    setTotal((prev) => prev + 1);
  }, []);

  const handleSocketUpdated = useCallback((doc) => {
    setEntries((prev) => prev.map((e) => (e._id === doc._id ? { ...e, ...doc } : e)));
  }, []);

  useTenantSocket(handleSocketCreated, handleSocketUpdated);

  const filtered = entries.filter(
    (e) => e.entryId.toLowerCase().includes(search.toLowerCase()) || e.amount.toString().includes(search)
  );

  const handleAdd = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let parsedMeta = {};
      if (form.meta.trim()) {
        try {
          parsedMeta = JSON.parse(form.meta);
        } catch {
          toast("Invalid JSON in metadata field", "error");
          setSubmitting(false);
          return;
        }
      }
      const payload = { entryId: form.entryId, amount: parseFloat(form.amount), status: form.status, meta: parsedMeta };
      const res = await ledgerAPI.create(payload);
      toast(res.data.status === "exists" ? "Entry already exists (idempotent)" : "Entry created");
      setShowAdd(false);
      setForm({ entryId: "", amount: "", status: "posted", meta: "" });
      fetchEntries();
    } catch (err) {
      toast(err.response?.data?.error || "Failed to create entry", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (entryId, newStatus) => {
    setUpdatingId(entryId);
    try {
      await ledgerAPI.updateStatus(entryId, newStatus);
      setEntries((prev) => prev.map((e) => (e.entryId === entryId ? { ...e, status: newStatus } : e)));
      toast(`Status updated to "${newStatus}"`);
    } catch (err) {
      toast(err.response?.data?.error || "Failed to update status", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusStyle = (status) => {
    return STATUS_COLORS[status] || STATUS_COLORS.posted;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Billing Ledger</h1>
          <p className="text-base-content/50 text-sm">
            {total} total entries
            {tenantId && <span className="badge badge-sm badge-outline ml-2">{tenantId}</span>}
          </p>
        </div>
        <button className="btn btn-primary gap-2" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" /> Add Entry
        </button>
      </div>

      <FadeIn delay={0.1}>
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body">
            <div className="flex items-center justify-between mb-4">
              <h3 className="card-title text-sm">Transactions</h3>
              <div className="join">
                <span className="join-item btn btn-sm btn-ghost pointer-events-none"><Search className="h-4 w-4" /></span>
                <input type="text" placeholder="Search entries..." className="join-item input input-bordered input-sm w-56" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-12"><span className="loading loading-spinner loading-md"></span></div>
            ) : filtered.length === 0 ? (
              <p className="text-base-content/30 text-sm text-center py-12">No entries found</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Entry ID</th>
                        <th>Amount</th>
                        <th>Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((e, i) => (
                        <motion.tr
                          key={e._id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          whileHover={{ backgroundColor: "rgba(99, 102, 241, 0.04)" }}
                          className="cursor-default"
                        >
                          <td className="font-mono text-xs">{e.entryId}</td>
                          <td className="font-semibold">${e.amount.toFixed(2)}</td>
                          <td className="text-base-content/50">{new Date(e.createdAt).toLocaleDateString()}</td>
                          <td>
                            <div className="relative inline-block">
                              <select
                                className={`appearance-none cursor-pointer rounded-full pl-5 pr-3 py-1 text-xs font-semibold border-0 ${getStatusStyle(e.status).bg} ${getStatusStyle(e.status).text} transition-colors`}
                                value={e.status || "posted"}
                                disabled={updatingId === e.entryId}
                                onChange={(ev) => handleStatusChange(e.entryId, ev.target.value)}
                                style={{ backgroundImage: "none" }}
                              >
                                <option value="posted">posted</option>
                                <option value="pending">pending</option>
                                <option value="processing">processing</option>
                                <option value="failed">failed</option>
                              </select>
                              <span className={`absolute left-2 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full ${getStatusStyle(e.status).dot} pointer-events-none`}></span>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-base-300">
                  <span className="text-sm text-base-content/50">Page {page} of {pages}</span>
                  <div className="join">
                    <motion.button whileTap={{ scale: 0.9 }} className="join-item btn btn-sm" disabled={page <= 1} onClick={() => { setPage(page - 1); fetchEntries(page - 1); }}>
                      <ChevronLeft className="h-4 w-4" />
                    </motion.button>
                    <button className="join-item btn btn-sm btn-disabled pointer-events-none">{page}</button>
                    <motion.button whileTap={{ scale: 0.9 }} className="join-item btn btn-sm" disabled={page >= pages} onClick={() => { setPage(page + 1); fetchEntries(page + 1); }}>
                      <ChevronRight className="h-4 w-4" />
                    </motion.button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </FadeIn>

      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setShowAdd(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="rounded-xl border border-base-300 bg-base-100 p-6 shadow-2xl">
                <h3 className="font-bold text-lg">Add Ledger Entry</h3>
                <p className="text-base-content/50 text-sm py-2">Create a new billing transaction entry</p>

                <form onSubmit={handleAdd} className="space-y-4 mt-4">
                  <div className="form-control">
                    <label className="label"><span className="label-text font-medium">Entry ID</span></label>
                    <input type="text" placeholder="INV-2024-001" className="input input-bordered w-full" value={form.entryId} onChange={(e) => setForm({ ...form, entryId: e.target.value })} required minLength={6} />
                    <label className="label"><span className="label-text-alt text-base-content/40">Min 6 characters</span></label>
                  </div>
                  <div className="form-control">
                    <label className="label"><span className="label-text font-medium">Amount ($)</span></label>
                    <input type="number" step="0.01" min="0.01" placeholder="99.99" className="input input-bordered w-full" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
                  </div>
                  <div className="form-control">
                    <label className="label"><span className="label-text font-medium">Status</span></label>
                    <select className="select select-bordered w-full" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                      <option value="posted">Posted</option>
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>
                  <div className="form-control">
                    <label className="label"><span className="label-text font-medium">Metadata (JSON, optional)</span></label>
                    <input type="text" placeholder='{"description": "Monthly fee"}' className="input input-bordered w-full" value={form.meta} onChange={(e) => setForm({ ...form, meta: e.target.value })} />
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <button type="button" className="btn" onClick={() => setShowAdd(false)}>Cancel</button>
                    <button type="submit" className={`btn btn-primary ${submitting ? "loading" : ""}`}>
                      {submitting ? "Creating..." : "Create Entry"}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
