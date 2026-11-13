/* =====================================================================
   WebCraft Agency — Demo Interaktif (100% di browser)
   Tidak butuh PHP, Docker, database, atau jaringan apa pun.
   Data disimpan di localStorage. Semua kredensial di sini adalah data
   contoh/simulasi, bukan kredensial asli.
   ===================================================================== */
'use strict';

/* ------------------------------------------------------------------ */
/* 1. Data statis                                                      */
/* ------------------------------------------------------------------ */

const PACKAGES = [
  {
    slug: 'landing-page-umkm', name: 'Landing Page UMKM', price: 750000, days: 3, quota: 2,
    icon: 'rocket-outline', badge: 'HEMAT', desc: 'Satu halaman promosi yang cepat, modern, dan siap pakai untuk usaha baru.',
    features: ['1 halaman beranda interaktif', 'Desain modern & mobile-friendly', 'Formulir kontak ke WhatsApp', 'Domain .com tahun pertama', 'Hosting NVMe SSD kecepatan tinggi', 'Setup Search Console & SEO dasar'],
  },
  {
    slug: 'company-profile-pro', name: 'Company Profile Pro', price: 1500000, days: 7, quota: 3,
    icon: 'business-outline', badge: 'POPULER', desc: 'Website profil perusahaan profesional dengan CMS agar konten bisa diubah sendiri.',
    features: ['Hingga 5 halaman dinamis', 'CMS admin panel mandiri', 'Desain eksklusif brand identity', 'Google Maps & live chat', 'Email bisnis profesional', 'Optimasi PageSpeed skor 90+'],
  },
  {
    slug: 'e-commerce-store', name: 'E-Commerce Store', price: 2500000, days: 14, quota: 4,
    icon: 'cart-outline', badge: 'TERBAIK', desc: 'Toko online lengkap dengan pembayaran otomatis dan manajemen stok.',
    features: ['Katalog produk & keranjang tanpa batas', 'Payment gateway (VA, QRIS, e-wallet)', 'Kalkulator ongkir JNE, J&T, SiCepat', 'Manajemen stok & laporan penjualan', 'Notifikasi pesanan via WhatsApp', 'Kupon diskon & flash sale'],
  },
  {
    slug: 'custom-web-application', name: 'Custom Web Application', price: 5000000, days: 21, quota: 5,
    icon: 'code-slash-outline', badge: 'ENTERPRISE', desc: 'Aplikasi web khusus sesuai proses bisnis, multi-role, dan integrasi sistem.',
    features: ['Arsitektur backend kustom', 'Dashboard multi-role & RBAC', 'Integrasi API pihak ketiga & webhook', 'Database teroptimasi', 'Deployment containerisasi', 'Garansi & SLA bug-fix 90 hari'],
  },
];

const ADDONS = {
  addon_domain_com: { name: 'Domain .com (1 Tahun)', price: 165000, days: 0 },
  addon_domain_id: { name: 'Domain .id Resmi PANDI (1 Tahun)', price: 250000, days: 1 },
  addon_hosting_nvme: { name: 'Upgrade Hosting NVMe SSD 10GB + Cloudflare Pro', price: 350000, days: 0 },
  addon_payment_gateway: { name: 'Integrasi Payment Gateway Otomatis (VA & QRIS)', price: 450000, days: 2 },
  addon_multilingual: { name: 'Fitur Multi-Bahasa (Bilingual ID & EN)', price: 500000, days: 2 },
  addon_content_upload: { name: 'Input Produk / Artikel Massal (Hingga 50 Item)', price: 350000, days: 2 },
  addon_seo_setup: { name: 'Advanced Technical SEO & Schema Markup', price: 400000, days: 2 },
};

const STAGES = [
  { n: 1, title: 'Review Brief & Sitemap', desc: 'Klien mengisi brief, aset logo, palet warna, dan referensi.' },
  { n: 2, title: 'Desain UI/UX & Wireframing', desc: 'Perancangan tata letak antarmuka dan prototipe.' },
  { n: 3, title: 'Slicing Kode & Backend', desc: 'Implementasi desain ke kode, database, dan logika sistem.' },
  { n: 4, title: 'Server Staging & Evaluasi', desc: 'Peninjauan di server staging serta tiket revisi.' },
  { n: 5, title: 'Pelunasan & Handover', desc: 'Pelunasan Termin 2, unlock vault kredensial, dan BAST.' },
];

const ROLE_META = {
  admin:     { label: 'Super Admin',     icon: 'shield-checkmark-outline', color: 'purple',  email: 'admin@webcraft.id',   password: 'admin123' },
  pm:        { label: 'Project Manager', icon: 'people-outline',           color: 'blue',    email: 'pm@webcraft.id',      password: 'pm123456' },
  developer: { label: 'Developer',       icon: 'code-slash-outline',       color: 'emerald', email: 'dev@webcraft.id',     password: 'dev123456' },
  finance:   { label: 'Finance',         icon: 'cash-outline',             color: 'amber',   email: 'finance@webcraft.id', password: 'finance123' },
  client:    { label: 'Klien',           icon: 'briefcase-outline',        color: 'indigo',  email: 'klien@webcraft.id',   password: 'klien123' },
};

const STORE_KEY = 'webcraft_demo_v3';

/* ------------------------------------------------------------------ */
/* 2. Utilitas                                                         */
/* ------------------------------------------------------------------ */

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rp = (n) => 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID');
const uid = (p) => p + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (d, n) => { const t = new Date(d + 'T00:00:00'); t.setDate(t.getDate() + n); return t.toISOString().slice(0, 10); };
const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(String(d).length === 10 ? d + 'T00:00:00' : d);
  return dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};
const nowStamp = () => new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

/* Simulasi enkripsi "AES-256": bukan kriptografi nyata, hanya agar alur
   gated-release bisa diperagakan. Di aplikasi Laravel asli memakai
   Crypt::encryptString() dengan cipher AES-256-CBC. */
const simEncrypt = (plain) => 'aes256:' + btoa(unescape(encodeURIComponent(String(plain))).split('').reverse().join(''));
const simDecrypt = (cipher) => {
  try {
    const body = String(cipher).replace(/^aes256:/, '');
    const rev = decodeURIComponent(escape(atob(body)));
    return rev.split('').reverse().join('');
  } catch { return '••••••'; }
};

function toast(message, type = 'info') {
  const el = document.getElementById('toast');
  if (!el) return;
  const icons = { success: 'checkmark-circle', danger: 'alert-circle-outline', info: 'information-circle-outline' };
  el.innerHTML = '<span class="inline-flex items-center gap-2"><ion-icon class="text-lg ' +
    (type === 'success' ? 'text-emerald-400' : type === 'danger' ? 'text-rose-400' : 'text-brand-300') +
    '" name="' + (icons[type] || icons.info) + '"></ion-icon>' + esc(message) + '</span>';
  el.classList.remove('opacity-0');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.add('opacity-0'), 3200);
}

/* ------------------------------------------------------------------ */
/* 3. Store (localStorage)                                             */
/* ------------------------------------------------------------------ */

let state = null;

function seedState() {
  const users = Object.entries(ROLE_META).map(([role, m], i) => ({
    id: 'u' + (i + 1), name: {
      admin: 'MaoneArt Super Admin', pm: 'Budi Santoso (Lead PM)', developer: 'Rian Hidayat (Fullstack Dev)',
      finance: 'Siti Rahma (Finance Officer)', client: 'Hendra Pratama',
    }[role], email: m.email, password: m.password, role, phone: '08128888' + String(i + 1).padStart(4, '0'),
  }));

  const client = {
    id: 'c1', userId: 'u5', company: 'PT Kopi Nusantara Raya', sector: 'F&B & Retail Kafe',
    wa: '081234567890', address: 'Jl. Senopati No. 42, Kebayoran Baru, Jakarta Selatan',
  };

  const pkg = PACKAGES[1];
  const addonIds = ['addon_domain_com', 'addon_seo_setup'];
  const total = pkg.price + addonIds.reduce((s, a) => s + ADDONS[a].price, 0);

  const order = {
    id: 'o1', number: 'ORD-2026-0001', clientId: 'c1', packageSlug: pkg.slug, addonIds,
    total, status: 'STAGING_REVIEW', revisionsUsed: 1, assignedPm: 'u2', assignedDev: 'u3',
    createdAt: '2026-10-17', startDate: '2026-10-18', targetDate: addDays('2026-10-18', pkg.days + 2),
    clientName: 'Hendra Pratama', clientEmail: 'klien@webcraft.id', companyName: 'PT Kopi Nusantara Raya',
  };

  const milestones = STAGES.map((s) => ({
    id: 'm' + s.n, orderId: 'o1', stage: s.n, title: s.title,
    status: s.n <= 3 ? 'APPROVED' : s.n === 4 ? 'ACTIVE' : 'LOCKED',
    approvedAt: s.n <= 3 ? '2026-10-' + (20 + s.n) + ' 10:1' + s.n + ':00' : null,
    approvedIp: s.n <= 3 ? '103.28.14.' + (20 + s.n) : null,
    stagingUrl: s.n === 4 ? 'https://staging.webcraft-demo.id' : null,
  }));

  const invoices = [
    { id: 'i1', number: 'INV-202610-0001', orderId: 'o1', term: 'TERM_1_DP', amount: Math.round(total / 2), dueDate: '2026-10-24', status: 'PAID', paidAt: '2026-10-18 09:12:00' },
    { id: 'i2', number: 'INV-202610-0002', orderId: 'o1', term: 'TERM_2_SETTLEMENT', amount: total - Math.round(total / 2), dueDate: addDays('2026-10-10', 14), status: 'UNPAID', paidAt: null },
  ];

  const vaults = [
    { id: 'v1', orderId: 'o1', label: 'cPanel Hosting', url: 'https://cpanel.webcraft-demo.id', username: 'kopinusantara', cipher: simEncrypt('Demo#Cpanel2026'), unlocked: false },
    { id: 'v2', orderId: 'o1', label: 'WP-Admin', url: 'https://kopinusantara.webcraft-demo.id/wp-admin', username: 'admin_kopi', cipher: simEncrypt('Demo#WpAdmin2026'), unlocked: false },
  ];

  return {
    v: 3,
    session: null,
    users, clients: [client], orders: [order],
    briefs: [{
      id: 'b1', orderId: 'o1', brand: 'Kopi Nusantara', tagline: 'Kopi lokal, rasa dunia.',
      palette: '#4f46e5, #f59e0b, #111827', audience: 'Karyawan kantor 22–40 tahun di Jakarta',
      references: 'bluebottlecoffee.com, kopiniken.id', notes: 'Perlu halaman menu kopi & lokasi cabang.',
      status: 'ACCEPTED', feedback: 'Brief lengkap. Lanjut ke fase desain.', reviewedAt: '2026-10-21 11:02:00',
    }],
    milestones,
    revisions: [{
      id: 'r1', orderId: 'o1', milestoneId: 'm4', ticket: 'REV-2026-0001',
      issue: 'Bagian footer terpotong di layar 360px dan nomor WhatsApp belum bisa diklik.',
      targetUrl: 'https://staging.webcraft-demo.id/#kontak', status: 'resolved',
      response: 'Sudah diperbaiki: padding footer disesuaikan, link wa.me aktif.', paid: false, createdAt: '2026-10-27 15:30:00',
    }],
    invoices,
    payments: [{ id: 'p1', invoiceId: 'i1', channel: 'VA_BCA', ref: 'BCA-' + Math.floor(Math.random() * 1e8), amount: Math.round(total / 2), paidAt: '2026-10-18 09:12:00', status: 'success' }],
    vaults,
    logs: [
      { id: 'l1', orderId: 'o1', title: 'Domain .com (1 tahun)', amount: 165000, category: 'domain', vendor: 'Cloudflare Registrar', date: '2026-10-18', note: 'Perpanjangan otomatis' },
      { id: 'l2', orderId: 'o1', title: 'Hosting NVMe 10GB (1 tahun)', amount: 480000, category: 'hosting', vendor: 'Jagoan Hosting', date: '2026-10-18', note: 'Paket tahunan' },
    ],
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.v === 3) return parsed;
    }
  } catch { /* data rusak → buat ulang */ }
  const fresh = seedState();
  try { localStorage.setItem(STORE_KEY, JSON.stringify(fresh)); } catch { /* mode privat */ }
  return fresh;
}

