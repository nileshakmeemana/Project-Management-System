"use client"

import * as React from "react"
import * as RechartsPrimitive from "recharts"

const THEMES = { light: "", dark: ".dark" } as const

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode
    icon?: React.ComponentType
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
}

type ChartContextProps = { config: ChartConfig }
const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)
  if (!context) throw new Error("useChart must be used within a <ChartContainer />")
  return context
}

function ChartContainer({
  id, className, children, config, ...props
}: React.ComponentProps<"div"> & { config: ChartConfig; children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"] }) {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`
  return (
    <ChartContext.Provider value={{ config }}>
      <div data-slot="chart" id={chartId} className={`flex aspect-auto justify-center text-xs ${className || ''}`} {...props}
        style={{ fontFamily: 'var(--p-font-family-sans)', ...((props as any).style || {}) }}>
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer width="100%" height="100%">
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
}

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const colorConfig = Object.entries(config).filter(([, cfg]) => cfg.theme || cfg.color)
  if (!colorConfig.length) return null
  return (
    <style dangerouslySetInnerHTML={{
      __html: Object.entries(THEMES).map(([theme, prefix]) => `
${prefix} [data-slot="chart"]#${id} {
${colorConfig.map(([key, cfg]) => {
  const color = cfg.theme?.[theme as keyof typeof THEMES] || cfg.color
  return color ? `  --color-${key}: ${color};` : null
}).filter(Boolean).join("\n")}
}`).join("\n")
    }} />
  )
}

const ChartTooltip = RechartsPrimitive.Tooltip

function ChartTooltipContent({
  active, payload, className, indicator = "dot", hideLabel = false, hideIndicator = false,
  label, labelFormatter, labelClassName, formatter, color, nameKey, labelKey,
}: React.ComponentProps<typeof RechartsPrimitive.Tooltip> & React.ComponentProps<"div"> & {
  hideLabel?: boolean; hideIndicator?: boolean
  indicator?: "line" | "dot" | "dashed"
  nameKey?: string; labelKey?: string
  payload?: any[]; label?: any; color?: string
}) {
  const { config } = useChart()
  const tooltipLabel = React.useMemo(() => {
    if (hideLabel || !payload?.length) return null
    const [item] = payload
    const key = `${labelKey || item?.dataKey || item?.name || "value"}`
    const itemConfig = getPayloadConfigFromPayload(config, item, key)
    const value = !labelKey && typeof label === "string"
      ? config[label as keyof typeof config]?.label || label
      : itemConfig?.label
    if (labelFormatter) {
      return <div className={`font-medium ${labelClassName || ''}`}>{labelFormatter(value, payload)}</div>
    }
    if (!value) return null
    return <div className={`font-medium ${labelClassName || ''}`}>{value}</div>
  }, [label, labelFormatter, payload, hideLabel, labelClassName, config, labelKey])

  if (!active || !payload?.length) return null

  const nestLabel = payload.length === 1 && indicator !== "dot"

  return (
    <div style={{ background: 'var(--p-surface)', border: '.0625rem solid var(--p-border)', borderRadius: 'var(--p-border-radius-200)', padding: '6px 10px', fontSize: 12, boxShadow: 'var(--p-shadow-200)', fontFamily: 'var(--p-font-family-sans)' }} className={className}>
      {!nestLabel && tooltipLabel}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {payload.map((item, index) => {
          const key = `${nameKey || item.name || item.dataKey || "value"}`
          const itemConfig = getPayloadConfigFromPayload(config, item, key)
          const indicatorColor = color || item.payload.fill || item.color
          return (
            <div key={item.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {itemConfig?.icon ? (
                <itemConfig.icon />
              ) : (!hideIndicator && (
                <div style={{ width: indicator === 'dot' ? 8 : 2, height: indicator === 'dot' ? 8 : 16, borderRadius: indicator === 'dot' ? '50%' : 1, background: indicatorColor, flexShrink: 0 }} />
              ))}
              <div style={{ display: 'flex', flex: 1, justifyContent: 'space-between', gap: 8 }}>
                <div style={{ color: 'var(--p-text-secondary)' }}>
                  {nestLabel && tooltipLabel}
                  <span>{itemConfig?.label || item.name}</span>
                </div>
                {item.value !== undefined && (
                  <span style={{ fontWeight: 600, color: 'var(--p-text)' }}>
                    {formatter ? formatter(item.value, item.name as string, item, index, item.payload) : item.value.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const ChartLegend = RechartsPrimitive.Legend
function ChartLegendContent({ className, hideIcon = false, payload, verticalAlign = "bottom", nameKey }: React.ComponentProps<"div"> & { payload?: any[]; verticalAlign?: "top" | "middle" | "bottom"; hideIcon?: boolean; nameKey?: string }) {
  const { config } = useChart()
  if (!payload?.length) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, paddingTop: verticalAlign === 'top' ? 0 : 12 }} className={className}>
      {payload.map(item => {
        const key = `${nameKey || item.dataKey || "value"}`
        const itemConfig = getPayloadConfigFromPayload(config, item, key)
        return (
          <div key={item.value} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--p-text-secondary)' }}>
            {itemConfig?.icon && !hideIcon ? <itemConfig.icon /> : (
              <div style={{ width: 8, height: 8, borderRadius: 2, background: item.color, flexShrink: 0 }} />
            )}
            {itemConfig?.label}
          </div>
        )
      })}
    </div>
  )
}

function getPayloadConfigFromPayload(config: ChartConfig, payload: unknown, key: string) {
  if (typeof payload !== "object" || payload === null) return undefined
  const payloadPayload = "payload" in payload && typeof (payload as any).payload === "object" && (payload as any).payload !== null ? (payload as any).payload : undefined
  let configLabelKey = key
  if (key in config) {
    configLabelKey = key
  } else if (payloadPayload && key in payloadPayload) {
    configLabelKey = payloadPayload[key] as string
  }
  return configLabelKey in config ? config[configLabelKey] : config[key as keyof typeof config]
}

export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, ChartStyle }
