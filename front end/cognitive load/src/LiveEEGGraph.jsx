import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

function LiveEEGGraph({ data }) {
  // Transform data for Recharts
  const chartData = data.timestamps.map((time, idx) => ({
    time: time.toFixed(2),
    TP9: data.channels.TP9[idx],
    AF7: data.channels.AF7[idx],
    AF8: data.channels.AF8[idx],
    TP10: data.channels.TP10[idx]
  }));

  return (
    <div className="bg-white/5 rounded-xl p-6 border border-white/10">
      <h3 className="text-xl font-semibold text-white mb-4">
        Live EEG Waves
        <span className="ml-4 text-sm bg-green-500 px-3 py-1 rounded-full">
          ● LIVE
        </span>
      </h3>
      
      <LineChart width={800} height={300} data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis 
          dataKey="time" 
          label={{ value: 'Time (s)', position: 'insideBottom', offset: -5 }}
          stroke="#9CA3AF"
        />
        <YAxis 
          label={{ value: 'Amplitude (μV)', angle: -90, position: 'insideLeft' }}
          stroke="#9CA3AF"
        />
        <Tooltip 
          contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
          labelStyle={{ color: '#F3F4F6' }}
        />
        <Legend />
        
        {/* EEG Channels */}
        <Line type="monotone" dataKey="TP9" stroke="#EF4444" dot={false} strokeWidth={2} />
        <Line type="monotone" dataKey="AF7" stroke="#3B82F6" dot={false} strokeWidth={2} />
        <Line type="monotone" dataKey="AF8" stroke="#10B981" dot={false} strokeWidth={2} />
        <Line type="monotone" dataKey="TP10" stroke="#F59E0B" dot={false} strokeWidth={2} />
      </LineChart>
    </div>
  );
}