function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { toast('Penyimpanan browser penuh / diblokir.', 'danger'); }
}

/* ------------------------------------------------------------------ */
/* 4. Selector & helper domain                                         */
/* ------------------------------------------------------------------ */

const currentUser = () => state.users.find((u) => u.id === state.session) || null;
const pkgOf = (slug) => PACKAGES.find((p) => p.slug === slug) || PACKAGES[0];
const orderById = (id) => state.orders.find((o) => o.id === id);
const clientOf = (order) => state.clients.find((c) => c.id === order.clientId);
const milestonesOf = (orderId) => state.milestones.filter((m) => m.orderId === orderId).sort((a, b) => a.stage - b.stage);
const invoicesOf = (orderId) => state.invoices.filter((i) => i.orderId === orderId);
const vaultsOf = (orderId) => state.vaults.filter((v) => v.orderId === orderId);
const revisionsOf = (orderId) => state.revisions.filter((r) => r.orderId === orderId);
const briefOf = (orderId) => state.briefs.find((b) => b.orderId === orderId);
const term2Paid = (orderId) => invoicesOf(orderId).some((i) => i.term === 'TERM_2_SETTLEMENT' && i.status === 'PAID');
const allStagesDone = (orderId) => milestonesOf(orderId).filter((m) => m.status === 'APPROVED').length >= 5;

function statusMeta(order) {
  const map = {
    WAITING_DP: ['Menunggu DP', 'amber'],
    BRIEF_PHASE: ['Fase Brief', 'blue'],
    IN_PROGRESS: ['Dikerjakan', 'indigo'],
    STAGING_REVIEW: ['Review Staging', 'emerald'],
    COMPLETED: ['Selesai', 'emerald'],
    CANCELLED: ['Dibatalkan', 'rose'],
  };
  const [label, color] = map[order.status] || ['—', 'slate'];
  return { label, color };
}

const badge = (text, tone = 'slate') => {
  const tones = {
    slate: 'bg-white/5 text-slate-300 border-white/10',
    amber: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
    blue: 'bg-blue-500/15 text-blue-300 border-blue-500/25',
    indigo: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/25',
    emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
    rose: 'bg-rose-500/15 text-rose-300 border-rose-500/25',
    purple: 'bg-purple-500/15 text-purple-300 border-purple-500/25',
  };
  return '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold ' + (tones[tone] || tones.slate) + '">' + esc(text) + '</span>';
};

const card = (body, extra = '') => '<section class="glass-panel rounded-2xl p-5 sm:p-6 border border-white/10 ' + extra + '">' + body + '</section>';
const h2 = (text, sub = '') => '<div class="mb-4"><h2 class="text-lg font-bold text-white">' + esc(text) + '</h2>' + (sub ? '<p class="text-xs text-slate-400 mt-1">' + sub + '</p>' : '') + '</div>';

const btnPrimary = (label, attrs, icon = 'arrow-forward') =>
  '<button ' + attrs + ' class="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold shadow-lg shadow-brand-500/20 transition"><span>' + esc(label) + '</span><ion-icon name="' + icon + '"></ion-icon></button>';
const btnGhost = (label, attrs, icon = '') =>
  '<button ' + attrs + ' class="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-sm font-semibold border border-white/10 transition">' + (icon ? '<ion-icon name="' + icon + '"></ion-icon>' : '') + '<span>' + esc(label) + '</span></button>';

const input = (label, name, opts = {}) =>
  '<label class="block"><span class="block text-xs font-semibold text-slate-300 mb-1.5">' + esc(label) + '</span>' +
  '<input name="' + esc(name) + '" type="' + (opts.type || 'text') + '"' +
  (opts.value ? ' value="' + esc(opts.value) + '"' : '') +
  (opts.placeholder ? ' placeholder="' + esc(opts.placeholder) + '"' : '') +
  (opts.required ? ' required' : '') +
  (opts.min ? ' min="' + esc(opts.min) + '"' : '') +
  ' class="w-full rounded-xl glass-input px-3.5 py-2.5 text-sm placeholder:text-slate-500"></label>';

const textarea = (label, name, opts = {}) =>
  '<label class="block"><span class="block text-xs font-semibold text-slate-300 mb-1.5">' + esc(label) + '</span>' +
  '<textarea name="' + esc(name) + '" rows="' + (opts.rows || 3) + '"' + (opts.required ? ' required' : '') +
  ' class="w-full rounded-xl glass-input px-3.5 py-2.5 text-sm placeholder:text-slate-500"' +
  (opts.placeholder ? ' placeholder="' + esc(opts.placeholder) + '"' : '') + '>' + esc(opts.value || '') + '</textarea></label>';

/* ------------------------------------------------------------------ */
/* 5. Modal konfirmasi (MaoneArt style)                                */
/* ------------------------------------------------------------------ */

