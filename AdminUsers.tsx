import { useState } from "react";
import { useListUsers, getListUsersQueryKey, useCreateUser, useUpdateUser, useDeleteUser } from "@/lib/api-client";
import { UserRole, ListUsersRole, UserInputRole, UserUpdateRole } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoreHorizontal, Plus, Edit, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const userSchema = z.object({
  name: z.string().min(2, "Name required"),
  email: z.string().email(),
  password: z.string().min(6).optional().or(z.literal('')),
  role: z.enum([UserInputRole.student, UserInputRole.judge, UserInputRole.admin]),
  studentId: z.string().optional(),
  course: z.string().optional(),
  year: z.string().optional(),
});

type UserForm = z.infer<typeof userSchema>;

export default function AdminUsers() {
  const [activeTab, setActiveTab] = useState<ListUsersRole>(ListUsersRole.student);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: users, isLoading } = useListUsers({ role: activeTab }, {
    query: { queryKey: getListUsersQueryKey({ role: activeTab }) }
  });

  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();

  const form = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: { role: activeTab }
  });

  const handleOpenDialog = (user?: any) => {
    if (user) {
      setEditingUserId(user.id);
      form.reset({
        name: user.name,
        email: user.email,
        role: user.role as UserInputRole,
        studentId: user.studentId || "",
        course: user.course || "",
        year: user.year || "",
        password: ""
      });
    } else {
      setEditingUserId(null);
      form.reset({ name: "", email: "", password: "", role: activeTab as UserInputRole, studentId: "", course: "", year: "" });
    }
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: UserForm) => {
    try {
      if (editingUserId) {
        const updateData: any = { ...data };
        if (!updateData.password) delete updateData.password;
        await updateUserMutation.mutateAsync({ id: editingUserId, data: updateData });
        toast({ title: "User updated" });
      } else {
        if (!data.password) {
          toast({ variant: "destructive", title: "Password required for new users" });
          return;
        }
        await createUserMutation.mutateAsync({ data: data as any });
        toast({ title: "User created" });
      }
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey({ role: activeTab }) });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err?.data?.error || "Failed to save user" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure?")) return;
    try {
      await deleteUserMutation.mutateAsync({ id });
      toast({ title: "User deleted" });
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey({ role: activeTab }) });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err?.data?.error || "Failed to delete" });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Users</h1>
          <p className="text-muted-foreground mt-1">Administer students, judges, and administrators.</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as ListUsersRole)}>
        <TabsList className="mb-4">
          <TabsTrigger value={ListUsersRole.student}>Students</TabsTrigger>
          <TabsTrigger value={ListUsersRole.judge}>Judges</TabsTrigger>
          <TabsTrigger value={ListUsersRole.admin}>Admins</TabsTrigger>
        </TabsList>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  {activeTab === ListUsersRole.student && (
                    <>
                      <TableHead>Student ID</TableHead>
                      <TableHead>Course</TableHead>
                    </>
                  )}
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center">Loading...</TableCell></TableRow>
                ) : users?.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No users found.</TableCell></TableRow>
                ) : (
                  users?.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={u.avatarUrl || undefined} />
                            <AvatarFallback>{u.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{u.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      {activeTab === ListUsersRole.student && (
                        <>
                          <TableCell>{u.studentId || '-'}</TableCell>
                          <TableCell>{u.course || '-'}</TableCell>
                        </>
                      )}
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${u.isActive !== false ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                          {u.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenDialog(u)}>
                              <Edit className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(u.id)}>
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingUserId ? 'Edit User' : 'Create User'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input {...form.register("name")} />
              {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" {...form.register("email")} />
              {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Password {editingUserId && "(Leave blank to keep current)"}</Label>
              <Input type="password" {...form.register("password")} />
              {form.formState.errors.password && <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={form.watch("role")} onValueChange={(v) => form.setValue("role", v as UserInputRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserInputRole.student}>Student</SelectItem>
                  <SelectItem value={UserInputRole.judge}>Judge</SelectItem>
                  <SelectItem value={UserInputRole.admin}>Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.watch("role") === UserInputRole.student && (
              <>
                <div className="space-y-2">
                  <Label>Student ID</Label>
                  <Input {...form.register("studentId")} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Course</Label>
                    <Input {...form.register("course")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Year</Label>
                    <Input {...form.register("year")} />
                  </div>
                </div>
              </>
            )}
            <div className="pt-4 flex justify-end">
              <Button type="submit" disabled={createUserMutation.isPending || updateUserMutation.isPending}>
                {editingUserId ? 'Save Changes' : 'Create User'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
