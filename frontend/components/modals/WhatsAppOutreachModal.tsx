"use client";

import { useState, useEffect } from "react";
import { Creator } from "@/lib/types";
import { openWhatsApp as openWa } from "@/lib/whatsapp";
import { Button } from "@/components/ui/Button";
import { X, MessageCircle, ChevronRight, CheckCircle } from "lucide-react";
import { clsx } from "clsx";

interface WhatsAppOutreachModalProps {
  creators: Creator[];
  onClose: () => void;
}

const DEFAULT_TEMPLATE = (name: string, handle: string) =>
  `Hi ${name}! 👋\n\nWe loved your recent work on ${handle}! We're running an exciting campaign and think you'd be a perfect fit.\n\nWe'd love to discuss a collaboration opportunity with you. Are you available for a quick call this week?\n\nLooking forward to hearing from you! 🚀`;

export function WhatsAppOutreachModal({ creators, onClose }: WhatsAppOutreachModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [customMessage, setCustomMessage] = useState("");
  const [editingMessage, setEditingMessage] = useState(false);

  const current = creators[currentIndex];
  const isLast = currentIndex === creators.length - 1;
  const allDone = completed.size === creators.length;

  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    if (current) {
      setCustomMessage(DEFAULT_TEMPLATE(current.name, current.handle));
      setEditingMessage(false);
    }
  }, [currentIndex, current]);

  // Reset image failed state when switching creators
  useEffect(() => {
    setImageFailed(false);
  }, [currentIndex, current?.avatar_url, current?.handle]);

  const handleOpenWhatsApp = () => {
    if (!current) return;
    openWa(current.phone.replace(/\D/g, ""), customMessage);
    setCompleted((prev) => new Set([...prev, currentIndex]));
  };

  const handleNext = () => {
    if (!isLast) {
      setCurrentIndex((i) => i + 1);
    }
  };

  const handleSkip = () => {
    if (!isLast) {
      setCurrentIndex((i) => i + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Bulk WhatsApp Outreach</h2>
              <p className="text-xs text-slate-500">
                {completed.size} of {creators.length} sent
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-slate-100">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${(completed.size / creators.length) * 100}%` }}
          />
        </div>

        {allDone ? (
          /* All done state */
          <div className="flex flex-col items-center justify-center py-12 px-5 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Outreach Complete!</h3>
            <p className="text-sm text-slate-500 mt-1">
              Messages sent to all {creators.length} creators.
            </p>
            <Button onClick={onClose} className="mt-6" variant="primary">
              Done
            </Button>
          </div>
        ) : current ? (
          <div className="p-5 flex flex-col gap-4">
            {/* Creator preview */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              {(() => {
                const cleanHandle = current?.handle ? current.handle.replace(/^@/, "").trim() : "";
                const avatarUrl = current?.avatar_url || (cleanHandle ? `https://unavatar.io/instagram/${cleanHandle}` : null);
                if (avatarUrl && !imageFailed) {
                  return (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={avatarUrl}
                      alt={current?.name}
                      onError={() => setImageFailed(true)}
                      className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-200 shadow-2xs"
                    />
                  );
                }
                return (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center shrink-0">
                    <span className="text-white font-bold">{current?.name.charAt(0).toUpperCase()}</span>
                  </div>
                );
              })()}

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 truncate">{current.name}</p>
                <p className="text-xs text-slate-500 truncate">
                  {current.handle} · +{current.phone}
                </p>
              </div>
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-white border border-slate-200 text-slate-600">
                {currentIndex + 1} / {creators.length}
              </span>
            </div>

            {/* Queue indicators */}
            <div className="flex gap-1.5 flex-wrap">
              {creators.map((_, idx) => (
                <div
                  key={idx}
                  className={clsx(
                    "h-1.5 rounded-full flex-1 min-w-[10px] max-w-[32px] transition-all duration-300",
                    completed.has(idx)
                      ? "bg-emerald-500"
                      : idx === currentIndex
                      ? "bg-indigo-500"
                      : "bg-slate-200"
                  )}
                />
              ))}
            </div>

            {/* Message composer */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">Message Preview</label>
                <button
                  onClick={() => setEditingMessage((e) => !e)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
                >
                  {editingMessage ? "Preview" : "Edit"}
                </button>
              </div>

              {editingMessage ? (
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={6}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 resize-none outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"
                />
              ) : (
                <div className="bg-emerald-50 rounded-xl p-3.5 border border-emerald-100">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {customMessage}
                  </p>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-1">
              <Button
                variant="ghost"
                size="md"
                onClick={handleSkip}
                disabled={isLast && completed.has(currentIndex)}
                fullWidth
              >
                Skip
              </Button>
              <Button
                variant="success"
                size="md"
                onClick={handleOpenWhatsApp}
                icon={<MessageCircle className="w-4 h-4" />}
                fullWidth
              >
                Open WhatsApp
              </Button>
              {completed.has(currentIndex) && !isLast && (
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleNext}
                  icon={<ChevronRight className="w-4 h-4" />}
                  fullWidth
                >
                  Next
                </Button>
              )}
            </div>

            {completed.has(currentIndex) && isLast && (
              <Button variant="primary" onClick={onClose} fullWidth>
                Finish
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