function confirmModal({ title, message, confirmText = 'Lanjutkan', cancelText = 'Batal', danger = false, onConfirm }) {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4';
  overlay.innerHTML =
    '<div class="w-full max-w-md rounded-2xl glass-panel p-6 border border-white/10 shadow-2xl">' +
      '<div class="flex items-start gap-4">' +
        '<div class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ' +
          (danger ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-brand-500/20 text-brand-300 border border-brand-500/30') + '">' +
          '<ion-icon name="' + (danger ? 'warning-outline' : 'shield-checkmark-outline') + '"></ion-icon></div>' +
        '<div class="flex-grow"><h3 class="text-lg font-bold text-white mb-1">' + esc(title) + '</h3>' +
          '<p class="text-sm text-slate-300 leading-relaxed">' + message + '</p></div>' +
      '</div>' +
      '<div class="grid grid-cols-2 gap-3 w-full mt-6">' +
        '<button data-cancel type="button" class="w-full py-2.5 px-4 rounded-xl text-sm font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition">' + esc(cancelText) + '</button>' +
        '<button data-ok type="button" class="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white transition ' +
          (danger ? 'bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-500/25' : 'bg-brand-600 hover:bg-brand-500 shadow-lg shadow-brand-500/25') + '">' + esc(confirmText) + '</button>' +
      '</div></div>';
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('[data-cancel]').onclick = close;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('[data-ok]').onclick = () => { close(); onConfirm && onConfirm(); };
}

/* ------------------------------------------------------------------ */
/* 6. Layout & navigasi                                                */
/* ------------------------------------------------------------------ */

function navItems() {
  const user = currentUser();
  if (!user) return [];
  const items = [{ href: '#/', label: 'Ruang Kerja', icon: 'grid-outline' }];
  if (user.role === 'client') items.push({ href: '#/checkout', label: 'Pesan Baru', icon: 'add-circle-outline' });
  items.push({ href: '#/dashboard', label: 'Dashboard ' + ROLE_META[user.role].label, icon: ROLE_META[user.role].icon });
  return items;
}

function paintChrome() {
  const nav = document.getElementById('navLinks');
  const chip = document.getElementById('userChip');
  const user = currentUser();
  const current = location.hash || '#/';

  nav.innerHTML = navItems().map((i) =>
    '<a href="' + i.href + '" class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ' +
    (current === i.href ? 'bg-brand-500/15 text-brand-200' : 'text-slate-300 hover:text-white hover:bg-white/5') +
    ' transition"><ion-icon name="' + i.icon + '" class="text-base"></ion-icon><span>' + esc(i.label) + '</span></a>'
  ).join('');

  if (!user) {
    chip.className = 'flex items-center gap-2';
    chip.innerHTML = '<a href="#/login" class="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition"><ion-icon name="log-in-outline"></ion-icon><span>Masuk</span></a>';
    return;
  }

  const m = ROLE_META[user.role];
  chip.className = 'flex items-center gap-2';
  chip.innerHTML =
    '<span class="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-200">' +
      '<ion-icon name="' + m.icon + '" class="text-base text-brand-300"></ion-icon>' + esc(m.label) + '</span>' +
    '<button data-act="logout" class="p-2 rounded-lg text-slate-300 hover:text-rose-300 hover:bg-rose-500/10 transition" title="Keluar"><ion-icon name="log-out-outline" class="text-lg"></ion-icon></button>';
}

/* ------------------------------------------------------------------ */
/* 7. Halaman: Login                                                   */
/* ------------------------------------------------------------------ */

function pageLogin() {
  const order = state.orders[0];
  const demoOrder = order
    ? '<div class="mt-6 rounded-xl bg-brand-500/10 border border-brand-500/25 p-4 text-xs text-slate-300 leading-relaxed">' +
      '<strong class="text-brand-200">Sudah ada proyek contoh:</strong> ' + esc(order.number) + ' — ' + esc(pkgOf(order.packageSlug).name) +
      ' untuk ' + esc(clientOf(order).company) + '. Masuk sebagai <em>Klien</em> atau <em>Developer</em> untuk melihat prosesnya.</div>'
    : '';

  return '<div class="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">' +
    card(
      '<div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/15 text-brand-200 text-xs font-semibold mb-4"><ion-icon name="flask-outline"></ion-icon><span>Demo tanpa server</span></div>' +
      '<h1 class="text-2xl font-extrabold text-white">Masuk ke ruang kerja demo</h1>' +
      '<p class="text-sm text-slate-300 mt-2 leading-relaxed">Pilih salah satu peran di samping untuk mencoba alur lengkap: brief, invoice, milestone, vault AES-256, sampai cetak BAST.</p>' +
      '<form data-form="login" class="mt-6 space-y-3">' +
        input('Email', 'email', { type: 'email', value: 'klien@webcraft.id', required: true }) +
        input('Password', 'password', { type: 'password', value: 'klien123', required: true }) +
        btnPrimary('Masuk', 'type="submit"') +
      '</form>' + demoOrder +
      '<p class="text-[11px] text-slate-500 mt-4">Data hanya tersimpan di browser Anda. Tidak ada kredensial asli di halaman ini.</p>',
      'border-brand-500/25'
    ) +
    card(
      h2('Masuk cepat sebagai', 'Satu klik untuk berpindah peran (demo).') +
      '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">' +
        Object.entries(ROLE_META).map(([role, m]) =>
          '<button data-act="quick-login" data-role="' + role + '" class="text-left p-3.5 rounded-xl glass-panel border border-white/10 hover:border-brand-400/60 hover:bg-brand-500/10 transition">' +
            '<div class="flex items-center gap-2 text-sm font-bold text-white"><ion-icon name="' + m.icon + '" class="text-brand-300"></ion-icon>' + esc(m.label) + '</div>' +
            '<div class="text-[11px] text-slate-400 mt-1.5">' + esc(m.email) + '</div>' +
            '<div class="text-[11px] text-slate-500">' + esc(m.password) + '</div>' +
          '</button>'
        ).join('') +
      '</div>' +
      '<div class="mt-5 text-[11px] text-slate-400 flex items-start gap-2"><ion-icon name="information-circle-outline" class="text-brand-300 text-base shrink-0"></ion-icon><span>Tombol “Reset data demo” di kanan atas mengembalikan semua data ke kondisi awal.</span></div>'
    ) +
  '</div>';
}

/* ------------------------------------------------------------------ */
/* 8. Halaman: Checkout                                                */
/* ------------------------------------------------------------------ */

function pageCheckout(params) {
  const user = currentUser();
  const slug = params.get('package') || (user ? 'landing-page-umkm' : 'landing-page-umkm');
  const pkg = pkgOf(slug);
  const chosen = params.getAll('addons[]');
  const total = pkg.price + chosen.reduce((s, a) => s + (ADDONS[a] ? ADDONS[a].price : 0), 0);
  const dp = Math.round(total / 2);

  return '<div class="max-w-4xl mx-auto space-y-6">' +
    '<div class="flex items-center gap-2 text-xs text-slate-400"><a href="../" class="hover:text-white">Situs utama</a><ion-icon name="chevron-forward"></ion-icon><span class="text-slate-300">Pemesanan</span></div>' +
    '<h1 class="text-2xl sm:text-3xl font-extrabold text-white">Formulir Pemesanan</h1>' +
    '<div class="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">' +
      '<div class="lg:col-span-3">' + card(
        '<form data-form="create-order" class="space-y-4">' +
          input('Nama kontak', 'client_name', { value: user ? user.name : '', required: true }) +
          input('Email', 'client_email', { type: 'email', value: user ? user.email : '', required: true }) +
          input('Nama perusahaan / brand', 'company_name', { value: user ? 'PT Kopi Nusantara Raya' : '', required: true }) +
          input('Sektor bisnis', 'business_sector', { placeholder: 'F&B, retail, jasa, pendidikan…', required: true }) +
          input('Nomor WhatsApp', 'whatsapp_no', { value: user ? user.phone : '', required: true }) +
          textarea('Alamat (opsional)', 'address', { rows: 2 }) +
          '<label class="block"><span class="block text-xs font-semibold text-slate-300 mb-1.5">Paket layanan</span>' +
            '<select name="package" class="w-full rounded-xl glass-input px-3.5 py-2.5 text-sm">' +
              PACKAGES.map((p) => '<option value="' + p.slug + '"' + (p.slug === pkg.slug ? ' selected' : '') + '>' + esc(p.name) + ' — ' + rp(p.price) + '</option>').join('') +
            '</select></label>' +
          chosen.map((a) => '<input type="hidden" name="addons[]" value="' + esc(a) + '">').join('') +
          '<button type="submit" class="inline-flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-bold shadow-lg shadow-brand-500/20 transition"><span>Buat Pesanan &amp; Lanjut ke Ruang Kerja</span><ion-icon name="arrow-forward"></ion-icon></button>' +
        '</form>'
      ) + '</div>' +
      '<div class="lg:col-span-2">' + card(
        h2('Ringkasan') +
        '<div class="text-sm text-white font-semibold">' + esc(pkg.name) + '</div>' +
        '<div class="text-xs text-slate-400 mt-0.5">Estimasi ' + pkg.days + ' hari kerja</div>' +
        '<ul class="mt-4 space-y-1.5 text-xs text-slate-300">' +
          chosen.map((a) => ADDONS[a] ? '<li class="flex justify-between gap-2"><span>' + esc(ADDONS[a].name) + '</span><span class="text-indigo-300 shrink-0">' + rp(ADDONS[a].price) + '</span></li>' : '').join('') +
        '</ul>' +
        '<div class="mt-4 pt-4 border-t border-white/10 space-y-1.5 text-sm">' +
          '<div class="flex justify-between text-slate-300"><span>Total</span><span class="font-bold text-white">' + rp(total) + '</span></div>' +
          '<div class="flex justify-between text-emerald-300 text-xs"><span>Termin 1 (DP 50%)</span><span>' + rp(dp) + '</span></div>' +
          '<div class="flex justify-between text-amber-300 text-xs"><span>Termin 2 (Pelunasan 50%)</span><span>' + rp(total - dp) + '</span></div>' +
        '</div>' +
        '<div class="mt-4 text-[11px] text-slate-500 flex items-start gap-1.5"><ion-icon name="lock-closed-outline" class="text-base text-brand-300 shrink-0"></ion-icon><span>Pesanan ini hanya simulasi dan tersimpan di browser Anda.</span></div>',
        'border-brand-500/25 sticky top-20'
      ) + '</div>' +
    '</div></div>';
}

/* ------------------------------------------------------------------ */
/* 9. Halaman: Ruang Kerja (order workspace)                           */
/* ------------------------------------------------------------------ */

function milestoneRow(m, order, user) {
  const tone = { APPROVED: 'emerald', ACTIVE: 'indigo', IN_REVIEW: 'amber', LOCKED: 'slate' }[m.status] || 'slate';
  const label = { APPROVED: 'Disetujui', ACTIVE: 'Sedang aktif', IN_REVIEW: 'Menunggu review', LOCKED: 'Terkunci' }[m.status] || m.status;
  const meta = STAGE_BY_N[m.stage];
  const canSign = user && ['client', 'pm', 'admin'].includes(user.role) && ['ACTIVE', 'IN_REVIEW'].includes(m.status);
  const canDev = user && ['developer', 'admin'].includes(user.role) && ['ACTIVE', 'IN_REVIEW'].includes(m.status);

  return '<li class="rounded-xl border border-white/10 bg-white/[0.02] p-4">' +
    '<div class="flex flex-wrap items-start justify-between gap-3">' +
      '<div class="flex items-start gap-3">' +
        '<span class="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold border ' +
          (m.status === 'APPROVED' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' :
           m.status === 'LOCKED' ? 'bg-white/5 text-slate-500 border-white/10' :
           'bg-brand-500/15 text-brand-200 border-brand-500/30') + '">' + String(m.stage).padStart(2, '0') + '</span>' +
        '<div><div class="text-sm font-semibold text-white">' + esc(m.title) + '</div>' +
          '<div class="text-[11px] text-slate-400 mt-0.5">' + esc(meta.desc) + '</div>' +
          (m.approvedAt ? '<div class="text-[11px] text-emerald-300/80 mt-1 flex items-center gap-1"><ion-icon name="checkmark-done-outline"></ion-icon>Sign-off ' + esc(fmtDate(m.approvedAt)) + ' • IP ' + esc(m.approvedIp || '—') + '</div>' : '') +
          (m.stagingUrl ? '<a href="' + esc(m.stagingUrl) + '" target="_blank" rel="noopener" class="text-[11px] text-brand-300 hover:text-brand-200 mt-1 inline-flex items-center gap-1"><ion-icon name="earth-outline"></ion-icon>' + esc(m.stagingUrl) + '</a>' : '') +
        '</div>' +
      '</div>' +
      '<div class="flex items-center gap-2">' + badge(label, tone) + '</div>' +
    '</div>' +
    (canSign || canDev ?
      '<div class="mt-3 flex flex-wrap gap-2">' +
        (canSign ? btnPrimary('Sign-off Digital', 'data-act="signoff" data-id="' + m.id + '"', 'checkmark-done-outline') : '') +
        (canDev ? btnGhost('Atur Link Staging', 'data-act="staging" data-id="' + m.id + '"', 'link-outline') : '') +
      '</div>' : '') +
  '</li>';
}

const STAGE_BY_N = Object.fromEntries(STAGES.map((s) => [s.n, s]));

function invoiceCard(inv, order) {
  const paid = inv.status === 'PAID';
  return '<div class="rounded-xl border border-white/10 bg-white/[0.02] p-4">' +
    '<div class="flex items-start justify-between gap-3">' +
      '<div><div class="text-sm font-semibold text-white">' + esc(inv.number) + '</div>' +
        '<div class="text-[11px] text-slate-400 mt-0.5">' + esc(TERM_LABEL[inv.term] || inv.term) + ' • jatuh tempo ' + esc(fmtDate(inv.dueDate)) + '</div>' +
        (paid ? '<div class="text-[11px] text-emerald-300/80 mt-1">Dibayar ' + esc(fmtDate(inv.paidAt)) + '</div>' : '') +
      '</div>' +
      '<div class="text-right"><div class="text-sm font-bold text-white">' + rp(inv.amount) + '</div>' + badge(paid ? 'LUNAS' : 'BELUM DIBAYAR', paid ? 'emerald' : 'amber') + '</div>' +
    '</div>' +
    (paid ? '' : '<div class="mt-3 flex flex-wrap gap-2">' +
      ['VA_BCA', 'QRIS', 'E_WALLET'].map((ch) => btnGhost(CHANNEL_LABEL[ch], 'data-act="pay" data-id="' + inv.id + '" data-channel="' + ch + '"', 'card-outline')).join('') +
    '</div>') +
  '</div>';
}

const TERM_LABEL = { TERM_1_DP: 'Termin 1 — DP 50%', TERM_2_SETTLEMENT: 'Termin 2 — Pelunasan 50%', EXTRA_REVISION: 'Add-on Revisi Berbayar' };
const CHANNEL_LABEL = { VA_BCA: 'VA BCA', QRIS: 'QRIS', E_WALLET: 'E-Wallet' };

function vaultCard(v, order) {
  const unlocked = v.unlocked || term2Paid(order.id);
  return '<div class="rounded-xl border border-white/10 bg-white/[0.02] p-4">' +
    '<div class="flex items-start justify-between gap-3">' +
      '<div class="min-w-0"><div class="text-sm font-semibold text-white flex items-center gap-1.5">' +
        '<ion-icon name="' + (unlocked ? 'lock-open-outline' : 'lock-closed-outline') + '" class="' + (unlocked ? 'text-emerald-400' : 'text-rose-400') + '"></ion-icon>' + esc(v.label) + '</div>' +
        '<div class="text-[11px] text-slate-400 mt-0.5 truncate">' + esc(v.url) + '</div>' +
        '<div class="text-[11px] text-slate-400">user: <span class="text-slate-200">' + esc(v.username) + '</span></div>' +
        (unlocked ? '<div class="text-[11px] text-emerald-300 mt-1 font-mono" data-pass="' + v.id + '">' + esc(simDecrypt(v.cipher)) + '</div>' :
          '<div class="text-[11px] text-rose-300/80 mt-1">Terkunci — aktif setelah Termin 2 lunas</div>') +
      '</div>' + badge(unlocked ? 'UNLOCKED' : 'GATED', unlocked ? 'emerald' : 'rose') +
    '</div>' +
    (unlocked ? '' : '<div class="mt-2 text-[11px] text-slate-500">Enkripsi simulasi AES-256.</div>') +
  '</div>';
}

function pageWorkspace() {
  const user = currentUser();
  if (!user) return pageLogin();

  const myOrders = user.role === 'client'
    ? state.orders.filter((o) => o.clientId === 'c1')
    : state.orders;

  if (!myOrders.length) {
    return card('<div class="text-center py-10"><ion-icon name="folder-open-outline" class="text-4xl text-brand-300"></ion-icon>' +
      '<h2 class="text-lg font-bold text-white mt-3">Belum ada pesanan</h2>' +
      '<p class="text-sm text-slate-400 mt-1">Buat pesanan baru untuk memulai simulasi alur kerja.</p>' +
      '<div class="mt-5">' + btnPrimary('Buat Pesanan', 'data-act="go" data-href="#/checkout"', 'add-circle-outline') + '</div></div>');
  }

  const order = myOrders[0];
  const pkg = pkgOf(order.packageSlug);
  const client = clientOf(order);
  const st = statusMeta(order);
  const ms = milestonesOf(order.id);
  const inv = invoicesOf(order.id);
  const brief = briefOf(order.id);
  const revs = revisionsOf(order.id);
  const done = ms.filter((m) => m.status === 'APPROVED').length;
  const progress = Math.round((done / 5) * 100);
  const canBast = term2Paid(order.id) && ms.filter((m) => m.stage <= 4).every((m) => m.status === 'APPROVED');
  const canAddRevision = user.role === 'client';

  return '<div class="space-y-6">' +
    /* Header pesanan */
    '<div class="glass-panel rounded-2xl p-5 sm:p-6 border border-white/10">' +
      '<div class="flex flex-wrap items-start justify-between gap-4">' +
        '<div><div class="flex items-center gap-2 flex-wrap">' +
          '<h1 class="text-xl sm:text-2xl font-extrabold text-white">' + esc(order.number) + '</h1>' + badge(st.label, st.color) +
        '</div>' +
        '<p class="text-sm text-slate-300 mt-1">' + esc(pkg.name) + ' • ' + esc(client ? client.company : order.companyName) + '</p>' +
        '<p class="text-[11px] text-slate-500 mt-1">Dibuat ' + esc(fmtDate(order.createdAt)) + ' • target selesai ' + esc(fmtDate(order.targetDate)) + '</p></div>' +
        '<div class="text-right"><div class="text-[11px] text-slate-400">Nilai kontrak</div><div class="text-lg font-bold text-white">' + rp(order.total) + '</div></div>' +
      '</div>' +
      '<div class="mt-5">' +
        '<div class="flex items-center justify-between text-[11px] text-slate-400 mb-1.5"><span>Progress milestone</span><span>' + done + ' / 5 fase</span></div>' +
        '<div class="h-2 rounded-full bg-white/5 overflow-hidden"><div class="h-full rounded-full bg-gradient-to-r from-brand-500 to-indigo-400" style="width:' + progress + '%"></div></div>' +
      '</div>' +
      (canBast ? '<div class="mt-5">' + btnPrimary('Cetak BAST Digital', 'data-act="go" data-href="#/bast"', 'print-outline') + '</div>' : '') +
    '</div>' +

    '<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">' +
      /* Kolom kiri: milestone */
      '<div class="lg:col-span-2 space-y-6">' +
        card(h2('Pipeline 5 Milestone', 'Klik sign-off untuk menyetujui fase yang sedang aktif.') +
          '<ol class="space-y-3">' + ms.map((m) => milestoneRow(m, order, user)).join('') + '</ol>') +

        card(h2('Tiket Revisi', 'Kuota gratis paket ini: ' + pkg.quota + 'x • terpakai ' + order.revisionsUsed + 'x') +
          (revs.length ? '<ul class="space-y-3">' + revs.map((r) =>
            '<li class="rounded-xl border border-white/10 bg-white/[0.02] p-4">' +
              '<div class="flex flex-wrap items-start justify-between gap-2">' +
                '<div><div class="text-sm font-semibold text-white">' + esc(r.ticket) + ' ' + (r.paid ? badge('BERBAYAR', 'amber') : badge('GRATIS', 'emerald')) + '</div>' +
                  '<p class="text-xs text-slate-300 mt-1">' + esc(r.issue) + '</p>' +
                  (r.response ? '<p class="text-xs text-emerald-300/90 mt-1.5 flex items-start gap-1"><ion-icon name="chatbubble-ellipses-outline" class="shrink-0"></ion-icon><span>' + esc(r.response) + '</span></p>' : '') +
                '</div>' + badge(r.status === 'resolved' ? 'SELESAI' : 'DIPROSES', r.status === 'resolved' ? 'emerald' : 'amber') + '</div>' +
              (user.role === 'developer' && r.status !== 'resolved' ?
                '<form data-form="resolve-revision" data-id="' + r.id + '" class="mt-3 flex flex-col sm:flex-row gap-2">' +
                  '<input name="response" required placeholder="Catatan penyelesaian…" class="flex-1 rounded-xl glass-input px-3 py-2 text-xs">' +
                  '<button type="submit" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold">Tandai selesai</button>' +
                '</form>' : '') +
            '</li>').join('') + '</ul>'
          : '<p class="text-xs text-slate-400">Belum ada tiket revisi.</p>') +
          (canAddRevision ? '<form data-form="create-revision" class="mt-4 space-y-2 border-t border-white/10 pt-4">' +
            '<div class="text-xs font-semibold text-slate-300">Ajukan revisi baru</div>' +
            '<textarea name="issue" rows="2" required placeholder="Jelaskan bagian yang perlu diperbaiki…" class="w-full rounded-xl glass-input px-3 py-2 text-xs"></textarea>' +
            '<input name="target" placeholder="URL halaman terkait (opsional)" class="w-full rounded-xl glass-input px-3 py-2 text-xs">' +
            '<div class="flex items-center justify-between gap-2"><span class="text-[11px] text-slate-500">Revisi di luar kuota otomatis menerbitkan invoice Rp 200.000.</span>' +
            '<button type="submit" class="shrink-0 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold">Kirim</button></div>' +
          '</form>' : '')) +
      '</div>' +

      /* Kolom kanan: brief, invoice, vault */
      '<div class="space-y-6">' +
        card(h2('Brief Klien') +
          (brief ? '<div class="text-xs space-y-1.5 text-slate-300">' +
            '<div><span class="text-slate-500">Brand:</span> ' + esc(brief.brand) + '</div>' +
            '<div><span class="text-slate-500">Tagline:</span> ' + esc(brief.tagline) + '</div>' +
            '<div><span class="text-slate-500">Palet:</span> ' + esc(brief.palette) + '</div>' +
            '<div><span class="text-slate-500">Audiens:</span> ' + esc(brief.audience) + '</div>' +
            (brief.feedback ? '<div class="text-emerald-300/90"><span class="text-slate-500">PM:</span> ' + esc(brief.feedback) + '</div>' : '') +
          '</div>' + '<div class="mt-3">' + badge(brief.status === 'ACCEPTED' ? 'DISETUJUI' : brief.status === 'NEED_REVISION' ? 'PERLU REVISI' : 'DIKIRIM', brief.status === 'ACCEPTED' ? 'emerald' : brief.status === 'NEED_REVISION' ? 'amber' : 'blue') + '</div>'
          : '<p class="text-xs text-slate-400">Belum ada brief.</p>') +
          (user.role === 'client' && (!brief || brief.status === 'NEED_REVISION') ?
            '<form data-form="submit-brief" class="mt-4 space-y-2 border-t border-white/10 pt-4">' +
              '<input name="brand" required placeholder="Nama brand" class="w-full rounded-xl glass-input px-3 py-2 text-xs">' +
              '<input name="tagline" placeholder="Tagline singkat" class="w-full rounded-xl glass-input px-3 py-2 text-xs">' +
              '<input name="palette" placeholder="Palet warna (mis. #4f46e5, #f59e0b)" class="w-full rounded-xl glass-input px-3 py-2 text-xs">' +
              '<input name="audience" placeholder="Target audiens" class="w-full rounded-xl glass-input px-3 py-2 text-xs">' +
              '<textarea name="notes" rows="2" placeholder="Catatan fitur / referensi" class="w-full rounded-xl glass-input px-3 py-2 text-xs"></textarea>' +
              '<button type="submit" class="w-full px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold">Kirim brief</button>' +
            '</form>' : '') +
          (user.role === 'pm' && brief && brief.status !== 'ACCEPTED' ?
            '<div class="mt-3 flex gap-2">' +
              btnPrimary('Terima Brief', 'data-act="brief-accept"', 'checkmark-circle-outline') +
              btnGhost('Minta Revisi', 'data-act="brief-reject"', 'refresh-outline') +
            '</div>' : '')) +

        card(h2('Invoice & Pembayaran') +
          '<div class="space-y-2.5">' + inv.map((i) => invoiceCard(i, order)).join('') + '</div>' +
          (state.payments.filter((p) => inv.some((i) => i.id === p.invoiceId)).length ?
            '<div class="mt-4 text-[11px] text-slate-400">Pembayaran tercatat: ' +
            state.payments.filter((p) => inv.some((i) => i.id === p.invoiceId)).map((p) => CHANNEL_LABEL[p.channel] + ' ' + esc(p.paidAt.slice(0, 10))).join(' • ') + '</div>' : '')) +

        card(h2('Vault Kredensial', 'Hanya terbuka setelah Termin 2 lunas (gated release).') +
          '<div class="space-y-2.5">' + (vaultsOf(order.id).length ? vaultsOf(order.id).map((v) => vaultCard(v, order)).join('') : '<p class="text-xs text-slate-400">Belum ada kredensial tersimpan.</p>') + '</div>' +
          (user.role === 'developer' || user.role === 'admin' ?
            '<form data-form="add-vault" class="mt-4 space-y-2 border-t border-white/10 pt-4">' +
              '<input name="label" required placeholder="Label (mis. cPanel)" class="w-full rounded-xl glass-input px-3 py-2 text-xs">' +
              '<input name="url" required placeholder="https://…" class="w-full rounded-xl glass-input px-3 py-2 text-xs">' +
              '<div class="grid grid-cols-2 gap-2"><input name="username" required placeholder="Username" class="w-full rounded-xl glass-input px-3 py-2 text-xs"><input name="password" required placeholder="Password" class="w-full rounded-xl glass-input px-3 py-2 text-xs"></div>' +
              '<button type="submit" class="w-full px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold">Simpan terenkripsi</button>' +
            '</form>' : '')) +
      '</div>' +
    '</div>' +
  '</div>';
}

/* ------------------------------------------------------------------ */
/* 10. Halaman: Dashboard per peran                                    */
/* ------------------------------------------------------------------ */

function kpi(label, value, icon, tone = 'brand') {
  const tones = { brand: 'text-brand-300', emerald: 'text-emerald-300', amber: 'text-amber-300', rose: 'text-rose-300', indigo: 'text-indigo-300' };
  return '<div class="glass-panel rounded-2xl p-4 border border-white/10">' +
    '<div class="flex items-center justify-between"><span class="text-[11px] uppercase tracking-wider text-slate-400">' + esc(label) + '</span>' +
    '<ion-icon name="' + icon + '" class="text-lg ' + (tones[tone] || tones.brand) + '"></ion-icon></div>' +
    '<div class="text-xl font-extrabold text-white mt-1.5">' + esc(value) + '</div></div>';
}

function ordersTable(rows) {
  if (!rows.length) return '<p class="text-xs text-slate-400">Belum ada data.</p>';
  return '<div class="overflow-x-auto"><table class="w-full text-xs"><thead><tr class="text-slate-400 text-left">' +
    ['No. Pesanan', 'Klien', 'Paket', 'Nilai', 'Status', ''].map((h) => '<th class="py-2 pr-3 font-semibold whitespace-nowrap">' + h + '</th>').join('') +
    '</tr></thead><tbody>' + rows.map((o) => {
      const st = statusMeta(o);
      return '<tr class="border-t border-white/5">' +
        '<td class="py-2.5 pr-3 font-mono text-[11px] text-slate-200">' + esc(o.number) + '</td>' +
        '<td class="py-2.5 pr-3 text-slate-300">' + esc(clientOf(o) ? clientOf(o).company : o.companyName) + '</td>' +
        '<td class="py-2.5 pr-3 text-slate-300">' + esc(pkgOf(o.packageSlug).name) + '</td>' +
        '<td class="py-2.5 pr-3 text-white whitespace-nowrap">' + rp(o.total) + '</td>' +
        '<td class="py-2.5 pr-3">' + badge(st.label, st.color) + '</td>' +
        '<td class="py-2.5"><button data-act="go" data-href="#/" class="text-brand-300 hover:text-brand-200 whitespace-nowrap">Buka →</button></td>' +
      '</tr>';
    }).join('') + '</tbody></table></div>';
}

function pageDashboard() {
  const user = currentUser();
  if (!user) return pageLogin();
  const role = user.role;
  const totals = {
    revenue: state.invoices.filter((i) => i.status === 'PAID').reduce((s, i) => s + i.amount, 0),
    outstanding: state.invoices.filter((i) => i.status === 'UNPAID').reduce((s, i) => s + i.amount, 0),
    cogs: state.logs.reduce((s, l) => s + l.amount, 0),
  };
  totals.profit = totals.revenue - totals.cogs;

  const header = '<div class="flex flex-wrap items-end justify-between gap-3">' +
    '<div><h1 class="text-2xl font-extrabold text-white">Dashboard ' + esc(ROLE_META[role].label) + '</h1>' +
    '<p class="text-sm text-slate-400 mt-1">Selamat datang, ' + esc(user.name) + '.</p></div>' +
    '<div class="text-[11px] text-slate-500">Data demo • ' + esc(nowStamp()) + '</div></div>';

  let body = '';

  if (role === 'admin') {
    body = '<div class="grid grid-cols-2 lg:grid-cols-4 gap-3">' +
        kpi('Omzet tertagih', rp(totals.revenue), 'cash-outline', 'emerald') +
        kpi('Piutang', rp(totals.outstanding), 'time-outline', 'amber') +
        kpi('Beban modal', rp(totals.cogs), 'trending-down-outline', 'rose') +
        kpi('Laba bersih', rp(totals.profit), 'trending-up-outline', 'brand') +
      '</div>' +
      card(h2('Semua Pesanan') + ordersTable(state.orders)) +
      card(h2('Alokasi Tim', 'Tentukan PM dan developer untuk setiap pesanan.') +
        state.orders.map((o) =>
          '<form data-form="assign" data-id="' + o.id + '" class="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end border-b border-white/5 py-3 last:border-0">' +
            '<div class="text-xs"><div class="font-semibold text-white">' + esc(o.number) + '</div><div class="text-slate-500">' + esc(pkgOf(o.packageSlug).name) + '</div></div>' +
            '<label class="text-[11px] text-slate-400">PM<select name="pm" class="mt-1 w-full rounded-lg glass-input px-2 py-1.5 text-xs">' +
              [['', '—'], ...state.users.filter((u) => u.role === 'pm').map((u) => [u.id, u.name])].map(([v, l]) => '<option value="' + v + '"' + (o.assignedPm === v ? ' selected' : '') + '>' + esc(l) + '</option>').join('') +
            '</select></label>' +
            '<label class="text-[11px] text-slate-400">Developer<select name="dev" class="mt-1 w-full rounded-lg glass-input px-2 py-1.5 text-xs">' +
              [['', '—'], ...state.users.filter((u) => u.role === 'developer').map((u) => [u.id, u.name])].map(([v, l]) => '<option value="' + v + '"' + (o.assignedDev === v ? ' selected' : '') + '>' + esc(l) + '</option>').join('') +
            '</select></label>' +
            '<button type="submit" class="sm:col-span-3 justify-self-start px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold">Simpan alokasi</button>' +
          '</form>').join(''));
  } else if (role === 'pm') {
    const pendingBriefs = state.briefs.filter((b) => b.status === 'SUBMITTED');
    body = '<div class="grid grid-cols-2 lg:grid-cols-4 gap-3">' +
        kpi('Pesanan aktif', state.orders.filter((o) => o.status !== 'COMPLETED').length, 'briefcase-outline') +
        kpi('Brief menunggu', pendingBriefs.length, 'document-text-outline', 'amber') +
        kpi('Tiket revisi terbuka', state.revisions.filter((r) => r.status !== 'resolved').length, 'repeat-outline', 'rose') +
        kpi('Milestone selesai', state.milestones.filter((m) => m.status === 'APPROVED').length + '/5', 'checkmark-done-outline', 'emerald') +
      '</div>' +
      card(h2('Antrean Brief', 'Brief baru harus disetujui agar fase desain terbuka.') +
        (pendingBriefs.length ? pendingBriefs.map((b) =>
          '<div class="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 py-3 last:border-0">' +
            '<div><div class="text-sm font-semibold text-white">' + esc(b.brand) + '</div>' +
            '<div class="text-[11px] text-slate-400">' + esc(b.tagline || '') + ' • ' + esc(b.audience || '') + '</div></div>' +
            '<div class="flex gap-2">' + btnPrimary('Terima', 'data-act="brief-accept" data-id="' + b.id + '"', 'checkmark-circle-outline') +
            btnGhost('Revisi', 'data-act="brief-reject" data-id="' + b.id + '"', 'refresh-outline') + '</div></div>').join('')
          : '<p class="text-xs text-slate-400">Tidak ada brief menunggu. Semua sudah ditinjau.</p>')) +
      card(h2('Pesanan Saya') + ordersTable(state.orders));
  } else if (role === 'developer') {
    body = '<div class="grid grid-cols-2 lg:grid-cols-4 gap-3">' +
        kpi('Tugas aktif', state.orders.filter((o) => o.status !== 'COMPLETED').length, 'code-slash-outline') +
        kpi('Tiket revisi', state.revisions.filter((r) => r.status !== 'resolved').length, 'repeat-outline', 'amber') +
        kpi('Kredensial tersimpan', state.vaults.length, 'key-outline', 'indigo') +
        kpi('Staging live', state.milestones.filter((m) => m.stagingUrl).length, 'earth-outline', 'emerald') +
      '</div>' +
      card(h2('Tiket Revisi Masuk') +
        (state.revisions.length ? state.revisions.map((r) =>
          '<div class="border-b border-white/5 py-3 last:border-0">' +
            '<div class="flex items-center justify-between gap-2"><span class="text-sm font-semibold text-white">' + esc(r.ticket) + '</span>' + badge(r.status === 'resolved' ? 'SELESAI' : 'TERBUKA', r.status === 'resolved' ? 'emerald' : 'amber') + '</div>' +
            '<p class="text-xs text-slate-300 mt-1">' + esc(r.issue) + '</p>' +
            (r.status !== 'resolved' ? '<form data-form="resolve-revision" data-id="' + r.id + '" class="mt-2 flex gap-2">' +
              '<input name="response" required placeholder="Catatan penyelesaian…" class="flex-1 rounded-xl glass-input px-3 py-1.5 text-xs">' +
              '<button class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold">Selesai</button></form>' : '') +
          '</div>').join('') : '<p class="text-xs text-slate-400">Belum ada tiket.</p>')) +
      card(h2('Pesanan Ditugaskan') + ordersTable(state.orders));
  } else if (role === 'finance') {
    body = '<div class="grid grid-cols-2 lg:grid-cols-4 gap-3">' +
        kpi('Kas masuk', rp(totals.revenue), 'cash-outline', 'emerald') +
        kpi('Piutang', rp(totals.outstanding), 'time-outline', 'amber') +
        kpi('COGS', rp(totals.cogs), 'trending-down-outline', 'rose') +
        kpi('Margin', (totals.revenue ? Math.round((totals.profit / totals.revenue) * 100) : 0) + '%', 'pie-chart-outline', 'brand') +
      '</div>' +
      card(h2('Rekonsiliasi Invoice') +
        '<div class="overflow-x-auto"><table class="w-full text-xs"><thead><tr class="text-left text-slate-400">' +
        ['Invoice', 'Termin', 'Nominal', 'Status'].map((h) => '<th class="py-2 pr-3 font-semibold">' + h + '</th>').join('') + '</tr></thead><tbody>' +
        state.invoices.map((i) => '<tr class="border-t border-white/5"><td class="py-2.5 pr-3 font-mono text-[11px] text-slate-200">' + esc(i.number) + '</td>' +
          '<td class="py-2.5 pr-3 text-slate-300">' + esc(TERM_LABEL[i.term] || i.term) + '</td>' +
          '<td class="py-2.5 pr-3 text-white whitespace-nowrap">' + rp(i.amount) + '</td>' +
          '<td class="py-2.5">' + badge(i.status === 'PAID' ? 'LUNAS' : 'BELUM', i.status === 'PAID' ? 'emerald' : 'amber') + '</td></tr>').join('') +
        '</tbody></table></div>') +
      card(h2('Catat Beban Modal (COGS)') +
        '<form data-form="add-log" class="grid grid-cols-1 sm:grid-cols-2 gap-2">' +
          '<input name="title" required placeholder="Deskripsi biaya (mis. domain .com)" class="rounded-xl glass-input px-3 py-2 text-xs">' +
          '<input name="amount" type="number" min="0" required placeholder="Nominal (Rp)" class="rounded-xl glass-input px-3 py-2 text-xs">' +
          '<select name="category" class="rounded-xl glass-input px-3 py-2 text-xs">' +
            ['domain', 'hosting', 'plugin', 'freelance', 'other'].map((c) => '<option value="' + c + '">' + c + '</option>').join('') + '</select>' +
          '<input name="vendor" placeholder="Vendor" class="rounded-xl glass-input px-3 py-2 text-xs">' +
          '<button type="submit" class="sm:col-span-2 justify-self-start px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold">Simpan biaya</button>' +
        '</form>' +
        '<ul class="mt-4 space-y-2 text-xs">' + state.logs.map((l) =>
          '<li class="flex items-center justify-between gap-2 border-b border-white/5 pb-2 last:border-0"><span class="text-slate-300">' + esc(l.title) + ' <span class="text-slate-500">• ' + esc(l.category) + '</span></span><span class="text-rose-300">−' + rp(l.amount) + '</span></li>').join('') + '</ul>');
  } else {
    const order = state.orders[0];
    const ms = order ? milestonesOf(order.id) : [];
    body = '<div class="grid grid-cols-2 lg:grid-cols-4 gap-3">' +
        kpi('Pesanan saya', state.orders.length, 'briefcase-outline') +
        kpi('Fase selesai', ms.filter((m) => m.status === 'APPROVED').length + '/5', 'checkmark-done-outline', 'emerald') +
        kpi('Invoice terbuka', state.invoices.filter((i) => i.status === 'UNPAID').length, 'receipt-outline', 'amber') +
        kpi('Vault terbuka', order && term2Paid(order.id) ? state.vaults.filter((v) => v.orderId === order.id).length : 0, 'lock-open-outline', 'indigo') +
      '</div>' +
      card(h2('Pesanan Anda') + ordersTable(state.orders)) +
      card(h2('Langkah berikutnya') +
        '<ul class="text-sm text-slate-300 space-y-2">' +
          (order ? '<li class="flex items-start gap-2"><ion-icon name="arrow-forward-circle-outline" class="text-brand-300 text-lg shrink-0"></ion-icon><span>Buka <a class="text-brand-300 underline" href="#/">ruang kerja</a> untuk sign-off milestone, membayar invoice, dan melihat brankas kredensial.</span></li>' : '') +
          '<li class="flex items-start gap-2"><ion-icon name="document-text-outline" class="text-brand-300 text-lg shrink-0"></ion-icon><span>Lengkapi brief agar tim bisa mulai desain.</span></li>' +
          '<li class="flex items-start gap-2"><ion-icon name="print-outline" class="text-brand-300 text-lg shrink-0"></ion-icon><span>Setelah Termin 2 lunas, cetak BAST digital dari ruang kerja.</span></li>' +
        '</ul>');
  }

  return '<div class="space-y-6">' + header + body + '</div>';
}

/* ------------------------------------------------------------------ */
/* 11. Halaman: BAST                                                   */
/* ------------------------------------------------------------------ */

function pageBast() {
  const user = currentUser();
  if (!user) return pageLogin();
  const order = state.orders[0];
  if (!order) return card('<p class="text-sm text-slate-300">Belum ada pesanan.</p>');
  if (!term2Paid(order.id)) {
    return card('<div class="text-center py-10"><ion-icon name="lock-closed-outline" class="text-4xl text-rose-400"></ion-icon>' +
      '<h2 class="text-lg font-bold text-white mt-3">BAST belum tersedia</h2>' +
      '<p class="text-sm text-slate-400 mt-1">Lunasi Termin 2 terlebih dahulu untuk menerbitkan Berita Acara Serah Terima.</p>' +
      '<div class="mt-5">' + btnGhost('Kembali ke ruang kerja', 'data-act="go" data-href="#/"', 'arrow-back') + '</div></div>');
  }

  const client = clientOf(order);
  const pkg = pkgOf(order.packageSlug);
  const ms = milestonesOf(order.id);
  const numbers = 'BAST/WC/' + new Date().getFullYear() + '/0001';

  return '<div class="max-w-3xl mx-auto">' +
    '<div class="flex items-center justify-between gap-3 mb-4 print:hidden">' +
      btnGhost('Kembali', 'data-act="go" data-href="#/"', 'arrow-back') +
      btnPrimary('Cetak / Simpan PDF', 'data-act="print"', 'print-outline') +
    '</div>' +
    '<article class="bg-white text-slate-900 rounded-2xl p-8 sm:p-10 shadow-2xl">' +
      '<header class="text-center border-b-2 border-slate-800 pb-4">' +
        '<div class="text-[11px] tracking-[0.25em] text-slate-500 uppercase">WebCraft Agency</div>' +
        '<h1 class="text-xl font-extrabold mt-1">BERITA ACARA SERAH TERIMA PEKERJAAN</h1>' +
        '<div class="text-xs text-slate-600 mt-1">Nomor: ' + esc(numbers) + '</div>' +
      '</header>' +
      '<p class="text-xs leading-relaxed mt-5">Pada hari ini, ' + esc(nowStamp()) + ', telah dilaksanakan serah terima pekerjaan pembuatan website antara pihak-pihak berikut:</p>' +
      '<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-xs">' +
        '<div class="border border-slate-300 rounded-lg p-3">' +
          '<div class="font-bold text-slate-800 mb-1">PIHAK PERTAMA (Pengembang)</div>' +
          '<div>WebCraft Agency</div><div class="text-slate-600">Representasi: MaoneArt Super Admin</div>' +
          '<div class="text-slate-600">admin@webcraft.id</div></div>' +
        '<div class="border border-slate-300 rounded-lg p-3">' +
          '<div class="font-bold text-slate-800 mb-1">PIHAK KEDUA (Klien)</div>' +
          '<div>' + esc(client ? client.company : order.companyName) + '</div>' +
          '<div class="text-slate-600">' + esc(order.clientName) + '</div>' +
          '<div class="text-slate-600">' + esc(order.clientEmail) + '</div></div>' +
      '</div>' +
      '<h2 class="text-sm font-bold mt-6">Ruang Lingkup Pekerjaan</h2>' +
      '<table class="w-full text-xs mt-2 border border-slate-300">' +
        '<tbody><tr class="border-b border-slate-300"><td class="p-2 font-semibold w-1/3 bg-slate-100">Paket</td><td class="p-2">' + esc(pkg.name) + '</td></tr>' +
        '<tr class="border-b border-slate-300"><td class="p-2 font-semibold bg-slate-100">Nomor Pesanan</td><td class="p-2">' + esc(order.number) + '</td></tr>' +
        '<tr class="border-b border-slate-300"><td class="p-2 font-semibold bg-slate-100">Nilai Pekerjaan</td><td class="p-2">' + rp(order.total) + '</td></tr>' +
        '<tr><td class="p-2 font-semibold bg-slate-100">Add-on</td><td class="p-2">' + esc(order.addonIds.map((a) => (ADDONS[a] ? ADDONS[a].name : a)).join(', ') || '—') + '</td></tr></tbody>' +
      '</table>' +
      '<h2 class="text-sm font-bold mt-6">Audit Trail Milestone</h2>' +
      '<table class="w-full text-xs mt-2 border border-slate-300">' +
        '<thead><tr class="bg-slate-100 text-left"><th class="p-2 border-b border-slate-300">Fase</th><th class="p-2 border-b border-slate-300">Uraian</th><th class="p-2 border-b border-slate-300">Sign-off</th></tr></thead><tbody>' +
        ms.map((m) => '<tr class="border-b border-slate-200 last:border-0"><td class="p-2 font-semibold">' + m.stage + '</td><td class="p-2">' + esc(m.title) + '</td>' +
          '<td class="p-2 text-slate-600">' + esc(m.approvedAt ? m.approvedAt.slice(0, 16) + ' • IP ' + (m.approvedIp || '—') : '—') + '</td></tr>').join('') +
        '</tbody></table>' +
      '<p class="text-xs leading-relaxed mt-5">Kredensial produksi (cPanel, WP-Admin, dan database) telah diserahkan melalui brankas terenkripsi AES-256 dan dapat dibuka oleh Pihak Kedua setelah pelunasan Termin 2 dinyatakan LUNAS.</p>' +
      '<div class="grid grid-cols-2 gap-6 mt-10 text-center text-xs">' +
        '<div><div class="border-t border-slate-400 pt-2">Pihak Pertama</div><div class="text-slate-500 mt-1">WebCraft Agency</div></div>' +
        '<div><div class="border-t border-slate-400 pt-2">Pihak Kedua</div><div class="text-slate-500 mt-1">' + esc(order.clientName) + '</div></div>' +
      '</div>' +
    '</article></div>';
}

/* ------------------------------------------------------------------ */
/* 12. Router                                                          */
/* ------------------------------------------------------------------ */

function parseHash() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, query] = raw.split('?');
  return { path: path || '/', params: new URLSearchParams(query || '') };
}

