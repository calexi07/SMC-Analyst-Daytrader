// ── Database Layer ──

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON);

const DB = {

  // ── ZONES ──

  async getZones(pair, timeframe) {
    var { data, error } = await db
      .from('zones')
      .select('*')
      .eq('pair', pair)
      .eq('timeframe', timeframe)
      .order('created_at', { ascending: false });
    if (error) { console.error('getZones:', error); return []; }
    return data;
  },

  // Get all zones marked for TradingView (show_tv = true) for a pair
  async getZonesForPine(pair) {
    var { data, error } = await db
      .from('zones')
      .select('*')
      .eq('pair', pair)
      .eq('show_tv', true)
      .neq('status', 'broken')
      .order('timeframe', { ascending: true })
      .order('created_at', { ascending: false });
    if (error) { console.error('getZonesForPine:', error); return []; }
    return data || [];
  },

  async addZone(zone) {
    var { data, error } = await db
      .from('zones')
      .insert([zone])
      .select()
      .single();
    if (error) { console.error('addZone:', error); return null; }
    return data;
  },

  async updateZone(id, updates) {
    var { data, error } = await db
      .from('zones')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) { console.error('updateZone:', error); return null; }
    return data;
  },

  async deleteZone(id) {
    await db.from('zone_comments').delete().eq('zone_id', id);
    var { error } = await db.from('zones').delete().eq('id', id);
    if (error) { console.error('deleteZone:', error); return false; }
    return true;
  },

  // ── COMMENTS / SETUPS ──

  async getComments(zoneId) {
    var { data, error } = await db
      .from('zone_comments')
      .select('*')
      .eq('zone_id', zoneId)
      .order('created_at', { ascending: true });
    if (error) { console.error('getComments:', error); return []; }
    return data;
  },

  async addComment(comment) {
    var { data, error } = await db
      .from('zone_comments')
      .insert([comment])
      .select()
      .single();
    if (error) { console.error('addComment:', error); return null; }
    return data;
  },

  async updateComment(id, updates) {
    var { data, error } = await db
      .from('zone_comments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) { console.error('updateComment:', error); return null; }
    return data;
  },

  async deleteComment(id) {
    var { error } = await db.from('zone_comments').delete().eq('id', id);
    if (error) { console.error('deleteComment:', error); return false; }
    return true;
  },

  // ── PAIR ANALYSIS ──

  async getAnalysis(pair, date) {
    var { data, error } = await db
      .from('pair_analysis')
      .select('*')
      .eq('pair', pair)
      .eq('analysis_date', date)
      .maybeSingle();
    if (error) { console.error('getAnalysis:', error); return null; }
    return data;
  },

  async getAnalysisDates(pair) {
    var { data, error } = await db
      .from('pair_analysis')
      .select('analysis_date')
      .eq('pair', pair)
      .order('analysis_date', { ascending: false });
    if (error) { console.error('getAnalysisDates:', error); return []; }
    return data.map(function(r) { return r.analysis_date; });
  },

  async saveAnalysis(pair, date, fields) {
    var existing = null;
    var res = await db
      .from('pair_analysis')
      .select('id')
      .eq('pair', pair)
      .eq('analysis_date', date)
      .maybeSingle();
    existing = res.data;

    if (existing) {
      var { data, error } = await db
        .from('pair_analysis')
        .update(Object.assign({}, fields, { updated_at: new Date().toISOString() }))
        .eq('id', existing.id)
        .select()
        .single();
      if (error) { console.error('saveAnalysis update:', error); return null; }
      return data;
    } else {
      var payload = Object.assign({ pair: pair, analysis_date: date }, fields);
      var { data, error } = await db
        .from('pair_analysis')
        .insert([payload])
        .select()
        .single();
      if (error) { console.error('saveAnalysis insert:', error); return null; }
      return data;
    }
  },

  async deleteAnalysis(id) {
    var { error } = await db.from('pair_analysis').delete().eq('id', id);
    if (error) { console.error('deleteAnalysis:', error); return false; }
    return true;
  },

  // ── DASHBOARD ──

  async getAllSetups() {
    var { data, error } = await db
      .from('zone_comments')
      .select('text, created_at');
    if (error) { console.error('getAllSetups:', error); return []; }
    return data || [];
  },

  // ── LIVE PRICES ──

  async getLivePrice(pair, tf) {
    var { data, error } = await db
      .from('live_prices')
      .select('*')
      .eq('pair', pair)
      .eq('tf', tf)
      .maybeSingle();
    if (error) { console.error('getLivePrice:', error); return null; }
    return data;
  },

  async getAllLivePrices(pair) {
    var { data, error } = await db
      .from('live_prices')
      .select('*')
      .eq('pair', pair);
    if (error) { console.error('getAllLivePrices:', error); return []; }
    return data || [];
  },

  // ── PENDING ZONES ──

  async getPendingZones(pair) {
    var { data, error } = await db
      .from('pending_zones')
      .select('*')
      .eq('pair', pair)
      .eq('validated', false)
      .order('created_at', { ascending: false });
    if (error) { console.error('getPendingZones:', error); return []; }
    return data || [];
  },

  async validatePendingZone(pendingId, zoneName, pair, timeframe, direction, top, btm) {
    var zone = await this.addZone({
      pair: pair,
      timeframe: timeframe,
      direction: direction,
      name: zoneName,
      status: 'fresh',
      zone_date: new Date().toISOString().slice(0, 10),
      test_count: 0,
      price_top: top,
      price_btm: btm,
    });
    if (!zone) return null;
    await db.from('pending_zones').update({ validated: true }).eq('id', pendingId);
    return zone;
  },

  async dismissPendingZone(id) {
    await db.from('pending_zones').update({ validated: true }).eq('id', id);
  },

};
