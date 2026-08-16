# FINWERSE — INDICATOR MEANING REFERENCE

Plain-language sentences for RSI(14), CCI(30,9) / CCI(60,9), and MACD(12,26,9) value ranges, crossovers, and slope. Purpose: chatbot pulls the matching sentence(s) based on the stock's current indicator state, converts to a conclusion for the user. Internal reference only — never show raw indicator names/numbers to the user unless they ask.

**Freshness definitions used throughout this document, matching the locked crossover decay scoring (candle 1 \= 100 down to candle 10 \= 10, flat after):**

- **Very fresh:** candles 1-2 since crossover  
- **Fresh:** candles 3-4 since crossover  
- **Cooling:** candles 5-7 since crossover  
- **Aging:** candles 8-10 since crossover  
- **Old:** candle 11+ since crossover (score has flattened at its floor)

These candle counts mean different real-world time spans depending on the timeframe — a "very fresh" daily crossover is 1-2 days old, but a "very fresh" monthly crossover is 1-2 months old. Always state the actual time span, not just the candle count, when talking to the user.

---

## RSI (14)

### Zone sentences

**RSI below 30** This stock has fallen fast recently. It is in oversold territory, which often means the price has dropped more than the situation may justify, and a bounce back up is possible. But if the stock is in a strong downtrend, it can stay this weak for a while before recovering.

**RSI 30 to 50** Momentum is on the weaker side but recovering. The stock is not falling as sharply as before, but it hasn't shown strong buying interest yet either.

**RSI 50 to 70** This is a healthy momentum zone. Buying interest is outweighing selling interest, and the stock has room to keep moving up before looking stretched.

**RSI above 70** This stock has risen fast recently. It is in overbought territory, meaning a pause or pullback is possible. But if the stock is in a strong uptrend, it can stay this strong for a while — being overbought doesn't automatically mean it will fall.

### Slope sentences

Slope is measured as the direction RSI has moved over its last 3-5 readings on that timeframe, independent of which zone it's currently in.

**RSI rising steadily** Momentum is building. Buying pressure is increasing candle over candle, which is generally a stronger signal than the zone alone.

**RSI falling steadily** Momentum is fading. Selling pressure is increasing or buying pressure is drying up, even if the price hasn't dropped much yet.

**RSI flat / sideways** Momentum has stalled. Neither buyers nor sellers are gaining ground right now.

**RSI flat near an extreme (flat while above \~70 or below \~30)** The stock's momentum has stalled at an extreme level. This is often the moment to watch closely — a change in direction from here carries more weight than a change from the middle of the range.

**RSI slope reversing (was rising, now turning down, or vice versa) — regardless of zone** This is an early warning sign. The slope often turns before the crossover happens, so this can flag a shift before the "official" crossover signal fires.

### Crossover sentences (RSI crossing its own moving average)

Applies on whichever timeframe RSI is being read — daily, weekly, or monthly.

**RSI crossed above its average, very fresh (1-2 candles ago)** Momentum has just turned positive — within the last 1 to 2 \[days/weeks/months, matching the timeframe\]. This is the freshest possible signal on this timeframe.

**RSI crossed above its average, fresh (3-4 candles ago)** Momentum turned positive recently, within the last 3 to 4 \[days/weeks/months\]. Still an early-stage signal.

**RSI crossed above its average, cooling (5-7 candles ago)** This positive shift happened 5 to 7 \[days/weeks/months\] back. The initial move may be partly played out already.

**RSI crossed above its average, aging (8-10 candles ago)** This positive shift is 8 to 10 \[days/weeks/months\] old. Much of this move is likely already reflected in the price.

**RSI crossed above its average, old (11+ candles ago)** This positive shift happened over 10 \[days/weeks/months\] ago. It is no longer a fresh signal — treat this as background context, not an active trigger.

**RSI crossed below its average** — same freshness bands as above, mirrored for a negative/weakening shift.

**RSI has never crossed its average (no signal)** There's no clear momentum shift happening on this indicator right now. Not a strong signal either way.

---

## CCI (30,9) — used on Daily candles only

### Zone sentences

**CCI below \-100** The stock has fallen sharply and quickly over the last several days. This is a strong downward momentum reading. In a stable or recovering stock, this can also mark an oversold point where buyers may step back in. In a genuinely weak stock, it can mean the fall is still accelerating.

**CCI \-100 to 0** Momentum is negative but not extreme. The stock is drifting weaker rather than falling sharply.

**CCI 0 to 100** Momentum is positive but not extreme. The stock is drifting stronger rather than surging.

**CCI above 100** The stock has risen sharply and quickly over the last several days. This is a strong upward momentum reading. In a trending stock, this often means the move is genuine and may continue. In a stock without a clear trend, it can mean the move is overextended and due for a pause.

**CCI above 200** This is an unusually extreme reading for a daily chart. The stock is moving very fast in one direction over just days. This kind of move is not sustainable indefinitely — either strong continuation or a sharp reversal typically follows within a short period.

### Slope sentences

