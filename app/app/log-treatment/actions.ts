"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Deduction = {
  productName: string;
  unit: string;
  quantity: number;
  batchLabel: string | null;
};

export type Variance = {
  drawn: number;
  billed: number;
  status: "matched" | "drawn_over" | "billed_over";
};

export type LogTreatmentState = {
  error: string | null;
  success: boolean;
  deductions: Deduction[];
  variance: Variance | null;
};

const initial: LogTreatmentState = { error: null, success: false, deductions: [], variance: null };

export async function logTreatment(
  _prevState: LogTreatmentState,
  formData: FormData
): Promise<LogTreatmentState> {
  const procedureId = String(formData.get("procedureId") || "").trim();
  const clinicianId = String(formData.get("clinicianId") || "").trim();
  const unitsDrawnRaw = String(formData.get("unitsDrawn") || "").trim();
  const unitsBilledRaw = String(formData.get("unitsBilled") || "").trim();

  if (!procedureId || !clinicianId) {
    return { ...initial, error: "Select a clinician and treatment above." };
  }

  const unitsDrawn = unitsDrawnRaw ? Number(unitsDrawnRaw) : null;
  const unitsBilled = unitsBilledRaw ? Number(unitsBilledRaw) : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("clinic_id")
    .eq("id", user.id)
    .single();

  if (!profile?.clinic_id) {
    return { ...initial, error: "Your account isn't linked to a clinic yet." };
  }

  const { data: logId, error } = await supabase.rpc("log_treatment", {
    p_clinic_id: profile.clinic_id,
    p_procedure_id: procedureId,
    p_clinician_id: clinicianId,
    p_units_drawn: unitsDrawn,
    p_units_billed: unitsBilled,
  });

  if (error) {
    if (error.code === "23503") {
      return { ...initial, error: "Select a valid clinician and treatment." };
    }
    console.error("logTreatment failed", error);
    return {
      ...initial,
      error: error.message || "Something went wrong logging that treatment. Please try again.",
    };
  }

  const { data: items } = await supabase
    .from("treatment_log_items")
    .select(
      `quantity_deducted, products ( name, unit ), stock_batches ( batch_number, expiry_date )`
    )
    .eq("treatment_log_id", logId);

  type Item = {
    quantity_deducted: number;
    products: { name: string; unit: string } | null;
    stock_batches: { batch_number: string | null; expiry_date: string | null } | null;
  };

  const deductions: Deduction[] = ((items as unknown as Item[]) || []).map((item) => {
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
    };
  });

  let variance: Variance | null = null;
  if (unitsDrawn != null && unitsBilled != null) {
    variance = {
      drawn: unitsDrawn,
      billed: unitsBilled,
      status: unitsDrawn === unitsBilled ? "matched" : unitsDrawn > unitsBilled ? "drawn_over" : "billed_over",
    };
  }

  revalidatePath("/app/stock");
  revalidatePath("/app/consumables");

  return { error: null, success: true, deductions, variance };
}
