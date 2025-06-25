"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { softDeleteUser } from "@/lib/soft-delete-user";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { Trash2, Loader2 } from "lucide-react";

interface DeleteAccountButtonProps {
  userId: string;
  className?: string;
}

export function DeleteAccountButton({
  userId,
  className,
}: DeleteAccountButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const supabase = supabaseBrowser;

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      // Soft delete the user
      await softDeleteUser(userId);

      // Show success message
      toast({
        title: "Account deleted",
        description: "Your account has been successfully deleted.",
      });

      // Sign out the user
      await supabase.auth.signOut({ scope: "global" });

      // Redirect to landing page
      window.location.href = "/";
    } catch (error) {
      console.error("Error deleting account:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to delete account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setIsModalOpen(false);
    }
  };

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setIsModalOpen(true)}
        disabled={isDeleting}
        className={className}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Delete Account
      </Button>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete your account? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Account"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
