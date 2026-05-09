// =============================================================================
// Webhook Events — filterable audit-log table · hourly trend chart · drill-down
// =============================================================================

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Search,
  Shield,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { api, type ApiResponse } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { AdminLayout } from "@/components/layout/admin-layout";
import { DataTable, type Column } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { Separator } from "@repo/ui/components/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@repo/ui/components/sheet";
import { Skeleton } from "@repo/ui/components/skeleton";

// ── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/_admin/webhook-events/")({
  component: WebhookEventsPage,
});

// ── Types ─────────────────────────────────────────────────────────────────────

interface WebhookEvent {
  createdAt: string;
  id: string;
  ip: string | null;
  orderId: string | null;
  outcome: string;
  outcomeDetail: string | null;
  paymentStatus: string | null;
  provider: string;
  transactionId: string | null;
}

interface WebhookEventDetail extends WebhookEvent {
  rawPayload: unknown;
}

interface Stats {
  byOutcome: { count: number; outcome: string }[];
  last24h: {
    attackRate: string;
    attacks: number;
    blockRate: string;
    blocked: number;
    duplicateRate: string;
    duplicates: number;
    forwarded: number;
    total: number;
  };
  recentTrend: { count: number; hour: string; outcome: string }[];
  since: string;
  total: number;
}

interface EventList {
  items: WebhookEvent[];
  pagination: {
    limit: number;
    page: number;
    total: number;
    totalPages: number;
  };
}

// ── Outcome metadata ──────────────────────────────────────────────────────────

const OUTCOME_ALL = "__all__";

const OUTCOME_META: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "outline" | "destructive";
  }
> = {
  forwarded:         { label: "Forwarded",         variant: "default"     },
  sig_skipped:       { label: "Sig Skipped",       variant: "secondary"   },
  duplicate:         { label: "Duplicate",         variant: "outline"     },
  invalid_signature: { label: "Invalid Signature", variant: "destructive" },
  invalid_json:      { label: "Invalid JSON",      variant: "destructive" },
  not_allowed:       { label: "Not Allowed",       variant: "destructive" },
};

const CHART_COLORS: Record<string, string> = {
  forwarded:         "#22c55e",
  sig_skipped:       "#f59e0b",
  duplicate:         "#3b82f6",
  invalid_signature: "#ef4444",
  invalid_json:      "#f97316",
  not_allowed:       "#dc2626",
};

// ── OutcomeBadge ──────────────────────────────────────────────────────────────

