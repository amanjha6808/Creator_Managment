"use client";

import { useState } from "react";
import { Creator, CreatorUpdate } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Edit3, X } from "lucide-react";

interface EditCreatorModalProps {
  creator: Creator;
  onUpdate: (id: string, data: CreatorUpdate) => Promise<void> | void;
  onClose: () => void;
}

/** Edit a creator's contact info: name, handle, phone, and profile/reel links. */
export function EditCreatorModal({ creator, onUpdate, onClose }: EditCreatorModalProps) {
  const [form, setForm] = useState({
    name: creator.name ?? "",
    handle: creator.handle ?? "",
    phone: creator.phone ?? "",
    profile_link: creator.profile_link ?? "",
    reel_link: creator.reel_link ?? "",
  });
  const [errors, setErrors] = useState<Partial<Record<"name" | "handle", string>>>({});
  const [loading, setLoading] = useState(false);

  const set = (field: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const validate = (): boolean => {
    const e: Partial<Record<"name" | "handle", string>> = {};
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
      await onUpdate(creator.id, {
        name: form.name.trim(),
        handle: form.handle.trim(),
        phone: form.phone.replace(/\D/g, ""),
        profile_link: form.profile_link.trim() || null,
        reel_link: form.reel_link.trim() || null,
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
            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Edit3 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Edit Creator</h2>
              <p className="text-xs text-slate-400">Edit contact details for {creator.name}</p>
            </div>
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
            placeholder="919876543210"
            hint="WhatsApp-compatible format, e.g. 919876543210"
            fullWidth
          />

          <Input
            label="Instagram Profile Link"
            type="url"
            value={form.profile_link}
            onChange={(e) => set("profile_link", e.target.value)}
            placeholder="https://www.instagram.com/username/"
            fullWidth
          />

          <Input
            label="Instagram Reel Link"
            type="url"
            value={form.reel_link}
            onChange={(e) => set("reel_link", e.target.value)}
            placeholder="https://www.instagram.com/reel/..."
            fullWidth
          />

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose} fullWidth>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={loading} fullWidth>
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}