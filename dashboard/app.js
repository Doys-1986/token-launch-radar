// Token Launch Radar dashboard (radar-2). Renders window.RADAR, written by main.ts beside this
// folder as data.js. No network, no framework: filtering, sorting and the detail view are all here.
(function () {
  var R = window.RADAR;
  if (!R) { document.body.innerHTML = '<p style="padding:20px">No data — run main.ts first.</p>'; return; }
  var $ = function (id) { return document.getElementById(id); };
  var fmt = function (n) {
    if (n === null || n === undefined) return '—';
    if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + n;
  };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var state = { q: '', cat: '', chain: '', conf: '', watch: false, grow: false, key: 'rank', dir: 1, sel: null };

  $('asof').textContent = R.as_of; $('asof2').textContent = R.as_of;
  $('globalratio').textContent = R.global_ratio.toFixed(3);
  var top = R.rows[0];
  $('stats').innerHTML =
    '<div class="stat"><b>' + R.board_size + '</b><span>ranked pre-token</span></div>' +
    '<div class="stat"><b>' + R.watchlist_size + '</b><span>watchlist covered</span></div>' +
    '<div class="stat"><b>' + R.early_size + '</b><span>early finds &lt; $50M</span></div>' +
    '<div class="stat"><b>' + fmt(top.implied_value_usd) + '</b><span>top implied: ' + esc(top.name) + '</span></div>';

  var cats = {}, chains = {};
  R.rows.forEach(function (r) { if (r.category) cats[r.category] = 1; r.chains.forEach(function (c) { chains[c] = 1; }); });
  Object.keys(cats).sort().forEach(function (c) { var o = document.createElement('option'); o.textContent = c; $('fcat').appendChild(o); });
  Object.keys(chains).sort().forEach(function (c) { var o = document.createElement('option'); o.textContent = c; $('fchain').appendChild(o); });

  function filtered() {
    var q = state.q.toLowerCase();
    return R.rows.filter(function (r) {
      if (state.watch && !r.watchlist) return false;
      if (state.grow && !(r.change_7d > 0)) return false;
      if (state.cat && r.category !== state.cat) return false;
      if (state.conf && r.confidence !== state.conf) return false;
      if (state.chain && r.chains.indexOf(state.chain) < 0) return false;
      if (q && (r.name + ' ' + r.slug + ' ' + (r.category || '') + ' ' + r.chains.join(' ')).toLowerCase().indexOf(q) < 0) return false;
      return true;
    }).sort(function (a, b) {
      var x = a[state.key], y = b[state.key];
      if (x === null) x = -Infinity; if (y === null) y = -Infinity;
      if (typeof x === 'string') return state.dir * x.localeCompare(y);
      return state.dir * (x - y);
    });
  }

  function render() {
    var rows = filtered();
    $('count').textContent = rows.length + ' of ' + R.board_size + ' shown';
    $('rows').innerHTML = rows.map(function (r) {
      var chg = r.change_7d === null ? '—' : '<span class="' + (r.change_7d >= 0 ? 'pos' : 'neg') + '">' + (r.change_7d >= 0 ? '+' : '') + r.change_7d.toFixed(1) + '%</span>';
      return '<tr data-slug="' + esc(r.slug) + '"' + (state.sel === r.slug ? ' class="sel"' : '') + '>' +
        '<td class="num">' + r.rank + '</td>' +
        '<td><span class="pname">' + esc(r.name) + '</span>' + (r.watchlist ? '<span class="wtag">watchlist</span>' : '') + '<br><span class="chains">' + esc(r.chains.slice(0, 3).join(' · ')) + (r.chains.length > 3 ? ' +' + (r.chains.length - 3) : '') + '</span></td>' +
        '<td class="cat">' + esc(r.category || '—') + '</td>' +
        '<td class="num">' + fmt(r.tvl_usd) + '</td><td class="num">' + chg + '</td>' +
        '<td class="num">' + r.peer_ratio.toFixed(2) + '×</td>' +
        '<td class="num imp">' + fmt(r.implied_value_usd) + '</td>' +
        '<td><span class="conf ' + r.confidence + '">' + r.confidence + '</span></td></tr>';
    }).join('');
    Array.prototype.forEach.call($('rows').children, function (tr) {
      tr.addEventListener('click', function () { showDetail(tr.getAttribute('data-slug')); });
    });
  }

  function showDetail(slug) {
    var r = null;
    R.rows.forEach(function (x) { if (x.slug === slug) r = x; });
    if (!r) return;
    state.sel = slug;
    var age = r.age_days === null ? 'unknown (model uses 365d)' : r.age_days + ' days (since ' + esc(r.listed_at) + ')';
    $('detail').classList.remove('hidden');
    $('detail').innerHTML =
      '<button class="close" id="dclose">Close ✕</button>' +
      '<h2>#' + r.rank + ' — ' + esc(r.name) + (r.watchlist ? '<span class="wtag">watchlist</span>' : '') + '</h2>' +
      '<p class="meta">' + esc(r.category || 'Uncategorised') + ' · ' + esc(r.chains.join(', ')) + ' · records no token in the snapshot · TVL ' + fmt(r.tvl_usd) + ' · 7d change ' + (r.change_7d === null ? 'not reported' : r.change_7d.toFixed(2) + '%') + '</p>' +
      '<div class="dgrid"><div><h3>The workings — recompute it yourself</h3><div class="kv">' +
      '<div><span>TVL</span><b>' + fmt(r.tvl_usd) + '</b></div>' +
      '<div><span>× peer ratio</span><b>' + r.peer_ratio.toFixed(3) + '×</b></div>' +
      '<div><span>peer basis</span><b>' + esc(r.peer_source) + '</b></div>' +
      '<div><span>× growth</span><b>' + r.growth_multiplier.toFixed(3) + '</b></div>' +
      '<div><span>× maturity (age ' + age + ')</span><b>' + r.maturity_multiplier.toFixed(3) + '</b></div>' +
      '<div><span>× breadth (' + r.chains.length + ' chain' + (r.chains.length === 1 ? '' : 's') + ')</span><b>' + r.breadth_multiplier.toFixed(3) + '</b></div>' +
      '<div class="tot"><span>Implied value</span><b>' + fmt(r.implied_value_usd) + '</b></div>' +
      '<div><span>Confidence</span><b>' + r.confidence + '</b></div></div>' +
      '<p class="note">Peer ratio = median market-cap/TVL of tokenized ' + esc(r.category || 'uncategorised') + ' protocols with ≥ $20M TVL in this snapshot, shrunk toward the global median (' + R.global_ratio.toFixed(3) + '×) by peer count. Confidence rises with peer count and TVL.</p></div>' +
      '<div><h3>Farm plan — no token is promised</h3><ol class="steps">' +
      r.farm_steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') +
      '</ol></div></div>';
    $('dclose').addEventListener('click', function () { $('detail').classList.add('hidden'); state.sel = null; render(); });
    $('detail').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    render();
  }

  $('liverows').innerHTML = R.live.map(function (r) {
    return '<tr><td class="pname">' + esc(r.name) + '</td><td class="cat">' + esc(r.category || '—') + '</td>' +
      '<td class="num">' + fmt(r.tvl_usd) + '</td><td class="num">' + fmt(r.mcap_usd) + '</td><td class="num">' + (r.ratio === null ? '—' : r.ratio.toFixed(2) + '×') + '</td></tr>';
  }).join('');

  $('q').addEventListener('input', function (e) { state.q = e.target.value; render(); });
  $('fcat').addEventListener('change', function (e) { state.cat = e.target.value; render(); });
  $('fchain').addEventListener('change', function (e) { state.chain = e.target.value; render(); });
  $('fconf').addEventListener('change', function (e) { state.conf = e.target.value; render(); });
  $('fwatch').addEventListener('change', function (e) { state.watch = e.target.checked; render(); });
  $('fgrow').addEventListener('change', function (e) { state.grow = e.target.checked; render(); });
  Array.prototype.forEach.call(document.querySelectorAll('#board th'), function (th) {
    th.addEventListener('click', function () {
      var k = th.getAttribute('data-k');
      if (state.key === k) state.dir = -state.dir; else { state.key = k; state.dir = k === 'name' || k === 'category' || k === 'confidence' ? 1 : -1; }
      render();
    });
  });

  // Deep links for screenshots and sharing: ?detail=<slug>, ?watch=1, ?cat=<category>, ?q=<text>
  var params = new URLSearchParams(location.search);
  if (params.get('watch') === '1') { state.watch = true; $('fwatch').checked = true; }
  if (params.get('cat')) { state.cat = params.get('cat'); $('fcat').value = state.cat; }
  if (params.get('q')) { state.q = params.get('q'); $('q').value = state.q; }
  render();
  if (params.get('detail')) showDetail(params.get('detail'));
})();
