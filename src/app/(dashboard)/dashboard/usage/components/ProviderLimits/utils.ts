import { getModelsByProviderId } from "open-sse/config/providerModels.js";

export type NormalizedQuota = {
  name: string;
  modelKey?: string;
  used: number;
  total: number;
  resetAt: string | null;
  remainingPercentage?: number;
  message?: string;
};

/**
 * Format ISO date string to countdown format (inspired by vscode-antigravity-cockpit)
 */
export function formatResetTime(date: string | Date | null | undefined): string {
  if (!date) return "-";

  try {
    const resetDate = typeof date === "string" ? new Date(date) : date;
    const now = new Date();
    const diffMs = resetDate.getTime() - now.getTime();

    if (diffMs <= 0) return "-";

    const totalMinutes = Math.ceil(diffMs / (1000 * 60));

    // < 60 minutes: show only minutes
    if (totalMinutes < 60) {
      return `${totalMinutes}m`;
    }

    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;

    // < 24 hours: show hours and minutes
    if (totalHours < 24) {
      return `${totalHours}h ${remainingMinutes}m`;
    }

    // >= 24 hours: show days, hours, and minutes
    const days = Math.floor(totalHours / 24);
    const remainingHours = totalHours % 24;
    return `${days}d ${remainingHours}h ${remainingMinutes}m`;
  } catch {
    return "-";
  }
}

/**
 * Get Tailwind color class based on percentage
 */
export function getStatusColor(percentage: number): "green" | "yellow" | "red" {
  if (percentage > 70) return "green";
  if (percentage >= 30) return "yellow";
  return "red";
}

/**
 * Get status emoji based on percentage
 */
export function getStatusEmoji(percentage: number): string {
  if (percentage > 70) return "🟢";
  if (percentage >= 30) return "🟡";
  return "🔴";
}

/**
 * Calculate remaining percentage
 */
export function calculatePercentage(used: number, total: number): number {
  if (!total || total === 0) return 0;
  if (!used || used < 0) return 100;
  if (used >= total) return 0;

  return Math.round(((total - used) / total) * 100);
}

/**
 * Parse provider-specific quota structures into normalized array
 */
export function parseQuotaData(
  provider: string,
  data: Record<string, any> | null | undefined,
): NormalizedQuota[] {
  if (!data || typeof data !== "object") return [];

  const normalizedQuotas: NormalizedQuota[] = [];

  try {
    switch (provider.toLowerCase()) {
      case "github":
        if (data.quotas) {
          Object.entries(data.quotas as Record<string, any>).forEach(([name, quota]: [string, any]) => {
            normalizedQuotas.push({
              name,
              used: quota.used || 0,
              total: quota.total || 0,
              resetAt: quota.resetAt || null,
            });
          });
        }
        break;

      case "antigravity":
        if (data.quotas) {
          Object.entries(data.quotas as Record<string, any>).forEach(([modelKey, quota]: [string, any]) => {
            normalizedQuotas.push({
              name: quota.displayName || modelKey,
              modelKey,
              used: quota.used || 0,
              total: quota.total || 0,
              resetAt: quota.resetAt || null,
              remainingPercentage: quota.remainingPercentage,
            });
          });
        }
        break;

      case "codex":
        if (data.quotas) {
          Object.entries(data.quotas as Record<string, any>).forEach(([quotaType, quota]: [string, any]) => {
            normalizedQuotas.push({
              name: quotaType,
              used: quota.used || 0,
              total: quota.total || 0,
              resetAt: quota.resetAt || null,
            });
          });
        }
        break;

      case "kiro":
        if (data.quotas) {
          Object.entries(data.quotas as Record<string, any>).forEach(([quotaType, quota]: [string, any]) => {
            normalizedQuotas.push({
              name: quotaType,
              used: quota.used || 0,
              total: quota.total || 0,
              resetAt: quota.resetAt || null,
            });
          });
        }
        break;

      case "claude":
        if (data.message) {
          normalizedQuotas.push({
            name: "error",
            used: 0,
            total: 0,
            resetAt: null,
            message: data.message,
          });
        } else if (data.quotas) {
          Object.entries(data.quotas as Record<string, any>).forEach(([name, quota]: [string, any]) => {
            normalizedQuotas.push({
              name,
              used: quota.used || 0,
              total: quota.total || 0,
              resetAt: quota.resetAt || null,
            });
          });
        }
        break;

      default:
        if (data.quotas) {
          Object.entries(data.quotas as Record<string, any>).forEach(([name, quota]: [string, any]) => {
            normalizedQuotas.push({
              name,
              used: quota.used || 0,
              total: quota.total || 0,
              resetAt: quota.resetAt || null,
            });
          });
        }
    }
  } catch (error) {
    console.error(`Error parsing quota data for ${provider}:`, error);
    return [];
  }

  // Sort quotas according to PROVIDER_MODELS order
  const modelOrder = getModelsByProviderId(provider);
  if (modelOrder.length > 0) {
    const orderMap = new Map<string, number>(
      modelOrder.map((m: { id: string }, i: number) => [m.id, i]),
    );

    normalizedQuotas.sort((a, b) => {
      const keyA = a.modelKey || a.name;
      const keyB = b.modelKey || b.name;
      const orderA = orderMap.get(keyA) ?? 999;
      const orderB = orderMap.get(keyB) ?? 999;
      return orderA - orderB;
    });
  }

  return normalizedQuotas;
}
