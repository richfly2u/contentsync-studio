"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">設定</h1>
      <div className="bg-white rounded-xl border p-6 shadow-sm">
        <h2 className="font-bold mb-4">帳號</h2>
        <button
          onClick={handleLogout}
          className="text-sm text-red-600 hover:text-red-700"
        >
          登出
        </button>
      </div>
    </div>
  );
}
