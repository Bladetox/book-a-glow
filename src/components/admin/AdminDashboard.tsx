import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, CalendarCheck,
  AlertTriangle, Star, ShoppingBag, Eye,
  BarChart3, CircleDollarSign, UserPlus, UserCheck, Percent,
  XCircle, Package, Bell, Clock, Info, X, Megaphone,
  Loader2, ArrowRight
} from "lucide-react";
import { useDashboardData } from "@/hooks/useSupabaseDashboard";
import RevenueTrendCard from "@/components/admin/RevenueTrendCard";
import { useClientAlerts } from "@/hooks/useClientAlerts";
import ClientAlertsModal from "@/components/admin/ClientAlertsModal";
import { useTenant } from "@/contexts/TenantContext";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useNextyInsights } from "@/hooks/useNextyInsights";
