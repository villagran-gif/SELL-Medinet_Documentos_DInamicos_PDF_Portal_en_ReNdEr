/* Portal Pending Patch: Quick Actions + Tampermonkey Export + Medinet Upload
   - Injects a horizontal action button section between header and first card
   - Adds a bottom section to load deal-context + build/copy JSON for Tampermonkey
   - Adds "Subir a Medinet" (guarda payload en backend y entrega mf_key + link)
   - Click en links de TRATO (Sell) dentro del portal -> precarga deal_id y muestra payload
*/

(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (k === "class") node.className = v;
        else if (k === "html") node.innerHTML = v;
        else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
        else node.setAttribute(k, String(v));
      }
    }
    if (children) {
      for (const c of children) node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return node;
  }

  function insertAfter(refNode, newNode) {
    if (!refNode || !refNode.parentNode) return;
    refNode.parentNode.insertBefore(newNode, refNode.nextSibling);
  }

  function getClosestCard(node) {
    if (!node) return null;
    return node.closest && node.closest("section.card") ? node.closest("section.card") : node;
  }

  function pulse(node) {
    const card = getClosestCard(node);
    if (!card) return;
    card.classList.add("qa-pulse");
    setTimeout(() => card.classList.remove("qa-pulse"), 1200);
  }

  function scrollToTarget(target) {
    if (!target) return;
    const card = getClosestCard(target);
    (card || target).scrollIntoView({ behavior: "smooth", block: "start" });
    pulse(card || target);
  }

  function safeSetStatus(elStatus, msg, kind) {
    // Prefer portal's setStatus if it's global
    try {
      if (typeof window.setStatus === "function") {
        window.setStatus(elStatus, msg, kind || "info");
        return;
      }
    } catch (_e) {}

    if (!elStatus) return;
    elStatus.className = "status" + (kind ? " " + kind : "");
    elStatus.textContent = msg || "";
  }

  function readFormField(id) {
    const x = $(id);
    if (!x) return "";
    return String(x.value || "").trim();
  }

  function buildTamperPayload({ dealCtx }) {
    // Base from portal form
    const payload = {
      deal_id: dealCtx && dealCtx.deal && dealCtx.deal.id ? Number(dealCtx.deal.id) : undefined,
      contact_id: dealCtx && dealCtx.contact && dealCtx.contact.id ? Number(dealCtx.contact.id) : undefined,

      rut: readFormField("c_rut"),
      first_name: readFormField("c_nombres"),
      last_name: readFormField("c_apellidos"),
      birth_date: readFormField("c_fecha"),
      email: readFormField("c_email"),
      telefono1: readFormField("c_tel1"),
      telefono2: readFormField("c_tel2"),
      direccion: readFormField("c_direccion"),
      comuna: (function () {
        const c = $("c_comuna");
        return c ? String(c.value || "").trim() : "";
      })(),
      tramo_modalidad: (function () {
        const m = $("c_modalidad");
        return m ? String(m.value || "").trim() : "";
      })(),
      aseguradora: (function () {
        const a = $("c_aseguradora");
        return a ? String(a.value || "").trim() : "";
      })(),

      // Desde bloque Deal (para Medinet ficha)
      peso: readFormField("dealPeso"),
      talla: readFormField("dealEstatura"),

      deal_url: (dealCtx && dealCtx.deal && dealCtx.deal.desktop_url) ? String(dealCtx.deal.desktop_url) : undefined,
      contact_url: (dealCtx && dealCtx.contact && dealCtx.contact.desktop_url) ? String(dealCtx.contact.desktop_url) : undefined,

      source: "portal_export_tampermonkey",
      timestamp: new Date().toISOString(),

      sell: dealCtx ? {
        deal: dealCtx.deal || null,
        contact: dealCtx.contact || null,
      } : undefined,
    };

    // Remove empty strings
    for (const k of Object.keys(payload)) {
      if (payload[k] === "") delete payload[k];
    }
    return payload;
  }

  async function copyToClipboard(text) {
    if (!text) return false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_e) {}

    // Fallback
    try {
      const ta = el("textarea", { style: "position:fixed;left:-9999px;top:-9999px;" });
      ta.value = text;
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch (_e) {
      return false;
    }
  }

  async function fetchDealContext(dealId) {
    const res = await fetch(`/api/deal-context?deal_id=${encodeURIComponent(String(dealId))}`);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(json && json.message ? json.message : `Error ${res.status}`);
      err.status = res.status;
      err.body = json;
      throw err;
    }
    return json;
  }

  function renderSellLinks(container, dealCtx) {
    if (!container) return;
    container.innerHTML = "";
    const links = [];
    if (dealCtx && dealCtx.contact) {
      if (dealCtx.contact.desktop_url) links.push({ label: "👤 Contacto (Desktop)", url: dealCtx.contact.desktop_url });
      if (dealCtx.contact.mobile_url) links.push({ label: "📱 Contacto (Mobile)", url: dealCtx.contact.mobile_url });
    }
    if (dealCtx && dealCtx.deal) {
      if (dealCtx.deal.desktop_url) links.push({ label: "💼 Trato/Deal (Desktop)", url: dealCtx.deal.desktop_url });
      if (dealCtx.deal.mobile_url) links.push({ label: "📱 Trato/Deal (Mobile)", url: dealCtx.deal.mobile_url });
    }

    if (!links.length) {
      container.innerHTML = '<div class="muted small">(sin links)</div>';
      return;
    }

    const list = el("div", { id: "tmLinksList" });
    for (const l of links) {
      list.appendChild(el("a", { href: l.url, target: "_blank", rel: "noreferrer" }, [l.label]));
    }
    container.appendChild(list);
  }

  function prefillFromDealContext(dealCtx) {
    // Prefill only safe/basic fields (rut no viene en endpoint)
    if (!dealCtx || !dealCtx.contact) return;

    const c = dealCtx.contact;
    if ($("c_nombres") && c.first_name) $("c_nombres").value = c.first_name;
    if ($("c_apellidos") && c.last_name) $("c_apellidos").value = c.last_name;
    if ($("c_email") && c.email) $("c_email").value = c.email;

    // phone/mobile -> Tel1/Tel2
    if ($("c_tel1") && (c.phone || c.mobile)) $("c_tel1").value = c.phone || c.mobile;
    if ($("c_tel2") && c.mobile) $("c_tel2").value = c.mobile;

    // address
    const addr = c.address || null;
    if (addr && typeof addr === "object") {
      if ($("c_direccion") && addr.line1) $("c_direccion").value = addr.line1;
      // comuna select: only set if option exists
      if ($("c_comuna") && addr.city) {
        try { $("c_comuna").value = addr.city; } catch (_e) {}
      }
    }
  }

  // -------------------------
  // Medinet store (backend)
  // -------------------------
  // IMPORT real en sell-medinet-backend: POST /medinet/import (protegido por X-API-Key).
  // Para NO exponer la API key en frontend, el portal debe proxyar vía server.js:
  //   POST /api/medinet/import  ->  https://sell-medinet-backend.onrender.com/medinet/import
  const MEDINET_IMPORT_ENDPOINT = '/api/medinet/import';

  function pickBackendResult(json) {
    const j = (json && typeof json === 'object') ? json : {};
    const status = j.status || j.ok || null;
    const message = j.message || j.msg || null;
    const key = j.key || j.mf_key || (j.data && (j.data.key || j.data.mf_key)) || null;
    const download_url = j.download_url || j.url || (j.data && (j.data.download_url || j.data.url)) || null;
    return { status, message, key, download_url, raw: j };
  }

  async function postJson(url, payload) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const text = await res.text().catch(() => '');
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch (_e) { json = { raw: text }; }
    return { res, json, text };
  }

  async function medinetStorePayload(payload) {
    const r = await postJson(MEDINET_IMPORT_ENDPOINT, payload);
    if (!r.res.ok) {
      throw new Error(`Backend ${r.res.status}: ${JSON.stringify(r.json).slice(0, 400)}`);
    }
    return { endpoint: MEDINET_IMPORT_ENDPOINT, http_status: r.res.status, json: r.json };
  }

