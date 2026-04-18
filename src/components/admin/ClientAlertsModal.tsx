import { X } from "lucide-react";
import type { OverdueLoyaltyClient, InactiveClient } from "@/hooks/useClientAlerts";

interface ClientAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  alertType: "overdue_loyalty" | "inactive_90_days" | null;
  overdueClients: OverdueLoyaltyClient[];
  inactiveClients: InactiveClient[];
}

export default function ClientAlertsModal({
  isOpen,
  onClose,
  alertType,
  overdueClients,
  inactiveClients,
}: ClientAlertsModalProps) {
  if (!isOpen || !alertType) return null;

  const clients = alertType === "overdue_loyalty" ? overdueClients : inactiveClients;
  const title = alertType === "overdue_loyalty" 
    ? "Clients with Overdue Loyalty Appointments"
    : "Clients Not Booked in 90+ Days";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[85vh] sm:max-h-[80vh] flex flex-col shadow-xl">
        {/* Header - Sticky */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 rounded-t-2xl sm:rounded-t-2xl flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 pr-4">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          {clients.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No clients found
            </div>
          ) : (
            <div className="space-y-3">
              {alertType === "overdue_loyalty" ? (
                overdueClients.map((client) => (
                  <div
                    key={client.id}
                    className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    key={client.id}                        <h3 className="font-medium text-gray-900 truncate">
                          {client.client_name}
                        </h3>
                        <p className="text-sm text-gray-600 truncate">
                          {client.phone}
                        </p>
                      </div>
                      <div className="flex flex-col sm:items-end gap-1">
                        <span className="text-sm font-medium text-red-600 whitespace-nowrap">
                          {client.days_overdue} days overdue
                        </span>
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          Due: {new Date(client.next_due_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                inactiveClients.map((client) => (
                  <div
                    key={client.client_id}
                    className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">
                          {client.client_name}
                        </h3>
                        <p className="text-sm text-gray-600 truncate">
                          {client.client_phone}
                        </p>
                      </div>
                      <div className="flex flex-col sm:items-end gap-1">
                        <span className="text-sm font-medium text-orange-600 whitespace-nowrap">
                          {client.days_since_booking} days ago
                        </span>
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          Last: {new Date(client.last_booking_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer - Sticky */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 sm:px-6 py-3 sm:py-4 rounded-b-2xl sm:rounded-b-2xl">
          <p className="text-sm text-gray-600 text-center">
            Total: {clients.length} client{clients.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </div>
  );
}