function render() {
  const { path, params } = parseHash();
  const app = document.getElementById('app');
  let html;

  if (path === '/' || path === '') html = pageWorkspace();
  else if (path === '/login') html = pageLogin();
  else if (path === '/checkout') html = pageCheckout(params);
  else if (path === '/dashboard') html = pageDashboard();
  else if (path === '/bast') html = pageBast();
  else html = card('<div class="text-center py-10"><h2 class="text-lg font-bold text-white">Halaman tidak ditemukan</h2>' +
    '<p class="text-sm text-slate-400 mt-1">Tautan <span class="font-mono">' + esc(path) + '</span> tidak dikenal di demo ini.</p>' +
    '<div class="mt-5">' + btnGhost('Kembali', 'data-act="go" data-href="#/"', 'arrow-back') + '</div></div>');

  app.innerHTML = html;
  paintChrome();
  window.scrollTo({ top: 0, behavior: 'auto' });
}

/* ------------------------------------------------------------------ */
/* 13. Aksi                                                            */
/* ------------------------------------------------------------------ */

const actions = {
  'quick-login'(el) {
    const role = el.dataset.role;
    const user = state.users.find((u) => u.role === role);
    if (!user) return;
    state.session = user.id;
    save();
    toast('Masuk sebagai ' + ROLE_META[role].label, 'success');
    location.hash = '#/dashboard';
    render();
  },

  logout() {
    state.session = null;
    save();
    toast('Sesi demo diakhiri.', 'info');
    location.hash = '#/login';
    render();
  },

  go(el) {
    location.hash = el.dataset.href;
    render();
  },

  print() {
    window.print();
  },

  signoff(el) {
    const m = state.milestones.find((x) => x.id === el.dataset.id);
    if (!m) return;
    confirmModal({
      title: 'Sign-off Fase ' + m.stage,
      message: 'Anda akan menyetujui <strong class="text-white">' + esc(m.title) + '</strong>. Persetujuan tercatat sebagai audit trail digital.',
      confirmText: 'Ya, setujui',
      onConfirm() {
        const order = orderById(m.orderId);
        m.status = 'APPROVED';
        m.approvedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
        m.approvedIp = '103.28.' + Math.floor(Math.random() * 200) + '.' + Math.floor(Math.random() * 250);

        const next = state.milestones.find((x) => x.orderId === m.orderId && x.stage === m.stage + 1);
        if (next && next.status === 'LOCKED') next.status = 'ACTIVE';

        if (order) {
          if (m.stage >= 4) order.status = 'STAGING_REVIEW';
          if (m.stage >= 5) order.status = 'COMPLETED';
          if (m.stage < 4 && order.status === 'BRIEF_PHASE') order.status = 'IN_PROGRESS';
        }

        // Fase 4 disetujui → aktifkan invoice Termin 2
        if (m.stage === 4) {
          const inv2 = state.invoices.find((i) => i.orderId === m.orderId && i.term === 'TERM_2_SETTLEMENT');
          if (inv2 && inv2.status === 'UNPAID') inv2.dueDate = addDays(today(), 7);
        }

        save();
        toast('Fase ' + m.stage + ' disetujui.', 'success');
        render();
      },
    });
  },

  staging(el) {
    const m = state.milestones.find((x) => x.id === el.dataset.id);
    if (!m) return;
    confirmModal({
      title: 'Link Server Staging',
      message: '<input id="stagingUrl" value="' + esc(m.stagingUrl || 'https://staging.webcraft-demo.id') + '" class="mt-2 w-full rounded-xl glass-input px-3 py-2 text-sm">',
      confirmText: 'Simpan',
      onConfirm() {
        const v = document.getElementById('stagingUrl');
        m.stagingUrl = v ? v.value.trim() : m.stagingUrl;
        save();
        toast('Link staging diperbarui.', 'success');
        render();
      },
    });
  },

  pay(el) {
    const inv = state.invoices.find((i) => i.id === el.dataset.id);
    const channel = el.dataset.channel || 'QRIS';
    if (!inv) return;
    confirmModal({
      title: 'Simulasi Pembayaran',
      message: 'Bayar <strong class="text-white">' + rp(inv.amount) + '</strong> melalui <strong class="text-white">' + (CHANNEL_LABEL[channel] || channel) + '</strong>?<br><span class="text-xs text-slate-400">Ini simulasi gateway (Midtrans sandbox), tidak ada uang sungguhan.</span>',
      confirmText: 'Bayar sekarang',
      onConfirm() {
        inv.status = 'PAID';
        inv.paidAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
        state.payments.push({
          id: uid('p'), invoiceId: inv.id, channel,
          ref: channel + '-' + Math.floor(Math.random() * 1e8),
          amount: inv.amount, paidAt: inv.paidAt, status: 'success',
        });

        const order = orderById(inv.orderId);
        if (inv.term === 'TERM_1_DP' && order) {
          order.status = 'BRIEF_PHASE';
          const m1 = state.milestones.find((m) => m.orderId === order.id && m.stage === 1);
          if (m1 && m1.status === 'LOCKED') m1.status = 'ACTIVE';
        }

        if (inv.term === 'TERM_2_SETTLEMENT' && order) {
          state.vaults.filter((v) => v.orderId === order.id).forEach((v) => { v.unlocked = true; });
          order.status = 'COMPLETED';
          const m5 = state.milestones.find((m) => m.orderId === order.id && m.stage === 5);
          if (m5) { m5.status = 'APPROVED'; m5.approvedAt = m5.approvedAt || inv.paidAt; m5.approvedIp = m5.approvedIp || '103.28.10.10'; }
        }

        if (inv.term === 'EXTRA_REVISION') {
          const rev = state.revisions.find((r) => r.invoiceId === inv.id);
          if (rev) rev.status = 'approved_for_work';
        }

        save();
        toast('Pembayaran berhasil dicatat.', 'success');
        render();
      },
    });
  },

  'brief-accept'(el) {
    const id = el.dataset.id;
    const brief = id ? state.briefs.find((b) => b.id === id) : state.briefs.find((b) => b.orderId === state.orders[0].id);
    if (!brief) return;
    brief.status = 'ACCEPTED';
    brief.feedback = 'Brief lengkap. Lanjut ke fase desain.';
    brief.reviewedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const order = orderById(brief.orderId);
    if (order) {
      order.status = 'IN_PROGRESS';
      const ms = milestonesOf(order.id);
      const m1 = ms.find((m) => m.stage === 1);
      const m2 = ms.find((m) => m.stage === 2);
      if (m1) { m1.status = 'APPROVED'; m1.approvedAt = m1.approvedAt || brief.reviewedAt; m1.approvedIp = m1.approvedIp || '103.28.10.21'; }
      if (m2 && m2.status === 'LOCKED') m2.status = 'ACTIVE';
    }
    save();
    toast('Brief diterima. Fase desain dibuka.', 'success');
    render();
  },

  'brief-reject'(el) {
    const id = el.dataset.id;
    const brief = id ? state.briefs.find((b) => b.id === id) : state.briefs.find((b) => b.orderId === state.orders[0].id);
    if (!brief) return;
    brief.status = 'NEED_REVISION';
    brief.feedback = 'Mohon lengkapi referensi visual dan target audiens.';
    save();
    toast('Brief dikembalikan untuk revisi.', 'info');
    render();
  },
};

