'use client'

import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ComposedChart,
  ScatterChart,
  Scatter
} from 'recharts'

// Color palette for charts
export const CHART_COLORS = {
  primary: '#6366f1',
  secondary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  muted: '#6b7280',
  light: '#f3f4f6'
}

export const MULTI_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', 
  '#ef4444', '#3b82f6', '#6b7280', '#84cc16', '#06b6d4'
]

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label, formatter }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
        <p className="font-medium text-gray-900 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-gray-600">
              {entry.name}: <span className="font-medium text-gray-900">
                {formatter ? formatter(entry.value) : entry.value}
              </span>
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

// Bar Chart Component
interface BarChartProps {
  data: any[]
  xKey: string
  yKey: string
  title?: string
  color?: string
  height?: number
  formatter?: (value: any) => string
}

export const CustomBarChart: React.FC<BarChartProps> = ({
  data,
  xKey,
  yKey,
  title,
  color = CHART_COLORS.primary,
  height = 300,
  formatter
}) => {
  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis 
            dataKey={xKey} 
            stroke="#6b7280" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="#6b7280" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip formatter={formatter} />} />
          <Bar 
            dataKey={yKey} 
            fill={color}
            radius={[4, 4, 0, 0]}
            className="drop-shadow-sm"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// Line Chart Component
interface LineChartProps {
  data: any[]
  xKey: string
  lines: { key: string; name: string; color?: string }[]
  title?: string
  height?: number
  formatter?: (value: any) => string
}

export const CustomLineChart: React.FC<LineChartProps> = ({
  data,
  xKey,
  lines,
  title,
  height = 300,
  formatter
}) => {
  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis 
            dataKey={xKey} 
            stroke="#6b7280" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="#6b7280" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip formatter={formatter} />} />
          <Legend />
          {lines.map((line, index) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              name={line.name}
              stroke={line.color || MULTI_COLORS[index % MULTI_COLORS.length]}
              strokeWidth={3}
              dot={{ fill: line.color || MULTI_COLORS[index % MULTI_COLORS.length], strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: line.color || MULTI_COLORS[index % MULTI_COLORS.length], strokeWidth: 2 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// Pie Chart Component
interface PieChartProps {
  data: any[]
  dataKey: string
  nameKey: string
  title?: string
  height?: number
  showLabels?: boolean
  formatter?: (value: any) => string
}

export const CustomPieChart: React.FC<PieChartProps> = ({
  data,
  dataKey,
  nameKey,
  title,
  height = 300,
  showLabels = true,
  formatter
}) => {
  const renderLabel = (entry: any) => {
    if (!showLabels) return ''
    const value = formatter ? formatter(entry[dataKey]) : entry[dataKey]
    return `${entry[nameKey]}: ${value}`
  }

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={showLabels ? renderLabel : false}
            outerRadius={100}
            fill="#8884d8"
            dataKey={dataKey}
            className="drop-shadow-sm"
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={MULTI_COLORS[index % MULTI_COLORS.length]} 
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip formatter={formatter} />} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

// Area Chart Component
interface AreaChartProps {
  data: any[]
  xKey: string
  areas: { key: string; name: string; color?: string }[]
  title?: string
  height?: number
  stacked?: boolean
  formatter?: (value: any) => string
}

export const CustomAreaChart: React.FC<AreaChartProps> = ({
  data,
  xKey,
  areas,
  title,
  height = 300,
  stacked = false,
  formatter
}) => {
  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis 
            dataKey={xKey} 
            stroke="#6b7280" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="#6b7280" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip formatter={formatter} />} />
          <Legend />
          {areas.map((area, index) => (
            <Area
              key={area.key}
              type="monotone"
              dataKey={area.key}
              name={area.name}
              stackId={stacked ? "1" : undefined}
              stroke={area.color || MULTI_COLORS[index % MULTI_COLORS.length]}
              fill={area.color || MULTI_COLORS[index % MULTI_COLORS.length]}
              fillOpacity={0.6}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// Chart Loading Skeleton
export const ChartSkeleton: React.FC<{ height?: number; title?: boolean }> = ({ 
  height = 300, 
  title = true 
}) => (
  <div className="w-full animate-pulse">
    {title && (
      <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
    )}
    <div 
      className="bg-gray-200 rounded-lg" 
      style={{ height }}
    />
  </div>
)

// Export utilities
export const downloadChartAsImage = (chartRef: React.RefObject<HTMLDivElement>, filename: string) => {
  // This would require additional libraries like html2canvas
  // For now, we'll just log the action
  console.log(`Downloading chart as image: ${filename}`)
}

export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('tr-TR').format(value)
}

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY'
  }).format(value)
}

export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`
}