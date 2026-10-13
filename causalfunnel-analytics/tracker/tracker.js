/*! CausalFunnel tracker. Usage:
    <script src="tracker.js" data-api="http://localhost:5000"></script> */
(function () {
  try {
    var script = document.currentScript;
    var API = ((script && script.getAttribute('data-api')) || '').replace(/\/$/, '');
    if (!API) return;
    var ENDPOINT = API + '/api/events';
    var KEY = 'cf_session_id', TTL = 30 * 60 * 1000, FLUSH_MS = 2000;
    var queue = [], memSession = null, lastUrl = null;

    function uuid() {
      if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 3) | 8).toString(16);
      });
    }

    // Session = uuid in localStorage; renewed after 30 min of inactivity.
    function sessionId() {
      var now = Date.now(), s = null;
      try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
      if (!s) s = memSession;
      if (!s || !s.id || now - s.last > TTL) s = { id: uuid() };
      s.last = now;
      memSession = s;
      try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
      return s.id;
    }

    function track(type, extra) {
      try {
        var ev = { session_id: sessionId(), type: type, page_url: location.href, timestamp: new Date().toISOString() };
        for (var k in extra) ev[k] = extra[k];
        queue.push(ev);
        if (queue.length >= 20) flush();
      } catch (e) {}
    }

    function flush() {
      if (!queue.length) return;
      var body = JSON.stringify(queue.splice(0, 100));
      try {
        // text/plain avoids a CORS preflight, which sendBeacon cannot do reliably
        if (navigator.sendBeacon && navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'text/plain' }))) return;
      } catch (e) {}
      try {
        fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: body, keepalive: true });
      } catch (e) {}
    }

    function pageView() {
      if (location.href === lastUrl) return;
      lastUrl = location.href;
      track('page_view');
    }

    document.addEventListener('click', function (e) {
      var d = document.documentElement;
      track('click', {
        x: Math.round(e.clientX + window.scrollX),
        y: Math.round(e.clientY + window.scrollY),
        page_width: Math.max(d.scrollWidth, d.clientWidth),
        page_height: Math.max(d.scrollHeight, d.clientHeight)
      });
    }, true);

    // SPA navigation
    ['pushState', 'replaceState'].forEach(function (fn) {
      var orig = history[fn];
      history[fn] = function () { var r = orig.apply(this, arguments); setTimeout(pageView, 0); return r; };
    });
    window.addEventListener('popstate', function () { setTimeout(pageView, 0); });

    setInterval(flush, FLUSH_MS);
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(); });

    pageView();
  } catch (e) { /* never break the host page */ }
})();