// -------------------------
  // UI
  // -------------------------
  function installQuickActions(wrap) {
    const header = wrap.querySelector("header.topbar");
    const firstCard = wrap.querySelector("section.card");
    if (!header || !firstCard) return;

    const card = el("section", { class: "card quick-actions-card", id: "quickActions" }, [
      el("h2", null, ["Acciones rápidas"]),
      el("div", { class: "quick-actions" }, [
        el("button", {
          type: "button",
          class: "qa-btn",
          onclick: () => {
            const t = $("contactForm") || $("c_rut") || wrap.querySelector("#contactForm");
            scrollToTarget(t);
            try { if ($("c_rut")) $("c_rut").focus(); } catch (_e) {}
          }
        }, [el("span", { class: "qa-k" }, ["A"]), el("span", { class: "qa-ico" }, ["👤"]), "Crear contacto"]),

        el("button", {
          type: "button",
          class: "qa-btn",
          onclick: () => {
            const t = $("dealForm") || wrap.querySelector("#dealForm");
            scrollToTarget(t);
          }
        }, [el("span", { class: "qa-k" }, ["B"]), el("span", { class: "qa-ico" }, ["💼"]), "Crear trato / deal"]),

        el("button", {
          type: "button",
          class: "qa-btn",
          onclick: () => {
            const t = $("form") || $("rut") || wrap.querySelector("#form");
            scrollToTarget(t);
            try { if ($("rut")) $("rut").focus(); } catch (_e) {}
          }
        }, [el("span", { class: "qa-k" }, ["C"]), el("span", { class: "qa-ico" }, ["🔎"]), "Buscar RUT"]),

        el("button", {
          type: "button",
          class: "qa-btn",
          onclick: () => {
            const t = $("btnCreateDocs") || $("docsTemplatesWrap") || wrap.querySelector("#btnCreateDocs");
            scrollToTarget(t);
          }
        }, [el("span", { class: "qa-k" }, ["E"]), el("span", { class: "qa-ico" }, ["🧾"]), "Crear orden examen"]),
      ]),
      el("div", { class: "qa-hint" }, [
        el("span", { class: "pill" }, ["Tip"]),
        el("span", { class: "muted small" }, ["Estos botones te llevan directo a cada bloque (no ejecutan acciones automáticamente)."]),
      ]),
    ]);

    // Place between header and first card
    insertAfter(header, card);
  }

  function installTampermonkeyExport(wrap) {
    const card = el("section", { class: "card", id: "tmExport" }, [
      el("h2", null, ["Exportar a Medinet (Tampermonkey)"]),
      el("p", { class: "muted" }, [
        "Carga un ", el("b", null, ["deal_id"]), " (opcional) para obtener links Sell, y luego ",
        el("b", null, ["Sube"]), " (guarda) o ", el("b", null, ["copia"]), " el JSON para Medinet."
      ]),

      el("form", { class: "form-grid", id: "tmForm" }, [
        el("label", null, [
          "Deal ID (opcional)",
          el("input", { id: "tmDealId", placeholder: "Ej: 195260421", inputmode: "numeric", autocomplete: "off" }),
          el("div", { class: "muted small" }, ["Si abriste el portal con ?deal_id=..., se carga automáticamente."]),
          el("div", { class: "muted small" }, ["Tip: el deal_id es el numero del URL del trato (/sales/deals/195260421). No uses Pipeline ID (ej: 1290779)."])
        ]),

        el("div", { class: "row span2" }, [
          el("button", { type: "button", id: "btnTmLoad" }, ["Cargar desde Sell"]),
          el("button", { type: "button", id: "btnTmBuild", class: "secondary" }, ["Armar JSON desde formulario"]),
          el("button", { type: "button", id: "btnTmCopy", class: "secondary", disabled: "true" }, ["Copiar JSON"]),
          el("button", { type: "button", id: "btnTmMedinet", class: "secondary", disabled: "true" }, ["Subir a Medinet"]),
        ]),
      ]),

      el("section", { id: "tmStatus", class: "status" }),

      el("details", { class: "details", open: "true" }, [
        el("summary", null, ["Payload para Medinet (JSON)"]),
        el("pre", { id: "tmOut", class: "out" }, ["(sin datos)"])
      ]),

      el("details", { class: "details", open: "false" }, [
        el("summary", null, ["Links Sell encontrados"]),
        el("div", { id: "tmLinks", class: "docs-links" })
      ]),

      el("details", { class: "details", open: "false" }, [
        el("summary", null, ["Medinet (resultado + debug)"]),
        el("div", { class: "tm-medinet" }, [
          el("div", { id: "tmMedinetMsg", class: "muted small" }, ["(aún no subido)"]),
          el("div", { id: "tmMedinetLink", class: "tm-medinet-link" }),
          el("pre", { id: "tmMedinetDebug", class: "out" }, ["{}"]),
        ])
      ]),

      el("p", { class: "muted small" }, [
        "Flujo sugerido: ",
        el("b", null, ["1)"]), " llena/extrae datos en IA BOX ",
        el("b", null, ["2)"]), " crea trato o carga deal_id ",
        el("b", null, ["3)"]), " Subir a Medinet (recomendado) o Copiar JSON ",
        el("b", null, ["4)"]), " en Medinet /pacientes/nuevo/ se auto-carga con mf_key (Tampermonkey)."
      ])
    ]);

    wrap.appendChild(card);

    const tmDealId = $("tmDealId");
    const btnLoad = $("btnTmLoad");
    const btnBuild = $("btnTmBuild");
    const btnCopy = $("btnTmCopy");
    const btnMedinet = $("btnTmMedinet");
    const tmStatus = $("tmStatus");
    const tmOut = $("tmOut");
    const tmLinks = $("tmLinks");

    const tmMedinetMsg = $("tmMedinetMsg");
    const tmMedinetLink = $("tmMedinetLink");
    const tmMedinetDebug = $("tmMedinetDebug");

    let lastCtx = null;
    let lastPayload = null;

    function setMedinetUi({ message, download_url, key, debugObj }) {
      if (tmMedinetMsg) tmMedinetMsg.textContent = message || "";
      if (tmMedinetLink) {
        tmMedinetLink.innerHTML = "";
        if (download_url) {
          tmMedinetLink.appendChild(el("a", { href: download_url, target: "_blank", rel: "noreferrer" }, ["Abrir Medinet (mf_key)"]));
          if (key) tmMedinetLink.appendChild(el("span", { class: "muted small" }, [` · ${key}`]));
        }
      }
      if (tmMedinetDebug) tmMedinetDebug.textContent = JSON.stringify(debugObj || {}, null, 2);
    }

    async function doBuild() {
      const payload = buildTamperPayload({ dealCtx: lastCtx });
      lastPayload = payload;
      const txt = JSON.stringify(payload, null, 2);
      tmOut.textContent = txt;
      btnCopy.disabled = false;
      btnMedinet.disabled = false;
      safeSetStatus(tmStatus, "JSON listo ✅", "ok");
    }

    function guessDealIdFromSearchOutput() {
      // Intenta rescatar el deal_id desde el JSON del bloque Buscar RUT (pre#out)
      try {
        const pre = document.getElementById('out');
        const txt = pre ? String(pre.textContent || '').trim() : '';
        if (!txt) return '';
        const j = JSON.parse(txt);
        if (j && j.deal && j.deal.id) return String(j.deal.id);
      } catch (_e) {}
      return '';
    }

    async function doLoad() {
      let dealIdRaw = tmDealId ? String(tmDealId.value || "").trim() : "";

      // Si esta vacio, intenta usar el ultimo deal del bloque de busqueda por RUT
      if (!dealIdRaw) {
        const guessed = guessDealIdFromSearchOutput();
        if (guessed) {
          dealIdRaw = guessed;
          if (tmDealId) tmDealId.value = guessed;
        }
      }

      if (!dealIdRaw) {
        safeSetStatus(tmStatus, "Ingresa deal_id (del URL del trato) o usa 'Armar JSON desde formulario'.", "error");
        return;
      }

      // Guard anti-confusion: pipeline_id suele ser corto (ej 1290779). deal_id suele ser mas largo.
      if (/^\d{1,7}$/.test(dealIdRaw)) {
        const msg = `Ese numero (${dealIdRaw}) parece un Pipeline ID. Aqui debes pegar el deal_id del trato (ej: 195260421).`;
        tmOut.textContent = JSON.stringify({ error: true, message: msg }, null, 2);
        safeSetStatus(tmStatus, msg, "error");
        return;
      }

      safeSetStatus(tmStatus, `Cargando deal_id=${dealIdRaw}...`, "running");
      tmOut.textContent = "(cargando...)";
      btnCopy.disabled = true;
      btnMedinet.disabled = true;
      setMedinetUi({ message: "(aún no subido)", download_url: "", key: "", debugObj: {} });

      try {
        const ctx = await fetchDealContext(dealIdRaw);
        lastCtx = ctx;
        renderSellLinks(tmLinks, ctx);
        prefillFromDealContext(ctx);
        await doBuild();

        // Persist deal_id in URL (opcional)
        try {
          const qs = new URLSearchParams(location.search);
          qs.set('deal_id', dealIdRaw);
          const newUrl = `${location.pathname}?${qs.toString()}${location.hash || ''}`;
          history.replaceState({}, '', newUrl);
        } catch (_e) {}

      } catch (e) {
        lastCtx = null;
        lastPayload = null;
        renderSellLinks(tmLinks, null);

        const is404 = (e && (e.status === 404 || e.http_status === 404)) || /\b404\b/.test(String(e && e.message));
        const msg = is404
          ? `No se encontro el deal_id=${dealIdRaw}. Ojo: debe ser el ID del TRATO (URL /sales/deals/<id>), no el Pipeline ID.`
          : (e && e.message ? e.message : String(e));

        tmOut.textContent = JSON.stringify({ error: true, message: msg }, null, 2);
        safeSetStatus(tmStatus, msg, "error");
      }
    }

    btnLoad.addEventListener("click", doLoad);
    btnBuild.addEventListener("click", doBuild);

    btnCopy.addEventListener("click", async () => {
      const txt = tmOut && tmOut.textContent ? tmOut.textContent : "";
      if (!txt || txt === "(sin datos)" || txt === "(cargando...)") {
        safeSetStatus(tmStatus, "No hay JSON para copiar.", "error");
        return;
      }
      safeSetStatus(tmStatus, "Copiando...", "running");
      const ok = await copyToClipboard(txt);
      safeSetStatus(tmStatus, ok ? "Copiado ✅" : "No se pudo copiar (permiso/HTTPS).", ok ? "ok" : "error");
    });

    btnMedinet.addEventListener("click", async () => {
      if (!lastPayload) {
        safeSetStatus(tmStatus, "Primero arma el JSON.", "error");
        return;
      }

      safeSetStatus(tmStatus, "Subiendo payload a Medinet...", "running");
      setMedinetUi({ message: "Subiendo...", download_url: "", key: "", debugObj: {} });

      const ts = new Date().toISOString();
      let backend_response = null;
      let backend_error = null;
      try {
        const result = await medinetStorePayload(lastPayload);
        const picked = pickBackendResult(result.json);
        backend_response = picked.raw;

        const okMsg = picked.message || "Listo ✅ (payload guardado)";
        setMedinetUi({
          message: okMsg,
          download_url: picked.download_url || "",
          key: picked.key || "",
          debugObj: {
            timestamp: ts,
            payload: lastPayload,
            block_reason: null,
            backend_response: picked.raw,
            backend_error: null,
            settings: {
              portal_proxy: true,
              import_endpoint: MEDINET_IMPORT_ENDPOINT,
              used_endpoint: result.endpoint,
            }
          }
        });

        safeSetStatus(tmStatus, okMsg, "ok");
        btnMedinet.textContent = "Listo ✅";
        setTimeout(() => { btnMedinet.textContent = "Subir a Medinet"; }, 2500);
      } catch (e) {
        backend_error = e;
        const msg = `Error subiendo a Medinet: ${e && e.message ? e.message : String(e)}`;
        setMedinetUi({
          message: msg,
          download_url: "",
          key: "",
          debugObj: {
            timestamp: ts,
            payload: lastPayload,
            block_reason: null,
            backend_response,
            backend_error: msg,
            settings: {
              portal_proxy: true,
              import_endpoint: MEDINET_IMPORT_ENDPOINT,
            }
          }
        });
        safeSetStatus(tmStatus, msg, "error");
      }
    });

    // Auto-load from URL ?deal_id=...
    try {
      const qs = new URLSearchParams(location.search);
      const dealId = qs.get("deal_id") || qs.get("dealId");
      if (dealId && tmDealId && !tmDealId.value) {
        tmDealId.value = dealId;
        doLoad();
      }
    } catch (_e) {}

    // Intercept clicks on Sell deal links inside the portal and load here
    document.addEventListener('click', (ev) => {
      const a = ev.target && ev.target.closest ? ev.target.closest('a') : null;
      if (!a || !a.href) return;

      // allow modifiers to open in new tab
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;

      const m = a.href.match(/\/sales\/deals\/(\d+)/);
      if (!m) return;

      // only intercept if link is in portal cards (avoid header/logo)
      const inPortal = a.closest('main.wrap') || a.closest('.wrap');
      if (!inPortal) return;

      ev.preventDefault();
      ev.stopPropagation();

      const dealId = m[1];
      if (tmDealId) tmDealId.value = dealId;
      scrollToTarget($("tmExport"));
      doLoad();
    }, true);
  }

  function boot() {
    const wrap = document.querySelector("main.wrap") || document.querySelector(".wrap");
    if (!wrap) return;

    // avoid double install
    if ($("quickActions") || $("tmExport")) return;

    installQuickActions(wrap);
    installTampermonkeyExport(wrap);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
