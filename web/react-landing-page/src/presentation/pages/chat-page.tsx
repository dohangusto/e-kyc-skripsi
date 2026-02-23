import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/presentation/components/ui/card";
import { Input } from "@/presentation/components/ui/input";
import { Button } from "@/presentation/components/ui/button";
import { Badge } from "@/presentation/components/ui/badge";
import { EmptyState } from "@/presentation/components/empty-state";
import { CardShell } from "@/presentation/components/card-shell";
import { PiiRevealGate } from "@/presentation/components/pii-reveal-gate";
import { useRole } from "@/presentation/components/role-context";
import { useFeatureFlags } from "@/presentation/components/feature-flags-context";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/presentation/components/ui/sheet";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/presentation/components/ui/breadcrumb";
import { Separator } from "@/presentation/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/presentation/components/ui/tabs";
import { statusLabelMap as caseStatusLabelMap } from "@/presentation/components/status-badge";
import type { CaseStatus, Eligibility, Region } from "@/domain/types";
import { formatDateTime } from "@/shared/lib/format-date-time";
import { maskNik } from "@/shared/lib/mask-nik";
import { caseUsecases } from "@/shared/lib/usecases";
import { cn } from "@/shared/lib/utils";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";

type ChatMessage = {
  id: string;
  from: "me" | "them";
  text: string;
  time: string;
};

type ChatThread = {
  id: string;
  name: string;
  role: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
  status: "online" | "offline" | "pending";
  profile: {
    caseId: string;
    nik: string;
    region: Region;
    createdAt: string;
    eligibility: Eligibility;
  };
  messages: ChatMessage[];
};

const formatChatTime = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const statusLabel: Record<ChatThread["status"], string> = {
  online: "Online",
  offline: "Offline",
  pending: "Menunggu",
};

const statusClass: Record<ChatThread["status"], string> = {
  online: "bg-emerald-50 text-emerald-700 border-emerald-200",
  offline: "bg-slate-50 text-slate-600 border-slate-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
};

const resolveChatStatus = (status: CaseStatus): ChatThread["status"] => {
  if (status === "EKYC_SUBMITTED" || status === "EKYC_IN_PROGRESS") {
    return "online";
  }
  if (status === "FALLBACK_REVIEW" || status === "NEED_REVERIFY") {
    return "pending";
  }
  return "offline";
};

const resolveUnreadCount = (status: CaseStatus) => {
  if (status === "EKYC_SUBMITTED" || status === "FALLBACK_REVIEW") return 1;
  if (status === "NEED_REVERIFY") return 2;
  return 0;
};

const buildMessages = (item: {
  id: string;
  applicant: { name: string };
  status: CaseStatus;
  createdAt: string;
  lastUpdatedAt?: string;
}): ChatMessage[] => {
  const statusLabel = caseStatusLabelMap[item.status];
  const initialTime = formatChatTime(item.createdAt);
  const updateTime = formatChatTime(item.lastUpdatedAt || item.createdAt);
  return [
    {
      id: `${item.id}-m1`,
      from: "them",
      text: `Halo, saya ingin update status eKYC saya (${statusLabel}).`,
      time: initialTime,
    },
    {
      id: `${item.id}-m2`,
      from: "me",
      text: `Terima kasih. Kami sedang memproses status ${statusLabel}.`,
      time: updateTime,
    },
  ];
};