Slope here is measured over the last 3-5 daily candles.

**CCI rising steadily (daily)** Short-term momentum is accelerating day over day.

**CCI falling steadily (daily)** Short-term momentum is decelerating or reversing day over day, even if CCI hasn't crossed its average yet.

**CCI flattening after an extreme move (daily)** The sharp move that pushed CCI to an extreme is losing steam. This often comes before a pullback or consolidation on the daily chart.

### Crossover sentences (CCI(30,9) crossing its own moving average, daily)

**Very fresh (1-2 trading days ago)** A short-term shift toward \[strength/weakness\] has just happened, within the last 1-2 trading days. This is the freshest possible daily signal.

**Fresh (3-4 trading days ago)** This shift happened within the last 3-4 trading days. Still early-stage on the daily timeframe.

**Cooling (5-7 trading days ago)** This shift is 5 to 7 trading days old. On the daily timeframe, signals age quickly — this one is starting to lose relevance.

**Aging (8-10 trading days ago)** This shift is 8 to 10 trading days old. Largely already reflected in the price by now.

**Old (11+ trading days ago)** This shift happened over two trading weeks ago. Treat as background context only, not an active signal.

**CCI has never crossed its average (no signal)** No clear short-term momentum shift on the daily chart right now.

---

## CCI (60,9) — used on Weekly and Monthly candles

### Zone sentences

Same interpretation as CCI(30,9) above, but because this is measured over weeks or months, each reading represents a much larger and slower-forming move than the daily version.

**CCI(60) below \-100 on Weekly or Monthly** The stock has been in a sustained decline over weeks or months. This is a significant, slow-forming weak phase, not a short-term dip.

**CCI(60) \-100 to 0** The medium-to-long-term trend is soft. Not a sharp decline, but not showing strength either.

**CCI(60) 0 to 100** The medium-to-long-term trend is constructive. The stock has been gradually building strength.

**CCI(60) above 100 on Weekly or Monthly** The stock has been in a sustained upward move over weeks or months. This is a meaningful, longer-forming strong phase — historically the kind of setup associated with genuine, multi-week or multi-month trends rather than short-lived spikes.

### Slope sentences

Slope here is measured over the last 3-5 weekly or monthly candles, so it reflects a change unfolding over a meaningfully longer span than the daily slope above.

**CCI(60) rising steadily (weekly/monthly)** The medium-to-long-term trend is strengthening, candle over candle on this slower timeframe. Because this builds up over weeks or months, a steady rise here is a more durable signal than the same reading on a daily chart.

**CCI(60) falling steadily (weekly/monthly)** The medium-to-long-term trend is weakening steadily. This kind of slow deterioration over weeks or months tends to be harder to reverse quickly.

**CCI(60) flattening after an extreme move (weekly/monthly)** A sustained multi-week or multi-month move is losing steam. Worth watching for a longer-term shift, not just a short pause.

### Crossover sentences (CCI(60,9) crossing its own moving average — Weekly/Monthly)

On the **Weekly** chart, one candle \= one week. On the **Monthly** chart, one candle \= one month.

**Very fresh (1-2 candles ago — i.e. 1-2 weeks, or 1-2 months)** This is a significant, very fresh shift on a longer timeframe — within the last 1-2 \[weeks/months\]. Because this timeframe moves slowly, a signal this fresh carries real weight; it typically means a new, longer-lasting move may just be beginning.

**Fresh (3-4 candles ago — i.e. 3-4 weeks, or 3-4 months)** This longer-term shift happened within the last 3-4 \[weeks/months\]. Still early in what could be a sustained move.

**Cooling (5-7 candles ago — i.e. 5-7 weeks, or 5-7 months)** This shift happened 5 to 7 \[weeks/months\] back. The move may be maturing — worth checking how extended the stock has become since then.

**Aging (8-10 candles ago — i.e. 8-10 weeks, or 8-10 months)** This shift is 8 to 10 \[weeks/months\] old. On this timeframe that is still meaningful context, but the strongest part of the move is likely behind it.

**Old (11+ candles ago — i.e. over 10 weeks, or over 10 months)** This shift happened more than 10 \[weeks/months\] ago. Even on a slow timeframe, this is no longer a fresh trigger — treat as established background trend, not new information.

**CCI(60) has never crossed its average (no signal)** No clear longer-term momentum shift on this timeframe right now.

---

## MACD (12,26,9)

### Line-vs-signal crossover sentences

Freshness bands apply on whichever timeframe MACD is being read (daily \= days, weekly \= weeks, monthly \= months per candle).

**Very fresh (1-2 candles ago)** The stock's momentum has just turned \[positive/negative\] on this timeframe, within the last 1-2 \[days/weeks/months\]. This is one of the more closely watched shifts in momentum, since it reflects a genuine change in the balance between recent and slightly older price trends.

**Fresh (3-4 candles ago)** This momentum shift happened within the last 3-4 \[days/weeks/months\]. Still an early-stage MACD signal.

