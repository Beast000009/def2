import { useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { fetchCoinChartData } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';

interface PriceChartProps {
  tokenSymbol?: string;
  baseTokenSymbol?: string;
}

const getTimeRange = (range: string): number => {
  switch(range) {
    case '1H': return 1/24; // 1 hour
    case '1D': return 1;    // 1 day
    case '1W': return 7;    // 7 days
    case '1M': return 30;   // 30 days
    case '1Y': return 365;  // 365 days
    default: return 1;
  }
};

const formatChartData = (data: [number, number][]) => {
  return data.map(([timestamp, price]) => ({
    time: new Date(timestamp).toLocaleString(),
    price: price
  }));
};

const PriceChart = ({ tokenSymbol = 'ETH', baseTokenSymbol = 'USDT' }: PriceChartProps) => {
  const [timeRange, setTimeRange] = useState('1D');

  const { data: chartData, isLoading } = useQuery({
    queryKey: [`/api/coins/${tokenSymbol}/chart`, timeRange],
    queryFn: () => fetchCoinChartData(tokenSymbol.toLowerCase(), getTimeRange(timeRange)),
    staleTime: 300000, // Consider data fresh for 5 minutes
    refetchOnWindowFocus: false
  });

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  const formattedData = chartData ? formatChartData(chartData.prices) : [];

  return (
    <div className="chart-container">
      <div className="flex space-x-1 mb-4 justify-end">
        {['1H', '1D', '1W', '1M', '1Y'].map((range) => (
          <button 
            key={range}
            className={`px-3 py-1.5 text-sm rounded-lg ${
              timeRange === range 
                ? 'bg-primary bg-opacity-20 text-primary-light' 
                : 'hover:bg-neutral-700'
            }`}
            onClick={() => setTimeRange(range)}
          >
            {range}
          </button>
        ))}
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart 
            data={formattedData} 
            margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="time" 
              hide 
              tickFormatter={(time) => new Date(time).toLocaleTimeString()}
            />
            <YAxis domain={['auto', 'auto']} hide />
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-neutral-800 border border-neutral-700 rounded-md p-2 shadow-lg">
                      <p className="font-mono">${Number(payload[0].value).toFixed(2)}</p>
                      <p className="text-xs text-neutral-400">
                        {payload[0].payload.time}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area 
              type="monotone" 
              dataKey="price" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorPrice)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PriceChart;