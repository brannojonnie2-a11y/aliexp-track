// /api/geo — Returns the real visitor's IP and country
// On Vercel: reads x-vercel-ip-country + x-real-ip headers (always accurate)
// On Cloudflare: reads cf-ipcountry + cf-connecting-ip headers
// Fallback: does a server-side lookup via ipapi.co (server IP is the real user IP here)

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // 1. Real visitor IP — try multiple header sources
  const ip =
    req.headers['x-real-ip'] ||
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['cf-connecting-ip'] ||
    req.socket?.remoteAddress ||
    'Unknown';

  // 2. Country from Vercel header (most reliable on Vercel)
  const vercelCountryCode = req.headers['x-vercel-ip-country'];
  if (vercelCountryCode && COUNTRY_CODES[vercelCountryCode]) {
    return res.json({ ip, country: COUNTRY_CODES[vercelCountryCode], source: 'vercel-header' });
  }

  // 3. Country from Cloudflare header
  const cfCountryCode = req.headers['cf-ipcountry'];
  if (cfCountryCode && cfCountryCode !== 'XX' && COUNTRY_CODES[cfCountryCode]) {
    return res.json({ ip, country: COUNTRY_CODES[cfCountryCode], source: 'cf-header' });
  }

  // 4. Server-side lookup — the request comes from the real user's IP
  if (ip && ip !== 'Unknown') {
    try {
      const lookupRes = await fetch(`https://ipwho.is/${ip}`);
      const data = await lookupRes.json();
      if (data.success && data.country) {
        return res.json({ ip, country: data.country, source: 'ipwho-server' });
      }
    } catch {}

    try {
      const lookupRes2 = await fetch(`https://ipapi.co/${ip}/json/`);
      const data2 = await lookupRes2.json();
      if (!data2.error && data2.country_name) {
        return res.json({ ip, country: data2.country_name, source: 'ipapi-server' });
      }
    } catch {}
  }

  return res.json({ ip, country: 'Unknown', source: 'fallback' });
}
