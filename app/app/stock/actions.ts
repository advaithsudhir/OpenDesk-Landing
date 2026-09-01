"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AddStockState = { error: string | null; success: boolean };

export async function addStockItem(
  _prevState: AddStockState,
  formData: FormData
): Promise<AddStockState> {
  const productName = String(formData.get("productName") || "").trim();
  const supplier = String(formData.get("supplier") || "").trim();
  const batch = String(formData.get("batch") || "").trim();
  const expiryDate = String(formData.get("expiryDate") || "").trim();
  const quantity = Number(formData.get("quantity") || 0);
  const unit = String(formData.get("unit") || "").trim() || "units";
  const reorderLevel = Number(formData.get("reorderLevel") || 0);
  const unitCostRaw = String(formData.get("unitCost") || "").trim();

  if (!productName) {
    return { error: "Enter a product name.", success: false };
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

  const { error } = await supabase.from("stock_items").insert({
    clinic_id: profile.clinic_id,
    product_name: productName,
    supplier: supplier || null,
    batch: batch || null,
    expiry_date: expiryDate || null,
    quantity,
    unit,
    reorder_level: Number.isFinite(reorderLevel) ? reorderLevel : 0,
    unit_cost: unitCostRaw ? Number(unitCostRaw) : null,
  });

  if (error) {
    console.error("addStockItem failed", error);
    return { error: "Something went wrong saving that item. Please try again.", success: false };
  }

  revalidatePath("/app/stock");
  return { error: null, success: true };
}
