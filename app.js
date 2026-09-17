(function () {
  "use strict";

  var STORAGE_KEY = "weekly-todo-v1";
  var DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  var state = {
    weekStart: startOfWeek(new Date()),
    data: loadData()
  };

  var daysEl = document.getElementById("days");
  var weekRangeEl = document.getElementById("week-range");
  var weekHintEl = document.getElementById("week-hint");
  var clearAllBtn = document.getElementById("clear-all");
  var modal = document.getElementById("clear-modal");
  var modalRangeEl = document.getElementById("clear-modal-range");
  var confirmBtn = document.getElementById("clear-confirm");

  document.getElementById("prev-week").addEventListener("click", function () {
    shiftWeek(-7);
  });
  document.getElementById("next-week").addEventListener("click", function () {
    shiftWeek(7);
  });
  clearAllBtn.addEventListener("click", openClearModal);
  confirmBtn.addEventListener("click", function () {
    clearWeek();
    closeModal();
  });
  modal.addEventListener("click", function (e) {
    if (e.target.dataset.close !== undefined) closeModal();
  });

  render();

  function shiftWeek(days) {
    var next = new Date(state.weekStart);
    next.setDate(next.getDate() + days);
    state.weekStart = startOfWeek(next);
    render();
  }

  function render() {
    var today = startOfDay(new Date());
    var dates = weekDates(state.weekStart);
    var weekData = state.data[weekKey(state.weekStart)] || {};

    weekRangeEl.textContent = formatRange(state.weekStart);
    var isCurrentWeek = weekKey(state.weekStart) === weekKey(today);
    weekHintEl.textContent = isCurrentWeek ? "This week" : "";
    weekHintEl.classList.toggle("is-today", isCurrentWeek);

    daysEl.innerHTML = "";
    dates.forEach(function (date, i) {
      var dateKey = dateKeyFmt(date);
      var tasks = weekData[dateKey] || [];
      daysEl.appendChild(buildDay(i, date, tasks, dateKey, date.getTime() === today.getTime()));
    });
  }

  function buildDay(i, date, tasks, dateKey, isToday) {
    var card = document.createElement("article");
    card.className = "day" + (isToday ? " day--today" : "");
    card.dataset.dateKey = dateKey;

    var head = document.createElement("div");
    head.className = "day__head";

    var nameWrap = document.createElement("div");
    nameWrap.className = "day__name";
    var dot = document.createElement("span");
    dot.className = "day__dot";
    nameWrap.appendChild(dot);
    nameWrap.appendChild(document.createTextNode(DAY_NAMES[i]));

    var dateEl = document.createElement("span");
    dateEl.className = "day__date";
    dateEl.textContent = shortDate(date);

    var clearBtn = document.createElement("button");
    clearBtn.className = "day__clear";
    clearBtn.textContent = "Clear day";
    clearBtn.addEventListener("click", function () {
      var wk = weekDataRef();
      if (wk && wk[dateKey] && wk[dateKey].length) {
        delete wk[dateKey];
        save();
        render();
      }
    });

    head.appendChild(nameWrap);
    card.appendChild(head);

    var list = document.createElement("ul");
    list.className = "day__list";

    var empty = document.createElement("li");
    empty.className = "day__empty";
    empty.textContent = "Nothing planned yet.";

    if (tasks.length === 0) list.appendChild(empty);

    tasks.forEach(function (task) {
      list.appendChild(buildTask(task, dateKey));
    });

    card.appendChild(list);

    var addRow = document.createElement("div");
    addRow.className = "day__add";
    var input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Add a task for " + DAY_NAMES[i].toLowerCase();
    input.autocomplete = "off";
    var addBtn = document.createElement("button");
    addBtn.textContent = "+";
    addBtn.setAttribute("aria-label", "Add task");

    function addTask() {
      var text = input.value.trim();
      if (!text) return;
      var wk = ensureWeek();
      wk[dateKey].push({ id: newId(), text: text, done: false });
      save();
      input.value = "";
      render();
      refocusInput(dateKey);
    }

    addBtn.addEventListener("click", addTask);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        addTask();
      }
    });

    addRow.appendChild(input);
    addRow.appendChild(addBtn);
    card.appendChild(addRow);
    return card;
  }

  function buildTask(task, dateKey) {
    var row = document.createElement("li");
    row.className = "task-row";

    var check = document.createElement("input");
    check.type = "checkbox";
    check.className = "task__check";
    check.checked = !!task.done;
    check.setAttribute("aria-label", "Mark as done");

    var text = document.createElement("span");
    text.className = "task__text";
    text.textContent = task.text;

    function toggleDone() {
      task.done = !task.done;
      save();
      text.classList.toggle("done", task.done);
      row.classList.toggle("is-done", task.done);
    }

    check.addEventListener("change", toggleDone);
    text.addEventListener("click", toggleDone);

    var del = document.createElement("button");
    del.className = "task__del";
    del.textContent = "\u2715";
    del.setAttribute("aria-label", "Delete task");
    del.addEventListener("click", function () {
      var wk = weekDataRef();
      if (wk) {
        var list = wk[dateKey] || [];
        var idx = list.indexOf(task);
        if (idx !== -1) {
          list.splice(idx, 1);
          if (list.length === 0) delete wk[dateKey];
          save();
          render();
        }
      }
    });

    row.appendChild(check);
    row.appendChild(text);
    row.appendChild(del);
    if (task.done) row.classList.add("is-done");
    return row;
  }

  function refocusInput(dateKey) {
    var card = daysEl.querySelector('[data-date-key="' + dateKey + '"]');
    if (card) {
      var input = card.querySelector("input");
      if (input) input.focus();
    }
  }

  // ----- Clear all -----

  function openClearModal() {
    var wk = weekDataRef();
    var total = 0;
    if (wk) Object.keys(wk).forEach(function (k) { total += wk[k].length; });
    if (total === 0) {
      alert("There is nothing to clear this week.");
      return;
    }
    modalRangeEl.textContent = formatRange(state.weekStart);
    modal.hidden = false;
    confirmBtn.focus();
  }

  function closeModal() {
    modal.hidden = true;
    clearAllBtn.focus();
  }

  function clearWeek() {
    var key = weekKey(state.weekStart);
    if (state.data[key]) {
      delete state.data[key];
      save();
      render();
    }
  }

  // ----- Data & dates -----

  function ensureWeek() {
    var key = weekKey(state.weekStart);
    if (!state.data[key]) state.data[key] = {};
    var wk = state.data[key];
    weekDates(state.weekStart).forEach(function (d) {
      if (!wk[dateKeyFmt(d)]) wk[dateKeyFmt(d)] = [];
    });
    return wk;
  }

  function weekDataRef() {
    return state.data[weekKey(state.weekStart)] || null;
  }

  function loadData() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
    } catch (e) {
      alert("Could not save — storage may be full or blocked.");
    }
  }

  function startOfWeek(date) {
    var d = startOfDay(date);
    var day = d.getDay(); // 0=Sun..6=Sat
    var diff = (day + 6) % 7; // days since Monday
    d.setDate(d.getDate() - diff);
    return d;
  }

  function weekDates(weekStart) {
    var out = [];
    for (var i = 0; i < 7; i++) {
      var d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      out.push(d);
    }
    return out;
  }

  function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function pad(n) { return String(n).padStart(2, "0"); }

  function dateKeyFmt(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function weekKey(d) { return dateKeyFmt(startOfWeek(d)); }

  function formatRange(weekStart) {
    var end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    var sameMonth = weekStart.getMonth() === end.getMonth();
    var left = weekStart.getDate() + " " + monthName(weekStart, true);
    var right = sameMonth
      ? end.getDate() + " " + monthName(end, true)
      : end.getDate() + " " + monthName(end, true);
    if (weekStart.getFullYear() !== end.getFullYear()) {
      left += " " + weekStart.getFullYear();
      right += " " + end.getFullYear();
    }
    return left + " \u2013 " + right;
  }

  function shortDate(d) {
    return d.getDate() + " " + monthName(d, true);
  }

  function monthName(d, short) {
    var names = short
      ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      : ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return names[d.getMonth()];
  }

  function newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
})();
