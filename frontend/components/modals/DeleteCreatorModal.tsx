"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Trash2, X } from "lucide-react";

interface DeleteCreatorModalProps {
  name: string;
  handle: string;
  campaignName: string;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

export function DeleteCreatorModal({
  name,
  handle,
  campaignName,
  onConfirm,
  onClose,
}: DeleteCreatorModalProps) {
  const [reason, setReason] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(reason.trim() || "No reason provided");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <Trash2 className="w-4 h-4 text-red-500" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Remove Creator</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {/* Creator info */}
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-3.5 flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900">{name}</span>
              <span className="text-xs text-slate-400">@{handle}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">
                {campaignName}
              </span>
            </div>
          </div>

          {/* Reason field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">
              Why are you removing this creator?
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Budget constraints, no longer relevant, low engagement, etc."
              rows={3}
              className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-red-300 focus:ring-2 focus:ring-red-50 transition-all"
              autoFocus
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-1">
            <Button variant="secondary" size="sm" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              className="!bg-red-600 hover:!bg-red-700 !shadow-xs"
            >
              Remove Creator
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
