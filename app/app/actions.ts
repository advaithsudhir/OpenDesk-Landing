"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ClinicSetupState = { error: string | null };

export async function createClinic(
  _prevState: ClinicSetupState,
  formData: FormData
): Promise<ClinicSetupState> {
  const name = String(formData.get("clinicName") || "").trim();

  if (!name) {
    return { error: "Enter your clinic's name." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: clinic, error: clinicError } = await supabase
    .from("clinics")
    .insert({ name, created_by: user.id })
    .select("id")
    .single();

  if (clinicError || !clinic) {
    console.error("createClinic: insert into clinics failed", clinicError);
    return { error: "Something went wrong creating your clinic. Please try again." };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ clinic_id: clinic.id })
    .eq("id", user.id);

  if (profileError) {
    console.error("createClinic: linking profile failed", profileError);
    return { error: "Something went wrong linking your account. Please try again." };
  }

  revalidatePath("/app");
  return { error: null };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
