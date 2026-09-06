const events = []; const totals = new Map(); const maxEvents = 500;
export function recordNetworkOperation(type, details = {}, timestamp = Date.now()) {
  const event = { type, at: timestamp, trigger: details.trigger || '', entityType: details.entityType || '', retried: Boolean(details.retried), coalesced: Boolean(details.coalesced) };
  events.push(event); while (events.length > maxEvents) events.shift(); totals.set(type, (totals.get(type) || 0) + 1); return event;
}
export function networkSnapshot(timestamp = Date.now()) {
  const recent = events.filter((event) => timestamp - event.at <= 60_000); return { totals: Object.fromEntries(totals), last60Seconds: recent.length,
    perMinute: recent.reduce((out, event) => ({ ...out, [event.type]: (out[event.type] || 0) + 1 }), {}), requestRateWarning: recent.length > 20, recent: recent.slice(-20) };
}
export function resetNetworkInstrumentation() { events.length = 0; totals.clear(); }
