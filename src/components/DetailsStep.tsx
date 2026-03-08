import { BookingState, safetyQuestions } from "@/data/bookingData";

interface DetailsStepProps {
  booking: BookingState;
  onUpdate: (updates: Partial<BookingState>) => void;
}

const phoneCodes = [
  { flag: "🇿🇦", code: "+27" },
  { flag: "🇺🇸", code: "+1" },
  { flag: "🇬🇧", code: "+44" },
  { flag: "🇦🇺", code: "+61" },
  { flag: "🇳🇿", code: "+64" },
  { flag: "🇩🇪", code: "+49" },
  { flag: "🇫🇷", code: "+33" },
];

const referralOptions = [
  "Instagram", "TikTok", "Facebook", "Google Search",
  "Word of Mouth", "Referred by a Friend", "I'm a returning client", "Other",
];

const DetailsStep = ({ booking, onUpdate }: DetailsStepProps) => {
  const inputClass =
    "w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all";

  return (
    <div className="flex flex-col gap-5">
      <h3 className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">
        Your details
      </h3>

      {/* Existing / New client */}
      <div>
        <p className="text-sm text-foreground mb-3">Have you booked with us before?</p>
        <div className="flex gap-3">
          {[
            { label: "✨ Existing Diva", value: true },
            { label: "🌸 New Diva", value: false },
          ].map((opt) => (
            <button
              key={String(opt.value)}
              onClick={() => onUpdate({ isExistingClient: opt.value })}
              className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all
                ${booking.isExistingClient === opt.value
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "glass-card-service text-foreground"
                }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Form fields */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <span className="absolute left-3 top-3.5 text-sm">👤</span>
          <input
            className={`${inputClass} pl-10`}
            placeholder="Full Name"
            value={booking.fullName}
            onChange={(e) => onUpdate({ fullName: e.target.value })}
          />
        </div>

        <div className="flex gap-2">
          <select
            className={`${inputClass} w-24 appearance-none`}
            value={booking.phoneCode}
            onChange={(e) => onUpdate({ phoneCode: e.target.value })}
          >
            {phoneCodes.map((pc) => (
              <option key={pc.code} value={pc.code}>
                {pc.flag} {pc.code}
              </option>
            ))}
          </select>
          <input
            className={inputClass}
            placeholder="e.g. 082 123 4567"
            value={booking.phone}
            onChange={(e) => onUpdate({ phone: e.target.value })}
          />
        </div>

        <div className="relative">
          <span className="absolute left-3 top-3.5 text-sm">✉️</span>
          <input
            className={`${inputClass} pl-10`}
            type="email"
            placeholder="Email Address"
            value={booking.email}
            onChange={(e) => onUpdate({ email: e.target.value })}
          />
        </div>

        <div>
          <div className="relative">
            <span className="absolute left-3 top-3.5 text-sm">📍</span>
            <input
              className={`${inputClass} pl-10`}
              placeholder="Home Address"
              value={booking.address}
              onChange={(e) => onUpdate({ address: e.target.value })}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1 ml-1">
            Used to calculate your call-out fee
          </p>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">How did you hear about us?</label>
          <select
            className={`${inputClass} appearance-none`}
            value={booking.referralSource}
            onChange={(e) => onUpdate({ referralSource: e.target.value })}
          >
            <option value="">Select an option…</option>
            {referralOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Safety check for new clients */}
      {booking.isExistingClient === false && (
        <div className="glass-card-service rounded-xl p-4 flex flex-col gap-4">
          <div>
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              🌸 New Client Safety Check
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              Answer all questions honestly. Your information is strictly confidential.
            </p>
          </div>

          {safetyQuestions.map((q) => (
            <div key={q.id} className="flex flex-col gap-2">
              <div>
                <p className="text-sm text-foreground">{q.id}. {q.question}</p>
                {q.detail && <p className="text-[10px] text-muted-foreground">{q.detail}</p>}
              </div>
              <div className="flex gap-2">
                {[
                  { label: "No", value: false },
                  { label: "Yes", value: true },
                ].map((opt) => (
                  <button
                    key={String(opt.value)}
                    onClick={() =>
                      onUpdate({
                        safetyAnswers: { ...booking.safetyAnswers, [q.id]: opt.value },
                      })
                    }
                    className={`px-5 py-1.5 rounded-lg text-xs font-medium transition-all
                      ${booking.safetyAnswers[q.id] === opt.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <textarea
            className={`${inputClass} min-h-[60px]`}
            placeholder="Anything else we should know? (optional)"
            value={booking.additionalNotes}
            onChange={(e) => onUpdate({ additionalNotes: e.target.value })}
          />
        </div>
      )}
    </div>
  );
};

export default DetailsStep;