function OutcomeBadge({ outcome }: { outcome: string }) {
  const meta = OUTCOME_META[outcome] ?? {
    label: outcome,
    variant: "outline" as const,
  };
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

// ── Hourly trend chart ────────────────────────────────────────────────────────

function HourlyTrendChart({
  data,
  isLoading,
}: {
  data: Stats["recentTrend"];
  isLoading: boolean;
}) {
  const pivoted = useMemo(() => {
    const map = new Map<string, Record<string, number>>();
    for (const row of data) {
      const bucket = map.get(row.hour) ?? {};
      bucket[row.outcome] = (bucket[row.outcome] ?? 0) + Number(row.count);
      map.set(row.hour, bucket);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([hour, counts]) => ({
        hour: new Date(hour).toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
        ...counts,
      }));
  }, [data]);

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (pivoted.length === 0) {
    return (
      <div className="text-muted-foreground flex h-48 items-center justify-center text-sm">
        Tidak ada event dalam 24 jam terakhir
      </div>
    );
  }

  return (
    <ResponsiveContainer height={192} width="100%">
      <BarChart
        barSize={10}
        data={pivoted}
        margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
      >
        <XAxis
          axisLine={false}
          dataKey="hour"
          tick={{ fontSize: 11, fill: "var(--color-muted-foreground, #888)" }}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "var(--color-muted-foreground, #888)" }}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: "var(--color-card, #fff)",
            border: "1px solid var(--color-border, #e5e7eb)",
            borderRadius: 8,
            fontSize: 12,
          }}
          cursor={{ fill: "rgba(0,0,0,0.05)" }}
        />
        {Object.keys(CHART_COLORS).map(outcome => (
          <Bar
            dataKey={outcome}
            fill={CHART_COLORS[outcome]}
            key={outcome}
            name={OUTCOME_META[outcome]?.label ?? outcome}
            stackId="a"
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Event detail sheet ────────────────────────────────────────────────────────

function EventDetailSheet({
  eventId,
  open,
  onOpenChange,
}: {
  eventId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["webhook-events", "detail", eventId],
    queryFn: () =>
      api.get<ApiResponse<WebhookEventDetail>>(
        `/admin/webhook-events/${eventId}`
      ),
    enabled: Boolean(eventId && open),
    staleTime: 60_000,
  });

  const event = data?.data;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="flex w-full flex-col overflow-y-auto sm:max-w-lg"
        side="right"
      >
        <SheetHeader className="border-b pb-4">
          <SheetTitle>Detail Event Webhook</SheetTitle>
          <SheetDescription>
            {event ? formatDateTime(event.createdAt) : "Memuat detail event…"}
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex flex-col gap-3 px-4 pt-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton className="h-7 w-full" key={i} />
            ))}
          </div>
        ) : event ? (
          <div className="flex flex-col gap-5 px-4 pb-6 pt-4">
            {/* Outcome badge + detail */}
            <div className="flex items-center gap-2">
              <OutcomeBadge outcome={event.outcome} />
              {event.outcomeDetail && (
                <span className="text-muted-foreground text-xs">
                  {event.outcomeDetail}
                </span>
              )}
            </div>

            <Separator />

            {/* Field table */}
            <dl className="space-y-2.5 text-sm">
              {(
                [
                  { label: "Event ID",    value: event.id },
                  { label: "Provider",    value: event.provider },
                  { label: "Order ID",    value: event.orderId ?? "—" },
                  { label: "Tx ID",       value: event.transactionId ?? "—" },
                  { label: "Py Status",   value: event.paymentStatus ?? "—" },
                  { label: "IP Address",  value: event.ip ?? "—" },
                  { label: "Timestamp",   value: formatDateTime(event.createdAt) },
                ] as { label: string; value: string }[]
              ).map(({ label, value }) => (
                <div
                  className="grid grid-cols-[110px_1fr] gap-2"
                  key={label}
                >
                  <dt className="text-muted-foreground shrink-0">{label}</dt>
                  <dd className="font-mono text-xs break-all">{value}</dd>
                </div>
              ))}
            </dl>

            <Separator />

            {/* Raw payload */}
            <div>
              <p className="mb-2 text-sm font-medium">Raw Payload</p>
              {event.rawPayload != null ? (
                <pre className="bg-muted text-foreground max-h-[420px] overflow-auto rounded-lg p-3 text-xs leading-relaxed whitespace-pre-wrap break-all">
                  {JSON.stringify(event.rawPayload, null, 2)}
                </pre>
              ) : (
                <p className="text-muted-foreground text-sm italic">
                  Payload tidak tersedia (body bukan JSON yang valid)
                </p>
              )}
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function WebhookEventsPage() {
  const [page, setPage]       = useState(1);
  const [outcome, setOutcome] = useState(OUTCOME_ALL);
  const [search, setSearch]   = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo]   = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen]   = useState(false);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: statsRes, isLoading: statsLoading } = useQuery({
    queryKey: ["webhook-events", "stats"],
    queryFn: () => api.get<ApiResponse<Stats>>("/admin/webhook-events/stats"),
    staleTime: 60_000,
  });

  const apiOutcome = outcome === OUTCOME_ALL ? undefined : outcome;
  const listParams = {
    page,
    limit: 50,
    ...(apiOutcome            && { outcome:   apiOutcome }),
    ...(search                && { orderId:   search }),
    ...(dateFrom              && { since:     new Date(dateFrom).toISOString() }),
    ...(dateTo                && { until:     new Date(dateTo + "T23:59:59").toISOString() }),
  };

  const { data: listRes, isLoading: listLoading } = useQuery({
    queryKey: ["webhook-events", "list", listParams],
    queryFn: () =>
      api.get<ApiResponse<EventList>>("/admin/webhook-events", {
        params: listParams as Record<string, string | number>,
      }),
    placeholderData: prev => prev,
    staleTime: 30_000,
  });

  const stats      = statsRes?.data;
  const items      = listRes?.data?.items ?? [];
  const pagination = listRes?.data?.pagination;

  const filtersActive = Boolean(outcome !== OUTCOME_ALL || search || dateFrom || dateTo);

  const clearFilters = () => {
    setOutcome(OUTCOME_ALL);
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  // ── Table columns ──────────────────────────────────────────────────────────

  const columns: Column<WebhookEvent>[] = useMemo(
    () => [
      {
        key: "createdAt",
        header: "Waktu",
        cell: row => (
          <span className="text-muted-foreground whitespace-nowrap text-xs">
            {formatDateTime(row.createdAt)}
          </span>
        ),
      },
      {
        key: "provider",
        header: "Provider",
        cell: row => (
          <span className="font-mono text-xs font-semibold uppercase">
            {row.provider}
          </span>
        ),
      },
      {
        key: "outcome",
        header: "Outcome",
        cell: row => <OutcomeBadge outcome={row.outcome} />,
      },
      {
        key: "orderId",
        header: "Order ID",
        cell: row => (
          <span className="font-mono text-xs">{row.orderId ?? "—"}</span>
        ),
      },
      {
        key: "transactionId",
        header: "Tx ID",
        cell: row => (
          <span className="font-mono text-xs">
            {row.transactionId
              ? row.transactionId.length > 14
                ? row.transactionId.slice(0, 14) + "…"
                : row.transactionId
              : "—"}
          </span>
        ),
      },
      {
        key: "paymentStatus",
        header: "Status Bayar",
        cell: row => (
          <span className="text-xs capitalize">{row.paymentStatus ?? "—"}</span>
        ),
      },
      {
        key: "ip",
        header: "IP",
        cell: row => (
          <span className="text-muted-foreground font-mono text-xs">
            {row.ip ?? "—"}
          </span>
        ),
      },
    ],
    []
  );

  const handleRowClick = (row: WebhookEvent) => {
    setSelectedId(row.id);
    setSheetOpen(true);
  };

  const paginationMeta = pagination
    ? {
        page:        pagination.page,
        limit:       pagination.limit,
        total:       pagination.total,
        totalPages:  pagination.totalPages,
        hasNextPage: pagination.page < pagination.totalPages,
        hasPrevPage: pagination.page > 1,
      }
    : undefined;

  return (
    <AdminLayout
      title="Webhook Events"
      subtitle="Audit log setiap notifikasi webhook masuk"
    >
      <PageHeader
        title="Webhook Events"
        description="Audit log tiap notifikasi masuk — klik baris untuk lihat payload lengkap"
      />

      {/* ── KPI summary cards ─────────────────────────────────────────────── */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton className="h-[104px] rounded-xl" key={i} />
          ))
        ) : (
          <>
            <StatCard
              icon={Activity}
              title="Total 24 Jam"
              value={(stats?.last24h.total ?? 0).toLocaleString("id-ID")}
              description={`${(stats?.total ?? 0).toLocaleString("id-ID")} seluruh waktu`}
            />
            <StatCard
              icon={CheckCircle2}
              title="Diteruskan"
              value={(stats?.last24h.forwarded ?? 0).toLocaleString("id-ID")}
              description="forwarded + sig_skipped"
            />
            <StatCard
              icon={AlertTriangle}
              title="Percobaan Serangan"
              value={(stats?.last24h.attacks ?? 0).toLocaleString("id-ID")}
              description={`${stats?.last24h.attackRate ?? "0%"} dari total`}
            />
            <StatCard
              icon={Shield}
              title="Duplikat"
              value={(stats?.last24h.duplicates ?? 0).toLocaleString("id-ID")}
              description={`${stats?.last24h.duplicateRate ?? "0%"} dari total`}
            />
          </>
        )}
      </div>

      {/* ── Hourly trend chart ─────────────────────────────────────────────── */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Tren Hourly (24 Jam Terakhir)</CardTitle>
              <CardDescription className="mt-0.5">
                Volume event per jam, dikelompokkan berdasarkan outcome
              </CardDescription>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {Object.entries(OUTCOME_META).map(([key, meta]) => (
                <div className="flex items-center gap-1.5" key={key}>
                  <span
                    className="inline-block h-2 w-2 shrink-0 rounded-full"
                    style={{ background: CHART_COLORS[key] }}
                  />
                  <span className="text-muted-foreground text-xs">
                    {meta.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="pt-4">
          <HourlyTrendChart
            data={stats?.recentTrend ?? []}
            isLoading={statsLoading}
          />
        </CardContent>
      </Card>

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="text-muted-foreground absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            className="pl-8"
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Cari Order ID…"
            type="search"
            value={search}
          />
        </div>

        <Select value={outcome} onValueChange={v => { setOutcome(v); setPage(1); }}>
          <SelectTrigger className="w-[190px]">
            <Filter className="mr-1.5 h-3.5 w-3.5 shrink-0 opacity-50" />
            <SelectValue placeholder="Semua Outcome" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={OUTCOME_ALL}>Semua Outcome</SelectItem>
            {Object.entries(OUTCOME_META).map(([key, meta]) => (
              <SelectItem key={key} value={key}>
                {meta.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground whitespace-nowrap text-sm">Dari</span>
          <Input
            className="w-[150px]"
            onChange={e => { setDateFrom(e.target.value); setPage(1); }}
            type="date"
            value={dateFrom}
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground whitespace-nowrap text-sm">Sampai</span>
          <Input
            className="w-[150px]"
            onChange={e => { setDateTo(e.target.value); setPage(1); }}
            type="date"
            value={dateTo}
          />
        </div>

        {filtersActive && (
          <Button onClick={clearFilters} size="sm" variant="ghost">
            <X className="mr-1 h-3.5 w-3.5" />
            Reset
          </Button>
        )}
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <DataTable
        columns={columns}
        data={items}
        emptyMessage="Belum ada webhook event yang tercatat"
        getRowKey={row => row.id}
        isLoading={listLoading}
        meta={paginationMeta}
        onPageChange={p => setPage(p)}
        onRowClick={handleRowClick}
      />

      {/* ── Detail sheet ──────────────────────────────────────────────────── */}
      <EventDetailSheet
        eventId={selectedId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </AdminLayout>
  );
}
