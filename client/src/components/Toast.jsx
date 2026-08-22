import { useEffect, useRef } from "react";
import "./Toast.css";

function Toast({ message, tone = "error", onDismiss, duration = 4000 }) {
  // keep the latest onDismiss without making the timer effect depend on it -
  // onDismiss is a new function reference on every parent render, which was
  // resetting the auto-dismiss timer far more often than intended
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (!message) return undefined;
    const t = setTimeout(() => onDismissRef.current?.(), duration);
    return () => clearTimeout(t);
  }, [message, duration]);

  if (!message) return null;

  return (
    <div className={`toast toast--${tone}`} role="alert">
      {message}
    </div>
  );
}

export default Toast;