**Cooling (5-7 candles ago)** This shift is 5 to 7 \[days/weeks/months\] old. MACD reacts a little slower than RSI or CCI to begin with, so this is still moderately relevant, but the initial move has likely partly played out.

**Aging (8-10 candles ago)** This shift is 8 to 10 \[days/weeks/months\] old. The strongest part of the move is probably already behind it.

**Old (11+ candles ago)** This shift happened over 10 \[days/weeks/months\] ago. Treat as an established trend rather than a new signal.

**MACD has never crossed its signal line (no signal)** No clear momentum shift on this indicator right now.

### Zero-line sentences

**MACD line above zero** The stock's shorter-term trend is running above its longer-term trend — a sign the overall direction has been positive recently.

**MACD line below zero** The stock's shorter-term trend is running below its longer-term trend — a sign the overall direction has been negative recently.

### Slope sentences (MACD line's own direction, independent of the crossover)

Measured over the last 3-5 candles on that timeframe.

**MACD line rising (getting more positive, or less negative)** The gap between the stock's shorter-term and longer-term trend is widening in a positive direction. Momentum is building even before or after a crossover.

**MACD line falling (getting more negative, or less positive)** The gap is widening in a negative direction. Momentum is weakening.

**MACD line flattening** The shorter-term and longer-term trends are converging, meaning momentum is stalling. This often happens just before a crossover.

### Histogram sentences (momentum acceleration — distinct from and complementary to the MACD line's own slope above)

**Histogram growing (bars getting bigger in the direction of the crossover)** Momentum is accelerating. The move looks like it's gaining strength, not just holding steady.

**Histogram shrinking (bars getting smaller)** Momentum is fading, even though the crossover direction hasn't flipped yet. This is often an early warning that a stock's current move may be running out of steam before the trend actually reverses. This tends to show up before the MACD line's own slope changes, making it the earliest of the three MACD-based warning signs (histogram, then MACD line slope, then the crossover itself).

---

## MULTI-TIMEFRAME ALIGNMENT SENTENCES

Used when combining Monthly, Weekly, and Daily readings of the same indicator for a stock. When describing alignment, always state each timeframe's own freshness too — "all three agree" means something different if all three are very fresh versus if the monthly signal is old and only the daily is fresh.

**All three timeframes agree (e.g., Monthly, Weekly, and Daily all showing positive momentum)** This stock is showing strength across short, medium, and long-term views. When all these timeframes line up, it is historically considered one of the more reliable setups because the bigger trend and the immediate move are both pointing the same way.

**Higher timeframe positive, lower timeframe negative (e.g., Monthly bullish, Daily bearish)** The bigger picture for this stock is still positive, but it is going through a short-term pullback. This kind of dip is often just a pause within a larger positive trend, not necessarily a reversal — though it's worth watching to see if the bigger trend holds.

**Higher timeframe negative, lower timeframe positive (e.g., Monthly bearish, Daily bullish)** The bigger picture for this stock is still weak, but it's showing a short-term bounce. This kind of bounce can fade quickly if the larger downward trend is still in control.

**All three timeframes disagree with no clear pattern** There's no consistent momentum story across timeframes right now for this stock. Signals are mixed, which generally means lower confidence either way.

---

## REGIME CONTEXT SENTENCES (used to qualify any of the above)

**When the stock has been trending strongly (up or down) recently** In a stock that's clearly trending, momentum readings like "overbought" or "oversold" are less about an upcoming reversal and more about confirming the trend is intact. Strong trends can keep pushing these readings to extremes for a while.

**When the stock has been moving sideways / range-bound recently** In a stock that's been range-bound, momentum readings like "overbought" or "oversold" tend to be more reliable as turning points, since there's no strong trend to override them.

---

## STANDING RULES FOR HOW THIS DOCUMENT IS USED

1. Never show the user raw indicator names, numbers, or these exact sentences verbatim as a wall of text. These are backend reasoning material the LLM uses to construct one natural, conclusion-first response.  
2. Always hedge. Use "often," "historically," "tends to," "can mean" — never "will" or "is definitely."  
3. Always translate candle counts into real time spans matching the actual timeframe (days for Daily, weeks for Weekly, months for Monthly) — never say "candles" to the user.  
4. Combine relevant sentences (zone \+ slope \+ crossover freshness \+ regime context \+ multi-timeframe alignment where applicable) into one coherent paragraph in the model's own words, not a stitched-together list of these exact lines.  
5. Never translate any of this into "buy" or "sell." Conclusions stay descriptive of what is happening and what it has historically tended to mean, not what the user should do — except where explicitly permitted per feature (e.g., the Portfolio Health bottleneck AI report, which is allowed to use hold/sell framing per that feature's specific rule).  
6. When CCI(30) \[daily\] and CCI(60) \[weekly/monthly\] disagree, mention both explicitly rather than picking one — the disagreement itself is meaningful information for the user.  
7. When the MACD histogram, MACD line slope, and the crossover itself disagree (e.g., histogram shrinking while crossover is still fresh-positive), surface this as an early-warning nuance rather than treating the crossover as the final word.

