import { useState } from "react";
import {
  useListEvents, getListEventsQueryKey,
  useJoinEvent, useLeaveEvent,
  useJoinEventAsJudge, useLeaveEventAsJudge,
} from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole, EventStatus } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Search, MapPin, Calendar, Users, Gavel } from "lucide-react";

export default function EventsList() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: events, isLoading } = useListEvents({
    query: { queryKey: getListEventsQueryKey() },
  });

  const joinMutation = useJoinEvent();
  const leaveMutation = useLeaveEvent();
  const joinAsJudgeMutation = useJoinEventAsJudge();
  const leaveAsJudgeMutation = useLeaveEventAsJudge();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });

  const handleJoin = async (id: number) => {
    try {
      await joinMutation.mutateAsync({ id });
      invalidate();
      toast({ title: "Joined event successfully" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to join event", description: err?.data?.error });
    }
  };

  const handleLeave = async (id: number) => {
    try {
      await leaveMutation.mutateAsync({ id });
      invalidate();
      toast({ title: "Left event successfully" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to leave event", description: err?.data?.error });
    }
  };

  const handleJoinAsJudge = async (id: number) => {
    try {
      await joinAsJudgeMutation.mutateAsync({ id });
      invalidate();
      toast({ title: "Assigned as event judge" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to assign", description: err?.data?.error });
    }
  };

  const handleLeaveAsJudge = async (id: number) => {
    try {
      await leaveAsJudgeMutation.mutateAsync({ id });
      invalidate();
      toast({ title: "Removed from event judges" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to withdraw", description: err?.data?.error });
    }
  };

  const isStudent = user?.role === UserRole.student;
  const isJudge = user?.role === UserRole.judge;

  const filteredEvents = events?.filter((e) => {
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    if (search && !e.title.toLowerCase().includes(search.toLowerCase()) && !e.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Events</h1>
        <p className="text-muted-foreground mt-1">Browse and join upcoming competitions.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value={EventStatus.upcoming}>Upcoming</SelectItem>
            <SelectItem value={EventStatus.ongoing}>Ongoing</SelectItem>
            <SelectItem value={EventStatus.completed}>Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => <Card key={i} className="h-64 animate-pulse bg-muted" />)}
        </div>
      ) : filteredEvents?.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Calendar className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">No events found</h3>
          <p className="text-muted-foreground mt-2">Try adjusting your filters or search query.</p>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredEvents?.map((event) => (
            <Card key={event.id} className="flex flex-col overflow-hidden transition-all hover:shadow-md">
              <div className={`h-2 w-full ${
                event.status === "ongoing" ? "bg-primary" :
                event.status === "upcoming" ? "bg-secondary-foreground/20" : "bg-muted-foreground/20"
              }`} />
              <CardHeader>
                <div className="flex justify-between items-start mb-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                    event.status === "ongoing" ? "bg-primary/10 text-primary" :
                    event.status === "upcoming" ? "bg-secondary text-secondary-foreground" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                  </span>
                  {isJudge && event.isJudgeAssigned && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      <Gavel className="h-3 w-3" /> Judging
                    </span>
                  )}
                </div>
                <CardTitle className="line-clamp-1">{event.title}</CardTitle>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(event.date).toLocaleDateString()}
                  </div>
                  {event.venue && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="line-clamp-1">{event.venue}</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground line-clamp-3">{event.description}</p>
                <div className="mt-4 flex items-center gap-1 text-sm font-medium">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  {event.participantCount} Participants
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 pt-4 flex gap-3">
                <Link
                  href={`/events/${event.id}`}
                  className="flex-1 inline-flex justify-center items-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
                >
                  Details
                </Link>

                {/* Student join/leave */}
                {isStudent && event.status !== "completed" && (
                  event.isJoined ? (
                    <Button variant="destructive" className="flex-1" onClick={() => handleLeave(event.id)} disabled={leaveMutation.isPending}>
                      Leave
                    </Button>
                  ) : (
                    <Button variant="default" className="flex-1" onClick={() => handleJoin(event.id)} disabled={joinMutation.isPending}>
                      Join
                    </Button>
                  )
                )}

                {/* Judge assign/withdraw */}
                {isJudge && event.status !== "completed" && (
                  event.isJudgeAssigned ? (
                    <Button variant="outline" className="flex-1 text-destructive border-destructive/40 hover:bg-destructive/10" onClick={() => handleLeaveAsJudge(event.id)} disabled={leaveAsJudgeMutation.isPending}>
                      <Gavel className="h-3.5 w-3.5 mr-1.5" /> Withdraw
                    </Button>
                  ) : (
                    <Button variant="outline" className="flex-1" onClick={() => handleJoinAsJudge(event.id)} disabled={joinAsJudgeMutation.isPending}>
                      <Gavel className="h-3.5 w-3.5 mr-1.5" /> Judge
                    </Button>
                  )
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
