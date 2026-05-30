// ── Database Layer ──

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON);

const DB = {

  // ── ZONES ──

  async getZones(pair, timeframe) {
    const { data, error } = await db
      .from('zones')
      .select('*')
      .eq('pair', pair)
      .eq('timeframe', timeframe)
      .order('created_at', { ascending: false });
    if (error) { console.error('getZones:', error); return []; }
    return data;
  },

  async addZone(zone) {
    const { data, error } = await db
      .from('zones')
      .insert([zone])
      .select()
      .single();
    if (error) { console.error('addZone:', error); return null; }
    return data;
  },

  async updateZone(id, updates) {
    const { data, error } = await db
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
    const { error } = await db.from('zones').delete().eq('id', id);
    if (error) { console.error('deleteZone:', error); return false; }
    return true;
  },

  // ── COMMENTS / SETUPS ──

  async getComments(zoneId) {
    const { data, error } = await db
      .from('zone_comments')
      .select('*')
      .eq('zone_id', zoneId)
      .order('created_at', { ascending: true });
    if (error) { console.error('getComments:', error); return []; }
    return data;
  },

  async addComment(comment) {
    const { data, error } = await db
      .from('zone_comments')
      .insert([comment])
      .select()
      .single();
    if (error) { console.error('addComment:', error); return null; }
    return data;
  },

  async updateComment(id, updates) {
    const { data, error } = await db
      .from('zone_comments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) { console.error('updateComment:', error); return null; }
    return data;
  },

  async deleteComment(id) {
    const { error } = await db.from('zone_comments').delete().eq('id', id);
    if (error) { console.error('deleteComment:', error); return false; }
    return true;
  },

  // ── PAIR ANALYSIS ──

  async getAnalysis(pair, date) {
    const { data, error } = await db
      .from('pair_analysis')
      .select('*')
      .eq('pair', pair)
      .eq('analysis_date', date)
      .maybeSingle();
    if (error) { console.error('getAnalysis:', error); return null; }
    return data;
  },

  async getAnalysisDates(pair) {
    const { data, error } = await db
      .from('pair_analysis')
      .select('analysis_date')
      .eq('pair', pair)
      .order('analysis_date', { ascending: false });
    if (error) { console.error('getAnalysisDates:', error); return []; }
    return data.map(r => r.analysis_date);
  },

  async saveAnalysis(pair, date, fields) {
    const { data: existing } = await db
      .from('pair_analysis')
      .select('id')
      .eq('pair', pair)
      .eq('analysis_date', date)
      .maybeSingle();

    if (existing) {
      const { data, error } = await db
        .from('pair_analysis')
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) { console.error('saveAnalysis update:', error); return null; }
      return data;
    } else {
      const { data, error } = await db
        .from('pair_analysis')
        .insert([{ pair, analysis_date: date, ...fields }])
        .select()
        .single();
      if (error) { console.error('saveAnalysis insert:', error); return null; }
      return data;
    }
  },

  async deleteAnalysis(id) {
    const { error } = await db.from('pair_analysis').delete().eq('id', id);
    if (error) { console.error('deleteAnalysis:', error); return false; }
    return true;
  },

  // ── DASHBOARD ──

  async getAllSetups() {
    const { data, error } = await db
      .from('zone_comments')
      .select('text, created_at');
    if (error) { console.error('getAllSetups:', error); return []; }
    return data || [];
  },

};
