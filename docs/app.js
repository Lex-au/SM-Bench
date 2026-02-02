
(function () {
  var isRunPage = window.location.pathname.indexOf('/run/') !== -1;
  var basePath = isRunPage ? '../' : './';
  var dataBase = basePath + 'data/';
  var themeKey = 'nobs-theme';

  function setTheme(theme) {
    document.documentElement.removeAttribute('data-theme');
  }

  function initTheme() {
    setTheme('light');
  }

  function bindThemeToggle() {}

  function fetchJson(path) {
    return fetch(path).then(function (res) {
      if (!res.ok) throw new Error('Failed to load');
      return res.json();
    });
  }

  function clampScore(score) {
    var value = Number(score) || 0;
    if (value < 0) return 0;
    if (value > 100) return 100;
    return value;
  }

  function formatScore(score) {
    var value = Number(score) || 0;
    return value.toFixed(1);
  }

  function scoreToWidth(score) {
    var value = Number(score) || 0;
    if (value <= 0) return 2;
    if (value > 100) value = 100;
    return Math.max(4, value);
  }

  function formatDate(iso) {
    if (!iso) return '-';
    return String(iso).slice(0, 10);
  }

  var LOGO_RULES = [
    { prefixes: ['openai/'], nameIncludes: ['openai'], file: 'OpenAI.svg', alt: 'OpenAI' },
    { prefixes: ['anthropic/'], nameIncludes: ['anthropic', 'claude'], file: 'Anthropic.svg', alt: 'Anthropic' },
    { prefixes: ['google/'], nameIncludes: ['gemini', 'google'], file: 'GoogleGemini.png', alt: 'Google' },
    { prefixes: ['x-ai/'], idIncludes: ['xai', 'x-ai'], nameIncludes: ['xai', 'x-ai', 'grok'], file: 'xAI.png', alt: 'xAI' },
    { prefixes: ['moonshotai/'], nameIncludes: ['moonshot', 'kimi'], file: 'Moonshot.png', alt: 'Moonshot' },
    { prefixes: ['minimax/'], nameIncludes: ['minimax'], file: 'Minimax.png', alt: 'Minimax' },
    { prefixes: ['qwen/'], nameIncludes: ['qwen'], file: 'Qwen.png', alt: 'Qwen' },
    { prefixes: ['deepseek/'], nameIncludes: ['deepseek'], file: 'DeepSeek.png', alt: 'DeepSeek' },
    { prefixes: ['arcee-ai/', 'arcee/'], idIncludes: ['arcee'], nameIncludes: ['arcee'], file: 'arcee-ai.png', alt: 'Arcee AI' },
    { prefixes: ['xiaomi/'], idIncludes: ['xiaomi'], nameIncludes: ['xiaomi'], file: 'xiaomi.png', alt: 'Xiaomi' },
    { prefixes: ['zai/'], idIncludes: ['z-ai', 'zai'], nameIncludes: ['z-ai', 'zai'], file: 'zAI.png', alt: 'zAI' }
  ];

  function matchesRule(rule, identifier, name) {
    if (rule.prefixes && rule.prefixes.some(function (prefix) { return identifier.indexOf(prefix) === 0; })) {
      return true;
    }
    if (rule.idIncludes && rule.idIncludes.some(function (fragment) { return identifier.indexOf(fragment) !== -1; })) {
      return true;
    }
    if (rule.nameIncludes && rule.nameIncludes.some(function (fragment) { return name.indexOf(fragment) !== -1; })) {
      return true;
    }
    return false;
  }

  function getVendorLogo(identifier, name) {
    var id = (identifier || '').toLowerCase();
    var label = (name || '').toLowerCase();
    for (var i = 0; i < LOGO_RULES.length; i += 1) {
      if (matchesRule(LOGO_RULES[i], id, label)) {
        return { file: LOGO_RULES[i].file, alt: LOGO_RULES[i].alt };
      }
    }
    return null;
  }

  var CATEGORY_ORDER = [
    'overfit',
    'eq-boundaries',
    'nsfw',
    'nsfw-system',
    'creative-writing',
    'anti-hallucination',
    'ambiguous',
    'adversarial'
  ];

  var CATEGORY_NAME_TO_SLUG = {
    'overfit': 'overfit',
    'eq boundaries': 'eq-boundaries',
    'creative writing (mature themes)': 'creative-writing',
    'nsfw (explicit)': 'nsfw',
    'nsfw (system prompt)': 'nsfw-system',
    'ambiguous interpretation': 'ambiguous',
    'adversarial (hostile logic)': 'adversarial',
    'anti-hallucination': 'anti-hallucination'
  };

  function slugifyCategory(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function resolveCategorySlug(name, slug) {
    if (slug) {
      var normalized = slugifyCategory(slug);
      return normalized || null;
    }
    if (name) {
      var key = String(name).trim().toLowerCase();
      if (CATEGORY_NAME_TO_SLUG[key]) return CATEGORY_NAME_TO_SLUG[key];
      var fallback = slugifyCategory(name);
      return fallback || null;
    }
    return null;
  }

  function sortByCategoryOrder(items, getCategory) {
    var decorated = items.map(function (item, index) {
      var category = (getCategory && getCategory(item)) || {};
      var name = category.name || null;
      var slug = category.slug || null;
      var resolved = resolveCategorySlug(name, slug);
      var orderIndex = resolved && CATEGORY_ORDER.indexOf(resolved) !== -1 ? CATEGORY_ORDER.indexOf(resolved) : Number.MAX_SAFE_INTEGER;
      var nameKey = String(name || resolved || '').trim().toLowerCase();
      return { item: item, orderIndex: orderIndex, nameKey: nameKey, index: index };
    });
    decorated.sort(function (a, b) {
      if (a.orderIndex !== b.orderIndex) return a.orderIndex - b.orderIndex;
      if (a.nameKey !== b.nameKey) return a.nameKey.localeCompare(b.nameKey);
      return a.index - b.index;
    });
    return decorated.map(function (entry) { return entry.item; });
  }

  function isOverfitName(name, slug) {
    var resolved = resolveCategorySlug(name, slug);
    return resolved === 'overfit';
  }


  function stripVendorPrefix(raw, vendor) {
    if (!raw || !vendor) return raw;
    var lowerRaw = raw.toLowerCase();
    var lowerVendor = vendor.toLowerCase();
    if (lowerRaw.indexOf(lowerVendor) === 0) {
      var trimmed = raw.slice(vendor.length).trim();
      if (trimmed.indexOf(':') === 0 || trimmed.indexOf('-') === 0) {
        trimmed = trimmed.slice(1).trim();
      }
      return trimmed || raw;
    }
    return raw;
  }

  function trimText(text, max) {
    if (!text) return '';
    if (text.length <= max) return text;
    return text.slice(0, max - 1) + '...';
  }

  function splitModelLabel(rawName, logoAlt, max) {
    var raw = rawName || '';
    var vendor = logoAlt || '';
    var model = raw;

    if (raw.indexOf(':') !== -1) {
      var parts = raw.split(':');
      vendor = parts[0].trim() || vendor;
      model = parts.slice(1).join(':').trim();
    } else if (raw.indexOf('/') !== -1) {
      var slash = raw.split('/');
      vendor = vendor || slash[0].trim();
      model = slash.slice(1).join('/').trim();
    }

    if (!vendor) {
      vendor = raw.split(' ')[0] || raw;
    }

    if (!model || model === raw) {
      model = stripVendorPrefix(raw, vendor);
    }

    return {
      vendor: trimText(vendor, max),
      model: trimText(model || raw, max)
    };
  }


  function stripVendorName(rawName, logoAlt) {
    var raw = rawName || '';
    var vendor = logoAlt || '';
    var model = raw;

    if (raw.indexOf(':') !== -1) {
      var parts = raw.split(':');
      vendor = parts[0].trim() || vendor;
      model = parts.slice(1).join(':').trim();
    } else if (raw.indexOf('/') !== -1) {
      var slash = raw.split('/');
      vendor = vendor || slash[0].trim();
      model = slash.slice(1).join('/').trim();
    }

    if (!vendor) {
      vendor = raw.split(' ')[0] || raw;
    }

    if (!model || model === raw) {
      model = stripVendorPrefix(raw, vendor);
    }

    return model || raw;
  }

  function wrapLabel(text, limit) {
    var words = String(text || '').split(' ');
    var lines = [];
    var line = '';
    for (var i = 0; i < words.length; i += 1) {
      var word = words[i];
      if (!word) continue;
      if (word.length > limit) {
        if (line) {
          lines.push(line);
          line = '';
        }
        for (var j = 0; j < word.length; j += limit) {
          lines.push(word.slice(j, j + limit));
        }
        continue;
      }
      if (!line) {
        line = word;
        continue;
      }
      if (line.length + 1 + word.length <= limit) {
        line = line + ' ' + word;
      } else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    return lines.length ? lines : [''];
  }


  function wrapLabelLimit(text, limit, maxLines) {
    var lines = wrapLabel(text, limit);
    if (maxLines && lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      var last = lines[maxLines - 1];
      if (last.length >= limit) {
        lines[maxLines - 1] = last.slice(0, Math.max(1, limit - 1)) + '...';
      } else {
        lines[maxLines - 1] = last + '...';
      }
    }
    return lines;
  }

  function clearContainer(el) {
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
  }

  function renderLabelLines(container, lines) {
    for (var i = 0; i < lines.length; i += 1) {
      var span = document.createElement('span');
      span.textContent = lines[i];
      container.appendChild(span);
    }
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function safeHtml(html, fallback) {
    if (html && typeof html === 'string') {
      return html;
    }
    return escapeHtml(fallback || '');
  }

  function appendMarkdownBlock(container, label, html, fallback) {
    var block = document.createElement('div');
    block.className = 'markdown-block';
    var strong = document.createElement('strong');
    strong.textContent = label;
    var body = document.createElement('div');
    body.className = 'markdown';
    body.innerHTML = safeHtml(html, fallback);
    block.appendChild(strong);
    block.appendChild(body);
    container.appendChild(block);
  }

  function renderScoreChart(container, items, options) {
    clearContainer(container);
    if (!items || !items.length) {
      var empty = document.createElement('div');
      empty.className = 'export-empty';
      empty.textContent = 'No data yet.';
      container.appendChild(empty);
      return;
    }

    var chart = document.createElement('div');
    chart.className = 'export-bar-chart';
    var count = items.length;
    var barWidth = count > 16 ? 15 : count > 12 ? 19 : count > 8 ? 24 : 30;
    var labelMax = count > 16 ? 12 : count > 12 ? 14 : count > 8 ? 16 : 20;

    for (var i = 0; i < items.length; i += 1) {
      var item = items[i];
      var wrap = document.createElement('div');
      wrap.className = 'export-bar-wrap';
      wrap.style.width = barWidth + 'px';

      var scoreLabel = document.createElement('div');
      scoreLabel.className = 'export-bar-score';
      scoreLabel.textContent = formatScore(item.score);
      wrap.appendChild(scoreLabel);

      var bar = document.createElement('div');
      bar.className = 'export-bar';
      bar.style.height = clampScore(item.score) + '%';
      if (options && options.color) {
        bar.style.background = options.color;
      }

      var logo = options && options.showLogo ? getVendorLogo(item.modelIdentifier, item.modelName || item.label) : null;
      if (logo) {
        var bubble = document.createElement('div');
        bubble.className = 'export-bar-logo';
        var img = document.createElement('img');
        img.src = basePath + 'logos/' + logo.file;
        img.alt = logo.alt;
        bubble.appendChild(img);
        bar.appendChild(bubble);
      }

      wrap.appendChild(bar);

      var label = document.createElement('div');
      label.className = 'export-bar-label';

      var displayLabel = item.label;
      if (options && options.labelMode === 'model') {
        var logoAlt = logo ? logo.alt : '';
        displayLabel = stripVendorName(item.label, logoAlt);
      }

      renderLabelLines(label, wrapLabelLimit(displayLabel, labelMax, 2));

      wrap.appendChild(label);

      if (options && options.linkBase && item.id) {
        wrap.classList.add('export-bar-clickable');
        wrap.addEventListener('click', (function (id) {
          return function () {
            window.location.href = options.linkBase + id + '.html';
          };
        })(item.id));
      }

      chart.appendChild(wrap);
    }

    container.appendChild(chart);
  }
  function renderStackedChart(container, items) {
    clearContainer(container);
    if (!items || !items.length) {
      var empty = document.createElement('div');
      empty.className = 'export-empty';
      empty.textContent = 'No data yet.';
      container.appendChild(empty);
      return;
    }

    var chart = document.createElement('div');
    chart.className = 'export-bar-chart';
    var count = items.length;
    var barWidth = count > 16 ? 10 : count > 12 ? 12 : count > 8 ? 16 : 22;

    for (var i = 0; i < items.length; i += 1) {
      var item = items[i];
      var wrap = document.createElement('div');
      wrap.className = 'export-bar-wrap';
      wrap.style.width = barWidth + 'px';

      var stack = document.createElement('div');
      stack.className = 'export-stack-bar';

      var counts = item.counts || { pass: 0, partial: 0, fail: 0 };
      var total = (counts.pass || 0) + (counts.partial || 0) + (counts.fail || 0);
      var passPct = total ? (counts.pass / total) * 100 : 0;
      var partialPct = total ? (counts.partial / total) * 100 : 0;
      var failPct = total ? (counts.fail / total) * 100 : 0;

      var passSeg = document.createElement('div');
      passSeg.className = 'export-stack-seg pass';
      passSeg.style.height = passPct + '%';
      var partialSeg = document.createElement('div');
      partialSeg.className = 'export-stack-seg partial';
      partialSeg.style.height = partialPct + '%';
      var failSeg = document.createElement('div');
      failSeg.className = 'export-stack-seg fail';
      failSeg.style.height = failPct + '%';

      stack.appendChild(passSeg);
      stack.appendChild(partialSeg);
      stack.appendChild(failSeg);

      wrap.appendChild(stack);

      var label = document.createElement('div');
      label.className = 'export-bar-label';
      renderLabelLines(label, wrapLabel(item.label, 8));
      wrap.appendChild(label);

      chart.appendChild(wrap);
    }

    container.appendChild(chart);

    var legend = document.createElement('div');
    legend.className = 'export-legend';

    var passLegend = document.createElement('span');
    var passSwatch = document.createElement('span');
    passSwatch.className = 'swatch';
    passSwatch.style.background = 'var(--color-teal)';
    passLegend.appendChild(passSwatch);
    passLegend.appendChild(document.createTextNode('pass'));

    var partialLegend = document.createElement('span');
    var partialSwatch = document.createElement('span');
    partialSwatch.className = 'swatch';
    partialSwatch.style.background = 'var(--color-gold)';
    partialLegend.appendChild(partialSwatch);
    partialLegend.appendChild(document.createTextNode('partial'));

    var failLegend = document.createElement('span');
    var failSwatch = document.createElement('span');
    failSwatch.className = 'swatch';
    failSwatch.style.background = 'var(--color-coral)';
    failLegend.appendChild(failSwatch);
    failLegend.appendChild(document.createTextNode('fail'));

    legend.appendChild(passLegend);
    legend.appendChild(partialLegend);
    legend.appendChild(failLegend);
    container.appendChild(legend);
  }

  function getRunTypeLabel(run, categories) {
    if (!run.category_filter) return 'All categories';
    try {
      var parsed = JSON.parse(run.category_filter);
      if (Array.isArray(parsed) && parsed.length === 1) {
        var categoryId = parsed[0];
        var match = categories.find(function (item) { return item.id === categoryId; });
        return match ? 'Single category: ' + match.name : 'Single category';
      }
      if (Array.isArray(parsed) && parsed.length > 1) {
        return 'Multiple categories: ' + parsed.length;
      }
    } catch (err) {
      return 'Custom scope';
    }
    return 'Custom scope';
  }

  function renderLeaderboard(data) {
    var chartEl = document.getElementById('leaderboard-chart');
    var tableEl = document.getElementById('leaderboard-table');
    if (!chartEl || !tableEl) return;

    var runs = (data && data.runs) ? data.runs.slice() : [];
    runs.sort(function (a, b) {
      var aScore = a.final_score || 0;
      var bScore = b.final_score || 0;
      return bScore - aScore;
    });

    var chartData = runs.slice(0, 16).map(function (run) {
      return {
        id: run.id,
        label: run.model_name || run.model_identifier,
        modelIdentifier: run.model_identifier,
        modelName: run.model_name,
        score: run.final_score || 0
      };
    });

    renderScoreChart(chartEl, chartData, {
      labelMode: 'model',
      showLogo: true,
      linkBase: basePath + 'run/'
    });

    clearContainer(tableEl);
    if (!runs.length) {
      tableEl.innerHTML = '<div class="export-empty">No completed runs yet.</div>';
      return;
    }

    var list = document.createElement('div');
    list.className = 'compare-run-list leaderboard-run-list';

    runs.forEach(function (run) {
      var item = document.createElement('a');
      item.href = basePath + 'run/' + run.id + '.html';
      item.className = 'compare-run-item leaderboard-run-item';

      var main = document.createElement('div');
      main.className = 'compare-run-main';

      var title = document.createElement('div');
      title.className = 'compare-run-title';
      var logo = getVendorLogo(run.model_identifier, run.model_name);
      if (logo) {
        var img = document.createElement('img');
        img.className = 'vendor-logo';
        img.src = basePath + 'logos/' + logo.file;
        img.alt = logo.alt;
        img.width = 18;
        img.height = 18;
        title.appendChild(img);
      }
      var titleText = document.createElement('span');
      titleText.textContent = run.model_name || run.model_identifier;
      title.appendChild(titleText);
      main.appendChild(title);

      var meta = document.createElement('div');
      meta.className = 'compare-run-meta';
      var metaParts = [
        'v' + (run.benchmark_version || '-'),
        formatDate(run.completed_at),
        '$' + Number(run.total_cost || 0).toFixed(4)
      ];
      metaParts.forEach(function (part, index) {
        if (index > 0) {
          var dot = document.createElement('span');
          dot.textContent = '\u00b7';
          dot.setAttribute('aria-hidden', 'true');
          meta.appendChild(dot);
        }
        var span = document.createElement('span');
        span.textContent = part;
        meta.appendChild(span);
      });
      main.appendChild(meta);

      var scoreWrap = document.createElement('div');
      scoreWrap.className = 'compare-run-score';
      var scorePill = document.createElement('span');
      scorePill.className = 'compare-score-pill';
      scorePill.textContent = formatScore(run.final_score || 0) + '%';
      var rating = document.createElement('small');
      rating.className = 'compare-score-rating';
      rating.textContent = run.final_rating || '-';
      scoreWrap.appendChild(scorePill);
      scoreWrap.appendChild(rating);

      item.appendChild(main);
      item.appendChild(scoreWrap);
      list.appendChild(item);
    });

    tableEl.appendChild(list);
  }

  function renderCompare(data) {
    var listEl = document.getElementById('compare-list');
    var contentEl = document.getElementById('compare-content');
    var searchEl = document.getElementById('compare-search');
    if (!listEl || !contentEl) return;

    var runs = (data && data.runs) ? data.runs.slice() : [];
    var categories = data && data.categories ? data.categories : [];

    runs.sort(function (a, b) {
      var aScore = a.final_score || 0;
      var bScore = b.final_score || 0;
      return bScore - aScore;
    });

    var selected = {};
    var searchQuery = '';
    var overallSpanObserver = null;
    var overallSpanHandler = null;

    function matchesSearch(run) {
      if (!searchQuery) return true;
      var haystack = (run.model_name || '') + ' ' + (run.model_identifier || '');
      return haystack.toLowerCase().indexOf(searchQuery) !== -1;
    }

    function toggleRun(id) {
      if (selected[id]) {
        delete selected[id];
      } else {
        selected[id] = true;
      }
      renderRunList();
      renderCompareTable();
    }

    function buildRunItem(run) {
      var item = document.createElement('button');
      item.className = 'compare-run-item' + (selected[run.id] ? ' selected' : '');
      item.setAttribute('data-id', run.id);
      item.addEventListener('click', function () { toggleRun(run.id); });

      var main = document.createElement('div');
      main.className = 'compare-run-main';

      var title = document.createElement('div');
      title.className = 'compare-run-title';
      var logo = getVendorLogo(run.model_identifier, run.model_name);
      if (logo) {
        var img = document.createElement('img');
        img.className = 'vendor-logo';
        img.src = basePath + 'logos/' + logo.file;
        img.alt = logo.alt;
        img.width = 18;
        img.height = 18;
        title.appendChild(img);
      }
      var titleText = document.createElement('span');
      titleText.textContent = run.model_name || run.model_identifier;
      title.appendChild(titleText);
      main.appendChild(title);

      var meta = document.createElement('div');
      meta.className = 'compare-run-meta';
      var metaParts = [getRunTypeLabel(run, categories), formatDate(run.completed_at)];
      metaParts.forEach(function (part, index) {
        if (index > 0) {
          var dot = document.createElement('span');
          dot.textContent = '\u00b7';
          dot.setAttribute('aria-hidden', 'true');
          meta.appendChild(dot);
        }
        var span = document.createElement('span');
        span.textContent = part;
        meta.appendChild(span);
      });
      main.appendChild(meta);

      var scoreWrap = document.createElement('div');
      scoreWrap.className = 'compare-run-score';
      var scorePill = document.createElement('span');
      scorePill.className = 'compare-score-pill';
      scorePill.textContent = formatScore(run.final_score || 0) + '%';
      var rating = document.createElement('small');
      rating.className = 'compare-score-rating';
      rating.textContent = run.final_rating || '-';
      scoreWrap.appendChild(scorePill);
      scoreWrap.appendChild(rating);

      item.appendChild(main);
      item.appendChild(scoreWrap);
      return item;
    }

    function renderRunList() {
      clearContainer(listEl);
      var filtered = runs.filter(matchesSearch);
      filtered.forEach(function (run) {
        listEl.appendChild(buildRunItem(run));
      });
    }

    function bindOverallSpan(grid, count) {
      if (!grid) return;

      function update() {
        var minWidth = 240;
        var gap = 18;
        var width = grid.getBoundingClientRect().width || 0;
        var columns = Math.max(1, Math.floor((width + gap) / (minWidth + gap)));
        var cards = grid.querySelectorAll('.compare-overall-card');
        for (var i = 0; i < cards.length; i += 1) {
          cards[i].classList.remove('compare-overall-card--span');
        }
        if (columns > 1 && count % columns === 1 && cards.length) {
          cards[cards.length - 1].classList.add('compare-overall-card--span');
        }
      }

      update();

      if (overallSpanObserver) {
        overallSpanObserver.disconnect();
        overallSpanObserver = null;
      }
      if (overallSpanHandler) {
        window.removeEventListener('resize', overallSpanHandler);
        overallSpanHandler = null;
      }

      if (typeof ResizeObserver !== 'undefined') {
        overallSpanObserver = new ResizeObserver(update);
        overallSpanObserver.observe(grid);
      } else {
        overallSpanHandler = update;
        window.addEventListener('resize', overallSpanHandler);
      }
    }

    function renderCompareTable() {
      clearContainer(contentEl);
      var selectedRuns = runs.filter(function (run) { return selected[run.id]; });
      if (!selectedRuns.length) {
        var empty = document.createElement('p');
        empty.className = 'export-empty';
        empty.textContent = 'Pick two or more runs to compare categories.';
        contentEl.appendChild(empty);
        return;
      }

      var overallSummaries = selectedRuns.map(function (run) {
        return {
          id: run.id,
          run: run,
          label: run.model_name || run.model_identifier,
          score: run.final_score || 0,
          rating: run.final_rating || '-'
        };
      });

      overallSummaries.sort(function (a, b) {
        if (b.score !== a.score) return b.score - a.score;
        return String(a.label).localeCompare(String(b.label));
      });

      var overallSection = document.createElement('div');
      overallSection.className = 'section';
      overallSection.style.marginTop = '0';

      var overallHeader = document.createElement('div');
      overallHeader.className = 'compare-section-header';
      var overallTitle = document.createElement('h3');
      overallTitle.className = 'section-title';
      overallTitle.textContent = 'Overall scores';
      overallHeader.appendChild(overallTitle);
      overallSection.appendChild(overallHeader);

      var overallWrap = document.createElement('div');
      overallWrap.id = 'compare-overall-snapshot';

      var graphCard = document.createElement('div');
      graphCard.className = 'card compare-overall-graph';
      var graphRows = document.createElement('div');
      graphRows.className = 'compare-overall-graph-rows';

      overallSummaries.forEach(function (summary) {
        var row = document.createElement('div');
        row.className = 'compare-overall-graph-row';

        var label = document.createElement('div');
        label.className = 'compare-overall-graph-label';
        var logo = getVendorLogo(summary.run.model_identifier, summary.run.model_name);
        if (logo) {
          var img = document.createElement('img');
          img.className = 'vendor-logo';
          img.src = basePath + 'logos/' + logo.file;
          img.alt = logo.alt;
          img.width = 18;
          img.height = 18;
          label.appendChild(img);
        }
        var labelText = document.createElement('span');
        labelText.textContent = stripVendorName(summary.label, logo ? logo.alt : '');
        label.appendChild(labelText);
        row.appendChild(label);

        var bar = document.createElement('div');
        bar.className = 'compare-overall-graph-bar';
        var barFill = document.createElement('span');
        barFill.style.width = scoreToWidth(summary.score) + '%';
        bar.appendChild(barFill);
        row.appendChild(bar);

        var meta = document.createElement('div');
        meta.className = 'compare-overall-graph-meta';
        var value = document.createElement('span');
        value.className = 'compare-overall-graph-value';
        value.textContent = formatScore(summary.score) + '%';
        var rating = document.createElement('span');
        rating.className = 'compare-overall-graph-rating';
        rating.textContent = summary.rating;
        meta.appendChild(value);
        meta.appendChild(rating);
        row.appendChild(meta);

        graphRows.appendChild(row);
      });

      graphCard.appendChild(graphRows);
      overallWrap.appendChild(graphCard);

      var grid = document.createElement('div');
      grid.className = 'card-grid compare-overall-grid';

      overallSummaries.forEach(function (summary) {
        var card = document.createElement('div');
        card.className = 'card compare-overall-card';

        var header = document.createElement('div');
        header.className = 'compare-overall-header';
        var labelWrap = document.createElement('div');
        labelWrap.className = 'compare-model-label';
        var logo = getVendorLogo(summary.run.model_identifier, summary.run.model_name);
        if (logo) {
          var img = document.createElement('img');
          img.className = 'vendor-logo';
          img.src = basePath + 'logos/' + logo.file;
          img.alt = logo.alt;
          img.width = 20;
          img.height = 20;
          labelWrap.appendChild(img);
        }
        var label = document.createElement('span');
        label.textContent = stripVendorName(summary.label, logo ? logo.alt : '');
        labelWrap.appendChild(label);
        header.appendChild(labelWrap);
        card.appendChild(header);

        var meta = document.createElement('div');
        meta.className = 'compare-overall-meta';
        var runType = document.createElement('span');
        runType.textContent = getRunTypeLabel(summary.run, categories);
        var dot = document.createElement('span');
        dot.textContent = '\u00b7';
        dot.setAttribute('aria-hidden', 'true');
        var date = document.createElement('span');
        date.textContent = formatDate(summary.run.completed_at);
        meta.appendChild(runType);
        meta.appendChild(dot);
        meta.appendChild(date);
        card.appendChild(meta);

        var statRow = document.createElement('div');
        statRow.className = 'stat-row compare-overall-stats';
        var overallPill = document.createElement('span');
        overallPill.className = 'mini-pill';
        overallPill.textContent = 'Overall ' + formatScore(summary.score) + '%';
        var ratingPill = document.createElement('span');
        ratingPill.className = 'mini-pill';
        ratingPill.textContent = 'Rating ' + summary.rating;
        statRow.appendChild(overallPill);
        statRow.appendChild(ratingPill);
        card.appendChild(statRow);

        grid.appendChild(card);
      });

      overallWrap.appendChild(grid);
      overallSection.appendChild(overallWrap);
      contentEl.appendChild(overallSection);

      bindOverallSpan(grid, overallSummaries.length);

      var categoryMap = {};
      selectedRuns.forEach(function (run) {
        (run.categoryScores || []).forEach(function (score) {
          categoryMap[score.categoryName] = true;
        });
      });

      var categoryNames = Object.keys(categoryMap).map(function (name) { return { name: name }; });
      categoryNames = sortByCategoryOrder(categoryNames, function (item) { return { name: item.name }; });

      var detailSection = document.createElement('div');
      detailSection.className = 'section';
      detailSection.style.marginTop = '32px';

      var detailHeader = document.createElement('div');
      detailHeader.className = 'compare-section-header';
      var detailTitle = document.createElement('h3');
      detailTitle.className = 'section-title';
      detailTitle.textContent = 'Category detail';
      detailHeader.appendChild(detailTitle);
      detailSection.appendChild(detailHeader);

      var detailCard = document.createElement('div');
      detailCard.className = 'card';

      var table = document.createElement('table');
      table.className = 'table compare-table';
      var thead = document.createElement('thead');
      thead.innerHTML = '<tr><th>Category</th><th>Model</th><th>Score</th><th>Pass</th><th>Partial</th><th>Fail</th></tr>';
      table.appendChild(thead);
      var tbody = document.createElement('tbody');

      categoryNames.forEach(function (category) {
        var name = category.name;
        var perRun = selectedRuns.map(function (run) {
          var match = (run.categoryScores || []).find(function (item) { return item.categoryName === name; });
          return {
            run: run,
            score: match ? (match.score || 0) : 0,
            counts: match && match.counts ? match.counts : { pass: 0, partial: 0, fail: 0 }
          };
        });
        perRun.sort(function (a, b) {
          if (b.score !== a.score) return b.score - a.score;
          var aLabel = a.run.model_name || a.run.model_identifier;
          var bLabel = b.run.model_name || b.run.model_identifier;
          return String(aLabel).localeCompare(String(bLabel));
        });

        perRun.forEach(function (entry, index) {
          var row = document.createElement('tr');
          if (index === 0) {
            var catCell = document.createElement('td');
            catCell.className = 'compare-category-cell';
            catCell.setAttribute('rowspan', perRun.length);
            catCell.textContent = isOverfitName(name) ? (name + '*') : name;
            row.appendChild(catCell);
          }

          var modelCell = document.createElement('td');
          modelCell.className = 'compare-model-cell';
          var labelWrap = document.createElement('div');
          labelWrap.className = 'compare-model-label';
          var logo = getVendorLogo(entry.run.model_identifier, entry.run.model_name);
          if (logo) {
            var img = document.createElement('img');
            img.className = 'vendor-logo';
            img.src = basePath + 'logos/' + logo.file;
            img.alt = logo.alt;
            img.width = 20;
            img.height = 20;
            labelWrap.appendChild(img);
          }
          var labelText = document.createElement('span');
          labelText.textContent = entry.run.model_name || entry.run.model_identifier;
          labelWrap.appendChild(labelText);
          modelCell.appendChild(labelWrap);
          row.appendChild(modelCell);

          var scoreCell = document.createElement('td');
          scoreCell.textContent = formatScore(entry.score) + '%';
          row.appendChild(scoreCell);

          var passCell = document.createElement('td');
          var passTag = document.createElement('span');
          passTag.className = 'tag pass tag-fixed';
          passTag.textContent = 'Pass ' + (entry.counts.pass || 0);
          passCell.appendChild(passTag);
          row.appendChild(passCell);

          var partialCell = document.createElement('td');
          var partialTag = document.createElement('span');
          partialTag.className = 'tag partial tag-fixed';
          partialTag.textContent = 'Partial ' + (entry.counts.partial || 0);
          partialCell.appendChild(partialTag);
          row.appendChild(partialCell);

          var failCell = document.createElement('td');
          var failTag = document.createElement('span');
          failTag.className = 'tag fail tag-fixed';
          failTag.textContent = 'Fail ' + (entry.counts.fail || 0);
          failCell.appendChild(failTag);
          row.appendChild(failCell);

          tbody.appendChild(row);
        });
      });

      table.appendChild(tbody);
      detailCard.appendChild(table);

      var footnote = document.createElement('small');
      footnote.className = 'category-footnote';
      footnote.textContent = '* Overfit is weighted 2x in the overall score.';
      detailCard.appendChild(footnote);

      detailSection.appendChild(detailCard);
      contentEl.appendChild(detailSection);
    }

    if (searchEl) {
      searchEl.addEventListener('input', function (event) {
        searchQuery = String(event.target.value || '').trim().toLowerCase();
        renderRunList();
      });
    }

    renderRunList();
    renderCompareTable();
  }

  function buildCategoryDetails(results, categoryScores) {
    var map = {};
    results.forEach(function (result) {
      var name = result.test_case.category.name;
      if (!map[name]) {
        map[name] = {
          name: name,
          slug: result.test_case.category.slug || null,
          total: 0,
          pass: 0,
          fail: 0,
          partial: 0,
          pending: 0,
          difficulty: { easy: 0, medium: 0, hard: 0 },
          score: 0
        };
      }
      var entry = map[name];
      entry.total += 1;
      entry.difficulty[result.test_case.difficulty] += 1;
      if (result.pass_fail) {
        entry[result.pass_fail] += 1;
      } else {
        entry.pending += 1;
      }
    });

    var scoreMap = {};
    (categoryScores || []).forEach(function (score) {
      scoreMap[score.categoryName] = score.score;
    });

    var details = Object.keys(map).map(function (key) {
      map[key].score = scoreMap[key] || 0;
      return map[key];
    });

    details = sortByCategoryOrder(details, function (item) {
      return { name: item.name, slug: item.slug };
    });

    return details;
  }

  function computeDifficultyCounts(results) {
    var counts = { easy: 0, medium: 0, hard: 0 };
    results.forEach(function (result) {
      counts[result.test_case.difficulty] += 1;
    });
    return counts;
  }

  function renderRunPage(runData) {
    var summary = document.getElementById('run-summary');
    var resultsSection = document.getElementById('run-results');
    var casesSection = document.getElementById('run-cases');
    if (!summary || !resultsSection || !casesSection) return;

    var run = runData.run;
    var results = runData.results || [];
    var categoryScores = runData.categoryScores || [];
    var totalTests = runData.totalTests || results.length || 0;
    var completedTests = results.length || 0;
    var judgedTests = results.filter(function (result) { return !!result.pass_fail; }).length;
    var progress = totalTests ? Math.min(100, (judgedTests / totalTests) * 100) : 0;

    var verdictCounts = { pass: 0, fail: 0, partial: 0 };
    results.forEach(function (result) {
      if (result.pass_fail) verdictCounts[result.pass_fail] += 1;
    });

    var modelLatencies = results
      .map(function (result) { return result.model_latency_ms; })
      .filter(function (value) { return typeof value === 'number'; });
    var judgeLatencies = results
      .map(function (result) { return result.judge_latency_ms; })
      .filter(function (value) { return typeof value === 'number'; });
    var avgModel = modelLatencies.length ? Math.round(modelLatencies.reduce(function (sum, value) { return sum + value; }, 0) / modelLatencies.length) : null;
    var avgJudge = judgeLatencies.length ? Math.round(judgeLatencies.reduce(function (sum, value) { return sum + value; }, 0) / judgeLatencies.length) : null;

    var modelLabel = run.model_name || run.model_identifier || 'SM Bench run';
    var logo = getVendorLogo(run.model_identifier, run.model_name);
    var scopeLabel = 'All categories';
    if (run.category_filter) {
      try {
        var parsed = JSON.parse(run.category_filter);
        if (Array.isArray(parsed) && parsed.length === 1) {
          var single = categoryScores[0];
          scopeLabel = single ? 'Single category: ' + single.categoryName : 'Single category';
        } else if (Array.isArray(parsed) && parsed.length > 1) {
          scopeLabel = 'Multiple categories: ' + parsed.length;
        }
      } catch (err) {
        scopeLabel = 'Custom scope';
      }
    }

    clearContainer(summary);
    var badge = document.createElement('span');
    badge.className = 'badge';
    if (run.status === 'completed') {
      badge.textContent = 'SM Bench complete';
    } else if (run.status === 'cancelled') {
      badge.textContent = 'SM Bench cancelled';
    } else if (run.status === 'failed') {
      badge.textContent = 'SM Bench failed';
    } else {
      badge.textContent = 'Live SM Bench';
    }
    summary.appendChild(badge);

    var title = document.createElement('h2');
    title.style.marginTop = '8px';
    title.className = 'export-run-title';
    if (logo) {
      var img = document.createElement('img');
      img.className = 'export-logo-inline';
      img.src = basePath + 'logos/' + logo.file;
      img.alt = logo.alt;
      title.appendChild(img);
    }
    var titleText = document.createElement('span');
    titleText.textContent = modelLabel;
    title.appendChild(titleText);
    summary.appendChild(title);

    var statusLine = document.createElement('p');
    statusLine.innerHTML = 'Status: <strong>' + (run.status || 'completed') + '</strong> | ' + completedTests + '/' + totalTests + ' tests complete';
    summary.appendChild(statusLine);

    var judgedLine = document.createElement('p');
    judgedLine.textContent = 'Judged: ' + judgedTests + '/' + totalTests;
    summary.appendChild(judgedLine);

    if (run.benchmark_version && run.benchmark_version.version) {
      var versionLine = document.createElement('p');
      versionLine.textContent = 'SM Bench version: ' + run.benchmark_version.version;
      summary.appendChild(versionLine);
    }

    var scopeLine = document.createElement('p');
    scopeLine.textContent = 'Scope: ' + scopeLabel;
    summary.appendChild(scopeLine);

    var progressWrap = document.createElement('div');
    progressWrap.className = 'progress';
    var progressBar = document.createElement('span');
    progressBar.style.width = progress + '%';
    progressWrap.appendChild(progressBar);
    summary.appendChild(progressWrap);

    var statRow = document.createElement('div');
    statRow.className = 'stat-row';
    var passStat = document.createElement('div');
    passStat.className = 'stat-pill';
    passStat.textContent = 'Pass: ' + verdictCounts.pass;
    var failStat = document.createElement('div');
    failStat.className = 'stat-pill';
    failStat.textContent = 'Fail: ' + verdictCounts.fail;
    var partialStat = document.createElement('div');
    partialStat.className = 'stat-pill';
    partialStat.textContent = 'Partial: ' + verdictCounts.partial;
    var responseStat = document.createElement('div');
    responseStat.className = 'stat-pill';
    responseStat.textContent = 'Responses: ' + completedTests;
    statRow.appendChild(passStat);
    statRow.appendChild(failStat);
    statRow.appendChild(partialStat);
    statRow.appendChild(responseStat);
    if (avgModel !== null) {
      var modelLatency = document.createElement('div');
      modelLatency.className = 'stat-pill';
      modelLatency.textContent = 'Avg model latency: ' + avgModel + ' ms';
      statRow.appendChild(modelLatency);
    }
    if (avgJudge !== null) {
      var judgeLatency = document.createElement('div');
      judgeLatency.className = 'stat-pill';
      judgeLatency.textContent = 'Avg judge latency: ' + avgJudge + ' ms';
      statRow.appendChild(judgeLatency);
    }
    var tokenStat = document.createElement('div');
    tokenStat.className = 'stat-pill';
    tokenStat.textContent = 'Tokens: ' + (run.total_input_tokens || 0) + ' in / ' + (run.total_output_tokens || 0) + ' out';
    statRow.appendChild(tokenStat);
    var costStat = document.createElement('div');
    costStat.className = 'stat-pill';
    costStat.textContent = 'Cost: $' + Number(run.total_cost || 0).toFixed(4);
    statRow.appendChild(costStat);
    summary.appendChild(statRow);

    clearContainer(resultsSection);
    var resultsTitle = document.createElement('h2');
    resultsTitle.className = 'section-title';
    resultsTitle.textContent = 'SM Bench Results';
    resultsSection.appendChild(resultsTitle);

    var resultsStack = document.createElement('div');
    resultsStack.className = 'results-stack';

    var heroCard = document.createElement('div');
    heroCard.className = 'card results-hero';
    var heroMain = document.createElement('div');
    heroMain.className = 'results-hero-main';

    var heroLeft = document.createElement('div');
    var heroBadge = document.createElement('span');
    heroBadge.className = 'badge';
    heroBadge.textContent = 'SM Bench Score';
    heroLeft.appendChild(heroBadge);
    var heroScore = document.createElement('p');
    heroScore.className = 'results-score';
    heroScore.textContent = (run.final_score || 0).toFixed(2) + '% (' + (run.final_rating || '-') + ')';
    heroLeft.appendChild(heroScore);
    var heroJudge = document.createElement('p');
    heroJudge.textContent = 'Endpoint: Openrouter';
    heroLeft.appendChild(heroJudge);
    var heroScope = document.createElement('p');
    heroScope.textContent = 'Scope: ' + scopeLabel;
    heroLeft.appendChild(heroScope);

    var heroStats = document.createElement('div');
    heroStats.className = 'results-hero-stats';
    var totalTokens = (run.total_input_tokens || 0) + (run.total_output_tokens || 0);
    var scoreValue = run.final_score || 0;
    var costPerPoint = scoreValue > 0 ? (run.total_cost || 0) / scoreValue : null;
    var tokensPerPoint = scoreValue > 0 ? totalTokens / scoreValue : null;

    var costPointStat = document.createElement('div');
    costPointStat.className = 'stat-pill';
    costPointStat.textContent = 'Cost per point: ' + (costPerPoint === null ? '-' : '$' + costPerPoint.toFixed(4));
    var tokenPointStat = document.createElement('div');
    tokenPointStat.className = 'stat-pill';
    tokenPointStat.textContent = 'Tokens per point: ' + (tokensPerPoint === null ? '-' : Math.round(tokensPerPoint).toLocaleString());
    var totalTokenStat = document.createElement('div');
    totalTokenStat.className = 'stat-pill';
    totalTokenStat.textContent = 'Total tokens: ' + totalTokens.toLocaleString();
    heroStats.appendChild(costPointStat);
    heroStats.appendChild(tokenPointStat);
    heroStats.appendChild(totalTokenStat);

    heroMain.appendChild(heroLeft);
    heroMain.appendChild(heroStats);
    heroCard.appendChild(heroMain);
    resultsStack.appendChild(heroCard);

    var overviewSection = document.createElement('div');
    overviewSection.className = 'section';
    overviewSection.style.marginTop = '0';
    var overviewTitle = document.createElement('h3');
    overviewTitle.className = 'section-title';
    overviewTitle.textContent = 'Overview';
    overviewSection.appendChild(overviewTitle);
    var overviewGrid = document.createElement('div');
    overviewGrid.className = 'results-grid';

    var costCard = document.createElement('div');
    costCard.className = 'card';
    costCard.innerHTML = '<strong>Cost breakdown</strong><p>Model: $' + Number(run.model_cost || 0).toFixed(4) + '</p><p>Judge: $' + Number(run.judge_cost || 0).toFixed(4) + '</p>';

    var difficultyCard = document.createElement('div');
    difficultyCard.className = 'card';
    var difficultyCounts = computeDifficultyCounts(results);
    difficultyCard.innerHTML = '<strong>Difficulty breakdown</strong><p>Easy ' + difficultyCounts.easy + '</p><p>Medium ' + difficultyCounts.medium + '</p><p>Hard ' + difficultyCounts.hard + '</p>';

    overviewGrid.appendChild(costCard);
    overviewGrid.appendChild(difficultyCard);
    overviewSection.appendChild(overviewGrid);
    resultsStack.appendChild(overviewSection);

    var chartSection = document.createElement('div');
    chartSection.className = 'section';
    var chartTitle = document.createElement('h3');
    chartTitle.className = 'section-title';
    chartTitle.textContent = 'Category charts';
    chartSection.appendChild(chartTitle);
    var chartStack = document.createElement('div');
    chartStack.className = 'results-stack';

    var sortedCategoryScores = sortByCategoryOrder((categoryScores || []).slice(), function (item) {
      return { name: item.categoryName };
    });

    var scoreCard = document.createElement('div');
    scoreCard.className = 'card';
    var scoreChart = document.createElement('div');
    var scoreData = sortedCategoryScores.map(function (item) {
      var label = isOverfitName(item.categoryName) ? item.categoryName + '*' : item.categoryName;
      return { label: label, score: item.score };
    });
    renderScoreChart(scoreChart, scoreData, { labelMode: 'category' });
    scoreCard.appendChild(scoreChart);

    var passCard = document.createElement('div');
    passCard.className = 'card';
    var passChart = document.createElement('div');
    var passData = sortedCategoryScores.map(function (item) {
      var label = isOverfitName(item.categoryName) ? item.categoryName + '*' : item.categoryName;
      return { label: label, counts: item.counts || { pass: 0, partial: 0, fail: 0 } };
    });
    renderStackedChart(passChart, passData);
    passCard.appendChild(passChart);

    chartStack.appendChild(scoreCard);
    chartStack.appendChild(passCard);
    chartSection.appendChild(chartStack);
    resultsStack.appendChild(chartSection);

    var detailSection = document.createElement('div');
    detailSection.className = 'section';
    var detailTitle = document.createElement('h3');
    detailTitle.className = 'section-title';
    detailTitle.textContent = 'Category detail';
    detailSection.appendChild(detailTitle);

    var detailTable = document.createElement('table');
    detailTable.className = 'table';
    var detailHead = document.createElement('thead');
    detailHead.innerHTML = '<tr><th>Category</th><th>Score</th><th>Pass</th><th>Partial</th><th>Fail</th><th>Difficulty</th></tr>';
    detailTable.appendChild(detailHead);
    var detailBody = document.createElement('tbody');

    var categoryDetails = buildCategoryDetails(results, categoryScores);
    categoryDetails.forEach(function (detail) {
      var row = document.createElement('tr');
      var nameCell = document.createElement('td');
      nameCell.textContent = isOverfitName(detail.name, detail.slug) ? detail.name + '*' : detail.name;
      row.appendChild(nameCell);

      var scoreCell = document.createElement('td');
      scoreCell.textContent = detail.score + '%';
      row.appendChild(scoreCell);

      var passCell = document.createElement('td');
      var passTag = document.createElement('span');
      passTag.className = 'tag pass tag-fixed';
      passTag.textContent = 'Pass ' + detail.pass;
      passCell.appendChild(passTag);
      row.appendChild(passCell);

      var partialCell = document.createElement('td');
      var partialTag = document.createElement('span');
      partialTag.className = 'tag partial tag-fixed';
      partialTag.textContent = 'Partial ' + detail.partial;
      partialCell.appendChild(partialTag);
      row.appendChild(partialCell);

      var failCell = document.createElement('td');
      var failTag = document.createElement('span');
      failTag.className = 'tag fail tag-fixed';
      failTag.textContent = 'Fail ' + detail.fail;
      failCell.appendChild(failTag);
      row.appendChild(failCell);

      var difficultyCell = document.createElement('td');
      difficultyCell.textContent = 'Easy ' + detail.difficulty.easy + ' \u00b7 Med ' + detail.difficulty.medium + ' \u00b7 Hard ' + detail.difficulty.hard;
      row.appendChild(difficultyCell);

      detailBody.appendChild(row);
    });

    detailTable.appendChild(detailBody);
    var detailCard = document.createElement('div');
    detailCard.className = 'card';
    detailCard.appendChild(detailTable);
    var footnote = document.createElement('small');
    footnote.className = 'category-footnote';
    footnote.textContent = '* Overfit is weighted 2x in the overall score.';
    detailCard.appendChild(footnote);
    detailSection.appendChild(detailCard);

    resultsStack.appendChild(detailSection);

    resultsSection.appendChild(resultsStack);

    renderCaseList(casesSection, results, modelLabel);
  }

  function renderCaseList(container, results, modelLabel) {
    clearContainer(container);
    if (!results || !results.length) {
      var empty = document.createElement('div');
      empty.className = 'card';
      empty.textContent = 'No results yet.';
      container.appendChild(empty);
      return;
    }

    var grouped = {};
    var order = [];
    results.forEach(function (result) {
      var name = result.test_case.category.name;
      if (!grouped[name]) {
        grouped[name] = [];
        order.push(name);
      }
      grouped[name].push(result);
    });

    var wrapper = document.createElement('div');
    wrapper.className = 'card';
    wrapper.style.display = 'grid';
    wrapper.style.gap = '14px';

    order.forEach(function (name) {
      var items = grouped[name];
      var counts = { pass: 0, fail: 0, partial: 0, pending: 0 };
      items.forEach(function (item) {
        if (!item.pass_fail) {
          counts.pending += 1;
          return;
        }
        counts[item.pass_fail] += 1;
      });

      var details = document.createElement('details');
      details.className = 'category-group';

      var summary = document.createElement('summary');
      summary.className = 'category-summary';
      var summaryLeft = document.createElement('div');
      var summaryTitle = document.createElement('strong');
      summaryTitle.textContent = name;
      summaryLeft.appendChild(summaryTitle);
      var summarySub = document.createElement('span');
      summarySub.className = 'category-sub';
      summarySub.textContent = items.length + ' cases';
      summaryLeft.appendChild(summarySub);

      var summaryCounts = document.createElement('div');
      summaryCounts.className = 'category-counts';
      summaryCounts.innerHTML =
        '<span class="tag pass tag-fixed">Pass ' + counts.pass + '</span>' +
        '<span class="tag partial tag-fixed">Partial ' + counts.partial + '</span>' +
        '<span class="tag fail tag-fixed">Fail ' + counts.fail + '</span>' +
        '<span class="tag tag-fixed">Pending ' + counts.pending + '</span>';

      summary.appendChild(summaryLeft);
      summary.appendChild(summaryCounts);
      details.appendChild(summary);

      var body = document.createElement('div');
      body.className = 'category-body';
      details.appendChild(body);

      var visible = 0;
      var pageSize = 20;

      function appendNext(targetCount) {
        var next = typeof targetCount === 'number'
          ? Math.min(targetCount, items.length)
          : Math.min(visible + pageSize, items.length);
        for (var i = visible; i < next; i += 1) {
          var result = items[i];
          var caseDetails = document.createElement('details');
          caseDetails.className = 'case-details';

          var caseSummary = document.createElement('summary');
          caseSummary.className = 'case-summary';
          var indexSpan = document.createElement('span');
          indexSpan.textContent = (i + 1) + '.';
          var difficultySpan = document.createElement('span');
          difficultySpan.style.textTransform = 'uppercase';
          difficultySpan.style.fontSize = '12px';
          difficultySpan.textContent = result.test_case.difficulty;
          var tagSpan = document.createElement('span');
          var failNr = result.pass_fail === 'fail' && !String(result.model_response || '').trim();
          tagSpan.className = 'tag tag-fixed ' + (result.pass_fail || 'partial');
          tagSpan.textContent = failNr ? 'fail-nr' : (result.pass_fail || 'pending');

          caseSummary.appendChild(indexSpan);
          caseSummary.appendChild(difficultySpan);
          caseSummary.appendChild(tagSpan);

          caseDetails.appendChild(caseSummary);

          var bodyWrap = document.createElement('div');
          bodyWrap.style.marginTop = '8px';
          bodyWrap.style.display = 'grid';
          bodyWrap.style.gap = '8px';

          if (modelLabel || result.model_latency_ms || result.judge_latency_ms) {
            var latencyRow = document.createElement('div');
            latencyRow.className = 'stat-row';
            latencyRow.style.marginTop = '0';
            if (modelLabel) {
              var modelName = document.createElement('div');
              modelName.className = 'stat-pill';
              modelName.textContent = 'Model: ' + modelLabel;
              latencyRow.appendChild(modelName);
            }
            if (result.model_latency_ms !== null && result.model_latency_ms !== undefined) {
              var modelLatency = document.createElement('div');
              modelLatency.className = 'stat-pill';
              modelLatency.textContent = 'Model latency: ' + result.model_latency_ms + ' ms';
              latencyRow.appendChild(modelLatency);
            }
            if (result.judge_latency_ms !== null && result.judge_latency_ms !== undefined) {
              var judgeLatency = document.createElement('div');
              judgeLatency.className = 'stat-pill';
              judgeLatency.textContent = 'Judge latency: ' + result.judge_latency_ms + ' ms';
              latencyRow.appendChild(judgeLatency);
            }
            bodyWrap.appendChild(latencyRow);
          }

          appendMarkdownBlock(
            bodyWrap,
            'Prompt:',
            result.test_case.prompt_html,
            result.test_case.prompt
          );
          appendMarkdownBlock(
            bodyWrap,
            'Expected:',
            result.test_case.expected_behavior_html,
            result.test_case.expected_behavior
          );
          if (result.test_case.reference_answer) {
            appendMarkdownBlock(
              bodyWrap,
              'Reference:',
              result.test_case.reference_answer_html,
              result.test_case.reference_answer
            );
          }
          appendMarkdownBlock(
            bodyWrap,
            'Response:',
            result.model_response_html,
            result.model_response
          );
          if (result.judge_evaluation) {
            appendMarkdownBlock(
              bodyWrap,
              'Judge:',
              result.judge_evaluation_html,
              result.judge_evaluation
            );
          }

          caseDetails.appendChild(bodyWrap);
          body.appendChild(caseDetails);
        }
        visible = next;
        if (visible >= items.length && actionWrap) {
          actionWrap.parentElement.removeChild(actionWrap);
          actionWrap = null;
          loadButton = null;
        }
      }

      appendNext();

      var loadButton = null;
      var actionWrap = null;
      if (items.length > visible) {
        actionWrap = document.createElement('div');
        actionWrap.className = 'form-actions';
        actionWrap.style.marginTop = '8px';
        loadButton = document.createElement('button');
        loadButton.className = 'button ghost';
        loadButton.textContent = 'Load rest';
        loadButton.addEventListener('click', function (event) {
          event.preventDefault();
          event.stopPropagation();
          appendNext(items.length);
        });
        actionWrap.appendChild(loadButton);
        body.appendChild(actionWrap);
      }

      wrapper.appendChild(details);
    });

    container.appendChild(wrapper);
  }

  function bootstrap() {
    initTheme();
    bindThemeToggle();
    var page = document.body.getAttribute('data-page');
    if (page === 'leaderboard') {
      fetchJson(dataBase + 'runs.json').then(renderLeaderboard).catch(function () {
        var chartEl = document.getElementById('leaderboard-chart');
        if (chartEl) chartEl.innerHTML = '<div class="export-empty">Unable to load data.</div>';
      });
    } else if (page === 'compare') {
      fetchJson(dataBase + 'runs.json').then(renderCompare).catch(function () {
        var listEl = document.getElementById('compare-list');
        if (listEl) listEl.innerHTML = '<div class="export-empty">Unable to load data.</div>';
      });
    } else if (page === 'run') {
      var path = window.location.pathname.split('/');
      var file = path[path.length - 1] || '';
      var id = file.replace('.html', '');
      fetchJson(dataBase + 'runs/' + id + '.json')
        .then(renderRunPage)
        .catch(function () {
          var summary = document.getElementById('run-summary');
          if (summary) summary.innerHTML = '<span class="badge">Run</span><h2 style="margin-top:8px;">Run not found</h2>';
        });
    }
  }

  document.addEventListener('DOMContentLoaded', bootstrap);
})();
