// Canonical list of face regions for area-based dosing on Log a Treatment.
// Shared by FaceDiagram (positions + labels) and the log-treatment form
// (area label lookups). Keep this list in sync with the `area` check
// constraint on treatment_log_areas in supabase/face_areas.sql.

export type FaceArea = { slug: string; label: string };

export const FACE_AREAS: FaceArea[] = [
  { slug: "forehead", label: "Forehead" },
  { slug: "glabella", label: "Glabella (frown lines)" },
  { slug: "crows_feet_left", label: "Crow's feet (left)" },
  { slug: "crows_feet_right", label: "Crow's feet (right)" },
  { slug: "cheek_left", label: "Cheek (left)" },
  { slug: "cheek_right", label: "Cheek (right)" },
  { slug: "nasolabial_folds", label: "Nasolabial folds" },
  { slug: "lips", label: "Lips" },
  { slug: "chin", label: "Chin" },
  { slug: "jawline_left", label: "Jawline (left)" },
  { slug: "jawline_right", label: "Jawline (right)" },
];

export function faceAreaLabel(slug: string): string {
  return FACE_AREAS.find((a) => a.slug === slug)?.label || slug;
}
