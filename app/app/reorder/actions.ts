"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type UpdateOrderCycleState = { error: string | null; success: boolean };

export async function updateOrderCycle(
  _prevState: UpdateOrderCycleState,
  formData: FormData
): Promise<UpdateOrderCycleState> {
  const days = Number(formData.get("orderCycleDays") || 0);

  if (!Number.isFinite(days) || days <= 0) {
    return { error: "Order cycle must be a positive number of days.", success: false };
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

  const { error } = await supabase
    .from("clinics")
    .update({ order_cycle_days: Math.round(days) })
    .eq("id", profile.clinic_id);

  if (error) {
    console.error("updateOrderCycle failed", error);
    return { error: "Something went wrong saving that. Please try again.", success: false };
  }

  revalidatePath("/app/reorder");
  return { error: null, success: true };
}
