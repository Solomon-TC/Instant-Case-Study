import { supabaseBrowser } from "@/lib/supabase-browser";

/**
 * Soft deletes a user by setting their is_deleted flag to true
 * @param userId - The ID of the user to soft delete
 * @returns Promise that resolves when the user is soft deleted
 */
export async function softDeleteUser(userId: string): Promise<void> {
  const supabase = supabaseBrowser;

  const { error } = await supabase
    .from("users")
    .update({ is_deleted: true })
    .eq("id", userId);

  if (error) {
    console.error("Error soft deleting user:", error);
    throw new Error("Failed to delete account. Please try again.");
  }
}
