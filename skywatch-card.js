/* SkyWatch card — LED departure-board style. Reads sensor.nearest_plane + sensor.nearest_plane_route. MAP button (or tap the card) = toggle map. INFO button = aircraft details. Filter chips drive input_select.nearest_plane_filter */
const AIRLINES = {
  BAW:['British Airways','#3d6bff'], SHT:['British Airways','#3d6bff'], CFE:['BA CityFlyer','#3d6bff'],
  EZY:['easyJet','#ff6a00'], EJU:['easyJet','#ff6a00'],
  RYR:['Ryanair','#f5d033'], RUK:['Ryanair','#f5d033'],
  VIR:['Virgin Atlantic','#ff1a1a'], EIN:['Aer Lingus','#00c46a'], TOM:['TUI','#19b5ff'],
  EXS:['Jet2','#ff2a2a'], LOG:['Loganair','#5cc8ff'], EFW:['Eastern Airways','#4d9cff'], AWC:['Titan Airways','#c8c8c8'],
  DLH:['Lufthansa','#ffc400'], GEC:['Lufthansa Cargo','#ffc400'], KLM:['KLM','#1ab0ff'], AFR:['Air France','#4d7cff'],
  UAE:['Emirates','#ff2b33'], QTR:['Qatar Airways','#c04a7c'], ETD:['Etihad','#e0b85a'], SWR:['SWISS','#ff2a2a'],
  AUA:['Austrian','#ff3a2a'], IBE:['Iberia','#ff3030'], VLG:['Vueling','#ffd000'], WZZ:['Wizz Air','#ff2fa8'],
  NAX:['Norwegian','#ff3a2a'], SAS:['SAS','#6e8cff'], FIN:['Finnair','#6e8cff'], TAP:['TAP Portugal','#00d26a'],
  BEL:['Brussels Airlines','#4d7cff'],
  AAL:['American','#ff2a4a'], DAL:['Delta','#ff3f5c'], UAL:['United','#4d7cff'], ACA:['Air Canada','#ff3a3a'],
  SIA:['Singapore Airlines','#ffc247'], CPA:['Cathay Pacific','#1fb8a5'], EVA:['EVA Air','#1fdc7a'],
  THY:['Turkish Airlines','#ff3a4a'], ELY:['El Al','#4d7cff'], JAL:['JAL','#ff3a3a'], ANA:['ANA','#4d9cff'],
  FDX:['FedEx','#ff7a1a'], UPS:['UPS','#ffb800'], DHK:['DHL','#ffd000'], BCS:['DHL','#ffd000'],
  ROU:['Air Canada Rouge','#ff3a5c'], JZA:['Air Canada Express','#ff3a3a'], WJA:['WestJet','#19c3b4'], WEN:['WestJet Encore','#19c3b4'],
  POE:['Porter','#5b8cff'], PTR:['Porter','#5b8cff'], TSC:['Air Transat','#36b6ff'], FLE:['Flair','#b6f23a'], SWG:['Sunwing','#ff9f1a'],
  CJT:['Cargojet','#ff4d4d'], PVL:['PAL Airlines','#3d8bff'], AKT:['Canadian North','#4fc3f7'], ANT:['Air North','#4da3ff'],
  CAV:['Calm Air','#ff7a1a'], PAG:['Perimeter','#4d9cff'], PSC:['Pascan','#ff3a4a'], AIE:['Air Inuit','#ff4d4d'], CRQ:['Air Creebec','#4d9cff'],
  GLR:['Central Mountain Air','#3fd07a'], TIN:['Air Tindi','#ff5a3a'], BFL:['Buffalo Airways','#ffcf33'], SUT:['Summit Air','#4dd0e1'],
  NWL:['North-Wright Airways','#ff6a3a'], KEW:['Keewatin Air','#4d9cff']
};
// The airline list above takes priority over the route database's airline name, because that
// database can be out of date (for example it still lists AKT, Canadian North, as Karat).
// Only airline-style callsigns (three letters then a digit) are looked up, so a light aircraft
// flying under its registration is never given an airline name.
function airlineFor(cs) {
  const t = String(cs || '').trim().toUpperCase();
  return /^[A-Z]{3}[0-9]/.test(t) ? (AIRLINES[t.slice(0, 3)] || null) : null;
}
const FILTERS = [['All aircraft','LOCAL'],['Commercial','COMMERCIAL'],['Light aircraft','LIGHT'],['Helicopters','HELI'],['Military','MIL']];
const CARD_VERSION = '1.0.3';
const ICON_MAP = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5L9 4zm0 2.2 6 2.5v11.1l-6-2.5V6.2z" fill="currentColor"/></svg>';
const ICON_INFO = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2"/><rect x="11" y="10.5" width="2" height="7" rx="1" fill="currentColor"/><circle cx="12" cy="7.5" r="1.3" fill="currentColor"/></svg>';
// Every value from the ADS-B feed, adsbdb, Planespotters, sensor attributes or config is
// third-party data. esc() must wrap it before it goes into any HTML string.
function esc(v) {
  return String(v === undefined || v === null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
// Only https: URLs are allowed into href/src. Anything else (javascript:, data:, http:,
// relative or malformed) returns ''. Callers still pass the result through esc().
function safeUrl(u) {
  if (u === undefined || u === null || u === '') return '';
  try {
    const x = new URL(String(u));
    return x.protocol === 'https:' ? x.href : '';
  } catch (_) {
    return '';
  }
}
function gcKm(lat1, lon1, lat2, lon2) {
  const R = 6371, r = Math.PI / 180;
  const dLat = (lat2 - lat1) * r, dLon = (lon2 - lon1) * r;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
function cleanCs(cs) {
  const t = String(cs || '').trim();
  return t && !/^@+$/.test(t) ? t : null;
}
class SkyWatchCard extends HTMLElement {
  connectedCallback() {
    if (this._timer) clearInterval(this._timer);
    this._timer = setInterval(() => this._tick(), 1000);
    this._tick();
  }
  disconnectedCallback() {
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
  }
  setConfig(c) {
    this._c = Object.assign({ entity: 'sensor.nearest_plane', route_entity: 'sensor.nearest_plane_route', filter_entity: 'input_select.nearest_plane_filter', refresh_entity: 'sensor.nearest_plane_raw', refresh_interval: 15, title: 'SKYWATCH', map_zoom: 8, map_theme: 'auto' }, c || {});
    if (!this._root) {
      this._root = this.attachShadow({ mode: 'open' });
      this._root.innerHTML = `<style>
        :host{display:block}
        ha-card{background:#05070f;border:1px solid #1b2340;border-radius:var(--ha-card-border-radius,14px);padding:18px 20px 14px;box-shadow:0 0 0 1px #0b1024 inset,0 12px 30px rgba(0,0,0,.45);font-family:'Courier New','Lucida Console',monospace;color:#ffb000;position:relative;overflow:hidden;cursor:pointer}
        ha-card:before{content:'';position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.045) 1px,transparent 1.3px);background-size:6px 6px;pointer-events:none}
        .row{position:relative;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:2px;text-transform:uppercase}
        .l1{font-size:22px;font-weight:700;line-height:1.15;margin-bottom:10px}
        .lr{font-size:15px;font-weight:700;color:#7fe7ff;text-shadow:0 0 6px #7fe7ff,0 0 16px rgba(127,231,255,.45);margin-bottom:6px}
        .lr .lbl{font-weight:400;color:#b4bde0;text-shadow:0 0 4px rgba(180,189,224,.4)}
        .lr small{font-size:10px;opacity:.75;letter-spacing:1px;margin-left:6px}
        .lr.eta{color:#3cff8a;text-shadow:0 0 6px #3cff8a,0 0 16px rgba(60,255,138,.4)}
        .lr.unk{color:#8f9bc4;text-shadow:none;font-weight:400}
        .lr.last{margin-bottom:10px}
        .l2{font-size:14px;font-weight:700;color:#ffffff;text-shadow:0 0 5px #ffffff,0 0 14px rgba(255,255,255,.55);margin-bottom:8px}
        .l3{font-size:15px;font-weight:700;color:#ffb000;text-shadow:0 0 6px #ffb000,0 0 16px rgba(255,176,0,.45)}
        .sep{opacity:.5;margin:0 8px}
        .foot{display:flex;justify-content:space-between;align-items:center;margin-top:14px;font-size:9px;letter-spacing:3px;color:#b4bde0;text-shadow:0 0 4px rgba(180,189,224,.5)}
        .foot .hint{color:#fff;letter-spacing:2px;margin-left:10px}
        .live{color:#3cff8a}.live:before{content:'';display:inline-block;width:7px;height:7px;border-radius:50%;background:#3cff8a;box-shadow:0 0 8px #3cff8a;margin-right:6px;vertical-align:middle}
        .idle{color:#b4bde0}.idle:before{content:'';display:inline-block;width:7px;height:7px;border-radius:50%;background:#b4bde0;box-shadow:0 0 6px #b4bde0;margin-right:6px;vertical-align:middle}
        .topbar{position:relative;display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;height:14px;color:#7fe7ff;font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase}
        .clk{font-size:13px;font-weight:700;color:#7fe7ff;text-shadow:0 0 6px #7fe7ff,0 0 16px rgba(127,231,255,.45);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:8px}
        .topactions{display:flex;align-items:center;gap:8px}.count{color:#3cff8a;min-width:11ch}
        dialog{width:min(520px,calc(100vw - 28px));max-height:calc(100vh - 28px);padding:0;border:1px solid #26345f;border-radius:14px;background:#05070f;color:#fff;box-shadow:0 20px 70px #000;font-family:Arial,sans-serif}dialog::backdrop{background:rgba(0,0,0,.78);backdrop-filter:blur(3px)}
        .dhead{display:flex;justify-content:space-between;align-items:center;padding:16px 18px;border-bottom:1px solid #26345f}.dhead h2{margin:0;color:#7fe7ff;font-size:17px}.close{border:0;background:transparent;color:#fff;font-size:26px;cursor:pointer}
        .dcontent{padding:16px 18px;max-height:70vh;overflow:auto}.photo{min-height:170px;border:1px solid #26345f;border-radius:10px;background:#0b1024;display:flex;align-items:center;justify-content:center;overflow:hidden;color:#8f9bc4;text-align:center}.photo img{display:block;width:100%;max-height:280px;object-fit:cover}.credit{margin:6px 2px 14px;color:#8f9bc4;font-size:9px}.credit a{color:#7fe7ff}.guide{display:grid;grid-template-columns:120px 1fr;gap:7px 12px;font-size:11px;line-height:1.45}.guide b{color:#7fe7ff}.note{margin-top:14px;padding:10px;border:1px solid #26345f;border-radius:8px;color:#b4bde0;font-size:10px;line-height:1.45}
        .scan{animation:pulse 1.6s ease-in-out infinite}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}
        .chips{position:relative;display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}
        .chip{font-size:8px;letter-spacing:2px;padding:5px 9px;border:1px solid #2a355c;border-radius:10px;color:#8f9bc4;cursor:pointer;user-select:none}
        .chip.on{color:#05070f;background:#7fe7ff;border-color:#7fe7ff;font-weight:700;box-shadow:0 0 8px rgba(127,231,255,.5)}
        .actions{position:relative;display:flex;gap:10px;margin-top:14px}
        .act{flex:1 1 0;display:flex;align-items:center;justify-content:center;gap:8px;min-height:42px;padding:0 14px;border:0;border-radius:10px;color:#05070f;font:700 14px/1 var(--ha-font-family-body,Roboto,'Segoe UI',Helvetica,Arial,sans-serif);letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;transition:filter .15s,box-shadow .15s}
        .act svg{width:18px;height:18px}
        .act:hover{filter:brightness(1.08)}
        .mapbtn{background:#7fe7ff;box-shadow:0 0 12px rgba(127,231,255,.45)}
        .mapbtn[aria-expanded="true"]{background:#4cc9e8;box-shadow:inset 0 2px 6px rgba(0,0,0,.35),0 0 12px rgba(127,231,255,.45)}
        .infobtn{background:#ffd166;box-shadow:0 0 12px rgba(255,176,0,.4)}
        .act:focus-visible,.chip:focus-visible{outline:2px solid #fff;outline-offset:2px}
        .act .chev{font-size:11px;letter-spacing:0}
        .mapwrap{position:relative;display:none;margin:14px -20px -14px;border-top:1px solid #1b2340;cursor:default}
        .mapwrap.open{display:block}
        .mapwrap .nomap{padding:14px 20px;font-size:12px;letter-spacing:2px;color:#8f9bc4;text-transform:uppercase}
      </style><ha-card><div class="body"></div><div class="mapwrap"></div><dialog><div class="dhead"><h2>AIRCRAFT INFORMATION</h2><button class="close" aria-label="Close">&times;</button></div><div class="dcontent"></div></dialog></ha-card>`;
      this._card = this._root.querySelector('ha-card');
      this._body = this._root.querySelector('.body');
      this._mapwrap = this._root.querySelector('.mapwrap');
      this._dialog = this._root.querySelector('dialog');
      this._dialogContent = this._root.querySelector('.dcontent');
      this._open = false;
      this._body.addEventListener('click', (e) => {
        const info = e.target.closest('.infobtn');
        if (info) { e.stopPropagation(); this._showInfo(); return; }
        const mapBtn = e.target.closest('.mapbtn');
        if (mapBtn) { e.stopPropagation(); this._setMap(!this._open); return; }
        const chip = e.target.closest('.chip');
        if (!chip) return;
        e.stopPropagation();
        if (this._hass) this._hass.callService('input_select', 'select_option', { entity_id: this._c.filter_entity, option: chip.dataset.opt });
      });
      this._root.querySelector('.close').addEventListener('click', () => this._dialog.close());
      // Tapping the dark area around the panel also closes it.
      this._dialog.addEventListener('click', (e) => { if (e.target === this._dialog) this._dialog.close(); });
      this._card.addEventListener('click', (e) => {
        // Clicks inside the map or the information panel must not toggle the map.
        if (this._mapwrap.contains(e.target) || this._dialog.contains(e.target)) return;
        this._setMap(!this._open);
      });
    }
  }
  _setMap(open) {
    this._open = !!open;
    this._mapwrap.classList.toggle('open', this._open);
    const b = this._root.querySelector('.mapbtn');
    if (b) {
      b.setAttribute('aria-expanded', String(this._open));
      b.setAttribute('aria-label', this._open ? 'Hide map' : 'Show map');
      const c = b.querySelector('.chev');
      if (c) c.textContent = this._open ? '▲' : '▼';
    }
    if (this._open) this._ensureMap();
  }
  _tick() {
    if (!this._root || !this._hass || !this._c) return;
    const clock = this._root.querySelector('.clk');
    if (clock) clock.textContent = new Intl.DateTimeFormat(undefined, { weekday:'short', day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false }).format(new Date());
    const count = this._root.querySelector('.count');
    if (count) {
      const e = this._hass.states[this._c.refresh_entity] || this._hass.states[this._c.entity];
      const last = e ? Date.parse(e.last_updated || e.last_changed) : NaN;
      const left = Number.isFinite(last) ? Math.max(0, Math.ceil((last + Number(this._c.refresh_interval) * 1000 - Date.now()) / 1000)) : null;
      count.textContent = left === null ? 'REFRESH —' : left === 0 ? 'UPDATING' : `REFRESH ${left}s`;
    }
  }
  async _showInfo() {
    const s = this._hass && this._hass.states[this._c.entity];
    const r = this._hass && this._hass.states[this._c.route_entity];
    const a = s ? s.attributes : {}, ra = r ? r.attributes : {};
    const reg = a.registration && a.registration !== '—' ? String(a.registration) : '';
    const csShown = cleanCs(s && s.state) || reg || 'UNKNOWN';
    const alInfo = airlineFor(cleanCs(s && s.state));
    const val = v => esc((v !== undefined && v !== null && v !== '' && v !== 'None') ? v : 'Not available');
    this._dialogContent.innerHTML = `<div class="photo">${reg ? 'Finding photograph for ' + esc(reg) + '…' : 'No registration available for photograph search'}</div><div class="credit"></div><div class="guide"><b>Callsign</b><span>${esc(csShown)}</span><b>Aircraft type</b><span>${val(a.aircraft_type)}</span><b>Registration</b><span>${val(reg)}</span><b>Classification</b><span>${val(a.category)}</span><b>Altitude</b><span>${val(a.altitude_ft)} ft</span><b>Ground speed</b><span>${val(a.speed_kt)} kt</span><b>Heading</b><span>${val(a.heading)}°</span><b>Distance</b><span>${val(a.distance_mi)} mi from home</span><b>Route</b><span>${val(r && r.state)}</span><b>Airline</b><span>${val(alInfo ? alInfo[0] : ra.airline)}</span></div><div class="note"><b>EST. ARRIVAL</b> is calculated from the aircraft’s current position, ground speed and straight-line distance to the destination. It is not the airline’s official scheduled arrival time. Aircraft and route data can be delayed, missing or inaccurate.</div>`;
    this._dialog.showModal();
    if (!reg) return;
    const photoBox = this._dialogContent.querySelector('.photo');
    const credit = this._dialogContent.querySelector('.credit');
    try {
      const response = await fetch(`https://api.planespotters.net/pub/photos/reg/${encodeURIComponent(reg)}`);
      if (!response.ok) throw new Error('Photo request failed');
      const data = await response.json();
      const p = data && data.photos && data.photos[0];
      const src = safeUrl(p && (p.thumbnail_large && p.thumbnail_large.src || p.thumbnail && p.thumbnail.src));
      if (!src) throw new Error('No photograph');
      const photoLink = safeUrl(p.link);
      const img = `<img src="${esc(src)}" alt="Photograph of ${esc(reg)}" style="cursor:pointer">`;
      photoBox.innerHTML = photoLink ? `<a href="${esc(photoLink)}" target="_blank" rel="noopener noreferrer">${img}</a>` : img;
      const who = p.photographer || 'PlaneSpotters.net contributor';
      const link = photoLink || `https://www.planespotters.net/search?q=${encodeURIComponent(reg)}`;
      credit.innerHTML = `© ${esc(who)} · <a href="${esc(link)}" target="_blank" rel="noopener noreferrer">Planespotters.net</a>`;
    } catch (_) {
      photoBox.textContent = `No photograph available for ${reg}`;
    }
  }
  _mapTheme() {
    const t = this._c.map_theme;
    if (t === 'light' || t === 'dark') return t;
    const sun = this._hass && this._hass.states['sun.sun'];
    if (sun && sun.state === 'below_horizon') return 'dark';
    return sun ? 'light' : 'dark';
  }
  async _ensureMap() {
    if (this._map || this._mapFailed) return;
    const a = this._hass && this._hass.states[this._c.entity] ? this._hass.states[this._c.entity].attributes : {};
    if (a.latitude === undefined || a.longitude === undefined) {
      this._mapwrap.innerHTML = '<div class="nomap">Map needs latitude/longitude attributes on the sensor</div>';
      return;
    }
    try {
      const helpers = await window.loadCardHelpers();
      const el = helpers.createCardElement({
        type: 'map', entities: [this._c.entity, 'zone.home'],
        aspect_ratio: '16:9', default_zoom: this._c.map_zoom, auto_fit: true, fit_zones: true, hours_to_show: 0, theme_mode: this._mapTheme()
      });
      el.hass = this._hass;
      this._mapwrap.innerHTML = '';
      this._mapwrap.appendChild(el);
      this._map = el;
      this._mapThemeUsed = this._mapTheme();
    } catch (err) {
      this._mapFailed = true;
      this._mapwrap.innerHTML = '<div class="nomap">Map unavailable</div>';
    }
  }
  async _rebuildMap() {
    if (!this._map) return;
    const a = this._hass && this._hass.states[this._c.entity] ? this._hass.states[this._c.entity].attributes : {};
    if (a.latitude === undefined || a.longitude === undefined) return;
    try {
      const helpers = await window.loadCardHelpers();
      const el = helpers.createCardElement({
        type: 'map', entities: [this._c.entity, 'zone.home'],
        aspect_ratio: '16:9', default_zoom: this._c.map_zoom, auto_fit: true, fit_zones: true, hours_to_show: 0, theme_mode: this._mapTheme()
      });
      el.hass = this._hass;
      this._mapThemeUsed = this._mapTheme();
      this._mapwrap.innerHTML = '';
      this._mapwrap.appendChild(el);
      this._map = el;
    } catch (_) {}
  }
  set hass(h) {
    if (!this._c) return;
    this._hass = h;
    if (this._map) this._map.hass = h;
    if (this._map && this._open && this._mapTheme() !== this._mapThemeUsed) this._rebuildMap();
    const s = h.states[this._c.entity];
    const r = h.states[this._c.route_entity];
    const f = h.states[this._c.filter_entity];
    const st = s ? String(s.state) : 'unavailable';
    const a = s ? s.attributes : {};
    const ra = r ? r.attributes : {};
    const filt = f ? f.state : null;
    const key = st + '|' + JSON.stringify(a) + '|' + (r ? r.state : '') + JSON.stringify(ra) + '|' + filt;
    if (key === this._key) return;
    this._key = key;
    const live = s && !['None', 'unknown', 'unavailable', ''].includes(st);
    const ok = v => v !== null && v !== undefined && v !== '' && v !== 'None' && v !== 'unknown' && v !== 'unavailable';
    const cs = cleanCs(st);
    const csShown = cs || ((a.registration && a.registration !== '—') ? String(a.registration) : 'UNKNOWN');
    const al = live && cs ? airlineFor(cs) : null;
    const apiName = live && ok(ra.airline) ? ra.airline : null;
    const name = al ? al[0] : (apiName || (live ? csShown : 'Scanning'));
    const col = al ? al[1] : (live ? '#ffb000' : '#c7d0ff');
    const num = v => ok(v) ? Number(v).toLocaleString('en-GB') : '—';
    const dash = v => ok(v) ? v : '—';
    const hasRoute = live && ok(ra.origin_city) && ok(ra.destination_city);
    const plat = ok(a.latitude) ? a.latitude : a.lat, plon = ok(a.longitude) ? a.longitude : a.lon;
    let eta = '';
    if (hasRoute && ok(plat) && ok(plon) && ok(ra.destination_lat) && ok(ra.destination_lon) && ok(a.speed_kt) && Number(a.speed_kt) > 60) {
      const km = gcKm(Number(plat), Number(plon), Number(ra.destination_lat), Number(ra.destination_lon));
      const mins = Math.round(km / (Number(a.speed_kt) * 1.852) * 60);
      if (km < 15) eta = 'Landing';
      else {
        const t = new Date(Date.now() + mins * 60000);
        const hh = String(t.getHours()).padStart(2, '0'), mm = String(t.getMinutes()).padStart(2, '0');
        const rem = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
        eta = `${hh}:${mm}<small>${rem}</small>`;
      }
    }
    const idleMsg = (filt && filt !== 'All aircraft') ? `No ${esc(String(filt).toLowerCase())} in range` : 'No aircraft in range';
    const l1 = `<div class="row l1${live ? '' : ' scan'}" style="color:${col};text-shadow:0 0 7px ${col},0 0 18px ${col}66">${esc(name)}</div>`;
    const routeOn = live && hasRoute;
    const etaOn = routeOn && eta;
    const v = on => on ? '' : ' style="visibility:hidden"';
    const lr =
      (routeOn
        ? `<div class="row lr"${v(routeOn)}><span class="lbl">Departed:</span> ${esc(ra.origin_city)}<small>${esc(dash(ra.origin_iata))}</small></div>`
        : `<div class="row lr unk"${v(live)}>${live ? 'Route not published' : '—'}</div>`) +
      (routeOn
        ? `<div class="row lr"${v(routeOn)}><span class="lbl">Destination:</span> ${esc(ra.destination_city)}<small>${esc(dash(ra.destination_iata))}</small></div>`
        : `<div class="row lr unk"${v(false)}>—</div>`) +
      `<div class="row lr eta last${etaOn ? '' : ' unk'}"${v(etaOn)}><span class="lbl">ETA:</span> ${etaOn ? eta : '—'}</div>`;
    const l2 = live
      ? `<div class="row l2">${esc(csShown)}<span class="sep">·</span>${esc(dash(a.aircraft_type))}<span class="sep">·</span>${esc(dash(a.registration))}</div>`
      : `<div class="row l2">${idleMsg}</div>`;
    const l3 = live
      ? `<div class="row l3">${esc(num(a.altitude_ft))} ft<span class="sep">·</span>${esc(num(a.speed_kt))} kt<span class="sep">·</span>${esc(dash(a.distance_mi))} mi</div>`
      : `<div class="row l3" style="opacity:.45">— ft<span class="sep">·</span>— kt<span class="sep">·</span>— mi</div>`;
    const top = `<div class="topbar"><span class="topactions"><span class="count"></span></span></div>`;
    const clk = `<div class="row clk"></div>`;
    const foot = `<div class="foot"><span>${esc(this._c.title)}<span class="hint">· v${CARD_VERSION}</span></span><span class="${live ? 'live' : 'idle'}">${live ? 'LIVE' : 'IDLE'}</span></div>`;
    const chips = f ? `<div class="chips">${FILTERS.map(([opt, lbl]) => `<span class="chip${filt === opt ? ' on' : ''}" data-opt="${opt}">${lbl}</span>`).join('')}</div>` : '';
    const actions = `<div class="actions"><button class="act mapbtn" type="button" aria-expanded="${this._open ? 'true' : 'false'}" aria-label="${this._open ? 'Hide map' : 'Show map'}">${ICON_MAP}<span>Map</span><span class="chev">${this._open ? '▲' : '▼'}</span></button><button class="act infobtn" type="button" aria-haspopup="dialog" aria-label="Aircraft information">${ICON_INFO}<span>Info</span></button></div>`;
    this._body.innerHTML = top + l1 + clk + lr + l2 + l3 + foot + chips + actions;
    this._tick();
  }
  getCardSize() { return 7; }
  static getStubConfig() { return { entity: 'sensor.nearest_plane', route_entity: 'sensor.nearest_plane_route', filter_entity: 'input_select.nearest_plane_filter', refresh_entity: 'sensor.nearest_plane_raw', refresh_interval: 15 }; }
}
if (!customElements.get('skywatch-card')) {
  customElements.define('skywatch-card', SkyWatchCard);
  console.info(
    `%c SKYWATCH-CARD %c v${CARD_VERSION} `,
    'color: white; background: #05070f; font-weight: 700;',
    'color: #05070f; background: #7fe7ff; font-weight: 700;'
  );
  window.customCards = window.customCards || [];
  window.customCards.push({ type: 'skywatch-card', name: 'SkyWatch Card', description: 'LED departure-board style nearest aircraft display' });
}
