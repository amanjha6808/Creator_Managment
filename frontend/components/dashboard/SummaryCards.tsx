"use client";

import { CampaignSummary } from "@/lib/types";
import { formatINR } from "@/lib/csv";
import {
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Users,
  Zap,
} from "lucide-react";

interface SummaryCardsProps {
  summary: CampaignSummary;
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  const savingsPct =
    summary.totalAllocated > 0
      ? ((summary.netSavings / summary.totalAllocated) * 100).toFixed(1)
      : "0.0";

  const cards = [
    {
      id: "total-allocated",
      label: "Total Allocated Budget",
      value: formatINR(summary.totalAllocated),
      sub: `${summary.creatorCount} creator${summary.creatorCount !== 1 ? "s" : ""}`,
      icon: <IndianRupee className="w-5 h-5" />,
      iconBg: "bg-indigo-50",
      iconColor: "text-indigo-600",
      trend: null,
    },
    {
      id: "total-spent",
      label: "Total Spent",
      value: formatINR(summary.totalSpent),
      sub: "Locked commercials",
      icon: <TrendingUp className="w-5 h-5" />,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
      trend: null,
    },
    {
      id: "net-savings",
      label: "Net Savings",
      value: formatINR(summary.netSavings),
      sub: `${savingsPct}% of allocated budget`,
      icon:
        summary.netSavings >= 0 ? (
          <TrendingDown className="w-5 h-5" />
        ) : (
          <TrendingUp className="w-5 h-5" />
        ),
      iconBg: summary.netSavings >= 0 ? "bg-emerald-50" : "bg-red-50",
      iconColor: summary.netSavings >= 0 ? "text-emerald-600" : "text-red-600",
      valueColor: summary.netSavings >= 0 ? "text-emerald-600" : "text-red-600",
      trend: null,
    },
    ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
      {cards.map((card, i) => (
        <div
          key={card.id}
          className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 md:p-5 animate-fade-in"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-1 min-w-0">
              <p className="text-xs font-medium text-slate-500 truncate">{card.label}</p>
              <p
                className={`text-xl md:text-2xl font-bold tracking-tight ${
                  (card as { valueColor?: string }).valueColor ?? "text-slate-900"
                }`}
              >
                {card.value}
              </p>
              <p className="text-xs text-slate-400 truncate">{card.sub}</p>
            </div>
            <div
              className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${card.iconBg} ${card.iconColor}`}
            >
              {card.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
