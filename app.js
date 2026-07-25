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
  // STORAGE
  // ============================================================

  function loadState() {
    var raw;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      raw = null;
    }
    if (raw) {
      try {
        var data = JSON.parse(raw);
        // Migración: si initialBalance es un número (formato antiguo), convertir a objeto por mes
        if (typeof data.initialBalance === 'number') {
          var currentMonth = getCurrentMonthKey();
          state.initialBalances = {};
          state.initialBalances[currentMonth] = data.initialBalance;
        } else if (data.initialBalances && typeof data.initialBalances === 'object' && !Array.isArray(data.initialBalances)) {
          state.initialBalances = data.initialBalances;
        } else {
          state.initialBalances = {};
        }
        state.incomeCategories = Array.isArray(data.incomeCategories) ? data.incomeCategories : DEFAULT_INCOME_CATS.slice();
        state.expenseCategories = Array.isArray(data.expenseCategories) ? data.expenseCategories : DEFAULT_EXPENSE_CATS.slice();
        state.transactions = Array.isArray(data.transactions) ? data.transactions : [];
        state.selectedMonth = typeof data.selectedMonth === 'string' && data.selectedMonth.match(/^\d{4}-\d{2}$/) ? data.selectedMonth : getCurrentMonthKey();
        state.compareActive = data.compareActive === true;
        state.compareMonth = typeof data.compareMonth === 'string' && data.compareMonth.match(/^\d{4}-\d{2}$/) ? data.compareMonth : addMonths(state.selectedMonth, -1);
      } catch (e) {
        setDefaults();
      }
    } else {
      setDefaults();
    }
  }

  function setDefaults() {
    var current = getCurrentMonthKey();
    state.initialBalances = {};
    state.incomeCategories = DEFAULT_INCOME_CATS.slice();
    state.expenseCategories = DEFAULT_EXPENSE_CATS.slice();
    state.transactions = [];
    state.selectedMonth = current;
    state.compareActive = false;
    state.compareMonth = addMonths(current, -1);
  }

  function saveState() {
    var data = {
      initialBalances: state.initialBalances,
      incomeCategories: state.incomeCategories,
      expenseCategories: state.expenseCategories,
      transactions: state.transactions,
      selectedMonth: state.selectedMonth,
      compareActive: state.compareActive,
      compareMonth: state.compareMonth
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      showToast('Error al guardar los datos');
    }
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
            '<span class="donut-legend__dot" style="background:' + color + '"></span>' +
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
    var categories = type === 'income' ? state.incomeCategories : state.expenseCategories;
    var catOptions = '';

    if (categories.length === 0) {
      catOptions = '<option value="">— Sin categorías disponibles —</option>';
    } else {
      categories.forEach(function (cat) {
        catOptions += '<option value="' + sanitizeString(cat) + '">' + sanitizeString(cat) + '</option>';
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
      var catEl = document.getElementById('txCategory');
      var amtEl = document.getElementById('txAmount');
      var descEl = document.getElementById('txDesc');

      var category = catEl.value;
      var rawAmount = amtEl.value.replace(/\./g, '').replace(/,/g, '');
      var amount = validateAmount(rawAmount);
      var description = descEl.value.trim();

      if (!category) {
        showToast('Selecciona una categoría');
        return;
      }
      if (amount === null || amount <= 0) {
        showToast('Ingresa un monto válido mayor a 0');
        return;
      }
      // Validación Regex: solo letras, números, espacios y caracteres permitidos
      if (description && !VALID_TEXT_REGEX.test(description)) {
        showToast('La descripción contiene caracteres no permitidos');
        return;
      }

      var transaction = {
        id: generateId(),
        type: type,
        category: category,
        amount: amount,
        description: description,
        date: state.selectedMonth + '-15'
      };

      state.transactions.push(transaction);
      saveState();
      render();
      closeModal();
      showToast((type === 'income' ? 'Ingreso' : 'Gasto') + ' registrado correctamente');
    });

    document.getElementById('modalCancel').addEventListener('click', closeModal);

    // Allow Enter key to submit
    var amtField = document.getElementById('txAmount');
    amtField.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('modalSave').click();
      }
    });
  }

  function deleteTransaction(id) {
    var found = false;
    for (var i = 0; i < state.transactions.length; i++) {
      if (state.transactions[i].id === id) {
        state.transactions.splice(i, 1);
        found = true;
        break;
      }
    }
    if (found) {
      saveState();
      render();
      showToast('Registro eliminado');
    }
  }

  // ============================================================
  // CATEGORIES
  // ============================================================

  function manageCategories(type) {
    var title = type === 'income' ? 'Administrar Categorías de Ingresos' : 'Administrar Categorías de Gastos';
    var categories = type === 'income' ? state.incomeCategories : state.expenseCategories;
    var listHtml = '';

    if (categories.length === 0) {
      listHtml = '<p style="color:var(--text-muted);font-size:0.82rem;text-align:center;padding:12px 0;">No hay categorías creadas</p>';
    } else {
      categories.forEach(function (cat) {
        listHtml +=
          '<div class="cat-item" data-cat="' + sanitizeString(cat) + '">' +
            '<span class="cat-item__name">' + sanitizeString(cat) + '</span>' +
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
    var addBtn = document.getElementById('addCatBtn');
    var input = document.getElementById('newCatName');
    var categories = type === 'income' ? state.incomeCategories : state.expenseCategories;

    function addNewCat() {
      var name = input.value.trim();
      if (!name) {
        showToast('Ingresa un nombre para la categoría');
        return;
      }
      // Validación Regex: solo letras, números, espacios y caracteres permitidos
      if (!VALID_TEXT_REGEX.test(name)) {
        showToast('El nombre contiene caracteres no permitidos');
        return;
      }
      if (categories.indexOf(name) !== -1) {
        showToast('Esa categoría ya existe');
        return;
      }
      categories.push(name);
      saveState();
      render();
      closeModal();
      showToast('Categoría agregada');
      manageCategories(type);
    }

    addBtn.addEventListener('click', addNewCat);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        addNewCat();
      }
    });

    // Edit and delete buttons
    var items = document.querySelectorAll('.cat-item');
    items.forEach(function (item) {
      var catName = item.getAttribute('data-cat');

      var editBtn = item.querySelector('[data-action="editCat"]');
      if (editBtn) {
        editBtn.addEventListener('click', function () {
          var nameSpan = item.querySelector('.cat-item__name');
          var currentName = nameSpan.textContent;
          var inputHtml = '<input class="cat-edit-input" type="text" value="' + sanitizeString(currentName) + '" maxlength="30">';
          nameSpan.innerHTML = inputHtml;
          var editInput = nameSpan.querySelector('.cat-edit-input');
          editInput.focus();
          editInput.select();

          function saveEdit() {
            var newName = editInput.value.trim();
            if (!newName) {
              showToast('El nombre no puede estar vacío');
              editInput.focus();
              return;
            }
            // Validación Regex: solo letras, números, espacios y caracteres permitidos
            if (!VALID_TEXT_REGEX.test(newName)) {
              showToast('El nombre contiene caracteres no permitidos');
              editInput.focus();
              return;
            }
            if (newName !== currentName && categories.indexOf(newName) !== -1) {
              showToast('Esa categoría ya existe');
              editInput.focus();
              return;
            }
            var idx = categories.indexOf(currentName);
            if (idx !== -1) {
              // Update transactions with old category name
              state.transactions.forEach(function (tx) {
                if (tx.type === type && tx.category === currentName) {
                  tx.category = newName;
                }
              });
              categories[idx] = newName;
              saveState();
              render();
              closeModal();
              showToast('Categoría actualizada');
              manageCategories(type);
            }
          }

          editInput.addEventListener('blur', saveEdit);
          editInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
              e.preventDefault();
              saveEdit();
            }
            if (e.key === 'Escape') {
              nameSpan.textContent = currentName;
            }
          });
        });
      }

      var deleteBtn = item.querySelector('[data-action="deleteCat"]');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', function () {
          if (categories.length <= 1) {
            showToast('Debe haber al menos una categoría');
            return;
          }
          var count = 0;
          state.transactions.forEach(function (tx) {
            if (tx.type === type && tx.category === catName) count++;
          });
          var msg = '¿Eliminar "' + catName + '"?';
          if (count > 0) {
            msg += ' ' + count + ' registro(s) pasarán a "Otros".';
          }
          if (!confirm(msg)) return;

          var idx = categories.indexOf(catName);
          if (idx !== -1) categories.splice(idx, 1);

          // Reassign transactions
          var fallback = categories.length > 0 ? categories[0] : 'Sin categoría';
          state.transactions.forEach(function (tx) {
            if (tx.type === type && tx.category === catName) {
              tx.category = fallback;
            }
          });

          saveState();
          render();
          closeModal();
          showToast('Categoría eliminada');
          manageCategories(type);
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
      saveState();
      render();
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
  // INIT
  // ============================================================

  function init() {
    cacheDom();
    loadState();
    render();
    setupEvents();
  }

  document.addEventListener('DOMContentLoaded', init);

})();
