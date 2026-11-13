"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function HistoryPage() {
  const [user, setUser] = useState(null);
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      const currentUser = userData.user ?? null;
      setUser(currentUser);

      if (!currentUser) {
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("scans")
        .select("id, created_at, face_shape, image_url")
        .order("created_at", { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setScans(data);
      }
      setLoading(false);
    }

    load();
  }, []);

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center px-6 py-12">
      <h1 className="text-3xl md:text-4xl font-bold tracking-wide text-yellow-400 mb-2">
        MY SCANS
      </h1>
      <Link
        href="/"
        className="text-yellow-400 underline text-sm hover:text-yellow-300 mb-8"
      >
        Back to scanner
      </Link>

      {loading && <p className="text-gray-400">Loading...</p>}

      {!loading && !user && (
        <p className="text-gray-300">
          Please log in on the scanner page to see your saved scans.
        </p>
      )}

      {error && <p className="text-red-400 text-sm">Error: {error}</p>}

      {!loading && user && scans.length === 0 && !error && (
        <p className="text-gray-300">
          No scans saved yet. Capture one on the scanner page.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 w-full max-w-[900px]">
        {scans.map((scan) => (
          <div
            key={scan.id}
            className="bg-zinc-900 border border-yellow-500/40 rounded-lg overflow-hidden"
          >
            {scan.image_url && (
              <img
                src={scan.image_url}
                alt={"Scan: " + scan.face_shape}
                className="w-full block"
              />
            )}
            <div className="p-3">
              <p className="text-yellow-400 font-semibold">{scan.face_shape}</p>
              <p className="text-gray-400 text-xs mt-1">
                {new Date(scan.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}