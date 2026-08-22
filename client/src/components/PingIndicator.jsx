import { usePing } from "../hooks/usePing";
import "./PingIndicator.css";

function pingTier(ms) {
  if (ms == null) return "unknown";
  if (ms < 100) return "good";
  if (ms < 300) return "okay";
  return "poor";
}

function PingIndicator() {
  const latency = usePing();
  const tier = pingTier(latency);

  return (
    <div className={`ping-indicator ping-indicator--${tier}`} title="Round-trip time to server">
      <span className="ping-indicator__dot" />
      {latency == null ? "…" : `${latency}ms`}
    </div>
  );
}

export default PingIndicator;