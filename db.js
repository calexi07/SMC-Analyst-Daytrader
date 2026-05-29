// ── Database Layer ──
// All Supabase interactions go here. No UI logic.

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
    // Also delete comments
    await db.from('zone_comments').delete().eq('zone_id', id);
    const { error } = await db.from('zones').delete().eq('id', id);
    if (error) { console.error('deleteZone:', error); return false; }
    return true;
  },

  // ── COMMENTS ──

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

  async deleteComment(id) {
    const { error } = await db.from('zone_comments').delete().eq('id', id);
    if (error) { console.error('deleteComment:', error); return false; }
    return true;
  },

  // ── STORAGE (images) ──

  async uploadImage(file) {
    const ext  = file.name.split('.').pop();
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { data, error } = await db.storage
      .from('zone-images')
      .upload(name, file, { cacheControl: '3600', upsert: false });
    if (error) { console.error('uploadImage:', error); return null; }
    const { data: urlData } = db.storage.from('zone-images').getPublicUrl(name);
    return urlData.publicUrl;
  },

};
