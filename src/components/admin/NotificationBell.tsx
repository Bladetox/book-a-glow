import { useState, useRef, useEffect } from "react";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { cn } from "@/lib/utils";

const TYPE_STYLES: Record<string, { dot: string; label: string }> = {
  new_booking:           { dot: "bg-blue-500",   label: "New Booking" },
  deposit_received:      { dot: "bg-green-500",  label: "Deposit" },
  balance_paid:          { dot: "bg-emerald-600", label: "Balance Paid" },
  full_payment_received: { dot: "bg-purple-500", label: "Full Payment" },
  cancelled:             { dot: "bg-red-500",    label: "Cancelled" },
};

export function NotificationBell() {
  const { notifications, unreadCount, markAllRead, markOneRead } = useRealtimeNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-semibold text-sm text-gray-800">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-blue-600 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => {
                const style = TYPE_STYLES[n.type] ?? { dot: "bg-gray-400", label: n.type };
                return (
                  <div
                    key={n.id}
                    onClick={() => !n.read && markOneRead(n.id)}
                    className={cn(
                      "flex gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors",
                      !n.read && "bg-blue-50/50"
                    )}
                  >
                    <div className="mt-1.5 flex-shrink-0">
                      <span className={cn("w-2 h-2 rounded-full block", style.dot)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm", !n.read ? "font-semibold text-gray-900" : "text-gray-700")}>
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{n.body}</p>
                      )}
                      <p className="text-[11px] text-gray-400 mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {!n.read && (
                      <div className="flex-shrink-0 mt-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500 block" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
