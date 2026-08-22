import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { forgotPasswordRequest } from "../services/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await forgotPasswordRequest(email);
      navigate("/reset-password", { state: { email } });
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
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-black text-xl shadow-lg shadow-indigo-500/20">S</div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white">Locked out? No problem.</h1>
          <p className="text-base text-slate-400 leading-relaxed">
            We'll send a one-time code to your inbox so you can get back into your account securely.
          </p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 py-12 sm:px-16 lg:px-24">
        <div className="mx-auto w-full max-w-md space-y-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-white">Forgot password</h2>
            <p className="mt-2 text-sm text-slate-400">Enter the email tied to your account.</p>
          </div>

          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Email</label>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-[#111827] px-4 py-3 text-white placeholder-slate-600 outline-none transition duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3.5 px-4 font-semibold text-white shadow-lg shadow-blue-600/10 transition duration-200 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : "Send Reset Code"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500">
            Remembered it?{" "}
            <Link to="/" className="font-semibold text-blue-400 hover:text-blue-300 transition">Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}