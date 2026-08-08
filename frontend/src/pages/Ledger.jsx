import { useState, useEffect } from "react";
import { ledgerAPI } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
          <p className="text-muted-foreground text-sm">{total} total entries</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" /> Add Entry
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm">Transactions</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search entries..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No entries found</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entry ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((entry) => (
                    <TableRow key={entry._id}>
                      <TableCell className="font-mono text-xs">{entry.entryId}</TableCell>
                      <TableCell className="font-medium">${entry.amount.toFixed(2)}</TableCell>
                      <TableCell className="text-muted-foreground">{new Date(entry.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell><Badge variant="success">posted</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">Page {page} of {pages}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => { setPage(page - 1); fetchEntries(page - 1); }}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => { setPage(page + 1); fetchEntries(page + 1); }}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAdd} onClose={() => setShowAdd(false)}>
        <DialogHeader>
          <DialogTitle>Add Ledger Entry</DialogTitle>
          <DialogDescription>Create a new billing transaction entry</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="space-y-2">
            <Label>Entry ID</Label>
            <Input placeholder="INV-2024-001" value={form.entryId} onChange={(e) => setForm({ ...form, entryId: e.target.value })} required minLength={6} />
          </div>
          <div className="space-y-2">
            <Label>Amount ($)</Label>
            <Input type="number" step="0.01" min="0.01" placeholder="99.99" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label>Metadata (JSON, optional)</Label>
            <Input placeholder='{"description": "Monthly fee"}' value={form.meta} onChange={(e) => setForm({ ...form, meta: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Creating..." : "Create"}</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
