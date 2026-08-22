import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginRequest } from "../services/api";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";
import Toast from "../components/Toast";
import "./Login.css";

export default function Login() {
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: "", tone: "error" });
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/home", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await loginRequest(form.identifier, form.password);
      login(data.token, data.username);
      navigate("/home");
    } catch (err) {
      const unverifiedEmail = err.email || (form.identifier.includes("@") ? form.identifier.trim() : "");
      if (err.message === "Please verify your email first" && unverifiedEmail) {
        navigate("/verify-otp", { state: { email: unverifiedEmail, toast: "Please verify your email to continue." } });
        return;
      }
      setError(err.message);
      setToast({ message: err.message, tone: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0b1526] text-[#e7edf7]">
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center bg-gradient-to-br from-[#131f38] via-[#0f1a2e] to-[#0b1526] p-12 border-r border-[#2c3f66] overflow-hidden">
        <div className="login-orb login-orb--a" />
        <div className="login-orb login-orb--b" />

        <div className="max-w-md space-y-6 relative z-10 login-panel-in">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#1f2937] border border-[#2c3f66] shadow-lg shadow-black/30">
              <Logo size={30} />
            </div>
            <span className="login-wordmark">SyncSpace</span>
          </div>

          <span className="login-eyebrow">COLLABORATIVE WORKSPACE</span>

          <div className="space-y-3">
            <h1 className="text-4xl font-extrabold tracking-tight text-white">
              The workspace built for scale.
            </h1>
            <p className="text-base text-[#a9b8d4] leading-relaxed">
              Access secure digital assets, collaborate across teams in real-time, and streamline engineering workflows with SyncSpace.
            </p>
          </div>

          <div className="login-features">
            <span className="login-feature">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="4" y="5" width="16" height="14" rx="2" stroke="#3fc6d6" strokeWidth="1.8" /><path d="M8 10h5M8 13h8" stroke="#3fc6d6" strokeWidth="1.8" strokeLinecap="round" /></svg>
              Whiteboard
            </span>
            <span className="login-feature">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 8l-4 4 4 4M15 8l4 4-4 4" stroke="#3ddc97" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Code Editor
            </span>
            <span className="login-feature">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 12a8 8 0 0114-5.3M20 12a8 8 0 01-14 5.3" stroke="#c77dff" strokeWidth="1.8" strokeLinecap="round" /><path d="M18 4v4h-4M6 20v-4h4" stroke="#c77dff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Real-time Sync
            </span>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-[#2c3f66] bg-[#1f2937]/60 px-3 py-1.5 text-xs text-[#a9b8d4]">
            <span className="login-status-dot" />
            Real-time sync online
          </div>

          <div className="pt-6 border-t border-[#2c3f66] flex items-center gap-6 text-xs text-[#5b6478]">
            <span>&copy; 2026 SyncSpace Inc.</span>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 py-12 sm:px-16 lg:px-24">
        <div className="mx-auto w-full max-w-md space-y-8 login-form-in">
          <div>
            <div className="flex lg:hidden items-center gap-2 mb-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#1f2937] border border-[#2c3f66]">
                <Logo size={22} />
              </div>
              <span className="login-wordmark login-wordmark--sm">SyncSpace</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-white">Account Sign In</h2>
            <p className="mt-2 text-sm text-[#a9b8d4]">Enter your credentials to continue.</p>
          </div>

          {error && (
            <div className="flex items-center gap-3 rounded-xl bg-[#ff6b6b]/10 border border-[#ff6b6b]/30 p-4 text-sm text-[#ff9b9b]">
              <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#a9b8d4] mb-2">
                Username or Email
              </label>
              <input
                name="identifier"
                required
                placeholder="you@example.com"
                value={form.identifier}
                onChange={handleChange}
                className="w-full rounded-xl border border-[#2c3f66] bg-[#1f2937] px-4 py-3 text-white placeholder-[#5b6478] outline-none transition duration-200 focus:border-[#3fc6d6] focus:ring-4 focus:ring-[#3fc6d6]/10"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#a9b8d4]">Password</label>
                <Link to="/forgot-password" className="text-xs font-medium text-[#3fc6d6] hover:text-[#56d3e1] transition">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-[#2c3f66] bg-[#1f2937] pl-4 pr-12 py-3 text-white placeholder-[#5b6478] outline-none transition duration-200 focus:border-[#3fc6d6] focus:ring-4 focus:ring-[#3fc6d6]/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5b6478] hover:text-[#a9b8d4] transition text-sm font-medium"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full relative flex justify-center items-center rounded-xl bg-gradient-to-r from-[#3fc6d6] to-[#3ddc97] py-3.5 px-4 font-semibold text-[#0b1526] shadow-lg shadow-[#3fc6d6]/20 transition duration-200 hover:from-[#56d3e1] hover:to-[#3ddc97] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#0b1526] border-t-transparent" /> : "Sign In"}
            </button>
          </form>

          <p className="text-center text-sm text-[#5b6478]">
            New here?{" "}
            <Link to="/signup" className="font-semibold text-[#3fc6d6] hover:text-[#56d3e1] transition">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}