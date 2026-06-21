"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

const MONTHS = ["一月","二月","三月","四月","五月","六月","七月","八月","九月","十月","十一月","十二月"];
const DAYS = ["日","一","二","三","四","五","六"];
const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-yellow-100 text-yellow-800 border-yellow-300",
  publishing: "bg-blue-100 text-blue-800 border-blue-300",
  published: "bg-green-100 text-green-800 border-green-300",
  failed: "bg-red-100 text-red-800 border-red-300",
};
const STATUS_LABELS: Record<string, string> = {
  scheduled: "已排程",
  publishing: "發布中",
  published: "已發布",
  failed: "失敗",
};

export default function SchedulesPage() {
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [days, setDays] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push("/login"); return; }
      setToken(session.access_token);
    });
  }, []);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/schedules/calendar?year=${year}&month=${month}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
      .then((r) => r.json())
      .then((d) => setDays(d.days || {}))
      .catch(() => setDays({}))
      .finally(() => setLoading(false));
  }, [year, month, token]);

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  const firstDay = new Date(year, month - 1, 1).getDay();
  const lastDate = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= lastDate; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">📅 排程日曆</h1>
        <Link href="/dashboard/publish" className="text-sm text-blue-600 hover:underline">
          ← 回發布頁
        </Link>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4 bg-white rounded-xl border p-4">
        <button onClick={prevMonth} className="px-3 py-1 rounded hover:bg-gray-100">◀</button>
        <span className="text-lg font-bold">{year}年 {MONTHS[month - 1]}</span>
        <button onClick={nextMonth} className="px-3 py-1 rounded hover:bg-gray-100">▶</button>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 border-b">
          {DAYS.map((d) => (
            <div key={d} className="text-center text-sm font-medium text-gray-500 py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((date, i) => {
            const key = date ? `${year}-${String(month).padStart(2,"0")}-${String(date).padStart(2,"0")}` : null;
            const items = key ? days[key] || [] : [];
            return (
              <div key={i} className="min-h-[100px] border-b border-r p-1 text-sm">
                {date && (
                  <>
                    <div className="text-xs text-gray-500 mb-1">{date}</div>
                    {items.slice(0, 3).map((item: any) => (
                      <div key={item.id} className={`text-xs px-1 py-0.5 rounded mb-0.5 border ${STATUS_COLORS[item.status] || "bg-gray-50"}`}>
                        {item.platform === "youtube" ? "▶️" : item.platform === "tiktok" ? "🎵" : item.platform === "xiaohongshu" ? "📕" : item.platform === "facebook" ? "👍" : "📹"} {STATUS_LABELS[item.status] || item.status}
                      </div>
                    ))}
                    {items.length > 3 && <div className="text-xs text-gray-400">+{items.length - 3} 更多</div>}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-4 text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300"></span> 已排程</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-300"></span> 發布中</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 border border-green-300"></span> 已發布</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 border border-red-300"></span> 失敗</span>
      </div>
    </div>
  );
}
