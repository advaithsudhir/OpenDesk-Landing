"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AddProductState = { error: string | null; success: boolean };

const CATEGORIES = ["Injectable", "Skincare", "Consumable", "Device", "Other"] as const;

export async function addProduct(
  _prevState: AddProductState,
  formData: FormData
): Promise<AddProductState> {
  const name = String(formData.get("name") || "").trim();
  const category = String(formData.get("category") || "").trim();
  const unit = String(formData.get("unit") || "").trim() || "units";
  const costPerUnitRaw = String(formData.get("costPerUnit") || "").trim();
  const defaultSupplier = String(formData.get("defaultSupplier") || "").trim();
  const reorderLevel = Number(formData.get("reorderLevel") || 0);
  const isS4 = formData.get("isS4") === "on";

  if (!name) {
    return { error: "Enter a product name.", success: false };
  }
  if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
    return { error: "Select a category.", success: false };
  }
  if (!Number.isFinite(reorderLevel) || reorderLevel < 0) {
    return { error: "Reorder level must be a positive number.", success: false };
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

  const { error } = await supabase.from("products").insert({
    clinic_id: profile.clinic_id,
    name,
    category,
    unit,
    cost_per_unit: costPerUnitRaw ? Number(costPerUnitRaw) : null,
    default_supplier: defaultSupplier || null,
    reorder_level: reorderLevel,
    is_s4: isS4,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: `A product named "${name}" already exists.`, success: false };
    }
    console.error("addProduct failed", error);
    return { error: "Something went wrong saving that product. Please try again.", success: false };
  }

  revalidatePath("/app/products");
  return { error: null, success: true };
}
