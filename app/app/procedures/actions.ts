"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CreateProcedureState = { error: string | null; success: boolean };

type Line = { productId: string; quantity: number; isDosed: boolean };

export async function createProcedure(
  _prevState: CreateProcedureState,
  formData: FormData
): Promise<CreateProcedureState> {
  const name = String(formData.get("name") || "").trim();
  const priceRaw = String(formData.get("price") || "").trim();
  const linesJson = String(formData.get("linesJson") || "[]");

  if (!name) {
    return { error: "Enter a procedure name.", success: false };
  }

  let price: number | null = null;
  if (priceRaw) {
    price = Number(priceRaw);
    if (!Number.isFinite(price) || price < 0) {
      return { error: "Enter a valid price.", success: false };
    }
  }

  let lines: Line[];
  try {
    lines = JSON.parse(linesJson);
  } catch {
    return { error: "Something went wrong reading the supply lines.", success: false };
  }

  // Empty is allowed — a procedure can be saved as a name-only shell (no
  // price, no recipe yet) and filled in later once real data arrives.
  const validLines = lines.filter((l) => l.productId && Number.isFinite(l.quantity) && l.quantity > 0);
  if (validLines.filter((l) => l.isDosed).length > 1) {
    return { error: "Only one supply line can be dosed.", success: false };
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

  const { error } = await supabase.rpc("create_procedure_with_supplies", {
    p_clinic_id: profile.clinic_id,
    p_name: name,
    p_price: price,
    p_lines: validLines.map((l) => ({
      product_id: l.productId,
      quantity: l.quantity,
      is_dosed: l.isDosed,
    })),
  });

  if (error) {
    if (error.code === "23505") {
      return { error: `A procedure named "${name}" already exists.`, success: false };
    }
    console.error("createProcedure failed", error);
    return {
      error: error.message || "Something went wrong saving that procedure. Please try again.",
      success: false,
    };
  }

  revalidatePath("/app/procedures");
  revalidatePath("/app");
  revalidatePath("/app/margin");
  return { error: null, success: true };
}

export async function updateProcedure(
  _prevState: CreateProcedureState,
  formData: FormData
): Promise<CreateProcedureState> {
  const procedureId = String(formData.get("procedureId") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const priceRaw = String(formData.get("price") || "").trim();
  const linesJson = String(formData.get("linesJson") || "[]");

  if (!procedureId) {
    return { error: "Missing procedure.", success: false };
  }
  if (!name) {
    return { error: "Enter a procedure name.", success: false };
  }

  let price: number | null = null;
  if (priceRaw) {
    price = Number(priceRaw);
    if (!Number.isFinite(price) || price < 0) {
      return { error: "Enter a valid price.", success: false };
    }
  }

  let lines: Line[];
  try {
    lines = JSON.parse(linesJson);
  } catch {
    return { error: "Something went wrong reading the supply lines.", success: false };
  }

  const validLines = lines.filter((l) => l.productId && Number.isFinite(l.quantity) && l.quantity > 0);
  if (validLines.filter((l) => l.isDosed).length > 1) {
    return { error: "Only one supply line can be dosed.", success: false };
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

  const { error } = await supabase.rpc("update_procedure_with_supplies", {
    p_clinic_id: profile.clinic_id,
    p_procedure_id: procedureId,
    p_name: name,
    p_price: price,
    p_lines: validLines.map((l) => ({
      product_id: l.productId,
      quantity: l.quantity,
      is_dosed: l.isDosed,
    })),
  });

  if (error) {
    if (error.code === "23505") {
      return { error: `A procedure named "${name}" already exists.`, success: false };
    }
    console.error("updateProcedure failed", error);
    return {
      error: error.message || "Something went wrong saving that procedure. Please try again.",
      success: false,
    };
  }

  revalidatePath("/app/procedures");
  revalidatePath("/app");
  revalidatePath("/app/margin");
  return { error: null, success: true };
}

export async function removeProcedure(formData: FormData) {
  const procedureId = String(formData.get("procedureId") || "");
  if (!procedureId) return;

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
    .from("procedures")
    .delete()
    .eq("id", procedureId)
    .eq("clinic_id", profile.clinic_id);

  revalidatePath("/app/procedures");

  if (error) {
    const message =
      error.code === "23503"
        ? "Can't remove — this procedure has treatment logs on record."
        : "Something went wrong removing that procedure. Please try again.";
    redirect(`/app/procedures?error=${encodeURIComponent(message)}`);
  }

  redirect("/app/procedures");
}
