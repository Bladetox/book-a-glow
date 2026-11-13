import { Clock } from "lucide-react";
import { formatCountdown } from "@/lib/bookingFormat";

/** Countdown for the 10-minute slot hold. Turns amber for the last two minutes. */
const HoldTimer = ({ secondsLeft }: { secondsLeft: number }) => (
  <span
    className={`bk-hold shrink-0 ${secondsLeft <= 120 ? "is-urgent" : ""}`}
    role="timer"
    aria-label={`Your time is held for ${formatCountdown(secondsLeft)}`}
  >
    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
    Held for <b>{formatCountdown(secondsLeft)}</b>
  </span>
);

export default HoldTimer;
