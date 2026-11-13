"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AuthPanel() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSignUp() {
    setLoading(true);
    setMessage("");
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setMessage(error.message);
    } else {
      setMessage(
        "Account created. If asked, check your email to confirm, then log in."
      );
    }
    setLoading(false);
  }

  async function handleLogin() {
    setLoading(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setMessage(error.message);
    }
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setMessage("");
  }

  if (user) {
    return (
      <div className="w-full max-w-[640px] flex items-center justify-between bg-zinc-900 border border-yellow-500/40 rounded-lg px-4 py-3 mb-6">
        <p className="text-gray-300 text-sm">
          Signed in as <span className="text-yellow-400">{user.email}</span>
        </p>
        <button
          onClick={handleLogout}
          className="text-sm text-yellow-400 underline hover:text-yellow-300"
        >
          Log out
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[640px] bg-zinc-900 border border-yellow-500/40 rounded-lg p-4 mb-6">
      <h3 className="text-yellow-400 text-sm font-semibold uppercase tracking-wide mb-3">
        Log in or create an account to save your scans
      </h3>
      <div className="flex flex-col gap-3">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="px-3 py-2 rounded bg-black border border-zinc-700 text-white text-sm focus:outline-none focus:border-yellow-500"
        />
        <input
          type="password"
          placeholder="Password (at least 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="px-3 py-2 rounded bg-black border border-zinc-700 text-white text-sm focus:outline-none focus:border-yellow-500"
        />
        <div className="flex gap-3">
          <button
            onClick={handleLogin}
            disabled={loading}
            className="px-5 py-2 rounded-full bg-yellow-500 text-black font-semibold text-sm hover:bg-yellow-400 transition disabled:opacity-50"
          >
            Log in
          </button>
          <button
            onClick={handleSignUp}
            disabled={loading}
            className="px-5 py-2 rounded-full border border-yellow-500 text-yellow-400 font-semibold text-sm hover:bg-yellow-500/10 transition disabled:opacity-50"
          >
            Sign up
          </button>
        </div>
        {message && <p className="text-gray-300 text-sm">{message}</p>}
      </div>
    </div>
  );
}