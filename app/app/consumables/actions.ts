"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AddConsumableState = { error: string | null; success: boolean };

export async function addConsumable(
  _prevState: AddConsumableState,
  formData: FormData
): Promise<AddConsumableState> {
  const productId = String(formData.get("productId") || "").trim();
  const quantity = Number(formData.get("quantity") || 0);

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
    batch_number: null,
    expiry_date: null,
    quantity,
    unit_cost: null,
  });

  if (error) {
    if (error.code === "23503") {
      return { error: "Select a valid product.", success: false };
    }
    console.error("addConsumable failed", error);
    return { error: "Something went wrong saving that item. Please try again.", success: false };
  }

  revalidatePath("/app/consumables");
  return { error: null, success: true };
}
