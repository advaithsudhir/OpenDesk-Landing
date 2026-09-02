"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AddStockState = { error: string | null; success: boolean };

export async function addStockBatch(
  _prevState: AddStockState,
  formData: FormData
): Promise<AddStockState> {
  const productId = String(formData.get("productId") || "").trim();
  const batchNumber = String(formData.get("batchNumber") || "").trim();
  const expiryDate = String(formData.get("expiryDate") || "").trim();
  const quantity = Number(formData.get("quantity") || 0);
  const unitCostRaw = String(formData.get("unitCost") || "").trim();

  if (!productId) {
    return { error: "Select a product.", success: false };
  }
  if (!Number.isFinite(quantity) || quantity < 0) {
    return { error: "Quantity must be a positive number.", success: false };
  }

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
    return { error: "Your account isn't linked to a clinic yet.", success: false };
  }

  const { error } = await supabase.from("stock_batches").insert({
    clinic_id: profile.clinic_id,
    product_id: productId,
    batch_number: batchNumber || null,
    expiry_date: expiryDate || null,
    quantity,
    unit_cost: unitCostRaw ? Number(unitCostRaw) : null,
  });

  if (error) {
    if (error.code === "23503") {
      return { error: "Select a valid product.", success: false };
    }
    console.error("addStockBatch failed", error);
    return { error: "Something went wrong saving that item. Please try again.", success: false };
  }

  revalidatePath("/app/stock");
  return { error: null, success: true };
}

export async function removeStockBatch(formData: FormData) {
  const batchId = String(formData.get("batchId") || "");
  if (!batchId) return;

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

  if (!profile?.clinic_id) return;

  const { error } = await supabase
    .from("stock_batches")
    .delete()
    .eq("id", batchId)
    .eq("clinic_id", profile.clinic_id);

  revalidatePath("/app/stock");
  revalidatePath("/app/consumables");

  if (error) {
    const message =
      error.code === "23503"
        ? "Can't remove — this batch has treatment history."
        : "Something went wrong removing that batch. Please try again.";
    redirect(`/app/stock?error=${encodeURIComponent(message)}`);
  }

  redirect("/app/stock");
}
