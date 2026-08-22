import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signupRequest } from "../services/api";

export default function Signup() {
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await signupRequest(form.username, form.email, form.password);
      navigate("/verify-otp", { state: { email: data.email } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#090d16] text-slate-200">
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center bg-gradient-to-br from-[#1e1b4b] via-[#0f172a] to-[#090d16] p-12 border-r border-slate-800/40">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="max-w-md space-y-6 relative z-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-black text-xl shadow-lg shadow-indigo-500/20">
            S
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-extrabold tracking-tight text-white">
              Start building, together.
            </h1>
            <p className="text-base text-slate-400 leading-relaxed">
              Create an account to spin up real-time rooms, share a whiteboard, and edit code with your team live.
            </p>
          </div>
          <div className="pt-8 border-t border-slate-800/60 flex items-center gap-6 text-xs text-slate-500">
            <span>&copy; 2026 SyncSpace Inc.</span>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 py-12 sm:px-16 lg:px-24">
        <div className="mx-auto w-full max-w-md space-y-8">
          <div>
            <div className="flex lg:hidden h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-lg mb-6">S</div>
            <h2 className="text-3xl font-bold tracking-tight text-white">Create your account</h2>
            <p className="mt-2 text-sm text-slate-400">We'll email you a code to verify it's you.</p>
          </div>

          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Username</label>
              <input
                name="username"
                required
                placeholder="yourname"
                value={form.username}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-800 bg-[#111827] px-4 py-3 text-white placeholder-slate-600 outline-none transition duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Email</label>
              <input
                type="email"
                name="email"
                required
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-800 bg-[#111827] px-4 py-3 text-white placeholder-slate-600 outline-none transition duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Password</label>
              <input
                type="password"
                name="password"
                required
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-800 bg-[#111827] px-4 py-3 text-white placeholder-slate-600 outline-none transition duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full relative flex justify-center items-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3.5 px-4 font-semibold text-white shadow-lg shadow-blue-600/10 transition duration-200 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : "Create account"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link to="/" className="font-semibold text-blue-400 hover:text-blue-300 transition">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}