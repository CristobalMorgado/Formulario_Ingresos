/* ============================================================
   Billetera.JS — Control de Finanzas Personales
   Aplicación principal (Vanilla JS)
   ============================================================ */

(function () {
  'use strict';

  // ============================================================
  // CONSTANTS
  // ============================================================
  var STORAGE_KEY = 'myMoneyData';
  var MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  var DEFAULT_INCOME_CATS = ['Sueldo', 'Horas Extras', 'Otros'];
  var DEFAULT_EXPENSE_CATS = ['ENEL', 'Smapa', 'Hija', 'Movistar', 'Wom', 'Gas', 'Hites', 'BIP'];

  // Regex para validación de texto: letras, números, espacios y caracteres especiales del español
  var VALID_TEXT_REGEX = /^[a-zA-Z0-9\s.,\-ñÑáéíóúÁÉÍÓÚ]+$/;

  // URL base del backend Node.js
  // Vacío = rutas relativas → funciona cuando Node.js sirve el frontend
  var API_BASE = '';

  // ============================================================
  // STATE
  // ============================================================
  var state = {
    initialBalances: {},
    incomeCategories: [],
    expenseCategories: [],
    transactions: [],
    selectedMonth: '',
    compareActive: false,
    compareMonth: ''
  };

  // ============================================================
  // DOM REFERENCES
  // ============================================================
  var dom = {};

  function cacheDom() {
    dom.initialBalanceInput = document.getElementById('initialBalance');
    dom.availableBalance = document.getElementById('availableBalance');
    dom.monthLabel      = document.getElementById('monthLabel');
    dom.monthPickerBtn  = document.getElementById('monthPickerBtn');
    dom.monthDropdown   = document.getElementById('monthDropdown');
    dom.prevYear        = document.getElementById('prevYear');
    dom.nextYear        = document.getElementById('nextYear');
    dom.incomeList = document.getElementById('incomeList');
    dom.expenseList = document.getElementById('expenseList');
    dom.totalIncome = document.getElementById('totalIncome');
    dom.totalExpenses = document.getElementById('totalExpenses');
    dom.chartBars = document.getElementById('chartBars');
    dom.addIncome = document.getElementById('addIncome');
    dom.addExpense = document.getElementById('addExpense');
    dom.manageIncomeCats = document.getElementById('manageIncomeCats');
    dom.manageExpenseCats = document.getElementById('manageExpenseCats');
    dom.modalOverlay = document.getElementById('modalOverlay');
    dom.modalTitle = document.getElementById('modalTitle');
    dom.modalBody = document.getElementById('modalBody');
    dom.modalClose = document.getElementById('modalClose');
    dom.toastContainer = document.getElementById('toastContainer');
    dom.toggleCompare = document.getElementById('toggleCompare');
    dom.comparePanel = document.getElementById('comparePanel');
    dom.compareMonthLabel = document.getElementById('compareMonthLabel');
    dom.comparePrev = document.getElementById('comparePrev');
    dom.compareNext = document.getElementById('compareNext');
    dom.chartLegend = document.getElementById('chartLegend');
    dom.clearAllExpenses = document.getElementById('clearAllExpenses');
    dom.indicatorsGrid   = document.getElementById('indicatorsGrid');
    dom.indicatorsDate   = document.getElementById('indicatorsDate');
  }

  // ============================================================
  // UTILITY FUNCTIONS
  // ============================================================

  function formatCLP(amount, spaceAfterSymbol) {
    var symbol = spaceAfterSymbol ? '$ ' : '$';
    return symbol + Math.round(amount).toLocaleString('es-CL');
  }

  function generateId() {
    return 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  }

  function getToday() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function getCurrentMonthKey() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }

  function monthKeyToLabel(key) {
    var parts = key.split('-');
    var year = parseInt(parts[0], 10);
    var month = parseInt(parts[1], 10) - 1;
    return MONTHS[month] + ' ' + year;
  }

  function parseMonthKey(key) {
    var parts = key.split('-');
    return { year: parseInt(parts[0], 10), month: parseInt(parts[1], 10) - 1 };
  }

  function addMonths(key, delta) {
    var p = parseMonthKey(key);
    p.month += delta;
    if (p.month > 11) { p.month = 0; p.year += 1; }
    if (p.month < 0) { p.month = 11; p.year -= 1; }
    return p.year + '-' + String(p.month + 1).padStart(2, '0');
  }

  function sanitizeString(str) {
    return String(str).replace(/[<>"']/g, function (ch) {
      switch (ch) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        case "'": return '&#39;';
        default: return ch;
      }
    });
  }

  function validateAmount(val) {
    var num = parseFloat(val);
    if (isNaN(num) || num < 0) return null;
    return num;
  }

  function isSameMonth(tx, monthKey) {
    return tx.date && tx.date.substring(0, 7) === monthKey;
  }

  function getMonthTransactions(monthKey) {
    return state.transactions.filter(function (tx) {
      return isSameMonth(tx, monthKey);
    });
  }

  function getTotalByCategory(transactions, type) {
    var totals = {};
    transactions.forEach(function (tx) {
      if (tx.type !== type) return;
      if (!totals[tx.category]) totals[tx.category] = 0;
      totals[tx.category] += tx.amount;
    });
    return totals;
  }

  // ============================================================
  // STORAGE — solo preferencias de UI (no datos)
  // ============================================================

  function loadUIPrefs() {
    var raw;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) { raw = null; }
    if (raw) {
      try {
        var data = JSON.parse(raw);
        state.selectedMonth = typeof data.selectedMonth === 'string' && data.selectedMonth.match(/^\d{4}-\d{2}$/) ? data.selectedMonth : getCurrentMonthKey();
        state.compareActive  = data.compareActive === true;
        state.compareMonth   = typeof data.compareMonth === 'string' && data.compareMonth.match(/^\d{4}-\d{2}$/) ? data.compareMonth : addMonths(state.selectedMonth, -1);
      } catch (e) {
        setDefaultPrefs();
      }
    } else {
      setDefaultPrefs();
    }
  }

  function setDefaultPrefs() {
    var current = getCurrentMonthKey();
    state.selectedMonth  = current;
    state.compareActive  = false;
    state.compareMonth   = addMonths(current, -1);
    // Datos vacíos hasta que llegue la API
    state.initialBalances   = {};
    state.incomeCategories  = [];
    state.expenseCategories = [];
    state.transactions      = [];
  }

  // Guarda SOLO preferencias de UI (mes, comparación)
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        selectedMonth: state.selectedMonth,
        compareActive: state.compareActive,
        compareMonth:  state.compareMonth
      }));
    } catch (e) { /* ignorar */ }
  }

  // ============================================================
  // LOADING SPINNER
  // ============================================================

  function showLoading() {
    var el = document.getElementById('appLoadingOverlay');
    if (el) el.removeAttribute('hidden');
  }

  function hideLoading() {
    var el = document.getElementById('appLoadingOverlay');
    if (el) el.setAttribute('hidden', '');
  }

  function showApiError(msg) {
    var el = document.getElementById('appLoadingOverlay');
    if (!el) return;
    el.innerHTML =
      '<div class="loading-overlay__box">' +
        '<span style="font-size:2.5rem">⚠️</span>' +
        '<p style="color:#f87171;font-weight:600;margin-top:12px">' + (msg || 'Error al conectar con el servidor') + '</p>' +
        '<p style="color:var(--text-muted);font-size:0.85rem;margin-top:6px">Asegúrate de que el backend esté corriendo en http://localhost:3000</p>' +
        '<button class="btn btn--ghost" style="margin-top:18px" onclick="location.reload()">Reintentar</button>' +
      '</div>';
    el.removeAttribute('hidden');
  }

  // ============================================================
  // RENDER
  // ============================================================

  function render() {
    renderMonthNav();
    renderBalance();
    renderIncome();
    renderExpenses();
    renderComparePanel();
    renderChart();
    updateInitialBalanceInput();
  }

  function renderMonthNav() {
    dom.monthLabel.textContent = monthKeyToLabel(state.selectedMonth);
  }

  function getInitialBalance(monthKey) {
    return state.initialBalances[monthKey] || 0;
  }

  function renderBalance() {
    var monthTxs = getMonthTransactions(state.selectedMonth);
    var totalInc = 0;
    var totalExp = 0;
    monthTxs.forEach(function (tx) {
      if (tx.type === 'income') totalInc += tx.amount;
      else totalExp += tx.amount;
    });
    var available = getInitialBalance(state.selectedMonth) + totalInc - totalExp;
    dom.availableBalance.textContent = formatCLP(available, true);
  }

  function updateInitialBalanceInput() {
    dom.initialBalanceInput.value = getInitialBalance(state.selectedMonth).toLocaleString('es-CL');
  }

  function renderIncome() {
    var monthTxs = getMonthTransactions(state.selectedMonth);
    var incomeTxs = monthTxs.filter(function (tx) { return tx.type === 'income'; });
    var total = 0;

    // Limpiar contenido previo de forma segura
    while (dom.incomeList.firstChild) {
      dom.incomeList.removeChild(dom.incomeList.firstChild);
    }

    if (incomeTxs.length === 0) {
      var emptyMsg = document.createElement('p');
      emptyMsg.classList.add('tx-group__empty');
      emptyMsg.textContent = 'No hay ingresos registrados este mes';
      dom.incomeList.appendChild(emptyMsg);
      dom.totalIncome.textContent = formatCLP(0);
      return;
    }

    var fragment = document.createDocumentFragment();

    incomeTxs.forEach(function (tx) {
      total += tx.amount;

      var item = document.createElement('div');
      item.classList.add('tx-item');
      item.setAttribute('data-id', tx.id);

      var info = document.createElement('div');
      info.classList.add('tx-item__info');

      var catSpan = document.createElement('span');
      catSpan.classList.add('tx-item__category');
      catSpan.textContent = tx.category;
      info.appendChild(catSpan);

      if (tx.description) {
        var descP = document.createElement('p');
        descP.classList.add('tx-item__desc');
        descP.textContent = tx.description;
        info.appendChild(descP);
      }

      var amountSpan = document.createElement('span');
      amountSpan.classList.add('tx-item__amount');
      amountSpan.classList.add('tx-item__amount--income');
      amountSpan.textContent = formatCLP(tx.amount);

      var deleteBtn = document.createElement('button');
      deleteBtn.classList.add('tx-item__delete');
      deleteBtn.setAttribute('data-action', 'deleteTx');
      deleteBtn.setAttribute('title', 'Eliminar');
      deleteBtn.setAttribute('aria-label', 'Eliminar');
      deleteBtn.textContent = '✕';

      item.appendChild(info);
      item.appendChild(amountSpan);
      item.appendChild(deleteBtn);
      fragment.appendChild(item);
    });

    dom.incomeList.appendChild(fragment);
    dom.totalIncome.textContent = formatCLP(total);
  }

  function renderExpenses() {
    var monthTxs = getMonthTransactions(state.selectedMonth);
    var expenseTxs = monthTxs.filter(function (tx) { return tx.type === 'expense'; });
    var total = 0;

    // Limpiar contenido previo de forma segura
    while (dom.expenseList.firstChild) {
      dom.expenseList.removeChild(dom.expenseList.firstChild);
    }

    if (expenseTxs.length === 0) {
      var emptyMsg = document.createElement('p');
      emptyMsg.classList.add('tx-group__empty');
      emptyMsg.textContent = 'No hay gastos registrados este mes';
      dom.expenseList.appendChild(emptyMsg);
      dom.totalExpenses.textContent = formatCLP(0);
      return;
    }

    var fragment = document.createDocumentFragment();

    expenseTxs.forEach(function (tx) {
      total += tx.amount;

      var item = document.createElement('div');
      item.classList.add('tx-item');
      item.setAttribute('data-id', tx.id);

      var info = document.createElement('div');
      info.classList.add('tx-item__info');

      var catSpan = document.createElement('span');
      catSpan.classList.add('tx-item__category');
      catSpan.textContent = tx.category;
      info.appendChild(catSpan);

      if (tx.description) {
        var descP = document.createElement('p');
        descP.classList.add('tx-item__desc');
        descP.textContent = tx.description;
        info.appendChild(descP);
      }

      var amountSpan = document.createElement('span');
      amountSpan.classList.add('tx-item__amount');
      amountSpan.classList.add('tx-item__amount--expense');
      amountSpan.textContent = formatCLP(tx.amount);

      var deleteBtn = document.createElement('button');
      deleteBtn.classList.add('tx-item__delete');
      deleteBtn.setAttribute('data-action', 'deleteTx');
      deleteBtn.setAttribute('title', 'Eliminar');
      deleteBtn.setAttribute('aria-label', 'Eliminar');
      deleteBtn.textContent = '✕';

      item.appendChild(info);
      item.appendChild(amountSpan);
      item.appendChild(deleteBtn);
      fragment.appendChild(item);
    });

    dom.expenseList.appendChild(fragment);
    dom.totalExpenses.textContent = formatCLP(total);
  }

  function renderComparePanel() {
    dom.comparePanel.setAttribute('hidden', '');
    dom.toggleCompare.classList.remove('chart__compare-btn--active');

    if (state.compareActive) {
      dom.comparePanel.removeAttribute('hidden');
      dom.compareMonthLabel.textContent = monthKeyToLabel(state.compareMonth);
      dom.toggleCompare.classList.add('chart__compare-btn--active');
    }
  }

  // Paleta de colores para el donut
  var DONUT_COLORS = [
    '#d946ef', '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
    '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
    '#84cc16', '#e879f9', '#22d3ee', '#34d399', '#fbbf24'
  ];

  function getExpenseTotals(monthKey) {
    var txs = getMonthTransactions(monthKey).filter(function (tx) { return tx.type === 'expense'; });
    var totals = {};
    txs.forEach(function (tx) {
      if (!totals[tx.category]) totals[tx.category] = 0;
      totals[tx.category] += tx.amount;
    });
    return totals;
  }

  function buildDonutSVG(totals, size, label, idSuffix) {
    var cats = Object.keys(totals).sort(function (a, b) { return totals[b] - totals[a]; });
    var total = cats.reduce(function (s, c) { return s + totals[c]; }, 0);
    if (total === 0 || cats.length === 0) return null;

    idSuffix = idSuffix || 'main';

    var cx      = size / 2;
    var cy      = size / 2;
    var R       = size * 0.43;        // radio exterior
    var r       = size * 0.29;        // radio interior (hueco)
    var strokeW = R - r;              // grosor del anillo
    var rMid    = r + strokeW / 2;    // radio de trazo
    var circ    = 2 * Math.PI * rMid;

    // SVG filter para el glow de cada segmento (suave y contenido)
    var filterId = 'glow-' + idSuffix;
    var defs =
      '<defs>' +
        '<filter id="' + filterId + '" x="-25%" y="-25%" width="150%" height="150%">' +
          '<feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur"/>' +
        '</filter>' +
      '</defs>';

    var glowParts = [];   
    var mainParts = [];   
    // Empezamos en 0. Rotaremos TODO el grupo -90 grados para que el 0 sea a las 12 en punto.
    // Esto evita el bug donde los segmentos se cortan al pasar por el inicio del path.
    var offset = 0;  

    cats.forEach(function (cat, i) {
      var pct     = totals[cat] / total;
      var dashArr = pct * circ;
      if (dashArr <= 0) return; // omitir categorías en 0
      
      var dashOff = -offset;
      var color   = DONUT_COLORS[i % DONUT_COLORS.length];
      var delay   = (i * 0.08).toFixed(2) + 's';

      // Glow (brillo suave, bien contenido)
      glowParts.push(
        '<circle cx="' + cx + '" cy="' + cy + '" r="' + rMid + '"' +
        ' fill="none" stroke="' + color + '" stroke-width="' + (strokeW * 1.4).toFixed(1) + '"' +
        ' stroke-linecap="butt"' +
        ' stroke-dasharray="' + dashArr.toFixed(2) + ' ' + circ.toFixed(2) + '"' +
        ' stroke-dashoffset="' + dashOff.toFixed(2) + '"' +
        ' opacity="0.15" filter="url(#' + filterId + ')"' +
        ' class="donut__glow" style="animation-delay:' + delay + '"/>'
      );

      // Segmento principal (uno al lado de otro, stroke-linecap: butt sin espacios)
      mainParts.push(
        '<circle cx="' + cx + '" cy="' + cy + '" r="' + rMid + '"' +
        ' fill="none" stroke="' + color + '" stroke-width="' + strokeW + '"' +
        ' stroke-linecap="butt"' +
        ' stroke-dasharray="' + dashArr.toFixed(2) + ' ' + circ.toFixed(2) + '"' +
        ' stroke-dashoffset="' + dashOff.toFixed(2) + '"' +
        ' class="donut__slice" style="animation-delay:' + delay + '"/>'
      );

      offset += dashArr;
    });

    // Círculo interior: cubre exactamente el hueco de la donut
    var holeR   = r + 2; 
    var innerEl =
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + holeR.toFixed(1) + '"' +
      ' fill="rgba(0,0,0,0.15)"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + (holeR - 2).toFixed(1) + '"' +
      ' fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>';

    // Texto central
    var fsLabel  = Math.round(size * 0.082);
    var fsAmount = Math.round(size * 0.07);

    var textEl =
      '<text x="' + cx + '" y="' + (cy - fsLabel * 0.45).toFixed(1) + '"' +
      ' text-anchor="middle" class="donut__center-label" font-size="' + fsLabel + '">' +
        sanitizeString(label) +
      '</text>' +
      '<text x="' + cx + '" y="' + (cy + fsAmount * 1.2).toFixed(1) + '"' +
      ' text-anchor="middle" class="donut__center-amount" font-size="' + fsAmount + '">' +
        sanitizeString(formatCLP(total)) +
      '</text>';

    return {
      svg:
        '<svg class="donut__svg" width="' + size + '" height="' + size +
        '" viewBox="0 0 ' + size + ' ' + size + '">' +
          defs +
          // Pista de fondo
          '<circle cx="' + cx + '" cy="' + cy + '" r="' + rMid +
          '" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="' + strokeW + '"/>' +
          // Grupo rotado a las 12 en punto
          '<g transform="rotate(-90, ' + cx + ', ' + cy + ')">' +
            glowParts.join('') +
            mainParts.join('') +
          '</g>' +
          innerEl +
          textEl +
        '</svg>',
      cats:  cats,
      total: total
    };
  }

  function renderChart() {
    var isComparing = state.compareActive === true;
    dom.chartLegend.setAttribute('hidden', '');

    var primaryTotals = getExpenseTotals(state.selectedMonth);
    var compareTotals = isComparing ? getExpenseTotals(state.compareMonth) : null;

    var allCats = Object.keys(primaryTotals);
    if (isComparing && compareTotals) {
      Object.keys(compareTotals).forEach(function (cat) {
        if (allCats.indexOf(cat) === -1) allCats.push(cat);
      });
    }

    if (allCats.length === 0) {
      dom.chartBars.innerHTML = '<p class="tx-group__empty">No hay gastos para mostrar</p>';
      return;
    }

    // ---- MODO SIMPLE (un solo mes) ----
    if (!isComparing) {
      var result = buildDonutSVG(primaryTotals, 280, 'Gastos', 'p');
      if (!result) {
        dom.chartBars.innerHTML = '<p class="tx-group__empty">No hay gastos para mostrar</p>';
        return;
      }
      var legendHTML = '';
      result.cats.forEach(function (cat, i) {
        var pct   = ((primaryTotals[cat] / result.total) * 100).toFixed(1);
        var color = DONUT_COLORS[i % DONUT_COLORS.length];
        legendHTML +=
          '<div class="donut-legend__item">' +
            '<span class="donut-legend__pill" style="background:' + color + ';box-shadow:0 0 8px ' + color + '66"></span>' +
            '<span class="donut-legend__cat">' + sanitizeString(cat) + '</span>' +
            '<span class="donut-legend__amount">' + sanitizeString(formatCLP(primaryTotals[cat])) + '</span>' +
            '<span class="donut-legend__pct">' + pct + '%</span>' +
          '</div>';
      });
      dom.chartBars.innerHTML =
        '<div class="donut__wrapper">' +
          result.svg +
          '<div class="donut-legend">' + legendHTML + '</div>' +
        '</div>';

    // ---- MODO COMPARACIÓN (dos donuts) ----
    } else {
      dom.chartLegend.removeAttribute('hidden');
      dom.chartLegend.innerHTML =
        '<div class="chart__legend-item">' +
          '<span class="chart__legend-swatch chart__legend-swatch--primary"></span>' +
          sanitizeString(monthKeyToLabel(state.selectedMonth)) +
        '</div>' +
        '<div class="chart__legend-item">' +
          '<span class="chart__legend-swatch chart__legend-swatch--compare"></span>' +
          sanitizeString(monthKeyToLabel(state.compareMonth)) +
        '</div>';

      var resA = buildDonutSVG(primaryTotals, 210, monthKeyToLabel(state.selectedMonth).split(' ')[0], 'ca');
      var resB = buildDonutSVG(compareTotals || {}, 210, monthKeyToLabel(state.compareMonth).split(' ')[0], 'cb');
      var emptyMini = '<div class="donut__empty-mini"><p class="tx-group__empty" style="font-size:0.75rem">Sin datos</p></div>';

      var allCatsSorted = allCats.slice().sort(function (a, b) {
        return ((primaryTotals[b] || 0) + (compareTotals ? (compareTotals[b] || 0) : 0)) -
               ((primaryTotals[a] || 0) + (compareTotals ? (compareTotals[a] || 0) : 0));
      });

      var compLeg = '';
      allCatsSorted.forEach(function (cat, i) {
        var vA = primaryTotals[cat] || 0;
        var vB = compareTotals ? (compareTotals[cat] || 0) : 0;
        var color = DONUT_COLORS[i % DONUT_COLORS.length];
        compLeg +=
          '<div class="donut-legend__item donut-legend__item--compare">' +
            '<span class="donut-legend__pill" style="background:' + color + ';box-shadow:0 0 8px ' + color + '66"></span>' +
            '<span class="donut-legend__cat">' + sanitizeString(cat) + '</span>' +
            '<span class="donut-legend__amount">' + sanitizeString(formatCLP(vA)) + '</span>' +
            '<span class="donut-legend__amount donut-legend__amount--compare">' + sanitizeString(formatCLP(vB)) + '</span>' +
          '</div>';
      });

      dom.chartBars.innerHTML =
        '<div class="donut__wrapper donut__wrapper--compare">' +
          '<div class="donut__pair">' +
            (resA ? resA.svg : emptyMini) +
            (resB ? resB.svg : emptyMini) +
          '</div>' +
          '<div class="donut-legend">' + compLeg + '</div>' +
        '</div>';
    }
  }

  // ============================================================
  // TRANSACTIONS
  // ============================================================

  function addTransaction(type) {
    var title = type === 'income' ? 'Agregar Ingreso' : 'Agregar Gasto';
    // Categorías ahora son objetos {_id, nombre}
    var categories = type === 'income' ? state.incomeCategories : state.expenseCategories;
    var catOptions = '';

    if (categories.length === 0) {
      catOptions = '<option value="">— Sin categorías disponibles —</option>';
    } else {
      categories.forEach(function (cat) {
        catOptions += '<option value="' + sanitizeString(cat.nombre) + '">' + sanitizeString(cat.nombre) + '</option>';
      });
    }

    var bodyHtml =
      '<div class="form-group">' +
        '<label class="form-label" for="txCategory">Categoría</label>' +
        '<select class="form-select" id="txCategory">' + catOptions + '</select>' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label" for="txAmount">Monto ($)</label>' +
        '<input class="form-input" type="text" id="txAmount" inputmode="numeric" placeholder="Ej: 150000" autocomplete="off">' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label" for="txDesc">Descripción (opcional)</label>' +
        '<input class="form-input" type="text" id="txDesc" placeholder="Ej: Sueldo de junio" autocomplete="off" maxlength="100">' +
      '</div>' +
      '<div class="form-actions">' +
        '<button class="btn btn--ghost" id="modalCancel">Cancelar</button>' +
        '<button class="btn ' + (type === 'income' ? 'btn--primary' : 'btn--danger') + '" id="modalSave">Guardar</button>' +
      '</div>';

    openModal(title, bodyHtml);

    document.getElementById('modalSave').addEventListener('click', function () {
      var catEl  = document.getElementById('txCategory');
      var amtEl  = document.getElementById('txAmount');
      var descEl = document.getElementById('txDesc');

      var category   = catEl.value;
      var rawAmount  = amtEl.value.replace(/\./g, '').replace(/,/g, '');
      var amount     = validateAmount(rawAmount);
      var description = descEl.value.trim();

      if (!category) { showToast('Selecciona una categoría'); return; }
      if (amount === null || amount <= 0) { showToast('Ingresa un monto válido mayor a 0'); return; }
      if (description && !VALID_TEXT_REGEX.test(description)) {
        showToast('La descripción contiene caracteres no permitidos');
        return;
      }

      // Deshabilitar el botón para evitar doble clic
      var saveBtn = document.getElementById('modalSave');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Guardando...';

      var payload = {
        tipo:        type === 'income' ? 'ingreso' : 'gasto',
        categoria:   category,
        monto:       amount,
        descripcion: description,
        mes:         state.selectedMonth,
        fecha:       state.selectedMonth + '-15'
      };

      fetch(API_BASE + '/api/transacciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          if (!res.ok) throw new Error('Error ' + res.status);
          return res.json();
        })
        .then(function (data) {
          var tx = data.transaccion;
          // Agregar al state local con el _id de MongoDB
          state.transactions.push({
            id:          tx._id,
            type:        tx.tipo === 'ingreso' ? 'income' : 'expense',
            category:    tx.categoria,
            amount:      tx.monto,
            description: tx.descripcion || '',
            date:        tx.mes + '-15'
          });
          render();
          closeModal();
          showToast((type === 'income' ? 'Ingreso' : 'Gasto') + ' registrado correctamente');
        })
        .catch(function (err) {
          console.error('[API] Error al guardar transacción:', err.message);
          showToast('❌ Error al guardar. Verifica que el backend esté activo.');
          if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Guardar'; }
        });
    });

    document.getElementById('modalCancel').addEventListener('click', closeModal);

    var amtField = document.getElementById('txAmount');
    amtField.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); document.getElementById('modalSave').click(); }
    });
  }

  function deleteTransaction(id) {
    fetch(API_BASE + '/api/transacciones/' + id, { method: 'DELETE' })
      .then(function (res) {
        if (!res.ok) throw new Error('Error ' + res.status);
        return res.json();
      })
      .then(function () {
        state.transactions = state.transactions.filter(function (tx) { return tx.id !== id; });
        render();
        showToast('Registro eliminado');
      })
      .catch(function (err) {
        console.error('[API] Error al eliminar transacción:', err.message);
        showToast('❌ Error al eliminar. Verifica que el backend esté activo.');
      });
  }

  function clearAllMonthExpenses() {
    var expenseTxs = getMonthTransactions(state.selectedMonth).filter(function (tx) {
      return tx.type === 'expense';
    });

    if (expenseTxs.length === 0) {
      showToast('No hay gastos para eliminar este mes');
      return;
    }

    var monthName = monthKeyToLabel(state.selectedMonth);
    if (!confirm('¿Estás seguro de que deseas eliminar TODOS los gastos de ' + monthName + '?')) return;

    fetch(API_BASE + '/api/transacciones/mes/' + state.selectedMonth + '/tipo/gasto', { method: 'DELETE' })
      .then(function (res) {
        if (!res.ok) throw new Error('Error ' + res.status);
        return res.json();
      })
      .then(function () {
        state.transactions = state.transactions.filter(function (tx) {
          return !(tx.type === 'expense' && isSameMonth(tx, state.selectedMonth));
        });
        render();
        showToast('Todos los gastos de ' + monthName + ' fueron eliminados');
      })
      .catch(function (err) {
        console.error('[API] Error al eliminar gastos:', err.message);
        showToast('❌ Error al eliminar. Verifica que el backend esté activo.');
      });
  }

  // ============================================================
  // CATEGORIES
  // ============================================================

  // Categorías ahora son objetos {_id, nombre, tipo}
  function manageCategories(type) {
    var title = type === 'income' ? 'Administrar Categorías de Ingresos' : 'Administrar Categorías de Gastos';
    var categories = type === 'income' ? state.incomeCategories : state.expenseCategories;
    var listHtml = '';

    if (categories.length === 0) {
      listHtml = '<p style="color:var(--text-muted);font-size:0.82rem;text-align:center;padding:12px 0;">No hay categorías creadas</p>';
    } else {
      categories.forEach(function (cat) {
        listHtml +=
          '<div class="cat-item" data-cat-id="' + cat._id + '" data-cat="' + sanitizeString(cat.nombre) + '">' +
            '<span class="cat-item__name">' + sanitizeString(cat.nombre) + '</span>' +
            '<div class="cat-item__actions">' +
              '<button class="cat-item__btn" data-action="editCat" title="Editar">✏️</button>' +
              '<button class="cat-item__btn cat-item__btn--delete" data-action="deleteCat" title="Eliminar">🗑️</button>' +
            '</div>' +
          '</div>';
      });
    }

    var bodyHtml =
      '<div class="cat-list">' + listHtml + '</div>' +
      '<div class="cat-add">' +
        '<input class="form-input" type="text" id="newCatName" placeholder="Nueva categoría..." maxlength="30" autocomplete="off">' +
        '<button class="btn ' + (type === 'income' ? 'btn--primary' : 'btn--danger') + '" id="addCatBtn">Agregar</button>' +
      '</div>';

    openModal(title, bodyHtml);
    setupCategoryEvents(type);
  }

  function setupCategoryEvents(type) {
    var addBtn    = document.getElementById('addCatBtn');
    var input     = document.getElementById('newCatName');
    var categories = type === 'income' ? state.incomeCategories : state.expenseCategories;

    function addNewCat() {
      var name = input.value.trim();
      if (!name) { showToast('Ingresa un nombre para la categoría'); return; }
      if (!VALID_TEXT_REGEX.test(name)) { showToast('El nombre contiene caracteres no permitidos'); return; }
      var exists = categories.some(function (c) { return c.nombre === name; });
      if (exists) { showToast('Esa categoría ya existe'); return; }

      addBtn.disabled = true;
      fetch(API_BASE + '/api/categorias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: name, tipo: type === 'income' ? 'ingreso' : 'gasto' })
      })
        .then(function (res) { if (!res.ok) throw new Error('Error ' + res.status); return res.json(); })
        .then(function (data) {
          categories.push(data.categoria);
          render();
          closeModal();
          showToast('Categoría agregada');
          manageCategories(type);
        })
        .catch(function (err) {
          console.error('[API] Error al agregar categoría:', err.message);
          showToast('❌ Error al agregar categoría');
          addBtn.disabled = false;
        });
    }

    addBtn.addEventListener('click', addNewCat);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); addNewCat(); }
    });

    var items = document.querySelectorAll('.cat-item');
    items.forEach(function (item) {
      var catId   = item.getAttribute('data-cat-id');
      var catName = item.getAttribute('data-cat');

      var editBtn = item.querySelector('[data-action="editCat"]');
      if (editBtn) {
        editBtn.addEventListener('click', function () {
          var nameSpan    = item.querySelector('.cat-item__name');
          var currentName = nameSpan.textContent;
          nameSpan.innerHTML = '<input class="cat-edit-input" type="text" value="' + sanitizeString(currentName) + '" maxlength="30">';
          var editInput = nameSpan.querySelector('.cat-edit-input');
          editInput.focus(); editInput.select();
          var saving = false;

          function saveEdit() {
            if (saving) return;
            var newName = editInput.value.trim();
            if (!newName) { showToast('El nombre no puede estar vacío'); editInput.focus(); return; }
            if (!VALID_TEXT_REGEX.test(newName)) { showToast('El nombre contiene caracteres no permitidos'); editInput.focus(); return; }
            var exists = categories.some(function (c) { return c.nombre === newName && c._id !== catId; });
            if (exists) { showToast('Esa categoría ya existe'); editInput.focus(); return; }
            saving = true;

            fetch(API_BASE + '/api/categorias/' + catId, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ nombre: newName })
            })
              .then(function (res) { if (!res.ok) throw new Error('Error ' + res.status); return res.json(); })
              .then(function (data) {
                // Actualizar también las transacciones en el state local
                state.transactions.forEach(function (tx) {
                  if (tx.type === type && tx.category === currentName) tx.category = newName;
                });
                var idx = categories.findIndex(function (c) { return c._id === catId; });
                if (idx !== -1) categories[idx].nombre = newName;
                render(); closeModal(); showToast('Categoría actualizada'); manageCategories(type);
              })
              .catch(function (err) {
                console.error('[API] Error al editar categoría:', err.message);
                showToast('❌ Error al actualizar categoría');
                nameSpan.textContent = currentName;
              });
          }

          editInput.addEventListener('blur', saveEdit);
          editInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); saveEdit(); }
            if (e.key === 'Escape') { nameSpan.textContent = currentName; }
          });
        });
      }

      var deleteBtn = item.querySelector('[data-action="deleteCat"]');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', function () {
          if (categories.length <= 1) { showToast('Debe haber al menos una categoría'); return; }
          var count = 0;
          state.transactions.forEach(function (tx) {
            if (tx.type === type && tx.category === catName) count++;
          });
          var msg = '¿Eliminar "' + catName + '"?';
          if (count > 0) msg += ' ' + count + ' registro(s) pasarán a la primera categoría disponible.';
          if (!confirm(msg)) return;

          fetch(API_BASE + '/api/categorias/' + catId, { method: 'DELETE' })
            .then(function (res) { if (!res.ok) throw new Error('Error ' + res.status); return res.json(); })
            .then(function () {
              var idx = categories.findIndex(function (c) { return c._id === catId; });
              if (idx !== -1) categories.splice(idx, 1);
              var fallback = categories.length > 0 ? categories[0].nombre : 'Sin categoría';
              state.transactions.forEach(function (tx) {
                if (tx.type === type && tx.category === catName) tx.category = fallback;
              });
              render(); closeModal(); showToast('Categoría eliminada'); manageCategories(type);
            })
            .catch(function (err) {
              console.error('[API] Error al eliminar categoría:', err.message);
              showToast('❌ Error al eliminar categoría');
            });
        });
      }
    });
  }

  // ============================================================
  // MODAL
  // ============================================================

  function openModal(title, bodyHtml) {
    dom.modalTitle.textContent = title;
    dom.modalBody.innerHTML = bodyHtml;
    dom.modalOverlay.removeAttribute('hidden');
    // Trigger reflow for transition
    void dom.modalOverlay.offsetWidth;
    dom.modalOverlay.classList.add('modal-overlay--open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    dom.modalOverlay.classList.remove('modal-overlay--open');
    document.body.style.overflow = '';
    setTimeout(function () {
      dom.modalOverlay.setAttribute('hidden', '');
    }, 250);
  }

  // ============================================================
  // TOAST
  // ============================================================

  function showToast(message) {
    var toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    dom.toastContainer.appendChild(toast);

    setTimeout(function () {
      toast.classList.add('toast--out');
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 2500);
  }

  // ============================================================
  // EVENT HANDLING
  // ============================================================

  function setupEvents() {
    // Initial balance
    dom.initialBalanceInput.addEventListener('focus', function () {
      var raw = this.value.replace(/\./g, '').replace(/,/g, '');
      if (!raw || Number(raw) === 0) {
        this.value = '';
      } else {
        // Select existing value for faster replacement
        try { this.select(); } catch (e) {}
      }
    });

    dom.initialBalanceInput.addEventListener('blur', function () {
      var raw = this.value.replace(/\./g, '').replace(/,/g, '');
      var val = validateAmount(raw);
      if (val === null) val = 0;
      state.initialBalances[state.selectedMonth] = val;
      render();
      // Persistir en MongoDB
      fetch(API_BASE + '/api/saldos/' + state.selectedMonth, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monto: val })
      })
        .then(function (res) { if (!res.ok) throw new Error('Error ' + res.status); })
        .catch(function (err) {
          console.warn('[API] Error al guardar saldo inicial:', err.message);
          showToast('⚠️ Error al guardar saldo en el servidor');
        });
    });

    dom.initialBalanceInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.blur();
      }
    });

    // Allow only numbers and basic keys in balance input
    dom.initialBalanceInput.addEventListener('keydown', function (e) {
      if (e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Tab' || e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End') {
        return;
      }
      if (e.key === 'Enter') return;
      if (!/^[0-9]$/.test(e.key)) {
        e.preventDefault();
      }
    });


    // ---- Selector de mes (dropdown) ----
    function getPickerYear() {
      return parseInt(state.selectedMonth.split('-')[0], 10);
    }

    function buildMonthDropdown() {
      var year   = getPickerYear();
      var selMon = parseInt(state.selectedMonth.split('-')[1], 10) - 1;
      dom.monthDropdown.innerHTML = '';

      // Fila del año dentro del dropdown
      var yearRow = document.createElement('div');
      yearRow.className = 'month-picker__year-row';

      var btnPY = document.createElement('button');
      btnPY.className = 'month-picker__year-btn';
      btnPY.textContent = '‹';
      btnPY.addEventListener('click', function (e) {
        e.stopPropagation();
        var p = parseMonthKey(state.selectedMonth);
        state.selectedMonth = (p.year - 1) + '-' + String(p.month + 1).padStart(2, '0');
        saveState();
        render();
        buildMonthDropdown();
      });

      var yearSpan = document.createElement('span');
      yearSpan.className = 'month-picker__year-label';
      yearSpan.textContent = year;

      var btnNY = document.createElement('button');
      btnNY.className = 'month-picker__year-btn';
      btnNY.textContent = '›';
      btnNY.addEventListener('click', function (e) {
        e.stopPropagation();
        var p = parseMonthKey(state.selectedMonth);
        state.selectedMonth = (p.year + 1) + '-' + String(p.month + 1).padStart(2, '0');
        saveState();
        render();
        buildMonthDropdown();
      });

      yearRow.appendChild(btnPY);
      yearRow.appendChild(yearSpan);
      yearRow.appendChild(btnNY);
      dom.monthDropdown.appendChild(yearRow);

      // Grid de 12 meses
      var grid = document.createElement('div');
      grid.className = 'month-picker__grid';

      MONTHS.forEach(function (name, i) {
        var btn = document.createElement('button');
        btn.className = 'month-picker__month-btn' + (i === selMon ? ' month-picker__month-btn--active' : '');
        btn.textContent = name.substring(0, 3); // abrev 3 letras
        btn.title = name;
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          state.selectedMonth = year + '-' + String(i + 1).padStart(2, '0');
          saveState();
          render();
          dom.monthDropdown.setAttribute('hidden', '');
          dom.monthPickerBtn.setAttribute('aria-expanded', 'false');
        });
        grid.appendChild(btn);
      });

      dom.monthDropdown.appendChild(grid);
    }

    dom.monthPickerBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = !dom.monthDropdown.hasAttribute('hidden');
      if (isOpen) {
        dom.monthDropdown.setAttribute('hidden', '');
        dom.monthPickerBtn.setAttribute('aria-expanded', 'false');
      } else {
        buildMonthDropdown();
        dom.monthDropdown.removeAttribute('hidden');
        dom.monthPickerBtn.setAttribute('aria-expanded', 'true');
      }
    });

    // Cerrar dropdown al hacer clic fuera
    document.addEventListener('click', function () {
      if (!dom.monthDropdown.hasAttribute('hidden')) {
        dom.monthDropdown.setAttribute('hidden', '');
        dom.monthPickerBtn.setAttribute('aria-expanded', 'false');
      }
    });

    // Add transactions
    dom.addIncome.addEventListener('click', function () { addTransaction('income'); });
    dom.addExpense.addEventListener('click', function () { addTransaction('expense'); });

    // Clear all expenses button
    if (dom.clearAllExpenses) {
      dom.clearAllExpenses.addEventListener('click', clearAllMonthExpenses);
    }

    // Manage categories
    dom.manageIncomeCats.addEventListener('click', function () { manageCategories('income'); });
    dom.manageExpenseCats.addEventListener('click', function () { manageCategories('expense'); });

    // Compare toggle
    dom.toggleCompare.addEventListener('click', function () {
      state.compareActive = !state.compareActive;
      if (state.compareActive && !state.compareMonth) {
        state.compareMonth = addMonths(state.selectedMonth, -1);
      }
      saveState();
      render();
    });

    dom.comparePrev.addEventListener('click', function () {
      state.compareMonth = addMonths(state.compareMonth, -1);
      saveState();
      render();
    });

    dom.compareNext.addEventListener('click', function () {
      state.compareMonth = addMonths(state.compareMonth, 1);
      saveState();
      render();
    });

    // Modal close
    dom.modalClose.addEventListener('click', closeModal);
    dom.modalOverlay.addEventListener('click', function (e) {
      if (e.target === dom.modalOverlay) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && dom.modalOverlay.classList.contains('modal-overlay--open')) {
        closeModal();
      }
    });

    // Event delegation for delete transaction buttons
    dom.incomeList.addEventListener('click', handleDeleteClick);
    dom.expenseList.addEventListener('click', handleDeleteClick);
  }

  function handleDeleteClick(e) {
    var btn = e.target.closest('[data-action="deleteTx"]');
    if (!btn) return;
    var item = btn.closest('.tx-item');
    if (!item) return;
    var id = item.getAttribute('data-id');
    if (id && confirm('¿Eliminar este registro?')) {
      deleteTransaction(id);
    }
  }

  // ============================================================
  // INDICADORES ECONÓMICOS DIARIOS (mindicador.cl API)
  // ============================================================
  function fetchEconomicIndicators() {
    if (!dom.indicatorsGrid) return;

    fetch('https://mindicador.cl/api')
      .then(function (response) {
        if (!response.ok) throw new Error('Error al consultar servidor');
        return response.json();
      })
      .then(function (data) {
        if (data && data.fecha) {
          var dateObj = new Date(data.fecha);
          var formattedDate = dateObj.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
          if (dom.indicatorsDate) {
            dom.indicatorsDate.textContent = 'Chile (' + formattedDate + ')';
          }
        }
        renderIndicators(data);
      })
      .catch(function () {
        if (dom.indicatorsGrid) {
          dom.indicatorsGrid.innerHTML =
            '<div class="indicators__error">' +
              '⚠️ No se pudieron obtener los indicadores económicos en este momento.' +
            '</div>';
        }
      });
  }

  function renderIndicators(data) {
    var items = [
      { key: 'dolar', label: 'Dólar Observado', icon: '💵', prefix: '$', decimals: 2 },
      { key: 'uf', label: 'UF', icon: '🏠', prefix: '$', decimals: 2 },
      { key: 'euro', label: 'Euro', icon: '💶', prefix: '$', decimals: 2 },
      { key: 'utm', label: 'UTM', icon: '📊', prefix: '$', decimals: 0 },
      { key: 'ipc', label: 'IPC', icon: '📈', suffix: '%', decimals: 2 }
    ];

    var html = '';
    items.forEach(function (item) {
      var ind = data[item.key];
      if (!ind || typeof ind.valor !== 'number') return;
      var formattedVal = ind.valor.toLocaleString('es-CL', {
        minimumFractionDigits: item.decimals,
        maximumFractionDigits: item.decimals
      });
      var displayVal = (item.prefix ? item.prefix + ' ' : '') + formattedVal + (item.suffix ? item.suffix : '');

      html +=
        '<div class="indicator-card">' +
          '<div class="indicator-card__icon">' + item.icon + '</div>' +
          '<div class="indicator-card__content">' +
            '<span class="indicator-card__label">' + sanitizeString(item.label) + '</span>' +
            '<span class="indicator-card__val">' + sanitizeString(displayVal) + '</span>' +
          '</div>' +
        '</div>';
    });

    dom.indicatorsGrid.innerHTML = html;
  }

  // ============================================================
  // API: CARGA INICIAL DESDE MONGODB
  // ============================================================

  /**
   * Carga en paralelo transacciones, categorías y saldos desde el backend.
   * Reemplaza completamente a loadState() para datos.
   */
  function initFromAPI() {
    showLoading();

    Promise.all([
      fetch(API_BASE + '/api/transacciones').then(function (r) { if (!r.ok) throw new Error('transacciones'); return r.json(); }),
      fetch(API_BASE + '/api/categorias').then(function (r) { if (!r.ok) throw new Error('categorias'); return r.json(); }),
      fetch(API_BASE + '/api/saldos').then(function (r) { if (!r.ok) throw new Error('saldos'); return r.json(); })
    ])
      .then(function (results) {
        var transacciones = results[0];
        var categorias    = results[1];
        var saldos        = results[2];

        // Mapear transacciones al formato interno del frontend
        state.transactions = transacciones.map(function (tx) {
          return {
            id:          tx._id,
            type:        tx.tipo === 'ingreso' ? 'income' : 'expense',
            category:    tx.categoria,
            amount:      tx.monto,
            description: tx.descripcion || '',
            date:        tx.mes + '-15'
          };
        });

        // Categorías como objetos {_id, nombre}
        state.incomeCategories  = categorias.filter(function (c) { return c.tipo === 'ingreso'; });
        state.expenseCategories = categorias.filter(function (c) { return c.tipo === 'gasto'; });

        // Si no hay categorías en DB, insertar las por defecto
        if (state.incomeCategories.length === 0) {
          seedDefaultCategories('ingreso', DEFAULT_INCOME_CATS);
        }
        if (state.expenseCategories.length === 0) {
          seedDefaultCategories('gasto', DEFAULT_EXPENSE_CATS);
        }

        // Saldos iniciales por mes
        state.initialBalances = {};
        saldos.forEach(function (s) {
          state.initialBalances[s.mes] = s.monto;
        });

        hideLoading();
        render();
        console.log('[API] Datos cargados desde MongoDB Atlas ✅');
      })
      .catch(function (err) {
        console.error('[API] Error al cargar datos:', err.message);
        showApiError('No se pudo conectar con el servidor. ¿Está corriendo node index.js?');
      });
  }

  /**
   * Inserta categorías por defecto en MongoDB cuando la DB está vacía.
   */
  function seedDefaultCategories(tipo, nombres) {
    var cats = tipo === 'ingreso' ? state.incomeCategories : state.expenseCategories;
    nombres.forEach(function (nombre) {
      fetch(API_BASE + '/api/categorias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombre, tipo: tipo })
      })
        .then(function (r) { if (!r.ok) throw new Error('Error'); return r.json(); })
        .then(function (data) { cats.push(data.categoria); })
        .catch(function (err) { console.warn('[API] Error al insertar categoría por defecto:', err.message); });
    });
  }

  // ============================================================
  // INIT
  // ============================================================

  function init() {
    cacheDom();
    loadUIPrefs();      // solo selectedMonth, compareActive, compareMonth
    setDefaultPrefs();  // inicializa arrays vacíos
    render();           // render inicial vacío (el spinner ocultará la app)
    setupEvents();
    fetchEconomicIndicators();
    initFromAPI();      // carga real desde MongoDB
  }

  document.addEventListener('DOMContentLoaded', init);

})();

