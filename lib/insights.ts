// Shared, pure calculations behind the "Expiry risk", "Procedures to
// prioritise", and "Reorder forecast" insights — used by the Dashboard and
// Reorder pages (as a logged-in user, RLS-scoped) and by the weekly digest
// cron job (as the service role, iterating every clinic). Keeping this in
// one place means the email can never silently disagree with what the app
// itself shows.
//
// Each function's parameter types list only the fields it actually reads,
// so callers can pass their richer page-specific types straight through.

const DAY_MS = 86_400_000;

export function daysBetween(a: Date, b: Date) {
  return Math.floor((a.getTime() - b.getTime()) / DAY_MS);
}

export function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// ---------- Expiry risk ----------

type ExpiryBatch = {
  id: string;
  product_id: string;
  quantity: number;
  expiry_date: string | null;
};

export type ExpiringBatch<B extends ExpiryBatch> = { batch: B; days: number };

export function computeExpiringBatches<B extends ExpiryBatch>(batches: B[], today: Date): ExpiringBatch<B>[] {
  return batches
    .filter((b) => b.expiry_date && b.quantity > 0)
    .map((b) => ({ batch: b, days: daysBetween(new Date(b.expiry_date as string), today) }))
    .filter((x) => x.days >= 0 && x.days <= 30)
    .sort((a, b) => a.days - b.days);
}

// ---------- Procedures to prioritise ----------

type PrioritiseProduct = { id: string; name: string };
type PrioritiseSupply = { product_id: string; quantity: number; is_dosed: boolean };
type PrioritiseProcedure = { id: string; name: string; procedure_supplies: PrioritiseSupply[] };
type PrioritiseBatch = { product_id: string; batch_number: string | null; quantity: number };

export type PrioritisedProcedure = {
  procedureId: string;
  procedureName: string;
  productName: string;
  batchNumber: string | null;
  days: number;
  capacity: number | null;
};

export function computeProceduresToPrioritise(
  procedures: PrioritiseProcedure[],
  expiringBatches: { batch: PrioritiseBatch; days: number }[],
  productsById: Map<string, PrioritiseProduct>
): PrioritisedProcedure[] {
  return procedures
    .map((proc) => {
      // expiringBatches is already sorted soonest-first, so .find() picks the
      // soonest-expiring batch when a product has more than one expiring.
      const candidates = proc.procedure_supplies
        .map((line) => {
          const match = expiringBatches.find((x) => x.batch.product_id === line.product_id);
          return match ? { line, batch: match.batch, days: match.days } : null;
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      if (candidates.length === 0) return null;

      // One row per procedure — ranked by whichever ingredient expires soonest.
      const driving = candidates.reduce((soonest, c) => (c.days < soonest.days ? c : soonest));
      const product = productsById.get(driving.line.product_id);
      const capacity = driving.line.is_dosed
        ? Math.floor(driving.batch.quantity / driving.line.quantity)
        : null;

      return {
        procedureId: proc.id,
        procedureName: proc.name,
        productName: product?.name || "—",
        batchNumber: driving.batch.batch_number,
        days: driving.days,
        capacity,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.days - b.days);
}

// ---------- Reorder forecast ----------

type ReorderProduct = { id: string; name: string; unit: string; reorder_level: number };
type ReorderBatch = { product_id: string; quantity: number };
type ReorderLogItem = { product_id: string; quantity_deducted: number; created_at: string };

export type ReorderRow<P extends ReorderProduct> = {
  product: P;
  onHand: number;
  avgMonthlyUsage: number;
  suggestedOrderQty: number;
  daysUntilStockout: number;
};

export function computeReorderForecast<P extends ReorderProduct>(
  products: P[],
  batches: ReorderBatch[],
  logItems: ReorderLogItem[],
  orderCycleDays: number,
  today: Date
): { reorderList: ReorderRow<P>[]; notEnoughHistory: string[] } {
  const notEnoughHistory: string[] = [];
  const reorderList: ReorderRow<P>[] = [];

  for (const p of products) {
    const onHand = batches.filter((b) => b.product_id === p.id).reduce((sum, b) => sum + b.quantity, 0);
    const productLogItems = logItems.filter((li) => li.product_id === p.id);

    if (productLogItems.length === 0) {
      notEnoughHistory.push(p.name);
      continue;
    }

    const firstUsage = new Date(Math.min(...productLogItems.map((li) => new Date(li.created_at).getTime())));
    const historyDays = daysBetween(today, firstUsage);

    if (historyDays < 30) {
      notEnoughHistory.push(p.name);
      continue;
    }

    // The window boundary is either exactly `firstUsage` (history < 90 days,
    // so every deduction on record must count) or exactly 90 days ago
    // (history >= 90 days). Deriving it from a floored day-count instead
    // can land a few hours after `firstUsage` itself, silently excluding
    // the very deduction that defines the window.
    const windowStart = historyDays >= 90 ? new Date(today.getTime() - 90 * DAY_MS) : firstUsage;
    const windowDays = Math.max(1, daysBetween(today, windowStart));
    const totalConsumed = productLogItems
      .filter((li) => new Date(li.created_at) >= windowStart)
      .reduce((sum, li) => sum + li.quantity_deducted, 0);
    const avgDailyUsage = totalConsumed / windowDays;

    if (avgDailyUsage <= 0) continue;

    const projectedNeed = avgDailyUsage * orderCycleDays;
    if (onHand >= projectedNeed) continue;

    reorderList.push({
      product: p,
      onHand,
      avgMonthlyUsage: avgDailyUsage * 30,
      suggestedOrderQty: projectedNeed - onHand + p.reorder_level,
      daysUntilStockout: onHand / avgDailyUsage,
    });
  }

  reorderList.sort((a, b) => a.daysUntilStockout - b.daysUntilStockout);
  return { reorderList, notEnoughHistory };
}
