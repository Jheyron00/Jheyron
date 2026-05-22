import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRegister, RegisterInputRole } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Eye, EyeOff } from "lucide-react";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum([RegisterInputRole.student, RegisterInputRole.judge]),
  studentId: z.string().optional(),
  course: z.string().optional(),
  year: z.string().optional(),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const registerMutation = useRegister();
  const [role, setRole] = useState<RegisterInputRole>(RegisterInputRole.student);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", role: RegisterInputRole.student, studentId: "", course: "", year: "" },
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      const response = await registerMutation.mutateAsync({ data });
      login(response.token, response.user);
      setLocation("/dashboard");
    } catch (error: any) {
      toast({ title: "Registration failed", description: error?.error || "Could not create an account.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex bg-muted/30 py-12">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-card p-8 rounded-xl shadow-lg border">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Create an account</h1>
            <p className="text-sm text-muted-foreground mt-2">Join the tabulation system</p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>I am a…</Label>
              <RadioGroup value={role} onValueChange={(val: RegisterInputRole) => { setRole(val); form.setValue("role", val); }} className="flex gap-6">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value={RegisterInputRole.student} id="role-student" />
                  <Label htmlFor="role-student" className="cursor-pointer font-normal">Student</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value={RegisterInputRole.judge} id="role-judge" />
                  <Label htmlFor="role-judge" className="cursor-pointer font-normal">Judge</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" placeholder="Juan dela Cruz" {...form.register("name")} />
              {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@university.edu" {...form.register("email")} />
              {form.formState.errors.email && <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="At least 6 characters" className="pr-10" {...form.register("password")} />
                <button type="button" onClick={() => setShowPassword((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.formState.errors.password && <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>}
            </div>

            {role === RegisterInputRole.student && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="studentId">Student ID <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                  <Input id="studentId" placeholder="00-BGU-0000" className="font-mono tracking-wide" {...form.register("studentId")} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="course">Course <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                    <Input id="course" placeholder="e.g. BSIT" {...form.register("course")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="year">Year Level <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                    <Input id="year" placeholder="e.g. 3" {...form.register("year")} />
                  </div>
                </div>
              </>
            )}

            <Button type="submit" className="w-full mt-6" disabled={registerMutation.isPending}>
              {registerMutation.isPending ? "Creating account..." : "Create account"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link href="/login" className="text-primary font-medium hover:underline">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
