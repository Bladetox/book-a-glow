import { createContext, useContext } from "react";

interface TenantContextValue {
  tenantId: string;
  userId: string;
}

const TenantContext = createContext<TenantContextValue | null>(null);

export const TenantProvider = TenantContext.Provider;

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used inside TenantProvider (admin layout)");
  return ctx;
}
