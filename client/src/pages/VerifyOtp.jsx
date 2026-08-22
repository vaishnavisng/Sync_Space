import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { verifyOtpRequest, resendOtpRequest } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function VerifyOtp() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const email = location.state?.email || "";

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [resendMsg, setResendMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await verifyOtpRequest(email, otp);
      login(data.token, data.username);
      navigate("/home");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendMsg("");
    setError("");
    try {
      await resendOtpRequest(email);
      setResendMsg("Code resent to your email.");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#090d16] text-slate-200 px-6">
      <div className="w-full max-w-md space-y-8">
        <div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-lg mb-6">S</div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Verify your email</h2>
          <p className="mt-2 text-sm text-slate-400">
            We sent a 6-digit code to <span className="text-slate-300">{email}</span>.
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400">{error}</div>
        )}
        {resendMsg && (
          <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4 text-sm text-blue-300">{resendMsg}</div>
        )}

        <form onSubmit={handleVerify} className="space-y-6">
          <input
            placeholder="000000"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            maxLength={6}
            required
            className="w-full text-center tracking-[0.5em] text-xl rounded-xl border border-slate-800 bg-[#111827] px-4 py-3 text-white placeholder-slate-700 outline-none transition duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3.5 px-4 font-semibold text-white shadow-lg shadow-blue-600/10 transition duration-200 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : "Verify"}
          </button>
        </form>

        <button onClick={handleResend} className="w-full text-sm font-medium text-blue-400 hover:text-blue-300 transition">
          Resend code
        </button>

        <p className="text-center text-sm text-slate-500">
          <Link to="/" className="hover:text-slate-300 transition">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}