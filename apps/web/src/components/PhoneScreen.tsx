const PhoneScreen = () => {
  return (
    <div className="w-full text-[10px] leading-tight" style={{ fontFamily: "'DM Sans', sans-serif", background: '#0a0a0a', color: '#e0e0e0' }}>
      {/* Status Bar */}
      <div className="flex justify-between items-center px-4 py-2 text-[9px]" style={{ color: '#888' }}>
        <span style={{ fontFamily: "'Space Mono', monospace" }}>9:41</span>
        <div className="flex gap-1">
          <div className="w-3 h-1.5 rounded-sm" style={{ background: '#555' }} />
          <div className="w-3 h-1.5 rounded-sm" style={{ background: '#555' }} />
          <div className="w-3 h-1.5 rounded-sm" style={{ background: '#555' }} />
        </div>
      </div>

      {/* Nav */}
      <div className="flex justify-between items-center px-4 py-2 border-b" style={{ borderColor: '#1a1a1a' }}>
        <span style={{ color: '#888' }}>←</span>
        <span className="text-[10px] font-medium tracking-wide" style={{ color: '#ccc' }}>Stock Analytics</span>
        <span style={{ color: '#888' }}>⋯</span>
      </div>

      {/* Search / Ticker */}
      <div className="flex justify-between items-center px-4 py-3">
        <div className="flex items-center gap-2">
          <span style={{ color: '#555' }}>⌕</span>
          <div>
            <div className="font-medium text-[11px]" style={{ color: '#fff' }}>TATAMOTORS</div>
            <div className="text-[8px]" style={{ color: '#666' }}>NSE</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] font-medium" style={{ color: '#fff' }}>₹824.50</div>
          <div className="text-[8px]" style={{ color: '#4ade80' }}>▲ 2.4%</div>
        </div>
      </div>

      {/* Holding Period */}
      <div className="px-4 py-2">
        <div className="text-[8px] uppercase tracking-widest mb-2" style={{ color: '#666', fontFamily: "'Space Mono', monospace" }}>Holding Period</div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {['Intraday', 'Short-term', 'Swing', 'Weekly', 'Monthly', 'Long-term'].map((period, i) => (
            <span
              key={period}
              className="shrink-0 px-2 py-1 rounded-full text-[8px]"
              style={{
                background: i === 2 ? '#c8ff00' : '#1a1a1a',
                color: i === 2 ? '#000' : '#888',
                fontWeight: i === 2 ? 600 : 400,
              }}
            >
              {period}
            </span>
          ))}
        </div>
      </div>

      {/* Overall Score */}
      <div className="mx-4 my-2 p-3 rounded-xl flex gap-3 items-center" style={{ background: '#111' }}>
        <div className="relative w-12 h-12 shrink-0">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <circle cx="18" cy="18" r="15" fill="none" stroke="#1a1a1a" strokeWidth="3" />
            <circle cx="18" cy="18" r="15" fill="none" stroke="#c8ff00" strokeWidth="3" strokeDasharray="94.25" strokeDashoffset="29.2" strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[11px] font-bold" style={{ color: '#c8ff00' }}>69</span>
          </div>
        </div>
        <div>
          <div className="text-[8px] uppercase tracking-wider" style={{ color: '#666' }}>Overall Score</div>
          <div className="text-[10px] font-semibold" style={{ color: '#c8ff00' }}>MODERATE</div>
          <div className="text-[7px] mt-0.5" style={{ color: '#666' }}>Mixed signals on Swing period. Strong fundamentals, weak sentiment.</div>
        </div>
      </div>

      {/* 8 Parameter Scores */}
      <div className="px-4 py-2">
        <div className="text-[8px] uppercase tracking-widest mb-2" style={{ color: '#666', fontFamily: "'Space Mono', monospace" }}>8 Parameter Scores</div>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { name: 'Technical', score: 74, delta: '▲ 6', color: '#4ade80', bar: 74 },
            { name: 'Fundamental', score: 81, delta: '▲ 2', color: '#4ade80', bar: 81 },
            { name: 'Sentiment', score: 38, delta: '▼ 11', color: '#f87171', bar: 38 },
            { name: 'External', score: 55, delta: '— 0', color: '#888', bar: 55 },
            { name: 'Volatility', score: 28, delta: '▼ 4', color: '#f87171', bar: 28 },
            { name: 'Liquidity', score: 88, delta: '▲ 1', color: '#4ade80', bar: 88 },
            { name: 'Analyst', score: 76, delta: '— 0', color: '#888', bar: 76 },
            { name: 'Momentum', score: 61, delta: '▲ 3', color: '#4ade80', bar: 61 },
          ].map((p) => (
            <div key={p.name} className="p-2 rounded-lg" style={{ background: '#111' }}>
              <div className="text-[8px] mb-1" style={{ color: '#888' }}>{p.name}</div>
              <div className="w-full h-1 rounded-full mb-1" style={{ background: '#1a1a1a' }}>
                <div className="h-full rounded-full" style={{ width: `${p.bar}%`, background: p.color }} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-semibold" style={{ color: '#fff' }}>{p.score}</span>
                <span className="text-[7px]" style={{ color: p.color }}>{p.delta}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Strategy Score */}
      <div className="mx-4 my-2 p-3 rounded-xl" style={{ background: '#111' }}>
        <div className="flex justify-between items-center mb-2">
          <span className="text-[9px]" style={{ color: '#888' }}>Strategy Score</span>
          <span className="text-[10px] font-semibold" style={{ color: '#c8ff00' }}>62 / 100</span>
        </div>
        {[
          { label: 'Trend strength', value: 72 },
          { label: 'Entry timing', value: 58 },
          { label: 'Risk/reward', value: 44 },
          { label: 'Exit signal', value: 68 },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-2 mb-1">
            <span className="text-[7px] w-16 shrink-0" style={{ color: '#666' }}>{s.label}</span>
            <div className="flex-1 h-1 rounded-full" style={{ background: '#1a1a1a' }}>
              <div className="h-full rounded-full" style={{ width: `${s.value}%`, background: s.value > 60 ? '#4ade80' : s.value > 50 ? '#c8ff00' : '#f87171' }} />
            </div>
            <span className="text-[8px] w-5 text-right" style={{ color: '#ccc' }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Chart Pattern */}
      <div className="mx-4 my-2 p-3 rounded-xl" style={{ background: '#111' }}>
        <div className="text-[8px] uppercase tracking-widest mb-2" style={{ color: '#666', fontFamily: "'Space Mono', monospace" }}>Chart Pattern</div>
        <div className="text-[7px] mb-0.5" style={{ color: '#666' }}>Detected Pattern</div>
        <div className="text-[10px] font-semibold mb-0.5" style={{ color: '#c8ff00' }}>Inverted Hammer</div>
        <div className="text-[7px] mb-2" style={{ color: '#666' }}>Potential bullish reversal. Confirmation on next candle recommended.</div>
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-bold" style={{ color: '#c8ff00' }}>72</span>
          <span className="text-[7px]" style={{ color: '#888' }}>Reliability</span>
        </div>
      </div>

      {/* Price Chart */}
      <div className="mx-4 my-2 p-3 rounded-xl" style={{ background: '#111' }}>
        <div className="flex justify-between items-center mb-2">
          <span className="text-[8px]" style={{ color: '#888' }}>Price Chart — Swing (3H)</span>
          <div className="flex gap-2 text-[7px]">
            <span style={{ color: '#4ade80' }}>Bull</span>
            <span style={{ color: '#f87171' }}>Bear</span>
          </div>
        </div>
        <div className="flex items-end gap-[3px] h-16">
          {[40, 55, 35, 60, 70, 50, 65, 80, 45, 75, 60, 85].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-sm"
              style={{
                height: `${h}%`,
                background: i % 2 === 0 ? '#4ade80' : '#f87171',
                opacity: 0.7,
              }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1 text-[6px]" style={{ color: '#444' }}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Today'].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
      </div>

      {/* Ask AI */}
      <div className="mx-4 my-2 p-3 rounded-xl flex items-center gap-2" style={{ background: '#111', border: '1px solid #1a1a1a' }}>
        <span className="text-[14px]" style={{ color: '#c8ff00' }}>✦</span>
        <div className="flex-1">
          <div className="text-[9px] font-medium" style={{ color: '#ccc' }}>Ask AI about TATAMOTORS</div>
          <div className="text-[7px]" style={{ color: '#666' }}>Filings, scores, strategy — one prompt away</div>
        </div>
        <span style={{ color: '#c8ff00' }}>→</span>
      </div>

      {/* Alert */}
      <div className="mx-4 my-2 py-2 text-center text-[8px] rounded-lg" style={{ border: '1px solid #1a1a1a', color: '#888' }}>
        ◎ Set Alert for this Stock
      </div>

      {/* Bottom Nav */}
      <div className="flex justify-around items-center py-3 mt-2 border-t" style={{ borderColor: '#1a1a1a', background: '#0a0a0a' }}>
        {[
          { icon: '◫', label: 'Portfolio' },
          { icon: '◎', label: 'Analytics' },
          { icon: '≡', label: 'Feed' },
          { icon: '◈', label: 'Ask AI' },
          { icon: '⊘', label: 'Impulse' },
        ].map((item) => (
          <div key={item.label} className="flex flex-col items-center gap-0.5">
            <span className="text-[12px]" style={{ color: item.label === 'Analytics' ? '#c8ff00' : '#555' }}>{item.icon}</span>
            <span className="text-[6px]" style={{ color: item.label === 'Analytics' ? '#c8ff00' : '#555' }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PhoneScreen;
