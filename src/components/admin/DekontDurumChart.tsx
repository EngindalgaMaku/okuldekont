'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

interface ChartData {
  name: string
  value: number
}

interface DekontDurumChartProps {
  data: ChartData[]
}

const COLORS = ['#FFBB28', '#00C49F', '#FF8042'] // Yellow, Green, Red

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 bg-white border rounded-lg shadow-lg">
        <p className="font-bold">{`${payload[0].name}: ${payload[0].value}`}</p>
      </div>
    )
  }
  return null
}

export default function DekontDurumChart({ data }: DekontDurumChartProps) {
  const total = data.reduce((sum, entry) => sum + entry.value, 0)

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Dekont verisi bulunamadı.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
          nameKey="name"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}