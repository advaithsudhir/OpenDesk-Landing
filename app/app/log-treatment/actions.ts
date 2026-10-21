"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FACE_AREAS } from "@/lib/faceAreas";

const VALID_AREAS = new Set(FACE_AREAS.map((a) => a.slug));
const DAY_MS = 86_400_000;

export type Deduction = {
  productName: string;
  unit: string;
  quantity: number;
  batchLabel: string | null;
  isSample: boolean;
};

export type Variance = {
  procedureName: string;
  drawn: number;
  billed: number;
  status: "matched" | "drawn_over" | "billed_over";
};

export type LogVisitState = {
  error: string | null;
  success: boolean;
  deductions: Deduction[];
  variances: Variance[];
  totalCost: number | null;
};

const initial: LogVisitState = { error: null, success: false, deductions: [], variances: [], totalCost: null };

type RawLine = { procedureId?: string; productId?: string; area?: string; quantity?: string | number };

export async function logVisit(_prevState: LogVisitState, formData: FormData): Promise<LogVisitState> {
  const clinicianId = String(formData.get("clinicianId") || "").trim();
  const visitDate = String(formData.get("visitDate") || "").trim();
  const samplesGiven = formData.get("samplesGiven") === "on";

  if (!clinicianId) {
    return { ...initial, error: "Select a clinician." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(visitDate) || Number.isNaN(Date.parse(visitDate))) {
    return { ...initial, error: "Pick the visit date." };
  }
  // A day of slack so an Australian "today" never reads as future against UTC.
  if (Date.parse(visitDate) > Date.now() + DAY_MS) {
    return { ...initial, error: "The visit date can't be in the future." };
  }

  let rawLines: RawLine[];
  let rawBilled: { procedureId: string; unitsBilled: string | number }[];
  let rawSamples: { productId: string; quantity: number }[];
  try {
    rawLines = JSON.parse(String(formData.get("linesJson") || "[]"));
    rawBilled = JSON.parse(String(formData.get("billedJson") || "[]"));
    rawSamples = JSON.parse(String(formData.get("samplesJson") || "[]"));
  } catch {
    return { ...initial, error: "Something went wrong reading the visit lines." };
  }

  const lines: { procedure_id: string | null; product_id: string | null; area: string | null; quantity: number | null }[] = [];
  for (const [i, raw] of rawLines.entries()) {
    const procedureId = (raw.procedureId || "").trim();
    const productId = (raw.productId || "").trim();
    const area = (raw.area || "").trim();
    const qtyText = String(raw.quantity ?? "").trim();
    if (!procedureId && !productId && !qtyText) continue;

    const n = i + 1;
    if (area && !VALID_AREAS.has(area)) {
      return { ...initial, error: `Line ${n}: unknown area.` };
    }
    if (!productId && qtyText) {
      return { ...initial, error: `Line ${n}: pick a product for that amount.` };
    }
    if (!procedureId && !productId) {
      return { ...initial, error: `Line ${n}: pick a procedure or a product.` };
    }
    const quantity = productId ? Number(qtyText) : null;
    if (productId && !(Number.isFinite(quantity) && (quantity as number) > 0)) {
      return { ...initial, error: `Line ${n}: enter an amount.` };
    }
    lines.push({ procedure_id: procedureId || null, product_id: productId || null, area: area || null, quantity });
  }

  if (lines.length === 0) {
    return { ...initial, error: "Add at least one line to the visit." };
  }

  const billed = rawBilled
    .filter((b) => b.procedureId && String(b.unitsBilled ?? "").trim() !== "")
    .map((b) => ({ procedure_id: b.procedureId, units_billed: Number(b.unitsBilled) }))
    .filter((b) => Number.isFinite(b.units_billed) && b.units_billed >= 0);

  let samples: { product_id: string; quantity: number }[] = [];
  if (samplesGiven) {
    samples = rawSamples
      .filter((s) => s.productId && Number.isFinite(s.quantity) && s.quantity > 0)
      .map((s) => ({ product_id: s.productId, quantity: s.quantity }));
    if (samples.length === 0) {
      return { ...initial, error: "Add at least one sample product and quantity, or untick Samples given." };
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase.from("profiles").select("clinic_id").eq("id", user.id).single();

  if (!profile?.clinic_id) {
    return { ...initial, error: "Your account isn't linked to a clinic yet." };
  }

  const { data: visitId, error } = await supabase.rpc("log_visit", {
    p_clinic_id: profile.clinic_id,
    p_clinician_id: clinicianId,
    p_visit_date: visitDate,
    p_lines: lines,
    p_billed: billed.length ? billed : null,
    p_samples: samples.length ? samples : null,
  });

  if (error) {
    if (error.code === "23503") {
      return { ...initial, error: "One of the selected clinician, procedures or products no longer exists." };
    }
    console.error("logVisit failed", error);
    return { ...initial, error: error.message || "Something went wrong logging that visit. Please try again." };
  }

  const [{ data: items }, { data: logs }] = await Promise.all([
    supabase
      .from("treatment_log_items")
      .select(
        `quantity_deducted, is_sample, products ( name, unit, cost_per_unit ), stock_batches ( batch_number, expiry_date )`
      )
      .eq("visit_id", visitId),
    supabase.from("treatment_logs").select(`units_drawn, units_billed, procedures ( name )`).eq("visit_id", visitId),
  ]);

  type Item = {
    quantity_deducted: number;
    is_sample: boolean;
    products: { name: string; unit: string; cost_per_unit: number | null } | null;
    stock_batches: { batch_number: string | null; expiry_date: string | null } | null;
  };
  type Log = { units_drawn: number | null; units_billed: number | null; procedures: { name: string } | null };

  const itemRows = (items as unknown as Item[]) || [];
  const deductions: Deduction[] = itemRows.map((item) => {
    const batch = item.stock_batches;
    const batchLabel = batch?.batch_number
      ? `batch ${batch.batch_number}`
      : batch?.expiry_date
        ? `expires ${new Date(batch.expiry_date).toLocaleDateString("en-AU")}`
        : null;
    return {
      productName: item.products?.name || "Product",
      unit: item.products?.unit || "units",
      quantity: item.quantity_deducted,
      batchLabel,
      isSample: item.is_sample,
    };
  });

  const totalCost = itemRows
    .filter((i) => !i.is_sample)
    .reduce((sum, i) => sum + i.quantity_deducted * (i.products?.cost_per_unit ?? 0), 0);

  const variances: Variance[] = ((logs as unknown as Log[]) || [])
    .filter((l) => l.units_drawn != null && l.units_billed != null)
    .map((l) => {
      const drawn = l.units_drawn as number;
      const billedUnits = l.units_billed as number;
      return {
        procedureName: l.procedures?.name || "Procedure",
        drawn,
        billed: billedUnits,
        status: drawn === billedUnits ? "matched" : drawn > billedUnits ? "drawn_over" : "billed_over",
      };
    });

  revalidatePath("/app/stock");
  revalidatePath("/app/consumables");
  revalidatePath("/app");
  revalidatePath("/app/margin");
  revalidatePath("/app/reorder");
  revalidatePath("/app/treatment-log");

  return { error: null, success: true, deductions, variances, totalCost };
}
