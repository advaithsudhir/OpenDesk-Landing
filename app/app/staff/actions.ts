"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AddStaffState = { error: string | null; success: boolean };

export async function addStaff(
  _prevState: AddStaffState,
  formData: FormData
): Promise<AddStaffState> {
  const name = String(formData.get("name") || "").trim();

  if (!name) {
    return { error: "Enter a name.", success: false };
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

  const { error } = await supabase.from("staff").insert({
    clinic_id: profile.clinic_id,
    name,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: `A staff member named "${name}" already exists.`, success: false };
    }
    console.error("addStaff failed", error);
    return { error: "Something went wrong saving that name. Please try again.", success: false };
  }

  revalidatePath("/app/staff");
  return { error: null, success: true };
}

export async function removeStaff(formData: FormData) {
  const staffId = String(formData.get("staffId") || "");
  if (!staffId) return;

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
    .from("staff")
    .delete()
    .eq("id", staffId)
    .eq("clinic_id", profile.clinic_id);

  revalidatePath("/app/staff");

  if (error) {
    const message =
      error.code === "23503"
        ? "Can't remove — this clinician has treatment logs on record."
        : "Something went wrong removing that name. Please try again.";
    redirect(`/app/staff?error=${encodeURIComponent(message)}`);
  }

  redirect("/app/staff");
}

export type AddRecipientState = { error: string | null; success: boolean };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function addRecipient(
  _prevState: AddRecipientState,
  formData: FormData
): Promise<AddRecipientState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();

  if (!email || !EMAIL_RE.test(email)) {
    return { error: "Enter a valid email address.", success: false };
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

  const { error } = await supabase.from("notification_recipients").insert({
    clinic_id: profile.clinic_id,
    email,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: `"${email}" is already on the list.`, success: false };
    }
    console.error("addRecipient failed", error);
    return { error: "Something went wrong saving that email. Please try again.", success: false };
  }

  revalidatePath("/app/staff");
  return { error: null, success: true };
}

export async function removeRecipient(formData: FormData) {
  const recipientId = String(formData.get("recipientId") || "");
  if (!recipientId) return;

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

  await supabase
    .from("notification_recipients")
    .delete()
    .eq("id", recipientId)
    .eq("clinic_id", profile.clinic_id);

  revalidatePath("/app/staff");
  redirect("/app/staff");
}
