import { useState, useEffect } from "react";
import { ledgerAPI } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";

export default function Ledger() {
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ entryId: "", amount: "", meta: "" });
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const fetchEntries = async (p = page) => {
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
  };

  useEffect(() => { fetchEntries(1); setPage(1); }, []);

  const filtered = entries.filter(
    (e) => e.entryId.toLowerCase().includes(search.toLowerCase()) || e.amount.toString().includes(search)
  );

  const handleAdd = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        entryId: form.entryId,
        amount: parseFloat(form.amount),
        meta: form.meta ? JSON.parse(form.meta) : {},
      };
      const res = await ledgerAPI.create(payload);
      toast(res.data.status === "exists" ? "Entry already exists (idempotent)" : "Entry created");
      setShowAdd(false);
      setForm({ entryId: "", amount: "", meta: "" });
      fetchEntries();
    } catch (err) {
      toast(err.response?.data?.error || "Failed to create entry", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Billing Ledger</h1>
          <p className="text-base-content/50 text-sm">{total} total entries</p>
        </div>
        <button className="btn btn-primary gap-2" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" /> Add Entry
        </button>
      </div>

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
                    {filtered.map((e) => (
                      <tr key={e._id} className="hover">
                        <td className="font-mono text-xs">{e.entryId}</td>
                        <td className="font-semibold">${e.amount.toFixed(2)}</td>
                        <td className="text-base-content/50">{new Date(e.createdAt).toLocaleDateString()}</td>
                        <td><span className="badge badge-success badge-sm">posted</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-base-300">
                <span className="text-sm text-base-content/50">Page {page} of {pages}</span>
                <div className="join">
                  <button className="join-item btn btn-sm" disabled={page <= 1} onClick={() => { setPage(page - 1); fetchEntries(page - 1); }}>
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button className="join-item btn btn-sm btn-disabled pointer-events-none">{page}</button>
                  <button className="join-item btn btn-sm" disabled={page >= pages} onClick={() => { setPage(page + 1); fetchEntries(page + 1); }}>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <dialog className={`modal ${showAdd ? "modal-open" : ""}`}>
        <div className="modal-box border border-base-300">
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
              <label className="label"><span className="label-text font-medium">Metadata (JSON, optional)</span></label>
              <input type="text" placeholder='{"description": "Monthly fee"}' className="input input-bordered w-full" value={form.meta} onChange={(e) => setForm({ ...form, meta: e.target.value })} />
            </div>
            <div className="modal-action">
              <button type="button" className="btn" onClick={() => setShowAdd(false)}>Cancel</button>
              <button type="submit" className={`btn btn-primary ${submitting ? "loading" : ""}`}>
                {submitting ? "Creating..." : "Create Entry"}
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={() => setShowAdd(false)}>close</button>
        </form>
      </dialog>
    </div>
  );
}
