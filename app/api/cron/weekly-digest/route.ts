import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  computeExpiringBatches,
  computeProceduresToPrioritise,
  computeReorderForecast,
} from "@/lib/insights";
import { buildDigestEmail } from "@/lib/email/digestTemplate";

export const dynamic = "force-dynamic";

type Product = {
  id: string;
  name: string;
  unit: string;
  default_supplier: string | null;
  cost_per_unit: number | null;
  reorder_level: number;
};

type Batch = {
  id: string;
  product_id: string;
  batch_number: string | null;
  quantity: number;
  unit_cost: number | null;
  expiry_date: string | null;
  created_at: string;
};

type LogItem = { id: string; product_id: string; quantity_deducted: number; created_at: string };
type Supply = { id: string; product_id: string; quantity: number; is_dosed: boolean };
type ProcedureRow = { id: string; name: string; procedure_supplies: Supply[] };
type Recipient = { email: string };

type Clinic = {
  id: string;
  name: string;
  order_cycle_days: number;
  notification_recipients: Recipient[];
  products: Product[];
  stock_batches: Batch[];
  treatment_log_items: LogItem[];
  procedures: ProcedureRow[];
};

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const resend = new Resend(process.env.RESEND_API_KEY);

  const { data, error } = await supabase.from("clinics").select(
    `id, name, order_cycle_days,
     notification_recipients ( email ),
     products ( id, name, unit, default_supplier, cost_per_unit, reorder_level ),
     stock_batches ( id, product_id, batch_number, quantity, unit_cost, expiry_date, created_at ),
     treatment_log_items ( id, product_id, quantity_deducted, created_at ),
     procedures ( id, name, procedure_supplies ( id, product_id, quantity, is_dosed ) )`
  );

  if (error) {
    console.error("weekly-digest: failed to load clinics", error);
    return NextResponse.json({ error: "Failed to load clinics" }, { status: 500 });
  }

  const clinics = (data || []) as unknown as Clinic[];
  const today = new Date();
  const results: { clinic: string; recipients: number; flagged: number; sent: boolean; error?: string }[] = [];

  for (const clinic of clinics) {
    const recipients = clinic.notification_recipients || [];
    if (recipients.length === 0) continue;

    const products = clinic.products || [];
    const batches = clinic.stock_batches || [];
    const logItems = clinic.treatment_log_items || [];
    const procedures = clinic.procedures || [];
    const productsById = new Map(products.map((p) => [p.id, p]));

    const expiringBatches = computeExpiringBatches(batches, today);
    const prioritise = computeProceduresToPrioritise(procedures, expiringBatches, productsById);
    const { reorderList } = computeReorderForecast(products, batches, logItems, clinic.order_cycle_days, today);

    const expiryRows = expiringBatches.map((x) => {
      const product = productsById.get(x.batch.product_id);
      return {
        productName: product?.name || "—",
        supplier: product?.default_supplier || null,
        batchNumber: x.batch.batch_number,
        days: x.days,
        quantity: x.batch.quantity,
        unit: product?.unit || "units",
      };
    });

    const prioritiseRows = prioritise.map((r) => ({
      procedureName: r.procedureName,
      productName: r.productName,
      batchNumber: r.batchNumber,
      days: r.days,
      capacity: r.capacity,
    }));

    const reorderRows = reorderList.map((r) => ({
      productName: r.product.name,
      onHand: r.onHand,
      unit: r.product.unit,
      avgMonthlyUsage: r.avgMonthlyUsage,
      suggestedOrderQty: r.suggestedOrderQty,
      daysUntilStockout: r.daysUntilStockout,
    }));

    const flagged = expiryRows.length + prioritiseRows.length + reorderRows.length;
    const { subject, html, text } = buildDigestEmail(clinic.name, expiryRows, prioritiseRows, reorderRows, today);

    try {
      await resend.emails.send({
        from: "Opendesk <notifications@getopendesk.com>",
        to: recipients.map((r) => r.email),
        subject,
        html,
        text,
      });
      results.push({ clinic: clinic.name, recipients: recipients.length, flagged, sent: true });
    } catch (err) {
      console.error(`weekly-digest: send failed for clinic ${clinic.name}`, err);
      results.push({
        clinic: clinic.name,
        recipients: recipients.length,
        flagged,
        sent: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
