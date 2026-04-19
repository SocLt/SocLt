// js/submit.js
// ─────────────────────────────────────────────
// Handles the submission form on submit.html
// ─────────────────────────────────────────────

const IMAGE_BUCKET   = 'SocLt_images'; // your Supabase Storage bucket name
const MAX_FILE_BYTES = 5 * 1024 * 1024;   // 5 MB

// ── Image preview ────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('f_image_file').addEventListener('change', function () {
    const file = this.files[0];
    if (!file) { clearImage(); return; }

    if (file.size > MAX_FILE_BYTES) {
      showError('Paveikslėlis turi būti mažesnis nei 5 MB.');
      this.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      document.getElementById('imagePreview').src = e.target.result;
      document.getElementById('imagePreviewWrap').classList.remove('d-none');
    };
    reader.readAsDataURL(file);
    hideError();
  });
});

function clearImage() {
  document.getElementById('f_image_file').value = '';
  document.getElementById('imagePreview').src   = '';
  document.getElementById('imagePreviewWrap').classList.add('d-none');
}

// ── Upload image to Supabase Storage ─────────

async function uploadImage(file) {
  // Unique filename: timestamp-randomhex.ext
  const ext      = file.name.split('.').pop().toLowerCase();
  const filename = `${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;

  const { data, error } = await db.storage
    .from(IMAGE_BUCKET)
    .upload(filename, file, { cacheControl: '3600', upsert: false });

  if (error) throw new Error('Image upload failed: ' + error.message);

  // Get the permanent public URL
  const { data: urlData } = db.storage
    .from(IMAGE_BUCKET)
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

// ── Form helpers ─────────────────────────────

function getVal(id) {
  return document.getElementById(id).value.trim();
}

function showError(msg) {
  const el = document.getElementById('formError');
  el.textContent = msg;
  el.classList.remove('d-none');
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function hideError() {
  document.getElementById('formError').classList.add('d-none');
}

function setLoading(on) {
  document.getElementById('submitBtn').disabled = on;
  document.getElementById('submitBtnText').classList.toggle('d-none', on);
  document.getElementById('submitBtnSpinner').classList.toggle('d-none', !on);
}

// ── Submit ────────────────────────────────────

async function handleSubmit() {
  hideError();

  // Required field validation
  const title      = getVal('f_title');
  const short_desc = getVal('f_short_desc');
  const date_from  = getVal('f_date_from');
  const date_to    = getVal('f_date_to');
  const city       = getVal('f_city');
  const org_name   = getVal('f_org_name');

  if (!title)      { showError('Įveskite pavadinimą.');                         return; }
  if (!short_desc) { showError('Įveskite trumpą aprašymą.');                    return; }
  if (date_from && date_to && date_to < date_from) {
    showError('Pabaigos data turi būti ne ankstesnė už pradžios datą.');
    return;
  }
  if (!city)     { showError('Įveskite miestą.');                               return; }
  if (!org_name) { showError('Įveskite organizacijos pavadinimą.');             return; }

  // Image file check
  const imageFile = document.getElementById('f_image_file').files[0];
  if (imageFile && imageFile.size > MAX_FILE_BYTES) {
    showError('Paveikslėlis turi būti mažesnis nei 5 MB.');
    return;
  }

  setLoading(true);

  // Upload image if provided
  let image_url = null;
  if (imageFile) {
    try {
      image_url = await uploadImage(imageFile);
    } catch (err) {
      console.error(err);
      showError(err.message);
      setLoading(false);
      return;
    }
  }

  // Build address string
  const street = getVal('f_street');
  const house  = getVal('f_house');
  const address = [city, street, house].filter(Boolean).join(', ');

  // Build payload
  const minAgeRaw = getVal('f_min_age');
  const payload = {
    title,
    short_desc,
    long_desc:   getVal('f_long_desc')   || null,
    date_from:   date_from               || null,
    date_to:     date_to                 || null,
    min_age:     minAgeRaw ? parseInt(minAgeRaw, 10) : null,
    image_url,
    address,
    org_name,
    org_email:   getVal('f_org_email')   || null,
    org_phone:   getVal('f_org_phone')   || null,
    org_website: getVal('f_org_website') || null,
  };

  const { error } = await submitActivity(payload);

  setLoading(false);

  if (error) {
    console.error('Submission error:', error);
    showError('Klaida. Bandykite dar kartą. (' + error.message + ')');
    return;
  }

  // Success
  document.getElementById('formWrap').classList.add('d-none');
  document.getElementById('successMsg').classList.remove('d-none');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Reset ─────────────────────────────────────

function resetForm() {
  ['f_title','f_short_desc','f_long_desc','f_date_from','f_date_to',
   'f_min_age','f_city','f_street','f_house',
   'f_org_name','f_org_email','f_org_phone','f_org_website'
  ].forEach(id => { document.getElementById(id).value = ''; });

  clearImage();
  document.getElementById('successMsg').classList.add('d-none');
  document.getElementById('formWrap').classList.remove('d-none');
  hideError();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.handleSubmit = handleSubmit;
window.resetForm    = resetForm;
window.clearImage   = clearImage;
