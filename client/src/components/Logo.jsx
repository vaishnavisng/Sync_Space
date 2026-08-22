import { useId } from "react";
import "./Logo.css";

function Logo({ size = 26 }) {
  const gradientId = useId();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="logo-icon"
    >
      <defs>
        <linearGradient id={gradientId} x1="2" y1="4" x2="22" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3fc6d6" />
          <stop offset="100%" stopColor="#3ddc97" />
        </linearGradient>
      </defs>

      <path
        className="logo-bracket logo-bracket--left"
        d="M8 4 3 12l5 8"
        stroke={`url(#${gradientId})`}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        className="logo-bracket logo-bracket--right"
        d="M16 4l5 8-5 8"
        stroke={`url(#${gradientId})`}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <circle className="logo-pulse-ring" cx="12" cy="12" r="2.2" fill="none" stroke="#3fc6d6" strokeWidth="1" />
      <circle className="logo-pulse-dot" cx="12" cy="12" r="1.6" fill="#3fc6d6" />
    </svg>
  );
}

export default Logo;