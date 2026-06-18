"use client"

import { useMemo } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell, Tooltip } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"

const fmtK  = (v: number) => v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}M` : v >= 1_000 ? `${Math.round(v/1_000)}K` : String(Math.round(v))
const fmtAmt = (v: number, c = 'LKR') => { try { return new Intl.NumberFormat('en-US', {style:'currency',currency:c,maximumFractionDigits:0}).format(v) } catch { return `${c} ${Math.round(v).toLocaleString()}` } }

/* ─── Client Profitability Bar Chart (Admin) ─── */
const profitConfig = { value: { label: "Revenue", color: "#005bd3" } } satisfies ChartConfig

export function ClientProfitChart({ data }: { data: Record<string, number> }) {
  const chartData = useMemo(() =>
    Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([client, value]) => ({
      client: client.split(' ')[0],
      fullName: client,
      value,
    })), [data])

  if (chartData.length === 0) return (
    <div style={{ height: 250, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--p-text-secondary)', fontSize:'var(--p-font-size-325)' }}>
      No client data yet — approve some tasks to see chart
    </div>
  )

  return (
    <ChartContainer config={profitConfig} style={{ height: 250, width: '100%' }}>
      <BarChart data={chartData} margin={{ top: 16, right: 12, left: 0, bottom: 20 }}>
        <CartesianGrid vertical={false} stroke="var(--p-border-subdued)" />
        <XAxis dataKey="client" tickLine={false} axisLine={false} tickMargin={8} style={{ fontSize: 11, fill: 'var(--p-text-secondary)' }} />
        <YAxis tickLine={false} axisLine={false} tickFormatter={fmtK} style={{ fontSize: 11, fill: 'var(--p-text-secondary)' }} width={40} />
        <ChartTooltip cursor={{ fill: 'var(--p-surface-secondary)' }}
          content={<ChartTooltipContent formatter={(value) => [fmtAmt(value as number), 'Revenue']} labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''} />}
        />
        <Bar dataKey="value" fill="#005bd3" radius={[3, 3, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ChartContainer>
  )
}

/* ─── Earnings Overview Bar Chart (Employee) ─── */
const earningsConfig = { amount: { label: "Approved Earnings", color: "#005bd3" } } satisfies ChartConfig

export function EarningsOverviewChart({ tasks }: { tasks: any[] }) {
  const chartData = useMemo(() => {
    const buckets: Record<string, number> = {}
    tasks.filter(t => ['Approved', 'Paid'].includes(t.status)).forEach(t => {
      const d = new Date(t.dateCompleted || t.createdAt)
      const day = d.getDay()
      const sun = new Date(d); sun.setDate(d.getDate() - day)
      const key = sun.toISOString().slice(0, 10)
      buckets[key] = (buckets[key] || 0) + (t.approvedAmount || t.requestedAmount || 0)
    })
    return Object.entries(buckets).sort(([a], [b]) => a.localeCompare(b)).map(([date, amount]) => ({
      date, amount,
      label: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }))
  }, [tasks])

  if (chartData.length === 0) return (
    <div style={{ height: 280, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--p-text-secondary)', fontSize:'var(--p-font-size-325)' }}>
      No approved tasks yet — earnings will appear here once tasks are approved
    </div>
  )

  return (
    <ChartContainer config={earningsConfig} style={{ height: 280, width: '100%' }}>
      <BarChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 20 }}>
        <CartesianGrid vertical={false} stroke="var(--p-border-subdued)" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32} style={{ fontSize: 11, fill: 'var(--p-text-secondary)' }} />
        <YAxis tickLine={false} axisLine={false} tickFormatter={fmtK} style={{ fontSize: 11, fill: 'var(--p-text-secondary)' }} width={44} />
        <ChartTooltip cursor={{ fill: 'var(--p-surface-secondary)' }}
          content={<ChartTooltipContent formatter={(v) => [fmtAmt(v as number), 'Earnings']} />}
        />
        <Bar dataKey="amount" fill="#005bd3" radius={[3, 3, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ChartContainer>
  )
}

/* ─── Monthly Earnings grouped (Admin) ─── */
const monthlyConfig = {
  approved: { label: "Approved", color: "#005bd3" },
  pending:  { label: "Pending",  color: "#91d0ff" },
} satisfies ChartConfig

export function MonthlyEarningsChart({ data }: { data: { label: string; approved: number; pending: number }[] }) {
  if (data.length === 0) return (
    <div style={{ height: 160, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--p-text-secondary)' }}>No data yet</div>
  )
  return (
    <ChartContainer config={monthlyConfig} style={{ height: 160, width: '100%' }}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 16 }} barGap={2} barCategoryGap="30%">
        <CartesianGrid vertical={false} stroke="var(--p-border-subdued)" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={6} style={{ fontSize: 10, fill: 'var(--p-text-secondary)' }} />
        <ChartTooltip cursor={{ fill: 'var(--p-surface-secondary)' }} content={<ChartTooltipContent formatter={(v) => [fmtAmt(v as number)]} />} />
        <Bar dataKey="approved" fill="#005bd3" radius={[2,2,0,0]} maxBarSize={20} />
        <Bar dataKey="pending"  fill="#91d0ff" radius={[2,2,0,0]} maxBarSize={20} />
      </BarChart>
    </ChartContainer>
  )
}

/* ─── Earnings by Status Donut ─── */
const STATUS_COLORS: Record<string, string> = {
  'Paid':              '#047b5d',
  'Approved':          '#005bd3',
  'Pending Review':    '#ffb800',
  'Changes Requested': '#e8912d',
  'Rejected':          '#c70a24',
}

export function EarningsByStatusDonut({ tasks }: { tasks: any[] }) {
  const { segments, total } = useMemo(() => {
    const map: Record<string, number> = {}
    tasks.forEach(t => {
      const val = t.approvedAmount || t.requestedAmount || 0
      map[t.status] = (map[t.status] || 0) + val
    })
    const segments = Object.entries(map)
      .filter(([, v]) => v > 0)
      .map(([status, value]) => ({ status, value, fill: STATUS_COLORS[status] || '#888' }))
    return { segments, total: segments.reduce((s, d) => s + d.value, 0) }
  }, [tasks])

  if (segments.length === 0) return (
    <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--p-text-secondary)', fontSize: 'var(--p-font-size-325)' }}>
      No task data yet
    </div>
  )

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
      <div style={{ background:'var(--p-surface)', border:'.0625rem solid var(--p-border)', borderRadius:'var(--p-border-radius-200)', padding:'6px 10px', fontSize:12, boxShadow:'var(--p-shadow-200)', fontFamily:'var(--p-font-family-sans)' }}>
        <div style={{ fontWeight:600, color:'var(--p-text)' }}>{d.status}</div>
        <div style={{ color:'var(--p-text-secondary)' }}>{fmtAmt(d.value)}</div>
      </div>
    )
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Donut chart - full width */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--p-space-300)' }}>
        <PieChart width={200} height={180}>
          <Tooltip cursor={false} content={<CustomTooltip />} />
          <Pie data={segments} dataKey="value" nameKey="status" innerRadius={55} outerRadius={85} strokeWidth={2} stroke="var(--p-surface)">
            {segments.map((s, i) => <Cell key={i} fill={s.fill} />)}
          </Pie>
        </PieChart>
      </div>
      {/* Legend - full width below chart */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p-space-200)', padding: '0 var(--p-space-200)' }}>
        {segments.map(s => (
          <div key={s.status} style={{ display:'flex', alignItems:'center', gap:'var(--p-space-200)' }}>
            <div style={{ width:10, height:10, borderRadius:2, background:s.fill, flexShrink:0 }} />
            <span style={{ color:'var(--p-text-secondary)', flex:1, fontSize:'var(--p-font-size-325)' }}>{s.status}</span>
            <span style={{ fontWeight:600, color:'var(--p-text)', fontSize:'var(--p-font-size-325)' }}>{fmtAmt(s.value)}</span>
          </div>
        ))}
        <div style={{ borderTop:'.0625rem solid var(--p-border-subdued)', paddingTop:'var(--p-space-200)', marginTop:'var(--p-space-100)', display:'flex', justifyContent:'space-between', fontSize:'var(--p-font-size-325)', fontWeight:600 }}>
          <span style={{ color:'var(--p-text-secondary)' }}>Total</span>
          <span>{fmtAmt(total)}</span>
        </div>
      </div>
    </div>
  )
}