/* Form handler */
const field = (form, name) => form.elements.namedItem(name) || form.querySelector('[name="' + name + '"]');

const forms = {
  login(form) {
    const email = field(form, 'email').value.trim().toLowerCase();
    const password = field(form, 'password').value;
    const user = state.users.find((u) => u.email === email && u.password === password);
    if (!user) return toast('Email atau password tidak cocok.', 'danger');
    state.session = user.id;
    save();
    toast('Selamat datang, ' + user.name, 'success');
    location.hash = '#/dashboard';
    render();
  },

  'create-order'(form) {
    const data = new FormData(form);
    const slug = data.get('package');
    const pkg = pkgOf(slug);
    const addonIds = data.getAll('addons[]').filter((a) => ADDONS[a]);
    const total = pkg.price + addonIds.reduce((sum, a) => sum + ADDONS[a].price, 0);
    const clientId = 'c-' + Date.now();
    state.clients.push({
      id: clientId, userId: null, company: data.get('company_name'),
      sector: data.get('business_sector'), wa: data.get('whatsapp_no'), address: data.get('address') || '',
    });
    const orderId = 'o-' + Date.now();
    const number = 'ORD-' + new Date().getFullYear() + '-' + String(state.orders.length + 2).padStart(4, '0');
    state.orders.unshift({
      id: orderId, number, clientId, packageSlug: slug, addonIds, total,
      status: 'WAITING_DP', revisionsUsed: 0, assignedPm: null, assignedDev: null,
      createdAt: today(), startDate: null,
      targetDate: addDays(today(), pkg.days + addonIds.reduce((sum, a) => sum + ADDONS[a].days, 0) + 2),
      clientName: data.get('client_name'), clientEmail: data.get('client_email'), companyName: data.get('company_name'),
    });
    STAGES.forEach((s) => state.milestones.push({
      id: uid('m'), orderId, stage: s.n, title: s.title,
      status: 'LOCKED', approvedAt: null, approvedIp: null, stagingUrl: null,
    }));
    const half = Math.round(total / 2);
    state.invoices.push(
      { id: uid('i'), number: 'INV-' + Date.now() + '-01', orderId, term: 'TERM_1_DP', amount: half, dueDate: addDays(today(), 7), status: 'UNPAID', paidAt: null },
      { id: uid('i'), number: 'INV-' + Date.now() + '-02', orderId, term: 'TERM_2_SETTLEMENT', amount: total - half, dueDate: addDays(today(), 30), status: 'UNPAID', paidAt: null }
    );
    save();
    toast('Pesanan dibuat. Silakan bayar Termin 1.', 'success');
    location.hash = '#/';
    render();
  },

  'submit-brief'(form) {
    const order = state.orders[0];
    if (!order) return;
    const existing = briefOf(order.id);
    const payload = {
      brand: field(form, 'brand').value.trim(), tagline: field(form, 'tagline').value.trim(), palette: field(form, 'palette').value.trim(),
      audience: field(form, 'audience').value.trim(), references: '', notes: field(form, 'notes').value.trim(),
      status: 'SUBMITTED', feedback: null, reviewedAt: null,
    };
    if (existing) Object.assign(existing, payload);
    else state.briefs.push({ id: uid('b'), orderId: order.id, ...payload });
    save();
    toast('Brief terkirim ke Project Manager.', 'success');
    render();
  },

  'create-revision'(form) {
    const order = state.orders[0];
    if (!order) return;
    const pkg = pkgOf(order.packageSlug);
    const free = order.revisionsUsed < pkg.quota;
    const rev = {
      id: uid('r'), orderId: order.id, milestoneId: (milestonesOf(order.id).find((m) => m.status === 'ACTIVE') || {}).id || null,
      ticket: 'REV-' + new Date().getFullYear() + '-' + String(state.revisions.length + 1).padStart(4, '0'),
      issue: field(form, 'issue').value.trim(), targetUrl: field(form, 'target').value.trim(), status: 'open', response: null,
      paid: !free, createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    };
    if (free) {
      order.revisionsUsed += 1;
    } else {
      const invId = uid('i');
      rev.invoiceId = invId;
      state.invoices.push({
        id: invId, number: 'INV-' + Date.now() + '-RV', orderId: order.id, term: 'EXTRA_REVISION',
        amount: 200000, dueDate: addDays(today(), 3), status: 'UNPAID', paidAt: null,
      });
      order.total += 200000;
      toast('Kuota gratis habis: invoice revisi Rp 200.000 diterbitkan.', 'info');
    }
    state.revisions.push(rev);
    save();
    if (free) toast('Tiket revisi dibuat (kuota gratis).', 'success');
    render();
  },

  'resolve-revision'(form) {
    const rev = state.revisions.find((r) => r.id === form.dataset.id);
    if (!rev) return;
    rev.status = 'resolved';
    rev.response = field(form, 'response').value.trim();
    save();
    toast('Tiket revisi ditandai selesai.', 'success');
    render();
  },

  'add-vault'(form) {
    const order = state.orders[0];
    if (!order) return;
    const data = new FormData(form);
    state.vaults.push({
      id: uid('v'), orderId: order.id, label: data.get('label'), url: data.get('url'),
      username: data.get('username'), cipher: simEncrypt(data.get('password')), unlocked: term2Paid(order.id),
    });
    save();
    toast('Kredensial disimpan (enkripsi simulasi).', 'success');
    render();
  },

  assign(form) {
    const order = orderById(form.dataset.id);
    if (!order) return;
    order.assignedPm = field(form, 'pm').value || null;
    order.assignedDev = field(form, 'dev').value || null;
    save();
    toast('Alokasi tim disimpan.', 'success');
    render();
  },

  'add-log'(form) {
    const data = new FormData(form);
    state.logs.push({
      id: uid('l'), orderId: (state.orders[0] || {}).id || null,
      title: data.get('title'), amount: Number(data.get('amount')) || 0,
      category: data.get('category'), vendor: data.get('vendor') || '', date: today(), note: '',
    });
    save();
    toast('Beban modal tercatat.', 'success');
    render();
  },
};

