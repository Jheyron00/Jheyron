import { useState } from "react";
import { useParams } from "wouter";
import {
  useGetEvent, getGetEventQueryKey,
  useListParticipants, getListParticipantsQueryKey,
  useListCategories, getListCategoriesQueryKey,
  useListScores, getListScoresQueryKey,
  useGetLeaderboard, getGetLeaderboardQueryKey,
  useListEventJudges, getListEventJudgesQueryKey,
  useCastVote, useSubmitScore,
} from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, MapPin, Trophy, Users, Star, CheckCircle, Medal, Gavel } from "lucide-react";

export default function EventDetail() {
  const { id } = useParams();
  const eventId = Number(id);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [scoreInputs, setScoreInputs] = useState<Record<string, { score: string; comment: string }>>({});

  const { data: event, isLoading: isLoadingEvent } = useGetEvent(eventId, {
    query: { enabled: !!eventId, queryKey: getGetEventQueryKey(eventId) },
  });

  const { data: participants, isLoading: isLoadingParticipants } = useListParticipants(eventId, {
    query: { enabled: !!eventId, queryKey: getListParticipantsQueryKey(eventId) },
  });

  const { data: categories, isLoading: isLoadingCategories } = useListCategories(eventId, {
    query: { enabled: !!eventId, queryKey: getListCategoriesQueryKey(eventId) },
  });

  const { data: myScores } = useListScores(eventId, {
    query: {
      enabled: !!eventId && user?.role === UserRole.judge,
      queryKey: getListScoresQueryKey(eventId),
    },
  });

  const { data: leaderboard, isLoading: isLoadingLeaderboard } = useGetLeaderboard(eventId, {
    query: { enabled: !!eventId, queryKey: getGetLeaderboardQueryKey(eventId) },
  });

  const { data: eventJudges } = useListEventJudges(eventId, {
    query: { enabled: !!eventId, queryKey: getListEventJudgesQueryKey(eventId) },
  });

  const castVoteMutation = useCastVote();
  const submitScoreMutation = useSubmitScore();

  const handleVote = async (participantId: number) => {
    try {
      await castVoteMutation.mutateAsync({ id: eventId, data: { participantId } });
      queryClient.invalidateQueries({ queryKey: getGetEventQueryKey(eventId) });
      queryClient.invalidateQueries({ queryKey: getListParticipantsQueryKey(eventId) });
      queryClient.invalidateQueries({ queryKey: getGetLeaderboardQueryKey(eventId) });
      toast({ title: "Vote cast successfully!" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to vote", description: err?.data?.error });
    }
  };

  const scoreKey = (participantId: number, categoryId: number) => `${participantId}-${categoryId}`;

  const getExistingScore = (participantId: number, categoryId: number) =>
    myScores?.find((s) => s.participantId === participantId && s.categoryId === categoryId);

  const handleScoreChange = (participantId: number, categoryId: number, field: "score" | "comment", value: string) => {
    const key = scoreKey(participantId, categoryId);
    setScoreInputs((prev) => ({
      ...prev,
      [key]: { score: prev[key]?.score ?? "", comment: prev[key]?.comment ?? "", [field]: value },
    }));
  };

  const handleSubmitScore = async (participantId: number, categoryId: number, maxScore: number) => {
    const key = scoreKey(participantId, categoryId);
    const existing = getExistingScore(participantId, categoryId);
    const raw = scoreInputs[key]?.score ?? (existing ? String(existing.score) : "");
    const comment = scoreInputs[key]?.comment ?? (existing ? existing.comment ?? "" : "");
    const score = parseFloat(raw);
    if (isNaN(score) || score < 0 || score > maxScore) {
      toast({ variant: "destructive", title: `Score must be between 0 and ${maxScore}` });
      return;
    }
    try {
      await submitScoreMutation.mutateAsync({ id: eventId, data: { participantId, categoryId, score, comment: comment || null } });
      queryClient.invalidateQueries({ queryKey: getListScoresQueryKey(eventId) });
      queryClient.invalidateQueries({ queryKey: getGetLeaderboardQueryKey(eventId) });
      setScoreInputs((prev) => { const next = { ...prev }; delete next[key]; return next; });
      toast({ title: "Score saved!" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to save score", description: err?.data?.error });
    }
  };

  if (isLoadingEvent || !event) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="h-32 bg-muted rounded-xl" />
        <div className="grid md:grid-cols-3 gap-6">
          <div className="h-64 bg-muted rounded-xl md:col-span-2" />
          <div className="h-64 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  const isStudent = user?.role === UserRole.student;
  const isJudge = user?.role === UserRole.judge;
  const canVote = isStudent && event.status === "ongoing" && !event.hasVoted;
  const canScore = isJudge && event.status === "ongoing";

  const rankMedal = (rank: number) => {
    if (rank === 1) return <span className="text-yellow-500">🥇</span>;
    if (rank === 2) return <span className="text-slate-400">🥈</span>;
    if (rank === 3) return <span className="text-amber-600">🥉</span>;
    return <span className="text-muted-foreground font-semibold text-sm">#{rank}</span>;
  };

  return (
    <div className="space-y-8">
      {/* Event header */}
      <div className="bg-card rounded-xl p-8 border shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-2 h-full bg-primary" />
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-3 mb-4">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                event.status === "ongoing" ? "bg-primary/10 text-primary" :
                event.status === "upcoming" ? "bg-secondary text-secondary-foreground" :
                "bg-muted text-muted-foreground"
              }`}>
                {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
              </span>
              <span className="text-sm text-muted-foreground">ID: #{event.id}</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight">{event.title}</h1>
            <p className="text-lg text-muted-foreground max-w-3xl leading-relaxed">{event.description}</p>
          </div>
          <div className="flex flex-col gap-3 bg-muted/30 p-4 rounded-lg min-w-[200px]">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              {new Date(event.date).toLocaleDateString()}
            </div>
            {event.venue && (
              <div className="flex items-center gap-2 text-sm font-medium">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {event.venue}
              </div>
            )}
            <div className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4 text-muted-foreground" />
              {event.participantCount || 0} Participants
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={canScore ? "score" : "participants"}>
        <TabsList className="mb-2">
          <TabsTrigger value="participants">
            <Users className="w-4 h-4 mr-1.5" /> Participants
          </TabsTrigger>
          <TabsTrigger value="leaderboard">
            <Trophy className="w-4 h-4 mr-1.5" /> Leaderboard
          </TabsTrigger>
          {isJudge && (
            <TabsTrigger value="score">
              <Star className="w-4 h-4 mr-1.5" /> Score
            </TabsTrigger>
          )}
          <TabsTrigger value="categories">
            <Medal className="w-4 h-4 mr-1.5" /> Categories
          </TabsTrigger>
        </TabsList>

        {/* Participants tab */}
        <TabsContent value="participants">
          <div className="space-y-4">
            {event.hasVoted && (
              <div className="flex items-center gap-2 text-sm font-medium text-primary bg-primary/10 px-4 py-2 rounded-lg w-fit">
                <CheckCircle className="h-4 w-4" /> You have already voted
              </div>
            )}
            {isLoadingParticipants ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => <Card key={i} className="h-32 animate-pulse bg-muted" />)}
              </div>
            ) : participants?.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground border rounded-lg border-dashed">
                No participants have joined yet.
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {participants?.map((p) => (
                  <Card key={p.id} className={`overflow-hidden transition-all ${canVote ? "hover:border-primary/50" : ""}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-12 w-12 border-2 border-muted">
                          <AvatarImage src={p.avatarUrl || undefined} />
                          <AvatarFallback className="text-lg bg-primary/5 text-primary">
                            {p.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base truncate">{p.name}</h3>
                          <p className="text-sm text-muted-foreground truncate">
                            {p.course} {p.year ? `- Year ${p.year}` : ""}
                          </p>
                          {p.voteCount !== undefined && p.voteCount > 0 && (
                            <div className="mt-2 text-xs font-medium bg-secondary text-secondary-foreground inline-flex px-2 py-0.5 rounded-full items-center gap-1">
                              <Star className="h-3 w-3" /> {p.voteCount} Votes
                            </div>
                          )}
                        </div>
                      </div>
                      {canVote && (
                        <Button
                          onClick={() => handleVote(p.id)}
                          className="w-full mt-4"
                          variant="secondary"
                          disabled={castVoteMutation.isPending}
                        >
                          <Trophy className="h-4 w-4 mr-2" /> Vote for Participant
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Leaderboard tab */}
        <TabsContent value="leaderboard">
          {isLoadingLeaderboard ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}
            </div>
          ) : !leaderboard || leaderboard.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground border rounded-lg border-dashed">
              No results yet. Scores and votes will appear here once submitted.
            </div>
          ) : (
            <div className="space-y-3">
              {leaderboard.map((entry) => (
                <div
                  key={entry.participantId}
                  className={`flex items-center gap-4 p-4 rounded-xl border bg-card transition-all ${
                    entry.rank <= 3 ? "border-primary/20 shadow-sm" : ""
                  }`}
                >
                  <div className="w-10 text-center text-2xl shrink-0">{rankMedal(entry.rank)}</div>
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={entry.avatarUrl || undefined} />
                    <AvatarFallback>{entry.participantName.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{entry.participantName}</p>
                    {entry.course && <p className="text-xs text-muted-foreground">{entry.course}</p>}
                    {entry.categoryScores && entry.categoryScores.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {entry.categoryScores.map((cs) => (
                          <span key={cs.categoryId} className="text-xs bg-muted px-2 py-0.5 rounded-full">
                            {cs.categoryName}: {cs.score.toFixed(1)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {entry.judgeScore !== undefined && entry.judgeScore > 0 && (
                      <span className="text-sm font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                        {entry.judgeScore.toFixed(2)} pts
                      </span>
                    )}
                    {entry.audienceVotes > 0 && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Star className="h-3 w-3" /> {entry.audienceVotes} votes
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Judge scoring tab */}
        {isJudge && (
          <TabsContent value="score">
            {!canScore ? (
              <div className="p-8 text-center text-muted-foreground border rounded-lg border-dashed">
                Scoring is only available during ongoing events.
              </div>
            ) : isLoadingParticipants || isLoadingCategories ? (
              <div className="h-32 bg-muted rounded-xl animate-pulse" />
            ) : participants?.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground border rounded-lg border-dashed">
                No participants to score yet.
              </div>
            ) : (
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  Score each participant for every judging category. Scores are saved individually.
                </p>
                {participants?.map((p) => (
                  <Card key={p.id}>
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={p.avatarUrl || undefined} />
                          <AvatarFallback>{p.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{p.name}</p>
                          <p className="text-sm text-muted-foreground">{p.course}</p>
                        </div>
                      </div>
                      {categories?.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No judging categories defined.</p>
                      ) : (
                        <div className="divide-y">
                          {categories?.map((cat) => {
                            const key = scoreKey(p.id, cat.id);
                            const existing = getExistingScore(p.id, cat.id);
                            const currentScore = scoreInputs[key]?.score ?? (existing ? String(existing.score) : "");
                            const currentComment = scoreInputs[key]?.comment ?? (existing?.comment ?? "");
                            return (
                              <div key={cat.id} className="py-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium text-sm">{cat.name}</p>
                                    <p className="text-xs text-muted-foreground">{cat.description}</p>
                                  </div>
                                  <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                                    Max {cat.maxScore}
                                  </span>
                                </div>
                                <div className="flex gap-2">
                                  <Input
                                    type="number"
                                    min={0}
                                    max={cat.maxScore}
                                    step={0.01}
                                    placeholder={`Score (0–${cat.maxScore})`}
                                    value={currentScore}
                                    onChange={(e) => handleScoreChange(p.id, cat.id, "score", e.target.value)}
                                    className="w-36"
                                  />
                                  <Input
                                    placeholder="Comment (optional)"
                                    value={currentComment}
                                    onChange={(e) => handleScoreChange(p.id, cat.id, "comment", e.target.value)}
                                    className="flex-1"
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() => handleSubmitScore(p.id, cat.id, cat.maxScore)}
                                    disabled={submitScoreMutation.isPending}
                                  >
                                    {existing ? "Update" : "Save"}
                                  </Button>
                                </div>
                                {existing && !scoreInputs[key] && (
                                  <p className="text-xs text-primary">
                                    Saved score: {existing.score} {existing.comment ? `— "${existing.comment}"` : ""}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}

        {/* Categories tab */}
        <TabsContent value="categories">
          <Card>
            <CardContent className="p-0 divide-y">
              {isLoadingCategories ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Loading categories...</div>
              ) : categories?.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No judging categories defined yet.
                </div>
              ) : (
                categories?.map((c) => (
                  <div key={c.id} className="p-4 flex flex-col gap-1">
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-sm">{c.name}</span>
                      <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                        {c.maxScore} pts
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{c.description}</p>
                    {c.weight && (
                      <p className="text-xs text-muted-foreground mt-1 font-medium">Weight: {c.weight}%</p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
