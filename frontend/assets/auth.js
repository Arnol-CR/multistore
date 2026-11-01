/**
 * auth.js — MultiStore
 * El servidor lo agrega a todas las páginas. Pone el token de sesión en cada
 * llamada a /api y manda al login cuando la sesión venció.
 */
(function () {
    var LOGIN = /\/login\.html$|^\/$/;
    function sesion() { try { return JSON.parse(localStorage.getItem('ms_usuario') || 'null'); } catch (e) { return null; } }
    function aLogin(motivo) {
        try { localStorage.removeItem('ms_usuario'); } catch (e) {}
        if (!LOGIN.test(location.pathname)) location.href = '/login.html' + (motivo ? '?' + motivo + '=1' : '');
    }
    // Sesiones guardadas antes del cambio (sin token): pedir login de nuevo
    var u0 = sesion();
    if (u0 && !u0.token) aLogin('actualizado');

    var fetchOriginal = window.fetch;
    window.fetch = function (input, init) {
        var url;
        try { url = new URL(typeof input === 'string' ? input : input.url, location.href); } catch (e) { return fetchOriginal.apply(this, arguments); }
        if (url.origin !== location.origin || url.pathname.indexOf('/api/') !== 0 || url.pathname.indexOf('/api/auth/') === 0)
            return fetchOriginal.apply(this, arguments);
        init = init || {};
        var h = new Headers(init.headers || (typeof input !== 'string' ? input.headers : undefined));
        var u = sesion();
        if (u && u.token) h.set('Authorization', 'Bearer ' + u.token);
        init.headers = h;
        return fetchOriginal.call(this, input, init).then(function (r) {
            if (r.status === 401) aLogin('expirada');
            return r;
        });
    };
})();