const eligibilityBadgeConfig = {
  ELIGIBLE: {
    label: "Eligible",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  INELIGIBLE: {
    label: "Ineligible",
    className: "border-red-200 bg-red-50 text-red-700",
  },
};

const TAB_STORAGE_KEY = "rsg.chat.activeTab";

const getInitials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

export const ChatPage = () => {
  const { role, actorName } = useRole();
  const { flags } = useFeatureFlags();
  const [activeTab, setActiveTab] = useState<"ALL" | "MY_QUEUE">(() => {
    if (typeof window === "undefined") return "ALL";
    const stored = localStorage.getItem(TAB_STORAGE_KEY);
    if (stored === "MY_QUEUE" || stored === "ALL") {
      return stored;
    }
    return role === "VERIFIER" ? "MY_QUEUE" : "ALL";
  });
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);

  const queryParams = useMemo(
    () => ({
      page: 1,
      pageSize: 200,
      sort: "NEWEST",
      assignedToName: activeTab === "MY_QUEUE" ? actorName : undefined,
    }),
    [activeTab, actorName]
  );

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["chat", "cases", queryParams],
    queryFn: () => caseUsecases.listCases(queryParams),
    placeholderData: keepPreviousData,
  });

  const cases = data?.items ?? [];

  const threads = useMemo<ChatThread[]>(
    () =>
      cases.map((item) => {
        const lastTimeSource = item.lastUpdatedAt || item.updatedAt || item.createdAt;
        const statusLabel = caseStatusLabelMap[item.status];
        return {
          id: item.id,
          name: item.applicant.name,
          role: "Calon Penerima",
          lastMessage: `Status eKYC: ${statusLabel}`,
          lastTime: formatDateTime(lastTimeSource),
          unread: resolveUnreadCount(item.status),
          status: resolveChatStatus(item.status),
          profile: {
            caseId: item.id,
            nik: item.applicant.nik,
            region: item.applicant.region,
            createdAt: item.createdAt,
            eligibility: item.eligibility,
          },
          messages: buildMessages({
            id: item.id,
            applicant: item.applicant,
            status: item.status,
            createdAt: item.createdAt,
            lastUpdatedAt: item.lastUpdatedAt,
          }),
        };
      }),
    [cases]
  );

  useEffect(() => {
    if (!threads.length) return;
    if (!activeId || !threads.some((thread) => thread.id === activeId)) {
      setActiveId(threads[0].id);
    }
  }, [activeId, threads]);

  const totalUnread = useMemo(
    () => threads.reduce((acc, thread) => acc + thread.unread, 0),
    [threads]
  );

  const filteredThreads = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return threads;
    return threads.filter(
      (thread) =>
        thread.name.toLowerCase().includes(normalized) ||
        thread.lastMessage.toLowerCase().includes(normalized)
    );
  }, [query, threads]);

  const activeThread = threads.find((thread) => thread.id === activeId);
  const profileThread = threads.find((thread) => thread.id === (profileId ?? activeId));

  const openProfile = (threadId: string) => {
    setActiveId(threadId);
    setProfileId(threadId);
    setProfileOpen(true);
  };

  const handleTabChange = (value: string) => {
    const next = value === "MY_QUEUE" ? "MY_QUEUE" : "ALL";
    setActiveTab(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(TAB_STORAGE_KEY, next);
    }
  };

  const actor = { role, name: actorName };
  const eligibilityBadge = profileThread
    ? eligibilityBadgeConfig[profileThread.profile.eligibility]
    : eligibilityBadgeConfig.ELIGIBLE;

  return (
    <div className="flex h-[calc(100vh-56px-24px)] flex-col gap-6 overflow-hidden">
      <div className="space-y-4">
        <Breadcrumb>
          <BreadcrumbList className="text-xs">
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/dashboard">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-3.5 w-3.5" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>Chat</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="ALL">All Chats</TabsTrigger>
            <TabsTrigger value="MY_QUEUE">Assigned to Me</TabsTrigger>
          </TabsList>
        </Tabs>
        <Separator />
      </div>
      {isError ? (
        <EmptyState
          title="Gagal memuat pesan"
          description="Coba muat ulang daftar pesan."
          action={<Button onClick={() => refetch()}>Retry</Button>}
        />
      ) : threads.length === 0 && !isLoading ? (
        <EmptyState
          title="Belum ada pesan"
          description="Daftar pesan akan muncul setelah ada data kasus."
        />
      ) : (
        <Card className="flex min-h-0 flex-1 overflow-hidden">
          <div className="grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-[320px_1fr]">
            <div className="flex min-h-0 flex-col border-b bg-card/60 lg:border-b-0 lg:border-r">
              <div className="border-b px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                      Inbox
                    </div>
                    <div className="text-base font-semibold text-foreground">Pesan Masuk</div>
                  </div>
                  <Badge variant="outline" className="text-[11px]">
                    {totalUnread} Baru
                  </Badge>
                </div>
                <div className="mt-3">
                  <Input
                    placeholder="Cari nama atau pesan..."
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {isLoading && threads.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                    Memuat pesan...
                  </div>
                ) : filteredThreads.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                    Tidak ada pesan yang cocok.
                  </div>
                ) : (
                  filteredThreads.map((thread) => (
                    <div
                      key={thread.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setActiveId(thread.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") setActiveId(thread.id);
                      }}
                      className={cn(
                        "flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-muted/40",
                        activeId === thread.id && "border-l-2 border-primary bg-muted/60"
                      )}
                    >
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openProfile(thread.id);
                        }}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
                      >
                        {getInitials(thread.name)}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openProfile(thread.id);
                            }}
                            className="truncate text-sm font-semibold text-foreground hover:underline"
                          >
                            {thread.name}
                          </button>
                          <Badge
                            variant="outline"
                            className={eligibilityBadgeConfig[thread.profile.eligibility].className}
                          >
                            {eligibilityBadgeConfig[thread.profile.eligibility].label}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex min-h-0 flex-col">
              {activeThread ? (
                <>
                  <div className="flex items-center justify-between border-b px-6 py-4">
                    <button
                      type="button"
                      onClick={() => openProfile(activeThread.id)}
                      className="flex items-center gap-3 text-left"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                        {getInitials(activeThread.name)}
                      </div>
                      <div>
                        <div className="text-base font-semibold text-foreground hover:underline">
                          {activeThread.name}
                        </div>
                        <div className="text-xs text-muted-foreground">{activeThread.role}</div>
                      </div>
                    </button>
                    <Badge
                      variant="outline"
                      className={cn("text-[11px]", statusClass[activeThread.status])}
                    >
                      {statusLabel[activeThread.status]}
                    </Badge>
                  </div>
                  <div className="flex-1 overflow-y-auto bg-muted/20 px-6 py-5">
                    <div className="space-y-4">
                      {activeThread.messages.map((message) => {
                        const isMe = message.from === "me";
                        return (
                          <div
                            key={message.id}
                            className={cn("flex", isMe ? "justify-end" : "justify-start")}
                          >
                            <div
                              className={cn(
                                "max-w-[70%] rounded-2xl px-4 py-2 text-sm shadow-sm",
                                isMe
                                  ? "bg-emerald-500 text-white"
                                  : "bg-white text-foreground border"
                              )}
                            >
                              <p>{message.text}</p>
                              <div
                                className={cn(
                                  "mt-1 text-[10px]",
                                  isMe ? "text-emerald-100" : "text-muted-foreground"
                                )}
                              >
                                {message.time}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="border-t bg-background px-6 py-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center">
                      <Input placeholder="Tulis pesan balasan..." />
                      <Button className="md:w-auto">Kirim</Button>
                    </div>
                    <div className="mt-2 text-[11px] text-muted-foreground">
                      UI demo saja, belum terhubung ke backend chat.
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex h-full items-center justify-center p-6">
                  <EmptyState
                    title={isLoading ? "Memuat percakapan" : "Pilih percakapan"}
                    description={
                      isLoading
                        ? "Sedang mengambil data dari daftar kasus."
                        : "Klik salah satu pesan masuk di sisi kiri untuk melihat percakapannya."
                    }
                  />
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      <Sheet open={profileOpen} onOpenChange={setProfileOpen}>
        <SheetContent className="w-[420px] sm:w-[480px]">
          <SheetHeader>
            <SheetTitle>Profil Pengirim</SheetTitle>
            <SheetDescription>
              Detail data pengirim dengan layout seperti Case Review.
            </SheetDescription>
          </SheetHeader>
          {profileThread ? (
            <div className="space-y-4">
              <Button asChild variant="outline">
                <Link to={`/cases/${profileThread.profile.caseId}`}>Buka Case Review</Link>
              </Button>
              <CardShell>
                <CardHeader>
                  <CardTitle>Applicant</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Name</div>
                    <div className="text-base font-semibold text-foreground">
                      {profileThread.name}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">NIK</div>
                    <PiiRevealGate
                      label=""
                      maskedValue={maskNik(profileThread.profile.nik)}
                      fullValue={profileThread.profile.nik}
                      caseId={profileThread.profile.caseId}
                      fieldKey="NIK"
                      actor={actor}
                      allowReveal={role === "VERIFIER"}
                      policyDisabled={!flags.enablePIIReveal}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <div className="text-xs text-muted-foreground">Region</div>
                      <div className="text-sm font-medium">
                        {profileThread.profile.region.province} /{" "}
                        {profileThread.profile.region.city}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Created</div>
                      <div className="text-sm font-medium">
                        {formatDateTime(profileThread.profile.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={eligibilityBadge.className}>
                      {eligibilityBadge.label}
                    </Badge>
                  </div>
                </CardContent>
              </CardShell>
            </div>
          ) : (
            <EmptyState
              title="Profil tidak ditemukan"
              description="Pilih percakapan untuk melihat detail pengirim."
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};
