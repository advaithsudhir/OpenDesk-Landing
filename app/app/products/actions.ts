"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AddProductState = { error: string | null; success: boolean };

const CATEGORIES = ["Injectable", "Skincare", "Consumable", "Device", "Sample", "Other"] as const;

export async function addProduct(
  _prevState: AddProductState,
  formData: FormData
): Promise<AddProductState> {
  const name = String(formData.get("name") || "").trim();
  const category = String(formData.get("category") || "").trim();
  const brand = String(formData.get("brand") || "").trim();
  const unit = String(formData.get("unit") || "").trim() || "units";
  const packName = String(formData.get("packName") || "").trim() || "unit";
  const packSize = Number(formData.get("packSize") || 1);
  const costPerPackRaw = String(formData.get("costPerPack") || "").trim();
  const defaultSupplier = String(formData.get("defaultSupplier") || "").trim();
  const reorderLevel = Number(formData.get("reorderLevel") || 0);
  const isS4 = formData.get("isS4") === "on";

  if (!name) {
    return { error: "Enter a product name.", success: false };
  }
  if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
    return { error: "Select a category.", success: false };
  }
  if (!Number.isFinite(packSize) || packSize <= 0) {
    return { error: "Amount per pack must be a positive number.", success: false };
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
    brand: brand || null,
    unit,
    pack_name: packName,
    pack_size: packSize,
    cost_per_unit: costPerPackRaw ? Number(costPerPackRaw) / packSize : null,
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

export async function removeProduct(formData: FormData) {
  const productId = String(formData.get("productId") || "");
  if (!productId) return;

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

  const { data: product } = await supabase
    .from("products")
    .select("name")
    .eq("id", productId)
    .eq("clinic_id", profile.clinic_id)
    .single();

  const [{ count: batchCount }, { count: supplyCount }] = await Promise.all([
    supabase
      .from("stock_batches")
      .select("id", { count: "exact", head: true })
      .eq("product_id", productId)
      .eq("clinic_id", profile.clinic_id),
    supabase
      .from("procedure_supplies")
      .select("id", { count: "exact", head: true })
      .eq("product_id", productId)
      .eq("clinic_id", profile.clinic_id),
  ]);

  if ((batchCount || 0) > 0 || (supplyCount || 0) > 0) {
    const parts: string[] = [];
    if (batchCount) parts.push(`${batchCount} stock batch${batchCount === 1 ? "" : "es"}`);
    if (supplyCount) parts.push(`${supplyCount} procedure${supplyCount === 1 ? "" : "s"}`);
    const message = `Can't remove "${product?.name || "this product"}" — it's referenced by ${parts.join(" and ")}. Remove those first.`;
    redirect(`/app/products?error=${encodeURIComponent(message)}`);
  }

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId)
    .eq("clinic_id", profile.clinic_id);

  revalidatePath("/app/products");

  if (error) {
    redirect(
      `/app/products?error=${encodeURIComponent("Something went wrong removing that product. Please try again.")}`
    );
  }

  redirect("/app/products");
}
