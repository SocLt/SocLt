// js/activities.js
// ─────────────────────────────────────────────
// Handles fetching, filtering and rendering
// activity cards on index.html
// ─────────────────────────────────────────────

// ── Helpers ─────────────────────────────────

/** Format a YYYY-MM-DD string to a more readable form, e.g. "12 Apr 2025" */
function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('lt-LT', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Extract the city portion from the address field (first comma-separated chunk). */
function extractCity(address) {
  if (!address) return '—';
  return address.split(',')[0].trim();
}

/** Work out whether an activity is active, upcoming or past relative to today. */
function badgeInfo(dateFrom, dateTo) {
  if (!dateFrom || !dateTo) return { label: 'Vyksta šiuo metu', cls: 'badge-active' };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const from = new Date(dateFrom + 'T00:00:00');
  const to   = new Date(dateTo   + 'T00:00:00');
  if (to < today)   return { label: 'Praeityje',     cls: 'badge-past'     };
  if (from > today) return { label: 'Ateityje', cls: 'badge-upcoming' };
  return               { label: 'Vyksta šiuo metu',   cls: 'badge-active'   };
}

/** Minimal HTML escaping to avoid XSS from DB content. */
function escHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Render ───────────────────────────────────

const grid    = document.getElementById('activitiesGrid');
const tmpl    = document.getElementById('activityCardTemplate');
const loading = document.getElementById('loadingState');
const empty   = document.getElementById('emptyState');
const countEl = document.getElementById('resultsCount');

function renderCards(activities) {
  grid.innerHTML = '';
  loading.classList.add('d-none');

  if (!activities || activities.length === 0) {
    empty.classList.remove('d-none');
    countEl.textContent = '';
    return;
  }

  empty.classList.add('d-none');
  //countEl.textContent = `${activities.length} activit${activities.length === 1 ? 'y' : 'ies'} found`;
  countEl.textContent = `Rasta veiklų: ${activities.length}`;
  activities.forEach(act => {
    const { label, cls } = badgeInfo(act.date_from, act.date_to);

    // Only render the date row when both dates are present
    const dateSpan = (act.date_from && act.date_to)
      ? `<span><i class="bi bi-calendar3"></i> ${fmtDate(act.date_from)} – ${fmtDate(act.date_to)}</span>`
      : '';

    // Only render the age row when min_age is set
    const ageSpan = act.min_age != null
      ? `<span><i class="bi bi-person"></i> Amžius ${act.min_age}+</span>`
      : '';

    const html = tmpl.innerHTML
      .replace(/__ID__/g,          act.id)
      .replace(/__IMAGE__/g,       act.image_url || 'images/placeholder.png')
      .replace(/__TITLE__/g,       escHtml(act.title))
      .replace(/__BADGE_CLASS__/g, cls)
      .replace(/__BADGE__/g,       label)
      .replace(/__ORG__/g,         escHtml(act.org_name))
      .replace(/__SHORT_DESC__/g,  escHtml(act.short_desc))
      .replace(/__DATE_SPAN__/g,   dateSpan)
      .replace(/__AGE_SPAN__/g,    ageSpan)
      .replace(/__CITY__/g,        escHtml(extractCity(act.address)));

    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    grid.appendChild(wrapper.firstElementChild);
  });
}

// ── Filter & load ────────────────────────────

async function filterActivities() {
  const search   = document.getElementById('searchInput').value.trim();
  const city     = document.getElementById('cityFilter').value.trim();
  const ageRaw   = document.getElementById('ageFilter').value;
  const dateRaw  = document.getElementById('dateFilter').value;
  const maxAge   = ageRaw  ? parseInt(ageRaw, 10) : null;
  const activeOn = dateRaw || null;

  loading.classList.remove('d-none');
  empty.classList.add('d-none');
  grid.innerHTML = '';
  countEl.textContent = '';

  const { data, error } = await fetchActivities({ search, city, maxAge, activeOn });

  if (error) {
    console.error('Supabase error:', error);
    loading.classList.add('d-none');
    countEl.textContent = 'Klaida bandant parodyti veiklas.';
    return;
  }

  renderCards(data);
}

function resetFilters() {
  document.getElementById('searchInput').value = '';
  document.getElementById('cityFilter').value  = '';
  document.getElementById('ageFilter').value   = '';
  document.getElementById('dateFilter').value  = '';
  filterActivities();
}

window.filterActivities = filterActivities;
window.resetFilters     = resetFilters;

// ── Init ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', filterActivities);
