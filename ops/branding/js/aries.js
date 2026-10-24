/* F-003 T03 - Enlace "Grabaciones" dentro del menu de usuario de Guacamole.
 *
 * Se carga como extension (campo "js" del guac-manifest.json), asi que no se
 * modifica el .war: al actualizar Guacamole, esto sigue viajando aparte.
 *
 * Si una version futura cambia el DOM, el enlace deja de aparecer y nada mas:
 * no rompe la aplicacion. Por eso se busca por clase, no por posicion.
 */
(function () {
    "use strict";

    var URL_GRABACIONES = "/grabaciones/";
    var CLASS = "aries-recordings";

    function inject() {
        var lists = document.querySelectorAll(".user-menu ul.action-list");
        for (var i = 0; i < lists.length; i++) {
            var list = lists[i];
            if (list.querySelector("." + CLASS)) continue;

            var item = document.createElement("li");
            var link = document.createElement("a");
            link.className = CLASS;
            link.href = URL_GRABACIONES;
            link.target = "_blank";
            link.rel = "noopener";
            link.textContent = "Grabaciones";
            item.appendChild(link);
            list.appendChild(item);
        }
    }

    // El menu se monta y se re-monta segun la vista: se revisa cada poco.
    setInterval(inject, 1500);
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", inject);
    } else {
        inject();
    }
})();
