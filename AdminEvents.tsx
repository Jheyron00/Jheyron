import { useState } from "react";
import { useListEvents, getListEventsQueryKey, useCreateEvent, useUpdateEvent, useDeleteEvent, useCreateCategory } from "@/lib/api-client";
import { EventInputStatus, EventUpdateStatus } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoreHorizontal, Plus, Edit, Trash2, Tag } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const eventSchema = z.object({
  title: z.string().min(1, "Title required"),
  description: z.string(),
  date: z.string(),
  venue: z.string().optional(),
  status: z.enum([EventInputStatus.upcoming, EventInputStatus.ongoing, EventInputStatus.completed]),
});

type EventForm = z.infer<typeof eventSchema>;

const categorySchema = z.object({
  name: z.string().min(1, "Name required"),
  description: z.string(),
  maxScore: z.coerce.number().min(1),
  weight: z.coerce.number().optional(),
});

type CategoryForm = z.infer<typeof categorySchema>;

export default function AdminEvents() {
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [activeEventIdForCategory, setActiveEventIdForCategory] = useState<number | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: events, isLoading } = useListEvents({ query: { queryKey: getListEventsQueryKey() } });

  const createEventMutation = useCreateEvent();
  const updateEventMutation = useUpdateEvent();
  const deleteEventMutation = useDeleteEvent();
  const createCategoryMutation = useCreateCategory();

  const eventForm = useForm<EventForm>({
    resolver: zodResolver(eventSchema),
    defaultValues: { status: EventInputStatus.upcoming, description: "", venue: "" }
  });

  const categoryForm = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", description: "", maxScore: 10, weight: undefined }
  });

  const handleOpenEventDialog = (event?: any) => {
    if (event) {
      setEditingEventId(event.id);
      eventForm.reset({
        title: event.title,
        description: event.description,
        date: event.date.split('T')[0],
        venue: event.venue || "",
        status: event.status as EventInputStatus,
      });
    } else {
      setEditingEventId(null);
      eventForm.reset({ title: "", description: "", date: new Date().toISOString().split('T')[0], venue: "", status: EventInputStatus.upcoming });
    }
    setIsEventDialogOpen(true);
  };

  const handleOpenCategoryDialog = (eventId: number) => {
    setActiveEventIdForCategory(eventId);
    categoryForm.reset({ name: "", description: "", maxScore: 10, weight: undefined });
    setIsCategoryDialogOpen(true);
  };

  const onEventSubmit = async (data: EventForm) => {
    try {
      if (editingEventId) {
        await updateEventMutation.mutateAsync({ id: editingEventId, data: data as any });
        toast({ title: "Event updated" });
      } else {
        await createEventMutation.mutateAsync({ data: data as any });
        toast({ title: "Event created" });
      }
      setIsEventDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err?.data?.error || "Failed to save event" });
    }
  };

  const onCategorySubmit = async (data: CategoryForm) => {
    if (!activeEventIdForCategory) return;
    try {
      await createCategoryMutation.mutateAsync({ 
        id: activeEventIdForCategory, 
        data: data 
      });
      toast({ title: "Category added" });
      setIsCategoryDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err?.data?.error || "Failed to add category" });
    }
  };

  const handleDeleteEvent = async (id: number) => {
    if (!confirm("Are you sure you want to delete this event? This action cannot be undone.")) return;
    try {
      await deleteEventMutation.mutateAsync({ id });
      toast({ title: "Event deleted" });
      queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err?.data?.error || "Failed to delete" });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Events</h1>
          <p className="text-muted-foreground mt-1">Create and configure competitions.</p>
        </div>
        <Button onClick={() => handleOpenEventDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Create Event
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Participants</TableHead>
                <TableHead className="text-right">Categories</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center">Loading...</TableCell></TableRow>
              ) : events?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No events found.</TableCell></TableRow>
              ) : (
                events?.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.title}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(e.date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        e.status === 'ongoing' ? 'bg-primary/10 text-primary' :
                        e.status === 'upcoming' ? 'bg-secondary text-secondary-foreground' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {e.status.charAt(0).toUpperCase() + e.status.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{e.participantCount || 0}</TableCell>
                    <TableCell className="text-right">{e.categoryCount || 0}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenEventDialog(e)}>
                            <Edit className="w-4 h-4 mr-2" /> Edit Event
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenCategoryDialog(e.id)}>
                            <Tag className="w-4 h-4 mr-2" /> Add Category
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeleteEvent(e.id)}>
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

      {/* Event Dialog */}
      <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingEventId ? 'Edit Event' : 'Create Event'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={eventForm.handleSubmit(onEventSubmit)} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input {...eventForm.register("title")} />
              {eventForm.formState.errors.title && <p className="text-xs text-destructive">{eventForm.formState.errors.title.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea {...eventForm.register("description")} className="h-20" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" {...eventForm.register("date")} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={eventForm.watch("status")} onValueChange={(v) => eventForm.setValue("status", v as EventInputStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EventInputStatus.upcoming}>Upcoming</SelectItem>
                    <SelectItem value={EventInputStatus.ongoing}>Ongoing</SelectItem>
                    <SelectItem value={EventInputStatus.completed}>Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Venue</Label>
              <Input {...eventForm.register("venue")} />
            </div>
            <div className="pt-4 flex justify-end">
              <Button type="submit" disabled={createEventMutation.isPending || updateEventMutation.isPending}>
                {editingEventId ? 'Save Changes' : 'Create Event'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Judging Category</DialogTitle>
          </DialogHeader>
          <form onSubmit={categoryForm.handleSubmit(onCategorySubmit)} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Category Name</Label>
              <Input {...categoryForm.register("name")} />
              {categoryForm.formState.errors.name && <p className="text-xs text-destructive">{categoryForm.formState.errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea {...categoryForm.register("description")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Max Score</Label>
                <Input type="number" {...categoryForm.register("maxScore")} />
              </div>
              <div className="space-y-2">
                <Label>Weight (%) <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                <Input type="number" {...categoryForm.register("weight")} />
              </div>
            </div>
            <div className="pt-4 flex justify-end">
              <Button type="submit" disabled={createCategoryMutation.isPending}>
                Add Category
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
