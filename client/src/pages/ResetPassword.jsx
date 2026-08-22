import { useMemo, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { forgotPasswordRequest, resetPasswordRequest } from "../services/api";

function passwordStrength(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}
const STRENGTH_LABEL = ["Too short", "Weak", "Okay", "Good", "Strong"];
const STRENGTH_COLOR = ["bg-red-500", "bg-red-500", "bg-yellow-500", "bg-blue-500", "bg-emerald-500"];

export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || "";

  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const strength = useMemo(() => passwordStrength(newPassword), [newPassword]);
  const mismatch = confirm.length > 0 && confirm !== newPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (mismatch) return;
    setLoading(true);
    try {
      await resetPasswordRequest(email, otp, newPassword);
      setSuccess("Password reset! Redirecting to sign in...");
      setTimeout(() => navigate("/"), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setError("");
    try {
      await forgotPasswordRequest(email);
      setCooldown(60);
      const t = setInterval(() => {
        setCooldown((c) => {
          if (c <= 1) { clearInterval(t); return 0; }
          return c - 1;
        });
      }, 1000);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#090d16] text-slate-200">
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center bg-gradient-to-br from-[#1e1b4b] via-[#0f172a] to-[#090d16] p-12 border-r border-slate-800/40">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="max-w-md space-y-6 relative z-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-black text-xl shadow-lg shadow-indigo-500/20">S</div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white">Almost there.</h1>
          <p className="text-base text-slate-400 leading-relaxed">
            Enter the code we sent to <span className="text-slate-200">{email || "your email"}</span> and choose a new password.
          </p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 py-12 sm:px-16 lg:px-24">
        <div className="mx-auto w-full max-w-md space-y-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-white">Reset password</h2>
            <p className="mt-2 text-sm text-slate-400">Code expires 10 minutes after it's sent.</p>
          </div>

          {error && <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400">{error}</div>}
          {success && <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-400">{success}</div>}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Reset Code</label>
                <button type="button" onClick={handleResend} disabled={cooldown > 0}
                  className="text-xs font-medium text-blue-400 hover:text-blue-300 transition disabled:text-slate-600 disabled:pointer-events-none">
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                </button>
              </div>
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                required
                placeholder="6-digit code"
                className="w-full rounded-xl border border-slate-800 bg-[#111827] px-4 py-3 tracking-[0.3em] text-center text-white placeholder-slate-600 outline-none transition duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-[#111827] px-4 py-3 text-white placeholder-slate-600 outline-none transition duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
              {newPassword && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < strength ? STRENGTH_COLOR[strength] : "bg-slate-800"}`} />
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{STRENGTH_LABEL[strength]}</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Confirm Password</label>
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={`w-full rounded-xl border bg-[#111827] px-4 py-3 text-white placeholder-slate-600 outline-none focus:ring-4 transition ${mismatch ? "border-red-500 focus:ring-red-500/10" : "border-slate-800 focus:border-blue-500 focus:ring-blue-500/10"}`}
              />
              {mismatch && <p className="mt-1 text-xs text-red-400">Passwords don't match.</p>}
            </div>

            <button
              type="submit"
              disabled={loading || mismatch}
              className="w-full flex justify-center items-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3.5 px-4 font-semibold text-white shadow-lg shadow-blue-600/10 transition duration-200 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : "Reset Password"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500">
            <Link to="/" className="font-semibold text-blue-400 hover:text-blue-300 transition">Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}