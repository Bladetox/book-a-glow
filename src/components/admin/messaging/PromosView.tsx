import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Send, Users, Copy, ChevronRight } from "lucide-react";
import { buildWhatsAppUrl } from "@/lib/messaging/whatsapp";
import type { ClientRowForPromo } from "./types";

type PromoAudience = "all" | "returning" | "due" | "overdue" | "inactive";

type PromoClient = ClientRowForPromo & {
  daysOverdue?: number;
  daysSinceBooking?: number;
};

export default function PromosView({
  clients,
  dueClients,
  overdueClients,
  inactiveClients,
  businessName,
  bookingUrl,
}: {
  clients: ClientRowForPromo[];
  dueClients: ClientRowForPromo[];
  overdueClients: PromoClient[];
  inactiveClients: PromoClient[];
  businessName: string;
  bookingUrl: string;
}) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState<PromoAudience>("all");
  const [queueIndex, setQueueIndex] = useState(0);

  const audienceClients = useMemo(() => {
    const source =
      audience === "due"
        ? dueClients
        : audience === "overdue"
          ? overdueClients
          : audience === "inactive"
            ? inactiveClients
            : audience === "returning"
              ? clients.filter((client) => client.bookingCount > 1)
              : clients;

    const seen = new Set<string>();
    return source.filter((client) => {
      const key = client.key;
      if (!client.phone || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [audience, clients, dueClients, overdueClients, inactiveClients]);

  useEffect(() => {
    setQueueIndex(0);
  }, [audience]);

  useEffect(() => {
    setQueueIndex((current) => Math.min(current, Math.max(audienceClients.length - 1, 0)));
  }, [audienceClients.length]);

  const currentClient = audienceClients[queueIndex] ?? null;

  const personalisedMessage = (client: ClientRowForPromo) => {
    const opening = title.trim() ? title.trim() + "\n\n" : "";
    return (opening + message.trim() + "\n\nBook here: " + bookingUrl).replace(
      /\[Client name\]/gi,
      client.name,
    );
  };

  const openCurrentWhatsApp = () => {
    if (!message.trim() || !currentClient?.phone) return;

    const url = buildWhatsAppUrl(
      currentClient.phone,
      personalisedMessage(currentClient),
    );

    if (!url) return;

    // This must remain a direct user action. Opening 119 windows on timers
    // will be blocked by browsers and is not a valid WhatsApp bulk-send flow.
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const nextClient = () => {
    if (queueIndex < audienceClients.length - 1) {
      setQueueIndex((current) => current + 1);
    }
  };

  const copyMessage = async () => {
    if (!message.trim()) return;

    const previewClient =
      currentClient ?? {
        name: "[Client name]",
        key: "preview",
        phone: null,
        email: null,
        lastBooking: null,
        bookingCount: 0,
        spend: 0,
        bookings: [],
      };

    await navigator.clipboard.writeText(personalisedMessage(previewClient));
  };

  const audienceLabel: Record<PromoAudience, string> = {
    all: "All clients",
    returning: "Returning clients",
    due: "Clients due soon",
    overdue: "Overdue clients",
    inactive: "Inactive clients",
  };

  const queueComplete =
    audienceClients.length > 0 && queueIndex >= audienceClients.length - 1;

  return (
    <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-4">
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center">
            <Send className="w-4 h-4 text-white/45" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white/80">Create a promo</p>
            <p className="text-xs text-white/30 mt-1">
              Write once, personalise it automatically and work through the WhatsApp queue one client at a time.
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          <label className="grid gap-1.5">
            <span className="text-[11px] text-white/40">Promo name</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Spring special"
              className="rounded-xl bg-white/[0.03] border border-white/[0.07] px-3 py-3 text-sm text-white/80 focus:outline-none focus:border-white/20"
            />
          </label>

          <label className="grid gap-1.5">
            <span className="text-[11px] text-white/40">Who should receive it?</span>
            <select
              value={audience}
              onChange={(event) => setAudience(event.target.value as PromoAudience)}
              className="rounded-xl bg-white/[0.03] border border-white/[0.07] px-3 py-3 text-sm text-white/80 focus:outline-none focus:border-white/20"
            >
              {(Object.keys(audienceLabel) as PromoAudience[]).map((key) => (
                <option key={key} value={key}>
                  {audienceLabel[key]}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5">
            <span className="text-[11px] text-white/40">Your message</span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={7}
              placeholder={"Hi [Client name], I’m running a special this month..."}
              className="rounded-xl bg-white/[0.03] border border-white/[0.07] px-3 py-3 text-sm text-white/80 resize-none focus:outline-none focus:border-white/20"
            />
            <span className="text-[10px] text-white/25">
              Use [Client name] where you want NextSlot to add the client’s name.
            </span>
          </label>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={copyMessage}
              disabled={!message.trim()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-white/45 hover:text-white/70 disabled:opacity-30"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy message
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={nextClient}
                disabled={!currentClient || queueComplete}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs text-white/45 hover:text-white/70 disabled:opacity-30"
              >
                Skip
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={openCurrentWhatsApp}
                disabled={!message.trim() || !currentClient}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.08] text-xs font-semibold text-white/75 hover:bg-white/[0.12] disabled:opacity-30"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Open WhatsApp
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 h-fit">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-white/30" />
          <div>
            <p className="text-sm font-semibold text-white/75">WhatsApp queue</p>
            <p className="text-[11px] text-white/30">{audienceLabel[audience]}</p>
          </div>
        </div>

        <div className="text-3xl font-semibold text-white/80">
          {audienceClients.length}
        </div>
        <p className="text-xs text-white/30 mt-1">
          clients with a WhatsApp number
        </p>

        {currentClient ? (
          <div className="mt-5 rounded-xl bg-white/[0.03] border border-white/[0.05] px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-white/25">
                  Current client
                </p>
                <p className="text-sm text-white/70 mt-1 truncate">
                  {currentClient.name}
                </p>
                <p className="text-[11px] text-white/30 mt-0.5">
                  {currentClient.phone}
                </p>
              </div>
              <span className="text-[11px] text-white/30 shrink-0">
                {queueIndex + 1} of {audienceClients.length}
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-xl bg-white/[0.03] border border-white/[0.05] px-3 py-3">
            <p className="text-sm text-white/50">No clients in this audience.</p>
          </div>
        )}

        <div className="mt-5 rounded-xl bg-white/[0.03] border border-white/[0.05] px-3 py-3">
          <p className="text-[10px] uppercase tracking-wider text-white/25">From</p>
          <p className="text-sm text-white/60 mt-1">{businessName || "Your business"}</p>
        </div>

        <p className="text-[10px] text-white/20 mt-4 leading-relaxed">
          NextSlot opens one personalised message at a time. You send it in WhatsApp.
          NextSlot cannot tell whether a message was sent, delivered or read.
        </p>
      </div>
    </div>
  );
}
