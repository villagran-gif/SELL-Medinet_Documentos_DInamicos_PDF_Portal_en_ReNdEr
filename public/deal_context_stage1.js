(() => {
  "use strict";

  const COLAB_OPTIONS = [
    "Carolin",
    "Camila",
    "Gabriela",
    "Allison",
    "MariaPaz",
    "Danitza",
    "Giselle",
  ];

  const state = {
    headerPinned: false,
    summaryObserverInstalled: false,
    rutLookupObserverInstalled: false,
    statusObserverInstalled: false,
    dealSummaryObserverInstalled: false,
    docsStatusObserverInstalled: false,
    boundDealButtons: false,
    boundCtaDelegate: false,
    dealDocsLastSignature: "",
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

  function normalizeText(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
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

  function parseContactIdFromHref(href) {
    const raw = String(href || "");
    const match =
      raw.match(/\/contacts\/(\d+)(?:[/?#]|$)/i) ||
      raw.match(/\/contact\/(\d+)(?:[/?#]|$)/i);
    return match ? Number(match[1]) : 0;
  }

  function parseDealIdFromHref(href) {
    const raw = String(href || "");
    const match =
      raw.match(/\/deals\/(\d+)(?:[/?#]|$)/i) ||
      raw.match(/\/deal\/(\d+)(?:[/?#]|$)/i);
    return match ? Number(match[1]) : 0;
  }

  function buildPreviewKvRow(label, value) {
    return `<div class="k">${escapeHtml(label)}</div><div class="v">${escapeHtml(value || "—")}</div>`;
  }

  function inspectContainerForContext(container) {
    if (!container) {
      return {
        meaningful: false,
        contactId: 0,
        hasDeal: false,
      };
    }

    const text = normalizeText(container.textContent || "");
    const meaningful = !!text;

    let contactId = 0;
    let hasDeal = false;

    const links = Array.from(container.querySelectorAll("a[href]"));
    for (const a of links) {
      const href = a.getAttribute("href") || "";
      const cId = parseContactIdFromHref(href);
      const dId = parseDealIdFromHref(href);
      if (!contactId && cId > 0) contactId = cId;
      if (dId > 0) hasDeal = true;
    }

    if (/Deals?\s+encontrados/i.test(text) || /Deal creado:/i.test(text)) {
      hasDeal = true;
    }

    return { meaningful, contactId, hasDeal };
  }

  function getContactContext() {
    const firstName = readValue("c_nombres");
    const lastName = readValue("c_apellidos");
    let rut = readValue("c_rut");
    let contactId = Number(window.__lastContactId || 0);
    let hasDeal = false;

    const cSummary = $("c_summary");
    const rutLookup = $("c_rut_lookup");

    [cSummary, rutLookup].forEach((container) => {
      const ctx = inspectContainerForContext(container);
      if (!contactId && ctx.contactId > 0) {
        contactId = ctx.contactId;
      }
      if (ctx.hasDeal) {
        hasDeal = true;
      }
    });

    const cJson = parseJsonFromPre("c_out");
    const dJson = parseJsonFromPre("d_out");

    if (!contactId) {
      contactId = Number(
        cJson?.contact?.id ||
        cJson?.contact_id ||
        dJson?.deal?.contact_id ||
        0
      );
    }

    if (!rut) {
      rut =
        cJson?.contact?.rut_humano ||
        cJson?.contact?.rut ||
        cJson?.rut_humano ||
        cJson?.rut ||
        dJson?.deal?.rut_humano ||
        dJson?.deal?.rut ||
        dJson?.rut_humano ||
        dJson?.rut ||
        "";
    }

    if (dJson?.deal?.id) {
      hasDeal = true;
    }

    const nameFromJson =
      cJson?.contact?.name ||
      [
        cJson?.contact?.first_name || cJson?.contact?.nombres || "",
        cJson?.contact?.last_name || cJson?.contact?.apellidos || "",
      ].filter(Boolean).join(" ").trim();

    const name = [firstName, lastName].filter(Boolean).join(" ").trim() || nameFromJson || "";

    if (Number.isFinite(contactId) && contactId > 0) {
      window.__lastContactId = Number(contactId);
    }

    return {
      name,
      rut,
      contactId,
      hasContactId: Number.isFinite(contactId) && contactId > 0,
      hasDeal,
    };
  }

  function getDealCard() {
    const form = $("dealForm");
    return form && form.closest ? form.closest("section.card") : null;
  }

  function ensureDealHeader() {
    const card = getDealCard();
    if (!card) return null;

    let header = $("dealStage1Header");
    if (header) return header;

    const title = card.querySelector("h2");
    header = document.createElement("div");
    header.id = "dealStage1Header";
    header.className = "deal-stage1-header";
    header.hidden = true;

    if (title && title.parentNode === card) {
      title.insertAdjacentElement("afterend", header);
    } else if (card.firstChild) {
      card.insertBefore(header, card.firstChild.nextSibling);
    } else {
      card.appendChild(header);
    }

    return header;
  }

  function renderDealHeader(forceShow) {
    const header = ensureDealHeader();
    if (!header) return;

    const ctx = getContactContext();
    if (!forceShow || !ctx.hasContactId) {
      if (!state.headerPinned) {
        header.hidden = true;
        header.innerHTML = "";
      }
      return;
    }

    const pieces = [
      ctx.name || "CONTACTO SIN NOMBRE",
      ctx.rut || "SIN RUT",
      `CONTACT_ID ${ctx.contactId}`,
    ];

    const nextHtml = `
      <span class="deal-stage1-icon" aria-hidden="true">🪛</span>
      <span class="deal-stage1-copy"><b>Creando DEAL/TRATO de ${escapeHtml(pieces.join(" · "))}</b></span>
      <span class="deal-stage1-icon" aria-hidden="true">🔧</span>
    `;

    header.hidden = false;
    if (header.innerHTML.trim() !== nextHtml.trim()) {
      header.innerHTML = nextHtml;
    }
  }

  function scrollToDealForm() {
    const header = $("dealStage1Header");
    const target = (header && !header.hidden ? header : null) || $("dealForm") || ensureDealHeader();
    if (!target) return;

    const card = getDealCard() || target;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    card.classList.add("deal-stage1-pulse");
    window.setTimeout(() => card.classList.remove("deal-stage1-pulse"), 1200);

    window.setTimeout(() => {
      const focusTarget = $("dealPipelineId") || $("dealOwnerId") || $("dealPeso");
      try {
        focusTarget?.focus({ preventScroll: true });
      } catch (_err) {
      }
    }, 260);
  }

  function setDealStatus(message, kind) {
    const statusEl = $("d_status");
    if (typeof window.setStatus === "function") {
      window.setStatus(statusEl, message, kind || "info");
      return;
    }
    if (!statusEl) return;
    statusEl.className = `status ${kind || "info"}`.trim();
    statusEl.textContent = message || "";
  }

  function activatePostContactDealCta() {
    const ctx = getContactContext();
    if (ctx.hasContactId) {
      window.__lastContactId = Number(ctx.contactId);
    }
    state.headerPinned = true;
    renderDealHeader(true);
    scrollToDealForm();
  }

  function isContainerMeaningful(container) {
    if (!container) return false;
    const cloned = container.cloneNode(true);
    cloned.querySelectorAll("#postContactDealCtaWrap, [data-stage1-cta-wrap='1']").forEach((el) => el.remove());
    return !!normalizeText(cloned.textContent || "");
  }

  function findBestCtaHost() {
    const summary = $("c_summary");
    const rutLookup = $("c_rut_lookup");

    const summaryCtx = inspectContainerForContext(summary);
    const lookupCtx = inspectContainerForContext(rutLookup);

    if (summaryCtx.meaningful) return { host: summary };
    if (lookupCtx.meaningful) return { host: rutLookup };
    return { host: summary || rutLookup || null };
  }

  function getAllCtaWraps() {
    return Array.from(document.querySelectorAll("#postContactDealCtaWrap, [data-stage1-cta-wrap='1']"));
  }

  function ensureCtaButton(wrap, ctx) {
    if (!wrap) return;

    let btn = wrap.querySelector("#postContactDealCta, [data-stage1-cta='1']");
    if (!btn) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.id = "postContactDealCta";
      btn.className = "qa-btn qa-btn-post-contact";
      btn.setAttribute("data-stage1-cta", "1");
      wrap.appendChild(btn);
    }

    const safeName = escapeHtml(ctx.name || "CONTACTO SIN NOMBRE");
    const nextHtml = `
      <span class="qa-k">B</span>
      <span class="qa-ico">💼</span>
      CREAR TRATO para CONTACTO ${safeName} · CONTACT_ID ${escapeHtml(String(ctx.contactId))}
    `;

    if (btn.innerHTML.trim() !== nextHtml.trim()) {
      btn.innerHTML = nextHtml;
    }
  }

  function ensureSummaryCta() {
    const placement = findBestCtaHost();
    const host = placement.host;
    const ctx = getContactContext();
    const existingWraps = getAllCtaWraps();

    if (!host) return;

    if (!ctx.hasContactId || ctx.hasDeal || !isContainerMeaningful(host)) {
      existingWraps.forEach((el) => el.remove());
      return;
    }

    let wrap = host.querySelector("[data-stage1-cta-wrap='1'], #postContactDealCtaWrap");
    if (!wrap) {
      existingWraps.forEach((el) => el.remove());
      wrap = document.createElement("div");
      wrap.id = "postContactDealCtaWrap";
      wrap.className = "post-contact-deal-cta";
      wrap.setAttribute("data-stage1-cta-wrap", "1");
      host.appendChild(wrap);
    } else {
      existingWraps.forEach((el) => {
        if (el !== wrap) el.remove();
      });
      if (wrap.parentElement !== host) {
        host.appendChild(wrap);
      }
    }

    ensureCtaButton(wrap, ctx);
  }

  function ensureFallbackPreviewCard() {
    const cStatus = $("c_status");
    const cSummary = $("c_summary");
    if (!cStatus || !cSummary) return;

    const statusText = normalizeText(cStatus.textContent || "");
    const alreadyHasPreview = !!cSummary.querySelector(".kv");
    if (alreadyHasPreview) return;
    if (!/Vista\s+Previa\s+OK/i.test(statusText)) return;

    const fields = {
      rut_normalizado: readValue("c_rut").replace(/\./g, ""),
      rut_o_id: readValue("c_rut"),
      nombres: readValue("c_nombres"),
      apellidos: readValue("c_apellidos"),
      fecha_nacimiento: readValue("c_fecha") || readValue("c_fecha_nacimiento"),
      telefono1: readValue("c_tel1") || readValue("c_telefono1"),
      telefono2: readValue("c_tel2") || readValue("c_telefono2"),
      email: readValue("c_email"),
      aseguradora: readValue("c_aseguradora"),
      modalidad: readValue("c_modalidad"),
      direccion: readValue("c_direccion"),
      comuna: readValue("c_comuna"),
    };

    const hasAny = Object.values(fields).some((v) => String(v || "").trim());
    if (!hasAny) return;

    cSummary.innerHTML = `
      <div class="kv">
        ${buildPreviewKvRow("RUT normalizado", fields.rut_normalizado)}
        ${buildPreviewKvRow("RUT (humano)", fields.rut_o_id)}
        ${buildPreviewKvRow("Nombres", fields.nombres)}
        ${buildPreviewKvRow("Apellidos", fields.apellidos)}
        ${buildPreviewKvRow("Fecha Nacimiento", fields.fecha_nacimiento)}
        ${buildPreviewKvRow("Teléfono 1", fields.telefono1)}
        ${buildPreviewKvRow("Teléfono 2", fields.telefono2)}
        ${buildPreviewKvRow("Correo", fields.email)}
        ${buildPreviewKvRow("Aseguradora", fields.aseguradora)}
        ${buildPreviewKvRow("Modalidad", fields.modalidad)}
        ${buildPreviewKvRow("Dirección", fields.direccion)}
        ${buildPreviewKvRow("Comuna", fields.comuna)}
      </div>
    `;
  }

  function ensureDealPreviewCard() {
    const dStatus = $("d_status");
    const dSummary = $("d_summary");
    const dJson = parseJsonFromPre("d_out");
    if (!dStatus || !dSummary || !dJson) return;

    const statusText = normalizeText(dStatus.textContent || "");
    if (!/Vista\s+previa\s+de\s+Deal/i.test(statusText)) return;

    const preview = dJson?.vista_previa || dJson?.vistaPrevia || null;
    if (!preview) return;

    const custom = preview.custom_fields || {};
    dSummary.innerHTML = `
      <div class="kv">
        ${buildPreviewKvRow("Deal name", preview.deal_name || preview.name || "")}
        ${buildPreviewKvRow("Contact ID", preview.contact_id || "")}
        ${buildPreviewKvRow("RUT normalizado", preview.rut_normalizado || custom.RUT_normalizado || "")}
        ${buildPreviewKvRow("RUT (humano)", preview.rut_humano || custom["RUT o ID"] || "")}
        ${buildPreviewKvRow("Aseguradora", preview.aseguradora || custom.Previsión || "")}
        ${buildPreviewKvRow("Modalidad", preview.modalidad || custom.Modalidad || "")}
        ${buildPreviewKvRow("Comuna", preview.comuna || custom.Ciudad || "")}
        ${buildPreviewKvRow("Estatura", custom.Estatura || preview.estatura || "")}
        ${buildPreviewKvRow("Peso", custom.Peso || preview.peso || "")}
        ${buildPreviewKvRow("Interés", custom.Interés || preview.interes || "")}
        ${buildPreviewKvRow("Validación PAD", custom["Validacion PAD"] || preview.validacion_pad || "")}
      </div>
    `;
  }

  function replaceColab1Input() {
    const current = $("dealColab1");
    if (!current) return null;
    if (current.tagName === "SELECT") return current;

    const label = current.closest("label");
    if (!label) return current;

    const select = document.createElement("select");
    select.id = "dealColab1";
    select.className = current.className || "";
    select.setAttribute("data-stage1-strict", "1");
    select.innerHTML =
      `<option value="">Selecciona colaboradora...</option>` +
      COLAB_OPTIONS.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");

    current.replaceWith(select);

    let hint = label.querySelector(".deal-colab1-help");
    if (!hint) {
      hint = document.createElement("div");
      hint.className = "muted small deal-colab1-help";
      hint.textContent = "Obligatorio. Solo permite opciones existentes de la lista.";
      label.appendChild(hint);
    }

    if (window.TomSelect && !select.tomselect) {
      try {
        new TomSelect(select, {
          create: false,
          persist: false,
          maxOptions: 50,
          placeholder: "Selecciona colaboradora...",
          sortField: { field: "text", direction: "asc" },
        });
      } catch (_err) {
      }
    }

    return select;
  }

  function readColab1StrictValue() {
    const el = replaceColab1Input();
    if (!el) return "";
    return String(el.value || "").trim();
  }

  function validateColab1BeforeDeal(ev) {
    const label = $("dealColab1") ? $("dealColab1").closest("label") : null;
    const value = readColab1StrictValue();
    const isValid = COLAB_OPTIONS.includes(value);

    if (label) label.classList.toggle("deal-colab1-invalid", !isValid);

    if (isValid) return;

    ev.preventDefault();
    ev.stopImmediatePropagation();
    setDealStatus("Debes seleccionar Colaborador1 desde la lista estricta antes de crear el trato.", "error");

    const dealColab = $("dealColab1");
    if (dealColab && typeof dealColab.focus === "function") {
      dealColab.focus();
    }

    const card = getDealCard();
    if (card) {
      card.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function bindDealButtons() {
    if (state.boundDealButtons) return;
    ["btnDealPreview", "btnDealCreate"].forEach((id) => {
      const btn = $(id);
      if (!btn) return;
      btn.addEventListener("click", validateColab1BeforeDeal, true);
    });
    state.boundDealButtons = true;
  }

  function extractRutForDocs() {
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

    const text = [
      $("d_summary")?.textContent || "",
      $("c_summary")?.textContent || "",
      $("c_rut_lookup")?.textContent || "",
    ].join("\n");

    const match = text.match(/\b\d{1,2}\.\d{3}\.\d{3}-[0-9kK]\b|\b\d{7,8}-[0-9kK]\b/);
    return match ? match[0] : "";
  }

  function extractDealDocsContext() {
    const summary = $("d_summary");
    if (!summary) return null;

    const summaryText = normalizeText(summary.textContent || "");
    if (!/Deal creado:/i.test(summaryText)) return null;

    const json = parseJsonFromPre("d_out");
    const deal = json?.deal || null;
    const links = Array.from(summary.querySelectorAll("a[href]"));
    const desktopLink = links[0] || null;
    const dealName = normalizeText(deal?.name || desktopLink?.textContent || "DEAL SIN NOMBRE");

    let dealId = Number(deal?.id || 0);
    if (!(Number.isFinite(dealId) && dealId > 0)) {
      for (const a of links) {
        const parsed = parseDealIdFromHref(a.getAttribute("href") || "");
        if (parsed > 0) {
          dealId = parsed;
          break;
        }
      }
    }

    const rut = extractRutForDocs();

    return {
      dealName,
      dealId: Number.isFinite(dealId) && dealId > 0 ? dealId : 0,
      rut,
      hasDeal: true,
    };
  }

  function getDocsSearchCard() {
    const rutInput = $("rut");
    return rutInput && rutInput.closest ? rutInput.closest("section.card") : null;
  }

  function scrollToDocsSearch() {
    const rutInput = $("rut");
    if (!rutInput) return;

    const card = getDocsSearchCard() || rutInput;
    card.scrollIntoView({ behavior: "smooth", block: "start" });
    card.classList.add("deal-docs-cta-pulse");
    window.setTimeout(() => card.classList.remove("deal-docs-cta-pulse"), 1200);

    window.setTimeout(() => {
      try {
        rutInput.focus({ preventScroll: true });
      } catch (_err) {
      }
      try {
        rutInput.select();
      } catch (_err) {
      }
    }, 220);
  }

  function submitDocsSearch() {
    const rutInput = $("rut");
    if (!rutInput) return;

    const form = rutInput.closest ? rutInput.closest("form") : null;
    const submitBtn = form ? form.querySelector('button[type="submit"]') : null;

    if (submitBtn && typeof submitBtn.click === "function") {
      submitBtn.click();
      return;
    }

    if (form) {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    }
  }

  function activateDealDocsCta() {
    const ctx = extractDealDocsContext();
    const rutInput = $("rut");
    if (!ctx || !rutInput) return;

    if (ctx.rut) {
      rutInput.value = ctx.rut;
    }

    scrollToDocsSearch();

    window.setTimeout(() => {
      submitDocsSearch();

      const owner = $("docsOwnerId");
      const docsBtn = $("btnCreateDocs");

      window.setTimeout(() => {
        if (!owner?.value) {
          try {
            owner?.focus({ preventScroll: true });
          } catch (_err) {
          }
          return;
        }

        try {
          docsBtn?.focus({ preventScroll: true });
        } catch (_err) {
        }
      }, 450);
    }, 260);
  }

  function ensureDealDocsCta() {
    const summary = $("d_summary");
    if (!summary) return;

    let wrap = $("postDealDocsCtaWrap");
    const ctx = extractDealDocsContext();

    if (!ctx || !ctx.hasDeal) {
      if (wrap) wrap.remove();
      state.dealDocsLastSignature = "";
      return;
    }

    const signature = `${ctx.dealName}__${ctx.rut}__${ctx.dealId}`;
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.id = "postDealDocsCtaWrap";
      wrap.className = "post-deal-docs-cta";
      summary.appendChild(wrap);
    }

    let btn = wrap.querySelector("#postDealDocsCta, [data-stage1-docs-cta='1']");
    if (!btn) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.id = "postDealDocsCta";
      btn.className = "qa-btn qa-btn-post-deal-docs";
      btn.setAttribute("data-stage1-docs-cta", "1");
      wrap.appendChild(btn);
    }

    const nextHtml = `
      <span class="qa-k">C</span>
      <span class="qa-ico">👇🖨️</span>
      CREAR DOCUMENTOS para ${escapeHtml(ctx.dealName)} · ${escapeHtml(ctx.rut || "SIN RUT")} · DEAL_ID ${escapeHtml(String(ctx.dealId || ""))}
      <span class="qa-ico">📑👇</span>
    `;

    if (state.dealDocsLastSignature !== signature || btn.innerHTML.trim() !== nextHtml.trim()) {
      btn.innerHTML = nextHtml;
      state.dealDocsLastSignature = signature;
    }
  }

  function ensureDocsInlineStatusMirror() {
    const btn = $("btnCreateDocs");
    if (!btn) return;

    let mirror = $("docsInlineStatusMirror");
    if (!mirror) {
      mirror = document.createElement("div");
      mirror.id = "docsInlineStatusMirror";
      mirror.className = "docs-inline-status-mirror";

      const host =
        btn.closest("label") ||
        btn.parentElement ||
        $("docsOwnerId")?.closest("label") ||
        $("docsOwnerId")?.parentElement;

      if (host && host.parentNode) {
        host.insertAdjacentElement("afterend", mirror);
      } else {
        btn.insertAdjacentElement("afterend", mirror);
      }
    }

    syncDocsInlineStatusMirror();
  }

  function syncDocsInlineStatusMirror() {
    const source = $("docs_status");
    const mirror = $("docsInlineStatusMirror");
    if (!mirror || !source) return;

    const text = normalizeText(source.textContent || "");
    if (!text) {
      mirror.hidden = true;
      mirror.innerHTML = "";
      return;
    }

    mirror.hidden = false;
    mirror.innerHTML = "";

    const box = document.createElement("div");
    box.className = source.className || "status info";
    box.textContent = text;
    mirror.appendChild(box);
  }

  function refreshUi() {
    ensureFallbackPreviewCard();
    ensureSummaryCta();
    ensureDealPreviewCard();
    ensureDealDocsCta();
    ensureDocsInlineStatusMirror();

    if (state.headerPinned) {
      renderDealHeader(true);
    }
  }

  function installSummaryObserver() {
    if (state.summaryObserverInstalled) return;
    const summary = $("c_summary");
    if (!summary) return;

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(refreshUi);
    });

    observer.observe(summary, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    state.summaryObserverInstalled = true;
  }

  function installRutLookupObserver() {
    if (state.rutLookupObserverInstalled) return;
    const rutLookup = $("c_rut_lookup");
    if (!rutLookup) return;

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(refreshUi);
    });

    observer.observe(rutLookup, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    state.rutLookupObserverInstalled = true;
  }

  function installStatusObserver() {
    if (state.statusObserverInstalled) return;
    const status = $("c_status");
    if (!status) return;

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(refreshUi);
    });

    observer.observe(status, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    state.statusObserverInstalled = true;
  }

  function installDealSummaryObserver() {
    if (state.dealSummaryObserverInstalled) return;
    const summary = $("d_summary");
    if (!summary) return;

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(refreshUi);
    });

    observer.observe(summary, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    state.dealSummaryObserverInstalled = true;
  }

  function installDocsStatusObserver() {
    if (state.docsStatusObserverInstalled) return;
    const source = $("docs_status");
    if (!source) return;

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(syncDocsInlineStatusMirror);
    });

    observer.observe(source, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["class"],
    });

    state.docsStatusObserverInstalled = true;
  }

  function bindContactFieldRefresh() {
    [
      "c_nombres",
      "c_apellidos",
      "c_rut",
      "c_fecha_nacimiento",
      "c_telefono1",
      "c_telefono2",
      "c_email",
      "c_aseguradora",
      "c_modalidad",
      "c_direccion",
      "c_comuna",
      "c_fecha",
      "c_tel1",
      "c_tel2",
    ].forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("input", refreshUi);
      el.addEventListener("change", refreshUi);
    });
  }

  function bindDelegatedClicks() {
    if (state.boundCtaDelegate) return;

    document.addEventListener(
      "click",
      (ev) => {
        const btn = ev.target && ev.target.closest
          ? ev.target.closest("#postContactDealCta, [data-stage1-cta='1'], #postDealDocsCta, [data-stage1-docs-cta='1']")
          : null;

        if (!btn) return;

        ev.preventDefault();

        if (btn.matches("#postDealDocsCta, [data-stage1-docs-cta='1']")) {
          activateDealDocsCta();
          return;
        }

        activatePostContactDealCta();
      },
      true
    );

    state.boundCtaDelegate = true;
  }

  function boot() {
    replaceColab1Input();
    ensureDealHeader();
    ensureDocsInlineStatusMirror();
    refreshUi();
    bindDealButtons();
    bindDelegatedClicks();
    installSummaryObserver();
    installRutLookupObserver();
    installStatusObserver();
    installDealSummaryObserver();
    installDocsStatusObserver();
    bindContactFieldRefresh();

    if (state.headerPinned) {
      renderDealHeader(true);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