/* ------------------------------------------------------------------ */
/* 14. Bootstrap                                                       */
/* ------------------------------------------------------------------ */

document.addEventListener('click', (e) => {
  const reset = e.target.closest('#btnReset');
  if (reset) {
    confirmModal({
      title: 'Reset data demo',
      message: 'Semua perubahan (pesanan, pembayaran, revisi) akan dihapus dan dikembalikan ke data contoh awal.',
      confirmText: 'Ya, reset',
      danger: true,
      onConfirm() {
        state = seedState();
        state.session = null;
        save();
        toast('Data demo dikembalikan ke awal.', 'success');
        location.hash = '#/login';
        render();
      },
    });
    return;
  }

  const el = e.target.closest('[data-act]');
  if (!el) return;
  const fn = actions[el.dataset.act];
  if (fn) {
    e.preventDefault();
    fn(el);
  }
});

document.addEventListener('submit', (e) => {
  const form = e.target.closest('[data-form]');
  if (!form) return;
  e.preventDefault();
  const fn = forms[form.dataset.form];
  if (fn) fn(form);
});

window.addEventListener('hashchange', render);

/* auto-start hanya di browser sungguhan */
if (!window.__DEMO_TEST__) {
  state = loadState();
  render();
}

/* Hook pengujian (tidak berpengaruh di produksi) */
window.WebCraftDemo = {
  get state() { return state; },
  setState(s) { state = s; },
  seedState, loadState, render, actions, forms, pageLogin, pageWorkspace, pageDashboard, pageBast, pageCheckout, parseHash,
};
