import { useState } from "react";
import { useGetProfile, getGetProfileQueryKey, useUpdateProfile, useChangePassword } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Eye, EyeOff, Lock } from "lucide-react";

const profileSchema = z.object({
  name: z.string().min(2, "Name required"),
  course: z.string().optional(),
  year: z.string().optional(),
  avatarUrl: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your new password"),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { data: profile, isLoading } = useGetProfile({
    query: { queryKey: getGetProfileQueryKey() },
  });

  const updateProfileMutation = useUpdateProfile();
  const changePasswordMutation = useChangePassword();

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: "", course: "", year: "", avatarUrl: "" },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (profile) {
      profileForm.reset({
        name: profile.name || "",
        course: profile.course || "",
        year: profile.year || "",
        avatarUrl: profile.avatarUrl || "",
      });
    }
  }, [profile, profileForm]);

  const onProfileSubmit = async (data: ProfileForm) => {
    try {
      await updateProfileMutation.mutateAsync({ data });
      toast({ title: "Profile updated successfully" });
      queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Update failed", description: err?.data?.error });
    }
  };

  const onPasswordSubmit = async (data: PasswordForm) => {
    try {
      await changePasswordMutation.mutateAsync({
        data: { currentPassword: data.currentPassword, newPassword: data.newPassword },
      });
      toast({ title: "Password changed successfully!" });
      passwordForm.reset();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to change password", description: err?.data?.error });
    }
  };

  if (isLoading || !profile) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-32 bg-muted rounded-xl" />
        <div className="h-64 bg-muted rounded-xl max-w-2xl" />
      </div>
    );
  }

  const PasswordInput = ({
    id, show, onToggle, ...props
  }: { id: string; show: boolean; onToggle: () => void } & React.InputHTMLAttributes<HTMLInputElement>) => (
    <div className="relative">
      <Input id={id} type={show ? "text" : "password"} className="pr-10" {...props} />
      <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your personal information and security.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Sidebar */}
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardContent className="pt-6 flex flex-col items-center text-center">
              <Avatar className="w-24 h-24 mb-4 border-4 border-muted">
                <AvatarImage src={profile.avatarUrl || undefined} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {profile.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h3 className="font-semibold text-lg">{profile.name}</h3>
              <p className="text-sm text-muted-foreground capitalize">{profile.role}</p>
              {profile.studentId && (
                <p className="text-xs text-muted-foreground mt-1 font-mono bg-muted px-2 py-0.5 rounded">{profile.studentId}</p>
              )}
              <div className="w-full border-t mt-6 pt-6 flex justify-around text-center">
                <div>
                  <div className="text-2xl font-bold">{profile.eventsJoined || 0}</div>
                  <div className="text-xs text-muted-foreground">Events</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{profile.votesGiven || 0}</div>
                  <div className="text-xs text-muted-foreground">Votes</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="md:col-span-2 space-y-6">
          {/* Personal info */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your profile details below.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={profile.email} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
                </div>
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input {...profileForm.register("name")} />
                  {profileForm.formState.errors.name && (
                    <p className="text-xs text-destructive">{profileForm.formState.errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Avatar URL (Optional)</Label>
                  <Input {...profileForm.register("avatarUrl")} placeholder="https://example.com/avatar.png" />
                </div>
                {profile.role === "student" && (
                  <>
                    <div className="space-y-2">
                      <Label>Student ID</Label>
                      <Input value={profile.studentId || ""} disabled className="bg-muted font-mono" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Course</Label>
                        <Input {...profileForm.register("course")} />
                      </div>
                      <div className="space-y-2">
                        <Label>Year Level</Label>
                        <Input {...profileForm.register("year")} />
                      </div>
                    </div>
                  </>
                )}
                <div className="pt-2">
                  <Button type="submit" disabled={updateProfileMutation.isPending}>
                    {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Change password */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-4 h-4" /> Change Password
              </CardTitle>
              <CardDescription>Update your password to keep your account secure.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <PasswordInput
                    id="currentPassword"
                    show={showCurrent}
                    onToggle={() => setShowCurrent((p) => !p)}
                    {...passwordForm.register("currentPassword")}
                  />
                  {passwordForm.formState.errors.currentPassword && (
                    <p className="text-xs text-destructive">{passwordForm.formState.errors.currentPassword.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <PasswordInput
                    id="newPassword"
                    show={showNew}
                    onToggle={() => setShowNew((p) => !p)}
                    {...passwordForm.register("newPassword")}
                  />
                  {passwordForm.formState.errors.newPassword && (
                    <p className="text-xs text-destructive">{passwordForm.formState.errors.newPassword.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <PasswordInput
                    id="confirmPassword"
                    show={showConfirm}
                    onToggle={() => setShowConfirm((p) => !p)}
                    {...passwordForm.register("confirmPassword")}
                  />
                  {passwordForm.formState.errors.confirmPassword && (
                    <p className="text-xs text-destructive">{passwordForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>
                <div className="pt-2">
                  <Button type="submit" disabled={changePasswordMutation.isPending}>
                    {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
