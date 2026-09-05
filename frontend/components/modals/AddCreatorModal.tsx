"use client";

import { useState } from "react";
import { CreatorCreate, Creator, CreatorStatus, CREATOR_STATUSES } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { X, UserPlus } from "lucide-react";

interface AddCreatorModalProps {
  onAdd: (creator: CreatorCreate) => Promise<Creator | void>;
  onClose: () => void;
}

export function AddCreatorModal({ onAdd, onClose }: AddCreatorModalProps) {
  const [form, setForm] = useState<CreatorCreate>({
    name: "",
    phone: "+91",
    handle: "",
    target_budget: 0,
    locked_commercials: 0,
    reel_link: "",
    status: "Pending",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof CreatorCreate, string>>>({});
  const [loading, setLoading] = useState(false);

  const set = (field: keyof CreatorCreate, value: string | number) =>
    setForm((f) => ({ ...f, [field]: value }));

  const validate = (): boolean => {
    const e: Partial<Record<keyof CreatorCreate, string>> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.handle.trim()) e.handle = "Instagram ID is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await onAdd({
        ...form,
        phone: form.phone.replace(/\D/g, ""),
        reel_link: form.reel_link || null,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 modal-backdrop">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Add Creator</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-3 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Full Name *"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              error={errors.name}
              placeholder="Priya Sharma"
              fullWidth
            />
            <Input
              label="Handle *"
              value={form.handle}
              onChange={(e) => set("handle", e.target.value)}
              error={errors.handle}
              placeholder="@priyasharma"
              fullWidth
            />
          </div>

          <Input
            label="Phone Number (with country code)"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            error={errors.phone}
            placeholder="919876543210"
            hint="e.g. +919876543210"
            fullWidth
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Counter Budget / Target (₹)"
              type="number"
              min={0}
              value={form.target_budget || ""}
              onChange={(e) => set("target_budget", parseFloat(e.target.value) || 0)}
              placeholder="50000"
              fullWidth
            />
            <Input
              label="Agreed Commercial (₹, 0 for Barter)"
              type="number"
              min={0}
              value={form.locked_commercials || ""}
              onChange={(e) => set("locked_commercials", parseFloat(e.target.value) || 0)}
              placeholder="0 for barter"
              fullWidth
            />
          </div>

          <Input
            label="Instagram Profile Link"
            type="url"
            value={form.profile_link ?? ""}
            onChange={(e) => set("profile_link", e.target.value)}
            placeholder="https://www.instagram.com/username/"
            fullWidth
          />

          <Input
            label="Instagram Reel Link"
            type="url"
            value={form.reel_link ?? ""}
            onChange={(e) => set("reel_link", e.target.value)}
            placeholder="https://www.instagram.com/reel/..."
            fullWidth
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Status</label>
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 bg-white"
            >
              {CREATOR_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose} fullWidth>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={loading} fullWidth>
              Add Creator
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
