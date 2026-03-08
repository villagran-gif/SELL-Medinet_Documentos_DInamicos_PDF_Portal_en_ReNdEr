(() => {
  "use strict";

  const state = {
    bound: false,
    observed: false,
    lastSignature: "",
  };

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function readValue(id) {
    const el = $(id);
    return el ? String(el.value || "").trim() : "";
  }

  function parseJsonFromPre(id) {
    const el = $(id);
    if (!el) return null;
    const raw = String(el.textContent || "").trim();
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (_err) {
      return null;
    }
  }

  function extractRut() {
    const direct = readValue("c_rut") || readValue("rut");
    if (direct) return direct;

    const dJson = parseJsonFromPre("d_out");
    const cJson = parseJsonFromPre("c_out");
    const candidates = [
      dJson?.deal?.rut,
      dJson?.deal?.rut_humano,
      dJson?.deal?.rut_normalizado,
      dJson?.rut,
      dJson?.rut_humano,
      dJson?.rut_normalizado,
      cJson?.contact?.rut,
      cJson?.contact?.rut_humano,
      cJson?.contact?.rut_normalizado,
      cJson?.rut,
      cJson?.rut_humano,
      cJson?.rut_normalizado,
    ].filter(Boolean);

    if (candidates.length) return String(candidates[0]).trim();

    const text = [$("d_summary")?.textContent || "", $("c_summary")?.textContent || "", $("c_rut_lookup")?.textContent || ""].join("\n");
    const match = text.match(/\b\d{1,2}\.\d{3}\.\d{3}-[0-9kK]\b|\b\d{7,8}-[0-9kK]\b/);
    return match ? match[0] : "";
  }

  function extractDealContext() {
    const summary = $("d_summary");
    if (!summary) return null;
    const summaryText = String(summary.textContent || "").trim();
    if (!/Deal creado:/i.test(summaryText)) return null;

    const json = parseJsonFromPre("d_out");
    const deal = json?.deal || null;
    const firstLink = summary.querySelector("a");
    const dealName = String(deal?.name || firstLink?.textContent || "DEAL SIN NOMBRE").trim();
    const dealId = Number(deal?.id || window.__lastCreatedDealId || 0);
    const rut = extractRut();

    return {
      dealName,
      dealId: Number.isFinite(dealId) && dealId > 0 ? dealId : 0,
      rut,
      hasDeal: true,
    };
  }

  function getSearchCard() {
    const rutInput = $("rut");
    return rutInput && rutInput.closest ? rutInput.closest("section.card") : null;
  }

  function scrollToDocsSearch() {
    const rutInput = $("rut");
    if (!rutInput) return;
    const card = getSearchCard() || rutInput;
    card.scrollIntoView({ behavior: "smooth", block: "start" });
    card.classList.add("deal-docs-cta-pulse");
    window.setTimeout(() => card.classList.remove("deal-docs-cta-pulse"), 1200);
    window.setTimeout(() => {
      try { rutInput.focus({ preventScroll: true }); } catch (_err) {}
      try { rutInput.select(); } catch (_err) {}
    }, 220);
  }

  function markDocsButtonReady() {
    const btn = $("btnCreateDocs");
    if (btn) btn.classList.add("docs-create-ready");
  }

  function renderDocsCta() {
    const summary = $("d_summary");
    if (!summary) return;

    let wrap = $("postDealDocsCtaWrap");
    const ctx = extractDealContext();
    if (!ctx || !ctx.hasDeal) {
      if (wrap) wrap.remove();
      state.lastSignature = "";
      return;
    }

    const signature = `${ctx.dealName}__${ctx.rut}__${ctx.dealId}`;
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.id = "postDealDocsCtaWrap";
      wrap.className = "post-deal-docs-cta";
      summary.appendChild(wrap);
    }

    if (state.lastSignature === signature && wrap.dataset.ready === "1") return;

    wrap.dataset.ready = "1";
    state.lastSignature = signature;
    wrap.innerHTML = `
      <button type="button" id="postDealDocsCta" class="qa-btn qa-btn-post-deal-docs">
        <span class="qa-k">C</span>
        <span class="qa-ico">👇🖨️</span>
        CREAR DOCUMENTOS para ${escapeHtml(ctx.dealName)} · ${escapeHtml(ctx.rut || "SIN RUT")} · DEAL_ID ${escapeHtml(String(ctx.dealId || ""))}
        <span class="qa-ico">📑👇</span>
      </button>
    `;
  }

  function submitSearch() {
    const form = $("form");
    if (!form) return;
    if (typeof form.requestSubmit === "function") {
      form.requestSubmit();
      return;
    }
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  }

  function activateDealDocsCta() {
    const ctx = extractDealContext();
    const rutInput = $("rut");
    if (!ctx || !rutInput) return;

    if (ctx.rut) rutInput.value = ctx.rut;
    markDocsButtonReady();
    scrollToDocsSearch();

    window.setTimeout(() => {
      submitSearch();
      markDocsButtonReady();
      const owner = $("docsOwnerId");
      const docsBtn = $("btnCreateDocs");
      window.setTimeout(() => {
        if (owner && !String(owner.value || "").trim()) {
          try { owner.focus({ preventScroll: true }); } catch (_err) {}
        } else {
          try { docsBtn?.focus({ preventScroll: true }); } catch (_err) {}
        }
      }, 240);
    }, 260);
  }

  function observeDealSummary() {
    if (state.observed) return;
    const targets = [$("d_summary"), $("d_out"), $("d_status")].filter(Boolean);
    if (!targets.length) return;

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(() => renderDocsCta());
    });

    targets.forEach((target) => {
      observer.observe(target, { childList: true, subtree: true, characterData: true });
    });

    state.observed = true;
  }

  function bindDelegatedClicks() {
    if (state.bound) return;
    document.addEventListener("click", (ev) => {
      const btn = ev.target && ev.target.closest ? ev.target.closest("#postDealDocsCta") : null;
      if (!btn) return;
      ev.preventDefault();
      activateDealDocsCta();
    }, true);
    state.bound = true;
  }

  function boot() {
    renderDocsCta();
    observeDealSummary();
    bindDelegatedClicks();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
