// js/supabase.js
// ─────────────────────────────────────────────
// Supabase client initialisation.
// Replace the two constants below with your
// project URL and anon/public API key.
// ─────────────────────────────────────────────

const SUPABASE_URL  = 'https://jkrhqqcfcbhimlsonkox.supabase.co';
const SUPABASE_ANON = 'sb_publishable_xtdyIBbgRNitw8u2NTKPBQ_3mqfoudu';

// Using the Supabase JS v2 CDN build.
// Add this script tag to every HTML page BEFORE supabase.js:
//   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── Public API ──────────────────────────────
// Only rows with status = 'approved' are shown to visitors.
// Admins work directly in Supabase Studio.

/**
 * Fetch approved activities with optional filters.
 * @param {Object} opts
 * @param {string} [opts.search]   - keyword for title / short_desc / org_name
 * @param {string} [opts.city]     - partial city match inside address field
 * @param {number} [opts.maxAge]   - show activities where min_age <= maxAge
 * @param {string} [opts.activeOn] - ISO date string; activity must span this date
 * @returns {Promise<{data: Array, error: any}>}
 */
async function fetchActivities({ search = '', city = '', maxAge = null, activeOn = null } = {}) {
  let query = db
    .from('Activities')
    .select('id, title, short_desc, date_from, date_to, min_age, address, image_url, org_name')
    .eq('status', 'approved')
    .order('date_from', { ascending: true });

  if (search) {
    // Full-text-style OR across three columns
    query = query.or(
      `title.ilike.%${search}%,short_desc.ilike.%${search}%,org_name.ilike.%${search}%`
    );
  }

  if (city) {
    query = query.ilike('address', `%${city}%`);
  }

  if (maxAge !== null && !isNaN(maxAge)) {
    // Activities whose min_age is null (no restriction) or <= the visitor's value
    query = query.or(`min_age.is.null,min_age.lte.${maxAge}`);
  }

  if (activeOn) {
    // Activity must still be running on the chosen date
    query = query.lte('date_from', activeOn).gte('date_to', activeOn);
  }

  return query;
}

/**
 * Fetch a single activity by id (any status – used for the detail page).
 * @param {number|string} id
 */
async function fetchActivityById(id) {
  return db
    .from('Activities')
    .select('*')
    .eq('id', id)
    .single();
}

/**
 * Insert a new activity submission (status defaults to 'pending' via DB default or explicit set).
 * @param {Object} payload - form data matching the Activities columns
 */
async function submitActivity(payload) {
  return db
    .from('Activities')
    .insert([{ ...payload, status: 'pending' }]);
}
