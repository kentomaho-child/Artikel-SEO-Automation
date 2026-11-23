/**
 * Artikel SEO Desk - Frontend Client Application
 * Clean, lightweight, anti-AI-slop single page application
 */

(function () {
  "use strict";

  // Application State
  const state = {
    articles: [],
    activeArticle: null,
    presets: [],
    llmStatus: {
      freeModeAvailable: true,
      dailyLimit: 3,
      usedToday: 0,
      remainingToday: 3,
      serverModel: "gemini-2.5-flash",
    },
    currentOutline: null,
    isDirty: false,
    activeView: "new-article", // 'new-article' | 'review-outline' | 'article-detail' | 'settings' | 'presets'
  };

  // Local Storage for BYOK settings
  const STORAGE_KEY = "artikel_seo_llm_settings";

  function getStoredSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return {
      mode: "free",
      provider: "gemini",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
      model: "gemini-2.5-flash",
      apiKey: "",
    };
  }

  function saveStoredSettings(settings) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {}
  }

  // Pre-configured Provider Presets
  const PROVIDER_PRESETS = {
    gemini: {
      baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
      model: "gemini-2.5-flash",
      help: "Dapatkan API Key gratis di Google AI Studio (aistudio.google.com).",
    },
    groq: {
      baseUrl: "https://api.groq.com/openai/v1",
      model: "llama-3.3-70b-versatile",
      help: "Dapatkan API Key gratis dengan kecepatan tinggi di console.groq.com.",
    },
    openrouter: {
      baseUrl: "https://openrouter.ai/api/v1",
      model: "meta-llama/llama-3.3-70b-instruct:free",
      help: "Dapatkan API Key di openrouter.ai (tersedia banyak model :free).",
    },
    openai: {
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4o-mini",
      help: "Dapatkan API Key di platform.openai.com.",
    },
    ollama: {
      baseUrl: "http://localhost:11434/v1",
      model: "qwen2.5:7b",
      help: "Jalankan Ollama di komputer Anda (`ollama run qwen2.5:7b`). Tanpa API Key.",
    },
    custom: {
      baseUrl: "",
      model: "",
      help: "Gunakan endpoint OpenAI-compatible kustom milik Anda.",
    },
  };

  // Build HTTP Headers for AI Requests
  function getAiHeaders() {
    const settings = getStoredSettings();
    const headers = {
      "Content-Type": "application/json",
    };

    if (settings.mode === "byok") {
      headers["X-LLM-Mode"] = "byok";
      if (settings.apiKey) headers["X-LLM-API-Key"] = settings.apiKey;
      if (settings.baseUrl) headers["X-LLM-Base-URL"] = settings.baseUrl;
      if (settings.model) headers["X-LLM-Model"] = settings.model;
    } else {
      headers["X-LLM-Mode"] = "free";
    }

    return headers;
  }

  // DOM Elements
  const el = {
    // Sidebar
    btnNewArticle: document.getElementById("btn-new-article"),
    articleSearch: document.getElementById("article-search"),
    articleList: document.getElementById("article-list"),
    navPresetsBtn: document.getElementById("nav-presets-btn"),
    navSettingsBtn: document.getElementById("nav-settings-btn"),
    sidebarApiPill: document.getElementById("sidebar-api-pill"),

    // Top Notice
    topNotice: document.getElementById("top-notice"),
    noticeText: document.getElementById("notice-text"),
    noticeAction: document.getElementById("notice-action"),

    // Views
    viewNewArticle: document.getElementById("view-new-article"),
    viewReviewOutline: document.getElementById("view-review-outline"),
    viewArticleDetail: document.getElementById("view-article-detail"),
    viewSettings: document.getElementById("view-settings"),
    viewPresets: document.getElementById("view-presets"),

    // Form New Article
    formNewArticle: document.getElementById("form-new-article"),
    selectPreset: document.getElementById("select-preset"),
    btnApplyPreset: document.getElementById("btn-apply-preset"),
    inputKeyword: document.getElementById("input-keyword"),
    inputWordCount: document.getElementById("input-word-count"),
    inputSecondaryKeywords: document.getElementById("input-secondary-keywords"),
    inputAudience: document.getElementById("input-audience"),
    selectStyle: document.getElementById("select-style"),
    selectPov: document.getElementById("select-pov"),
    selectLanguage: document.getElementById("select-language"),
    inputInstructions: document.getElementById("input-instructions"),
    btnSubmitOutline: document.getElementById("btn-submit-outline"),
    btnSubmitDirect: document.getElementById("btn-submit-direct"),
    progressBox: document.getElementById("progress-box"),
    progressStatusTitle: document.getElementById("progress-status-title"),
    progressStatusDetail: document.getElementById("progress-status-detail"),

    // Review Outline View
    btnBackToForm: document.getElementById("btn-back-to-form"),
    outlineTitle: document.getElementById("outline-title"),
    outlineTitleCounter: document.getElementById("outline-title-counter"),
    outlineSlug: document.getElementById("outline-slug"),
    outlineMeta: document.getElementById("outline-meta"),
    outlineMetaCounter: document.getElementById("outline-meta-counter"),
    outlineSectionItems: document.getElementById("outline-section-items"),
    btnAddOutlineSection: document.getElementById("btn-add-outline-section"),
    btnConfirmGenerate: document.getElementById("btn-confirm-generate"),

    // Detail View
    detailTitle: document.getElementById("detail-title"),
    detailTitleCounter: document.getElementById("detail-title-counter"),
    detailSlug: document.getElementById("detail-slug"),
    detailMeta: document.getElementById("detail-meta"),
    detailMetaCounter: document.getElementById("detail-meta-counter"),
    tabModePreview: document.getElementById("tab-mode-preview"),
    tabModeMarkdown: document.getElementById("tab-mode-markdown"),
    articlePreviewPane: document.getElementById("article-preview-pane"),
    articleMarkdownPane: document.getElementById("article-markdown-pane"),
    detailContent: document.getElementById("detail-content"),
    saveStatusText: document.getElementById("save-status-text"),
    btnSaveArticle: document.getElementById("btn-save-article"),
    btnExpandArticle: document.getElementById("btn-expand-article"),
    btnCopyMd: document.getElementById("btn-copy-md"),
    btnCopyHtml: document.getElementById("btn-copy-html"),
    btnDownloadMenu: document.getElementById("btn-download-menu"),
    downloadDropdown: document.getElementById("download-dropdown"),
    btnDownloadMd: document.getElementById("btn-download-md"),
    btnDownloadHtml: document.getElementById("btn-download-html"),
    btnDeleteArticle: document.getElementById("btn-delete-article"),

    // Settings View
    radioModeFree: document.getElementById("radio-mode-free"),
    radioModeByok: document.getElementById("radio-mode-byok"),
    byokFields: document.getElementById("byok-fields"),
    byokProvider: document.getElementById("byok-provider"),
    byokBaseUrl: document.getElementById("byok-base-url"),
    byokModel: document.getElementById("byok-model"),
    byokApiKey: document.getElementById("byok-api-key"),
    btnToggleKeyVisibility: document.getElementById("btn-toggle-key-visibility"),
    providerHelpText: document.getElementById("provider-help-text"),
    btnTestConnection: document.getElementById("btn-test-connection"),
    btnSaveSettings: document.getElementById("btn-save-settings"),
    testResultBox: document.getElementById("test-result-box"),

    // Presets View
    presetsItemsGrid: document.getElementById("presets-items-grid"),
    formAddPreset: document.getElementById("form-add-preset"),

    // Inspector
    inspectorBadgeScore: document.getElementById("inspector-badge-score"),
    scoreVal: document.getElementById("score-val"),
    scoreBarFill: document.getElementById("score-bar-fill"),
    metricWordCount: document.getElementById("metric-word-count"),
    metricReadingTime: document.getElementById("metric-reading-time"),
    metricDensity: document.getElementById("metric-density"),
    metricHeadings: document.getElementById("metric-headings"),
    checklistItems: document.getElementById("checklist-items"),
  };

  // Safe client-side Markdown parser (XSS-safe)
  function renderMarkdownSafe(md) {
    if (!md) return "<p><em>Konten artikel kosong.</em></p>";

    // 1. HTML entity escape
    let safe = md
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // 2. Code blocks
    safe = safe.replace(/```([a-z0-9]*)\n([\s\S]*?)```/g, function (_, lang, code) {
      return `<pre><code>${code.trim()}</code></pre>`;
    });

    // 3. Inline code
    safe = safe.replace(/`([^`]+)`/g, "<code>$1</code>");

    // 4. Headings
    safe = safe.replace(/^### (.*$)/gim, "<h3>$1</h3>");
    safe = safe.replace(/^## (.*$)/gim, "<h2>$1</h2>");
    safe = safe.replace(/^# (.*$)/gim, "<h1>$1</h1>");

    // 5. Blockquotes
    safe = safe.replace(/^\> (.*$)/gim, "<blockquote>$1</blockquote>");

    // 6. Bold & Italic
    safe = safe.replace(/\*\*\*(.*?)\*\*\*/g, "<strong><em>$1</em></strong>");
    safe = safe.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    safe = safe.replace(/\*(.*?)\*/g, "<em>$1</em>");

    // 7. Unordered lists
    safe = safe.replace(/^\s*[-*+]\s+(.*$)/gim, "<li>$1</li>");
    safe = safe.replace(/(<li>[\s\S]*?<\/li>)/gim, "<ul>$1</ul>");
    // Clean nested duplicate ul
    safe = safe.replace(/<\/ul>\s*<ul>/g, "");

    // 8. Ordered lists
    safe = safe.replace(/^\s*\d+\.\s+(.*$)/gim, "<li>$1</li>");

    // 9. Paragraphs (split by double newlines)
    const blocks = safe.split(/\n\n+/);
    const htmlBlocks = blocks.map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      if (
        trimmed.startsWith("<h1") ||
        trimmed.startsWith("<h2") ||
        trimmed.startsWith("<h3") ||
        trimmed.startsWith("<pre") ||
        trimmed.startsWith("<ul") ||
        trimmed.startsWith("<ol") ||
        trimmed.startsWith("<blockquote") ||
        trimmed.startsWith("<table")
      ) {
        return trimmed;
      }
      return `<p>${trimmed.replace(/\n/g, "<br>")}</p>`;
    });

    return htmlBlocks.join("\n");
  }

  // Switch View
  function showView(viewName) {
    state.activeView = viewName;
    el.viewNewArticle.classList.add("hidden");
    el.viewReviewOutline.classList.add("hidden");
    el.viewArticleDetail.classList.add("hidden");
    el.viewSettings.classList.add("hidden");
    el.viewPresets.classList.add("hidden");

    if (viewName === "new-article") el.viewNewArticle.classList.remove("hidden");
    if (viewName === "review-outline") el.viewReviewOutline.classList.remove("hidden");
    if (viewName === "article-detail") el.viewArticleDetail.classList.remove("hidden");
    if (viewName === "settings") el.viewSettings.classList.remove("hidden");
    if (viewName === "presets") el.viewPresets.classList.remove("hidden");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Update Quota / Top Notice
  function updateQuotaNotice() {
    const settings = getStoredSettings();

    if (settings.mode === "byok") {
      el.sidebarApiPill.textContent = "API Sendiri";
      el.sidebarApiPill.className = "status-pill status-pill-pass";
      el.topNotice.className = "top-notice";
      el.noticeText.textContent = `Mode API Sendiri Aktif (${settings.provider.toUpperCase()} · ${settings.model}) — Bebas Kuota Aplikasi.`;
      el.noticeAction.textContent = "Ubah Pengaturan";
      return;
    }

    // Free Mode
    const remaining = state.llmStatus.remainingToday;
    const limit = state.llmStatus.dailyLimit;

    if (!state.llmStatus.freeModeAvailable) {
      el.sidebarApiPill.textContent = "Belum Diatur";
      el.sidebarApiPill.className = "status-pill status-pill-warn";
      el.topNotice.className = "top-notice warn";
      el.noticeText.textContent =
        "Server belum memiliki API Key bawaan. Silakan masukkan API Key Anda di Pengaturan API.";
      el.noticeAction.textContent = "Buka Pengaturan API";
    } else if (remaining <= 0) {
      el.sidebarApiPill.textContent = "Kuota Habis";
      el.sidebarApiPill.className = "status-pill status-pill-warn";
      el.topNotice.className = "top-notice warn";
      el.noticeText.textContent = `Kuota gratis harian Anda telah habis (${limit}/${limit} artikel hari ini). Masukkan API Key Anda untuk lanjut tanpa batas.`;
      el.noticeAction.textContent = "Gunakan API Sendiri";
    } else {
      el.sidebarApiPill.textContent = `Gratis · ${remaining}/${limit}`;
      el.sidebarApiPill.className = "status-pill status-pill-muted";
      el.topNotice.className = "top-notice";
      el.noticeText.textContent = `Mode Gratis: sisa ${remaining} dari ${limit} artikel hari ini. Ingin tanpa batas?`;
      el.noticeAction.textContent = "Gunakan API Sendiri";
    }
  }

  // Fetch LLM Status from backend
  async function fetchLlmStatus() {
    try {
      const res = await fetch("/api/llm/status");
      if (res.ok) {
        state.llmStatus = await res.json();
      }
    } catch {}
    updateQuotaNotice();
  }

  // Fetch Presets
  async function fetchPresets() {
    try {
      const res = await fetch("/api/presets");
      if (res.ok) {
        state.presets = await res.json();
        renderPresetDropdown();
        renderPresetsGrid();
      }
    } catch {}
  }

  function renderPresetDropdown() {
    el.selectPreset.innerHTML = '<option value="">-- Isi Manual / Pilih Preset --</option>';
    state.presets.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = `${p.name} (${p.targetAudience.slice(0, 30)}...)`;
      el.selectPreset.appendChild(opt);
    });
  }

  function renderPresetsGrid() {
    el.presetsItemsGrid.innerHTML = "";
    if (state.presets.length === 0) {
      el.presetsItemsGrid.innerHTML = '<div class="checklist-placeholder">Belum ada preset.</div>';
      return;
    }

    state.presets.forEach((p) => {
      const item = document.createElement("div");
      item.className = "preset-card-item";
      item.innerHTML = `
        <div class="preset-header">
          <span class="preset-title">${p.name}</span>
          ${p.id > 4 ? `<button class="btn-text-action btn-delete-preset" data-id="${p.id}" style="color:var(--color-fail)">Hapus</button>` : '<span style="font-size:0.7rem;color:var(--text-muted)">Bawaan</span>'}
        </div>
        <div class="preset-body">
          <div><strong>Audiens:</strong> ${p.targetAudience}</div>
          <div><strong>Tone:</strong> ${p.languageStyle} (Sapaan: ${p.pov})</div>
          ${p.customInstructions ? `<div><strong>Instruksi:</strong> ${p.customInstructions}</div>` : ""}
        </div>
      `;
      el.presetsItemsGrid.appendChild(item);
    });

    el.presetsItemsGrid.querySelectorAll(".btn-delete-preset").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const id = e.target.getAttribute("data-id");
        if (confirm("Hapus preset kustom ini?")) {
          await fetch(`/api/presets/${id}`, { method: "DELETE" });
          await fetchPresets();
        }
      });
    });
  }

  // Fetch Articles
  async function fetchArticles() {
    const search = el.articleSearch.value.trim();
    const activeFilter = document.querySelector(".filter-btn.active")?.dataset.filter || "all";
    let url = `/api/articles?search=${encodeURIComponent(search)}`;
    if (activeFilter !== "all") url += `&status=${encodeURIComponent(activeFilter)}`;

    try {
      const res = await fetch(url);
      if (res.ok) {
        state.articles = await res.json();
        renderArticleList();
      }
    } catch {}
  }

  function renderArticleList() {
    el.articleList.innerHTML = "";
    if (state.articles.length === 0) {
      el.articleList.innerHTML = '<div class="checklist-placeholder">Belum ada artikel. Klik "+ Artikel Baru" di atas.</div>';
      return;
    }

    state.articles.forEach((art) => {
      const item = document.createElement("div");
      const isActive = state.activeArticle && state.activeArticle.id === art.id;
      item.className = `article-card-item ${isActive ? "active" : ""}`;

      let scoreClass = "fail";
      if (art.seoScore >= 80) scoreClass = "pass";
      else if (art.seoScore >= 60) scoreClass = "warn";

      item.innerHTML = `
        <div class="item-title">${escapeHtml(art.title)}</div>
        <div class="item-meta">
          <span class="font-mono">${art.wordCount.toLocaleString("id-ID")} kata</span>
          <span class="item-score-badge ${scoreClass} font-mono">${art.seoScore}/100</span>
        </div>
      `;

      item.addEventListener("click", () => {
        selectArticle(art.id);
      });

      el.articleList.appendChild(item);
    });
  }

  async function selectArticle(id) {
    try {
      const res = await fetch(`/api/articles/${id}`);
      if (res.ok) {
        state.activeArticle = await res.json();
        populateArticleDetail();
        showView("article-detail");
        renderArticleList();
        renderSeoInspector(state.activeArticle.seoReport);
      }
    } catch {}
  }

  function populateArticleDetail() {
    const art = state.activeArticle;
    if (!art) return;

    el.detailTitle.value = art.title;
    el.detailSlug.value = art.slug;
    el.detailMeta.value = art.metaDescription || "";
    el.detailContent.value = art.content || "";

    updateDetailCounters();
    renderActiveArticlePreview();

    setClean();
  }

  function updateDetailCounters() {
    const titleLen = el.detailTitle.value.length;
    el.detailTitleCounter.textContent = `${titleLen} / 60`;
    el.detailTitleCounter.className = `char-counter font-mono ${titleLen < 45 || titleLen > 65 ? "warning" : ""}`;

    const metaLen = el.detailMeta.value.length;
    el.detailMetaCounter.textContent = `${metaLen} / 160`;
    el.detailMetaCounter.className = `char-counter font-mono ${metaLen < 120 || metaLen > 165 ? "warning" : ""}`;
  }

  function renderActiveArticlePreview() {
    const content = el.detailContent.value;
    el.articlePreviewPane.innerHTML = renderMarkdownSafe(content);
  }

  // Dirty State Tracker
  function setDirty() {
    state.isDirty = true;
    el.saveStatusText.textContent = "Ada perubahan belum disimpan";
    el.btnSaveArticle.classList.remove("hidden");
  }

  function setClean() {
    state.isDirty = false;
    el.saveStatusText.textContent = "Semua tersimpan";
    el.btnSaveArticle.classList.add("hidden");
  }

  // SEO Inspector Rendering
  function renderSeoInspector(report) {
    if (!report) {
      el.scoreVal.textContent = "0";
      el.scoreBarFill.style.width = "0%";
      el.inspectorBadgeScore.textContent = "--";
      el.inspectorBadgeScore.className = "inspector-badge";
      el.metricWordCount.textContent = "0";
      el.metricReadingTime.textContent = "0 mnt";
      el.metricDensity.textContent = "0%";
      el.metricHeadings.textContent = "0 / 0 / 0";
      el.checklistItems.innerHTML = '<div class="checklist-placeholder">Belum ada artikel yang dipilih.</div>';
      return;
    }

    const score = report.score || 0;
    el.scoreVal.textContent = score;
    el.scoreBarFill.style.width = `${score}%`;

    let badgeClass = "item-score-badge fail";
    let badgeText = "Perlu Perbaikan";
    if (score >= 80) {
      badgeClass = "item-score-badge pass";
      badgeText = "Sangat Baik";
      el.scoreBarFill.style.backgroundColor = "var(--color-pass)";
    } else if (score >= 60) {
      badgeClass = "item-score-badge warn";
      badgeText = "Cukup";
      el.scoreBarFill.style.backgroundColor = "var(--color-warn)";
    } else {
      el.scoreBarFill.style.backgroundColor = "var(--color-fail)";
    }

    el.inspectorBadgeScore.textContent = badgeText;
    el.inspectorBadgeScore.className = `inspector-badge ${badgeClass}`;

    el.metricWordCount.textContent = (report.wordCount || 0).toLocaleString("id-ID");
    el.metricReadingTime.textContent = `${report.readingTimeMinutes || 1} mnt`;
    el.metricDensity.textContent = `${report.keywordDensity || 0}%`;

    const h = report.headings || { h1: 0, h2: 0, h3: 0 };
    el.metricHeadings.textContent = `${h.h1} / ${h.h2} / ${h.h3}`;

    // Checklist
    el.checklistItems.innerHTML = "";
    (report.checks || []).forEach((c) => {
      const item = document.createElement("div");
      item.className = `check-item ${c.status}`;

      let icon = "✓";
      if (c.status === "warn") icon = "!";
      if (c.status === "fail") icon = "×";

      item.innerHTML = `
        <div class="check-item-header">
          <span class="check-status-icon">${icon}</span>
          <span>${escapeHtml(c.title)}</span>
        </div>
        <div class="check-item-msg">${escapeHtml(c.message)}</div>
      `;
      el.checklistItems.appendChild(item);
    });
  }

  // Save Article Edits
  async function saveArticleEdits() {
    if (!state.activeArticle) return;
    const id = state.activeArticle.id;

    const payload = {
      title: el.detailTitle.value.trim(),
      slug: el.detailSlug.value.trim(),
      metaDescription: el.detailMeta.value.trim(),
      content: el.detailContent.value,
    };

    try {
      el.saveStatusText.textContent = "Menyimpan...";
      const res = await fetch(`/api/articles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        state.activeArticle = await res.json();
        setClean();
        renderSeoInspector(state.activeArticle.seoReport);
        fetchArticles();
      } else {
        el.saveStatusText.textContent = "Gagal menyimpan";
      }
    } catch {
      el.saveStatusText.textContent = "Koneksi terputus";
    }
  }

  // Populate Settings Page
  function loadSettingsIntoUi() {
    const settings = getStoredSettings();
    if (settings.mode === "byok") {
      el.radioModeByok.checked = true;
      el.byokFields.style.opacity = "1";
      el.byokFields.style.pointerEvents = "auto";
    } else {
      el.radioModeFree.checked = true;
      el.byokFields.style.opacity = "0.6";
      el.byokFields.style.pointerEvents = "none";
    }

    el.byokProvider.value = settings.provider || "gemini";
    el.byokBaseUrl.value = settings.baseUrl || "";
    el.byokModel.value = settings.model || "";
    el.byokApiKey.value = settings.apiKey || "";

    const presetHelp = PROVIDER_PRESETS[el.byokProvider.value]?.help;
    if (presetHelp) el.providerHelpText.textContent = presetHelp;
  }

  // Save Settings from UI
  function saveSettingsFromUi() {
    const isByok = el.radioModeByok.checked;
    const settings = {
      mode: isByok ? "byok" : "free",
      provider: el.byokProvider.value,
      baseUrl: el.byokBaseUrl.value.trim(),
      model: el.byokModel.value.trim(),
      apiKey: el.byokApiKey.value.trim(),
    };

    saveStoredSettings(settings);
    updateQuotaNotice();

    el.testResultBox.className = "test-result-box success";
    el.testResultBox.textContent = "Pengaturan berhasil disimpan di browser Anda.";
    el.testResultBox.classList.remove("hidden");
    setTimeout(() => {
      el.testResultBox.classList.add("hidden");
    }, 4000);
  }

  // EVENT LISTENERS

  // 1. Navigation
  el.btnNewArticle.addEventListener("click", () => {
    state.activeArticle = null;
    showView("new-article");
    renderSeoInspector(null);
  });

  el.navPresetsBtn.addEventListener("click", () => {
    showView("presets");
  });

  el.navSettingsBtn.addEventListener("click", () => {
    loadSettingsIntoUi();
    showView("settings");
  });

  el.noticeAction.addEventListener("click", () => {
    loadSettingsIntoUi();
    showView("settings");
  });

  el.btnBackToForm.addEventListener("click", () => {
    showView("new-article");
  });

  // 2. Preset Picker on Form
  el.btnApplyPreset.addEventListener("click", () => {
    const presetId = Number(el.selectPreset.value);
    if (!presetId) return;
    const p = state.presets.find((x) => x.id === presetId);
    if (p) {
      el.inputAudience.value = p.targetAudience;
      el.selectStyle.value = p.languageStyle;
      el.selectPov.value = p.pov;
      el.selectLanguage.value = p.language || "id";
      if (p.customInstructions) el.inputInstructions.value = p.customInstructions;
    }
  });

  // 3. Form Submission: Generate Outline
  el.btnSubmitOutline.addEventListener("click", async () => {
    const keyword = el.inputKeyword.value.trim();
    if (!keyword) {
      alert("Silakan masukkan Kata Kunci Utama terlebih dahulu.");
      el.inputKeyword.focus();
      return;
    }

    const payload = {
      keyword,
      targetWordCount: Math.max(1000, Number(el.inputWordCount.value) || 1200),
      secondaryKeywords: el.inputSecondaryKeywords.value.trim(),
      targetAudience: el.inputAudience.value.trim(),
      languageStyle: el.selectStyle.value,
      pov: el.selectPov.value,
      language: el.selectLanguage.value,
      customInstructions: el.inputInstructions.value.trim(),
    };

    // Show Progress
    el.progressBox.classList.remove("hidden");
    el.formNewArticle.classList.add("hidden");
    el.progressStatusTitle.textContent = "Menyusun Outline & Analisis Kata Kunci...";
    el.progressStatusDetail = `Menghubungkan ke ${getStoredSettings().mode === "byok" ? getStoredSettings().model : "Server AI"} untuk merancang struktur artikel.`;

    try {
      const res = await fetch("/api/articles/outline", {
        method: "POST",
        headers: getAiHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `Error status ${res.status}`);
      }

      state.currentOutline = await res.json();
      populateReviewOutline(state.currentOutline);
      showView("review-outline");
    } catch (err) {
      alert(`Gagal membuat outline: ${err.message}`);
    } finally {
      el.progressBox.classList.add("hidden");
      el.formNewArticle.classList.remove("hidden");
      fetchLlmStatus();
    }
  });

  // 4. Form Submission: Direct Generate (1-Click)
  el.btnSubmitDirect.addEventListener("click", async () => {
    const keyword = el.inputKeyword.value.trim();
    if (!keyword) {
      alert("Silakan masukkan Kata Kunci Utama terlebih dahulu.");
      el.inputKeyword.focus();
      return;
    }

    const payload = {
      keyword,
      targetWordCount: Math.max(1000, Number(el.inputWordCount.value) || 1200),
      secondaryKeywords: el.inputSecondaryKeywords.value.trim(),
      targetAudience: el.inputAudience.value.trim(),
      languageStyle: el.selectStyle.value,
      pov: el.selectPov.value,
      language: el.selectLanguage.value,
      customInstructions: el.inputInstructions.value.trim(),
    };

    startDirectGeneration(payload);
  });

  async function startDirectGeneration(payload) {
    el.progressBox.classList.remove("hidden");
    el.formNewArticle.classList.add("hidden");
    el.progressStatusTitle.textContent = "Menulis Artikel Lengkap (>= 1.000 Kata)...";
    el.progressStatusDetail.textContent = "Tahap 1: Menyusun outline -> Tahap 2: Menulis isi -> Tahap 3: Verifikasi target kata & SEO.";

    try {
      const res = await fetch("/api/articles/generate", {
        method: "POST",
        headers: getAiHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `Error status ${res.status}`);
      }

      state.activeArticle = await res.json();
      populateArticleDetail();
      showView("article-detail");
      renderSeoInspector(state.activeArticle.seoReport);
      fetchArticles();
      fetchLlmStatus();
    } catch (err) {
      alert(`Gagal membuat artikel: ${err.message}`);
    } finally {
      el.progressBox.classList.add("hidden");
      el.formNewArticle.classList.remove("hidden");
    }
  }

  // Populate Outline Review Step
  function populateReviewOutline(outline) {
    el.outlineTitle.value = outline.title;
    el.outlineSlug.value = outline.slug;
    el.outlineMeta.value = outline.metaDescription;

    updateOutlineCounters();
    renderOutlineSectionsList(outline.outline || []);
  }

  function updateOutlineCounters() {
    const titleLen = el.outlineTitle.value.length;
    el.outlineTitleCounter.textContent = `${titleLen} / 60`;

    const metaLen = el.outlineMeta.value.length;
    el.outlineMetaCounter.textContent = `${metaLen} / 160`;
  }

  el.outlineTitle.addEventListener("input", updateOutlineCounters);
  el.outlineMeta.addEventListener("input", updateOutlineCounters);

  function renderOutlineSectionsList(sections) {
    el.outlineSectionItems.innerHTML = "";
    sections.forEach((sec, idx) => {
      const row = document.createElement("div");
      row.className = "outline-section-row";
      row.innerHTML = `
        <div class="outline-section-main-fields">
          <input type="text" class="outline-heading-input" value="${escapeHtml(sec.heading)}" placeholder="Judul Bagian H2">
          <input type="number" class="outline-words-input font-mono" value="${sec.targetWords || 250}" title="Estimasi Target Kata">
          <button type="button" class="btn-text-action btn-remove-section" style="color:var(--color-fail)">Hapus</button>
        </div>
        <input type="text" class="outline-subheadings-input" value="${escapeHtml((sec.subheadings || []).join(", "))}" placeholder="Sub-poin H3 (pisahkan dengan koma)">
      `;

      row.querySelector(".btn-remove-section").addEventListener("click", () => {
        row.remove();
      });

      el.outlineSectionItems.appendChild(row);
    });
  }

  el.btnAddOutlineSection.addEventListener("click", () => {
    const row = document.createElement("div");
    row.className = "outline-section-row";
    row.innerHTML = `
      <div class="outline-section-main-fields">
        <input type="text" class="outline-heading-input" value="Sub-Topik Tambahan" placeholder="Judul Bagian H2">
        <input type="number" class="outline-words-input font-mono" value="250" title="Estimasi Target Kata">
        <button type="button" class="btn-text-action btn-remove-section" style="color:var(--color-fail)">Hapus</button>
      </div>
      <input type="text" class="outline-subheadings-input" value="Langkah praktis, Contoh kasus" placeholder="Sub-poin H3 (pisahkan dengan koma)">
    `;
    row.querySelector(".btn-remove-section").addEventListener("click", () => {
      row.remove();
    });
    el.outlineSectionItems.appendChild(row);
  });

  // Confirm Generate from Outline Review Step
  el.btnConfirmGenerate.addEventListener("click", async () => {
    // Read edited outline
    const editedSections = [];
    const rows = el.outlineSectionItems.querySelectorAll(".outline-section-row");
    rows.forEach((r) => {
      const heading = r.querySelector(".outline-heading-input").value.trim();
      const targetWords = Number(r.querySelector(".outline-words-input").value) || 200;
      const subs = r.querySelector(".outline-subheadings-input").value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      if (heading) {
        editedSections.push({ heading, targetWords, subheadings: subs });
      }
    });

    const customOutline = {
      title: el.outlineTitle.value.trim(),
      slug: el.outlineSlug.value.trim(),
      metaDescription: el.outlineMeta.value.trim(),
      secondaryKeywords: state.currentOutline.secondaryKeywords || [],
      outline: editedSections,
    };

    const payload = {
      keyword: el.inputKeyword.value.trim(),
      targetWordCount: Math.max(1000, Number(el.inputWordCount.value) || 1200),
      secondaryKeywords: el.inputSecondaryKeywords.value.trim(),
      targetAudience: el.inputAudience.value.trim(),
      languageStyle: el.selectStyle.value,
      pov: el.selectPov.value,
      language: el.selectLanguage.value,
      customInstructions: el.inputInstructions.value.trim(),
      customOutline,
    };

    showView("new-article");
    startDirectGeneration(payload);
  });

  // 5. Editor Detail Actions
  el.detailTitle.addEventListener("input", () => {
    updateDetailCounters();
    setDirty();
  });
  el.detailSlug.addEventListener("input", setDirty);
  el.detailMeta.addEventListener("input", () => {
    updateDetailCounters();
    setDirty();
  });
  el.detailContent.addEventListener("input", () => {
    setDirty();
    renderActiveArticlePreview();
  });

  el.btnSaveArticle.addEventListener("click", saveArticleEdits);

  // Tabs Preview vs Markdown
  el.tabModePreview.addEventListener("click", () => {
    el.tabModePreview.classList.add("active");
    el.tabModeMarkdown.classList.remove("active");
    el.articlePreviewPane.classList.remove("hidden");
    el.articleMarkdownPane.classList.add("hidden");
    renderActiveArticlePreview();
  });

  el.tabModeMarkdown.addEventListener("click", () => {
    el.tabModeMarkdown.classList.add("active");
    el.tabModePreview.classList.remove("active");
    el.articleMarkdownPane.classList.remove("hidden");
    el.articlePreviewPane.classList.add("hidden");
  });

  // Expand Article
  el.btnExpandArticle.addEventListener("click", async () => {
    if (!state.activeArticle) return;
    const instructions = prompt(
      "Instruksi tambahan untuk perpanjangan konten (opsional):",
      "Perdalam contoh praktis dan studi kasus"
    );
    if (instructions === null) return;

    el.saveStatusText.textContent = "Sedang memperpanjang konten...";
    try {
      const res = await fetch(`/api/articles/${state.activeArticle.id}/expand`, {
        method: "POST",
        headers: getAiHeaders(),
        body: JSON.stringify({ instructions }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `Error status ${res.status}`);
      }

      state.activeArticle = await res.json();
      populateArticleDetail();
      renderSeoInspector(state.activeArticle.seoReport);
      fetchArticles();
      fetchLlmStatus();
    } catch (err) {
      alert(`Gagal memperpanjang artikel: ${err.message}`);
    } finally {
      el.saveStatusText.textContent = "Semua tersimpan";
    }
  });

  // Copy Markdown
  el.btnCopyMd.addEventListener("click", () => {
    const text = el.detailContent.value;
    navigator.clipboard.writeText(text).then(() => {
      const orig = el.btnCopyMd.textContent;
      el.btnCopyMd.textContent = "Disalin ✓";
      setTimeout(() => (el.btnCopyMd.textContent = orig), 2000);
    });
  });

  // Copy HTML
  el.btnCopyHtml.addEventListener("click", () => {
    const html = el.articlePreviewPane.innerHTML;
    navigator.clipboard.writeText(html).then(() => {
      const orig = el.btnCopyHtml.textContent;
      el.btnCopyHtml.textContent = "Disalin ✓";
      setTimeout(() => (el.btnCopyHtml.textContent = orig), 2000);
    });
  });

  // Download Dropdown
  el.btnDownloadMenu.addEventListener("click", (e) => {
    e.stopPropagation();
    el.downloadDropdown.classList.toggle("hidden");
  });

  document.addEventListener("click", () => {
    el.downloadDropdown.classList.add("hidden");
  });

  el.btnDownloadMd.addEventListener("click", () => {
    if (!state.activeArticle) return;
    window.location.href = `/api/articles/${state.activeArticle.id}/export?format=md`;
  });

  el.btnDownloadHtml.addEventListener("click", () => {
    if (!state.activeArticle) return;
    window.location.href = `/api/articles/${state.activeArticle.id}/export?format=html`;
  });

  // Delete Article
  el.btnDeleteArticle.addEventListener("click", async () => {
    if (!state.activeArticle) return;
    if (!confirm(`Hapus artikel "${state.activeArticle.title}" secara permanen?`)) return;

    try {
      const res = await fetch(`/api/articles/${state.activeArticle.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        state.activeArticle = null;
        fetchArticles();
        showView("new-article");
        renderSeoInspector(null);
      }
    } catch {}
  });

  // 6. Settings Handlers
  el.radioModeFree.addEventListener("change", () => {
    el.byokFields.style.opacity = "0.6";
    el.byokFields.style.pointerEvents = "none";
  });

  el.radioModeByok.addEventListener("change", () => {
    el.byokFields.style.opacity = "1";
    el.byokFields.style.pointerEvents = "auto";
  });

  el.byokProvider.addEventListener("change", () => {
    const val = el.byokProvider.value;
    const preset = PROVIDER_PRESETS[val];
    if (preset) {
      if (preset.baseUrl) el.byokBaseUrl.value = preset.baseUrl;
      if (preset.model) el.byokModel.value = preset.model;
      el.providerHelpText.textContent = preset.help;
    }
  });

  el.btnToggleKeyVisibility.addEventListener("click", () => {
    if (el.byokApiKey.type === "password") {
      el.byokApiKey.type = "text";
      el.btnToggleKeyVisibility.textContent = "Sembunyikan";
    } else {
      el.byokApiKey.type = "password";
      el.btnToggleKeyVisibility.textContent = "Tampilkan";
    }
  });

  el.btnSaveSettings.addEventListener("click", saveSettingsFromUi);

  el.btnTestConnection.addEventListener("click", async () => {
    const isByok = el.radioModeByok.checked;
    const payload = isByok
      ? {
          apiKey: el.byokApiKey.value.trim(),
          baseUrl: el.byokBaseUrl.value.trim(),
          model: el.byokModel.value.trim(),
        }
      : {};

    el.testResultBox.className = "test-result-box";
    el.testResultBox.textContent = "Menguji koneksi ke model...";
    el.testResultBox.classList.remove("hidden");

    try {
      const res = await fetch("/api/llm/test", {
        method: "POST",
        headers: isByok
          ? {
              "Content-Type": "application/json",
              "X-LLM-Mode": "byok",
              "X-LLM-API-Key": el.byokApiKey.value.trim(),
              "X-LLM-Base-URL": el.byokBaseUrl.value.trim(),
              "X-LLM-Model": el.byokModel.value.trim(),
            }
          : { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        el.testResultBox.className = "test-result-box success";
        el.testResultBox.textContent = `Koneksi berhasil! Model: ${data.model} siap digunakan.`;
      } else {
        el.testResultBox.className = "test-result-box error";
        el.testResultBox.textContent = `Uji koneksi gagal: ${data.message}`;
      }
    } catch (err) {
      el.testResultBox.className = "test-result-box error";
      el.testResultBox.textContent = `Koneksi gagal: ${err.message}`;
    }
  });

  // 7. Presets Form Handlers
  el.formAddPreset.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      name: document.getElementById("preset-name").value.trim(),
      targetAudience: document.getElementById("preset-audience").value.trim(),
      languageStyle: document.getElementById("preset-style").value.trim(),
      pov: document.getElementById("preset-pov").value,
      customInstructions: document.getElementById("preset-instructions").value.trim(),
    };

    try {
      const res = await fetch("/api/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        el.formAddPreset.reset();
        await fetchPresets();
        alert("Preset baru berhasil disimpan.");
      }
    } catch {}
  });

  // Search and Filter Listeners
  let searchTimeout;
  el.articleSearch.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(fetchArticles, 300);
  });

  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      fetchArticles();
    });
  });

  function escapeHtml(text) {
    if (!text) return "";
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Initialize
  async function init() {
    loadSettingsIntoUi();
    await fetchLlmStatus();
    await fetchPresets();
    await fetchArticles();
    showView("new-article");
  }

  init();
})();
