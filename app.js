const STORAGE_KEY = "messmate_state_v1";
const SETTINGS_KEY = "messmate_settings_v1";
const APP_STATE_KEYS = ["ui", "residents", "meals", "purchases", "menus", "payments"];

const state = loadState();
const localSettings = loadSettings();
let cloudUser = null;
let cloudConnected = false;
let cloudLoading = false;
let applyingRemoteState = false;
let deferredInstallPrompt = null;

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const els = {
  pageTitle: document.querySelector("#pageTitle"),
  monthPicker: document.querySelector("#monthPicker"),
  metricGrid: document.querySelector("#metricGrid"),
  todayDateBadge: document.querySelector("#todayDateBadge"),
  todayMenuCard: document.querySelector("#todayMenuCard"),
  attentionList: document.querySelector("#attentionList"),
  profileSnapshot: document.querySelector("#profileSnapshot"),
  residentForm: document.querySelector("#residentForm"),
  residentTable: document.querySelector("#residentTable"),
  mealForm: document.querySelector("#mealForm"),
  mealSummary: document.querySelector("#mealSummary"),
  mealTable: document.querySelector("#mealTable"),
  purchaseForm: document.querySelector("#purchaseForm"),
  categoryBreakdown: document.querySelector("#categoryBreakdown"),
  purchaseTable: document.querySelector("#purchaseTable"),
  menuForm: document.querySelector("#menuForm"),
  menuHistory: document.querySelector("#menuHistory"),
  paymentForm: document.querySelector("#paymentForm"),
  paymentTable: document.querySelector("#paymentTable"),
  settlementStats: document.querySelector("#settlementStats"),
  settlementTable: document.querySelector("#settlementTable"),
  exportCsvBtn: document.querySelector("#exportCsvBtn"),
  resetDemoBtn: document.querySelector("#resetDemoBtn"),
  syncStatus: document.querySelector("#syncStatus"),
  sidebarSyncText: document.querySelector("#sidebarSyncText"),
  installAppBtn: document.querySelector("#installAppBtn"),
  installAppBtnInline: document.querySelector("#installAppBtnInline"),
  cloudConfigBadge: document.querySelector("#cloudConfigBadge"),
  cloudStatusText: document.querySelector("#cloudStatusText"),
  authForm: document.querySelector("#authForm"),
  signOutBtn: document.querySelector("#signOutBtn"),
  messCodeBadge: document.querySelector("#messCodeBadge"),
  messCloudForm: document.querySelector("#messCloudForm"),
  uploadCloudBtn: document.querySelector("#uploadCloudBtn"),
  profileForm: document.querySelector("#profileForm"),
  installBadge: document.querySelector("#installBadge"),
  toast: document.querySelector("#toast"),
  hamburgerBtn: document.querySelector("#hamburgerBtn"),
  sidebar: document.querySelector(".sidebar"),
};

init();

function init() {
  const currentMonth = todayIso().slice(0, 7);
  els.monthPicker.value = state.ui?.month || currentMonth;
  setDefaultDates();
  bindNavigation();
  bindForms();
  bindAccount();
  registerServiceWorker();
  renderAll();
  renderAccount();
}

function bindNavigation() {
  document.querySelectorAll(".nav-link").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.view;
      document.querySelectorAll(".nav-link").forEach((item) => item.classList.toggle("is-active", item === button));
      document.querySelectorAll(".view").forEach((view) => view.classList.toggle("is-active", view.id === target));
      els.pageTitle.textContent = button.textContent;
      
      // Close sidebar on mobile after navigation
      if (els.sidebar && els.hamburgerBtn) {
        els.sidebar.classList.remove("is-open");
      }
    });
  });

  // Hamburger menu toggle
  if (els.hamburgerBtn) {
    els.hamburgerBtn.addEventListener("click", () => {
      els.sidebar.classList.toggle("is-open");
    });
    
    // Close menu when clicking overlay (sidebar::after)
    document.addEventListener("click", (e) => {
      if (els.sidebar.classList.contains("is-open") && 
          !e.target.closest(".sidebar") && 
          !e.target.closest("#hamburgerBtn")) {
        els.sidebar.classList.remove("is-open");
      }
    });
  }

  els.monthPicker.addEventListener("change", () => {
    state.ui = { ...state.ui, month: els.monthPicker.value };
    persist();
    renderAll();
  });

  els.resetDemoBtn.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    Object.assign(state, createDefaultState());
    els.monthPicker.value = todayIso().slice(0, 7);
    setDefaultDates();
    persist();
    renderAll();
    showToast("Sample mess data restored");
  });
}

function bindForms() {
  els.residentForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    state.residents.push({
      id: uid("resident"),
      name: text(form.get("name")),
      room: text(form.get("room")),
      phone: text(form.get("phone")) || "-",
      status: form.get("status"),
      joined: todayIso(),
    });
    event.currentTarget.reset();
    persistAndRender("Resident added");
  });

  els.mealForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const entry = {
      id: uid("meal"),
      date: form.get("date"),
      residentId: form.get("residentId"),
      breakfast: form.get("breakfast") ? 1 : 0,
      lunch: form.get("lunch") ? 1 : 0,
      dinner: form.get("dinner") ? 1 : 0,
      guest: number(form.get("guest")),
    };
    const existingIndex = state.meals.findIndex((meal) => meal.date === entry.date && meal.residentId === entry.residentId);
    if (existingIndex >= 0) {
      state.meals[existingIndex] = { ...entry, id: state.meals[existingIndex].id };
      persistAndRender("Meal entry updated");
    } else {
      state.meals.push(entry);
      persistAndRender("Meal entry saved");
    }
  });

  els.purchaseForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    state.purchases.push({
      id: uid("purchase"),
      date: form.get("date"),
      item: text(form.get("item")),
      category: form.get("category"),
      quantity: number(form.get("quantity")),
      unit: form.get("unit"),
      cost: number(form.get("cost")),
      buyer: text(form.get("buyer")) || "Manager",
    });
    event.currentTarget.reset();
    setDefaultDates();
    persistAndRender("Purchase added");
  });

  els.menuForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const menu = {
      id: uid("menu"),
      date: form.get("date"),
      breakfast: text(form.get("breakfast")),
      lunch: text(form.get("lunch")),
      dinner: text(form.get("dinner")),
      note: text(form.get("note")),
    };
    const existingIndex = state.menus.findIndex((item) => item.date === menu.date);
    if (existingIndex >= 0) {
      state.menus[existingIndex] = { ...menu, id: state.menus[existingIndex].id };
      persistAndRender("Menu updated");
    } else {
      state.menus.push(menu);
      persistAndRender("Menu published");
    }
  });

  els.paymentForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    state.payments.push({
      id: uid("payment"),
      date: form.get("date"),
      residentId: form.get("residentId"),
      type: form.get("type"),
      amount: number(form.get("amount")),
      mode: form.get("mode"),
    });
    event.currentTarget.reset();
    setDefaultDates();
    persistAndRender("Fund contribution recorded");
  });

  els.exportCsvBtn.addEventListener("click", exportSettlementCsv);
}

function bindAccount() {
  window.addEventListener("messcloud-ready", renderAccount);
  window.addEventListener("messcloud-user", (event) => {
    cloudUser = event.detail;
    cloudConnected = false;
    renderAccount();
  });
  window.addEventListener("messcloud-error", (event) => {
    showToast(event.detail || "Cloud sync failed to load");
    renderAccount();
  });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    renderAccount();
  });

  [els.installAppBtn, els.installAppBtnInline].forEach((button) => {
    button?.addEventListener("click", installApp);
  });

  els.authForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const cloud = getCloud();
    if (!cloud?.isConfigured()) {
      showToast("Add Firebase config first");
      return;
    }

    const form = new FormData(event.currentTarget);
    const email = text(form.get("email"));
    const password = String(form.get("password") || "");
    const mode = event.submitter?.value || "signin";

    try {
      cloudLoading = true;
      renderAccount();
      if (mode === "signup") {
        await cloud.signUp(email, password);
        showToast("Cloud account created");
      } else {
        await cloud.signIn(email, password);
        showToast("Signed in");
      }
    } catch (error) {
      showToast(error.message || "Login failed");
    } finally {
      cloudLoading = false;
      renderAccount();
    }
  });

  els.signOutBtn?.addEventListener("click", async () => {
    const cloud = getCloud();
    if (!cloud?.isConfigured()) return;
    try {
      await cloud.signOut();
      cloudUser = null;
      cloudConnected = false;
      showToast("Signed out");
      renderAccount();
    } catch (error) {
      showToast(error.message || "Could not sign out");
    }
  });

  els.messCloudForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await openCloudMess(text(form.get("messId")));
  });

  els.uploadCloudBtn?.addEventListener("click", async () => {
    const cloud = getCloud();
    if (!cloudUser || !cloudConnected) {
      showToast("Sign in and open a mess code first");
      return;
    }

    try {
      await cloud.saveState(state, { now: true });
      showToast("This device data uploaded");
    } catch (error) {
      showToast(error.message || "Upload failed");
    }
  });

  els.profileForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    localSettings.role = form.get("role");
    localSettings.residentId = form.get("residentId");
    saveSettings();
    renderAccount();
    showToast("Phone profile saved");
  });
}

function renderAll() {
  updateResidentOptions();
  renderDashboard();
  renderResidents();
  renderMeals();
  renderPurchases();
  renderMenus();
  renderPayments();
  renderSettlement();
  renderAccount();
}

function renderAccount() {
  const cloud = getCloud();
  const configured = Boolean(cloud?.isConfigured());
  const ready = Boolean(cloud?.isReady?.());
  const error = cloud?.getError?.();
  const currentUser = cloud?.getUser?.() || cloudUser;
  const currentMessId = cloud?.getMessId?.() || localSettings.messId || "";
  document.body.classList.toggle("student-mode", localSettings.role === "student");

  if (els.cloudConfigBadge) {
    els.cloudConfigBadge.textContent = configured ? "Firebase ready" : "Local only";
  }

  if (els.cloudStatusText) {
    if (!configured) {
      els.cloudStatusText.textContent = "Cloud login is built in, but Firebase keys are not added yet. The app is working in local/offline mode.";
    } else if (error) {
      els.cloudStatusText.textContent = `Cloud load error: ${error}`;
    } else if (!ready) {
      els.cloudStatusText.textContent = "Loading Firebase services...";
    } else if (currentUser) {
      els.cloudStatusText.textContent = `Signed in as ${currentUser.email || "mess user"}.`;
    } else {
      els.cloudStatusText.textContent = "Sign in or create an account to sync this mess across phones.";
    }
  }

  const syncText = cloudConnected && currentMessId ? `Cloud sync: ${currentMessId}` : "Local mode";
  els.syncStatus.textContent = syncText;
  els.syncStatus.classList.toggle("offline", !cloudConnected);
  els.sidebarSyncText.textContent = cloudConnected ? `Synced with ${currentMessId}` : "Local data saved on this device";
  els.messCodeBadge.textContent = cloudConnected && currentMessId ? currentMessId : "Not connected";

  if (els.messCloudForm?.elements.messId && !els.messCloudForm.elements.messId.matches(":focus")) {
    els.messCloudForm.elements.messId.value = currentMessId || defaultMessId();
  }

  setFormDisabled(els.authForm, !configured || !ready || cloudLoading || Boolean(currentUser));
  setFormDisabled(els.messCloudForm, !configured || !ready || cloudLoading || !currentUser);
  els.signOutBtn.disabled = !configured || !ready || !currentUser;
  els.uploadCloudBtn.disabled = !configured || !ready || !currentUser || !cloudConnected;

  const canInstall = Boolean(deferredInstallPrompt);
  els.installAppBtn.classList.toggle("hidden", !canInstall);
  els.installAppBtnInline.disabled = !canInstall;
  els.installBadge.textContent = canInstall ? "Ready" : "Use browser menu";

  if (els.profileForm) {
    els.profileForm.elements.role.value = localSettings.role || "manager";
    if (els.profileForm.elements.residentId.value !== localSettings.residentId) {
      els.profileForm.elements.residentId.value = localSettings.residentId || "";
    }
  }
}

async function openCloudMess(messId) {
  const cloud = getCloud();
  if (!cloud?.isConfigured()) {
    showToast("Add Firebase config first");
    return;
  }

  try {
    cloudLoading = true;
    renderAccount();
    const openedMessId = await cloud.openMess(messId, state, applyRemoteState);
    localSettings.messId = openedMessId;
    cloudConnected = true;
    saveSettings();
    renderAccount();
    showToast("Cloud mess connected");
  } catch (error) {
    cloudConnected = false;
    showToast(error.message || "Could not open cloud mess");
  } finally {
    cloudLoading = false;
    renderAccount();
  }
}

function applyRemoteState(remoteState) {
  applyingRemoteState = true;
  mergeAppState(remoteState);
  persist();
  applyingRemoteState = false;

  if (state.ui?.month) {
    els.monthPicker.value = state.ui.month;
  }

  renderAll();
}

async function installApp() {
  if (!deferredInstallPrompt) {
    showToast("Use your browser menu to add MessMate to the home screen");
    return;
  }

  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  renderAccount();
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || !location.protocol.startsWith("http")) return;
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

function getCloud() {
  return window.MessCloud;
}

function renderDashboard() {
  const report = buildSettlementReport();
  const foodSpend = sum(monthPurchases().map((item) => item.cost));
  const totalMeals = sum(monthMeals().map(mealCount));
  const totalDue = sum(report.rows.map((row) => Math.max(row.due, 0)));
  const fundAdded = sum(monthPayments().map((item) => item.amount));
  const fundBalance = fundAdded - foodSpend;
  const activeResidents = state.residents.filter((resident) => resident.status === "active").length;

  const metrics = [
    ["Active residents", activeResidents, `${state.residents.length} total members`],
    ["Food spend", money(foodSpend), `${totalMeals} meals counted`],
    ["Cost per meal", money(report.mealRate), "Calculated from purchases"],
    ["Fund added", money(fundAdded), "Money added by students"],
    ["Fund balance", money(fundBalance), "Contribution minus food spend"],
    ["Total pending", money(totalDue), "Meal share still due"],
    ["Today meals", todayMealTotal(), "Breakfast + lunch + dinner"],
  ];

  els.metricGrid.innerHTML = metrics
    .map(
      ([label, value, note]) => `
        <article class="metric-card">
          <small>${escapeHtml(label)}</small>
          <strong>${escapeHtml(String(value))}</strong>
          <span>${escapeHtml(note)}</span>
        </article>
      `,
    )
    .join("");

  const today = todayIso();
  els.todayDateBadge.textContent = formatDate(today);
  renderTodayMenu();
  renderAttention(report);
  renderProfileSnapshot();
}

function renderProfileSnapshot() {
  if (!els.profileSnapshot) return;
  const resident = findResident(localSettings.residentId);
  if (!resident) {
    els.profileSnapshot.innerHTML = `
      <article class="mini-stat">
        <span>Profile</span>
        <strong>Not selected</strong>
      </article>
      <article class="mini-stat">
        <span>Tip</span>
        <strong>Set it in Account & Sync</strong>
      </article>
    `;
    return;
  }

  const report = buildResidentReport(resident.id);
  const todayMeal = state.meals.find((meal) => meal.date === todayIso() && meal.residentId === resident.id);
  els.profileSnapshot.innerHTML = miniStats([
    ["Resident", resident.name],
    ["Room", resident.room],
    ["This month meals", report.meals],
    ["Today meals", todayMeal ? mealCount(todayMeal) : 0],
    ["Fund added", money(report.contributed)],
    ["Net balance", money(report.due)],
  ]);
}

function renderTodayMenu() {
  const today = todayIso();
  const menu = state.menus.find((item) => item.date === today) || latestByDate(state.menus);
  if (!menu) {
    els.todayMenuCard.innerHTML = `<div class="empty-state">No menu published yet.</div>`;
    return;
  }

  els.todayMenuCard.innerHTML = `
    ${mealCard("B", "Breakfast", menu.breakfast, "breakfast")}
    ${mealCard("L", "Lunch", menu.lunch, "lunch")}
    ${mealCard("D", "Dinner", menu.dinner, "dinner")}
    <article>
      <div class="meal-chip dinner">N</div>
      <div>
        <strong>Cook note</strong>
        <span>${escapeHtml(menu.note || "No special note")}</span>
      </div>
    </article>
  `;
}

function renderAttention(report) {
  const dueRows = report.rows
    .filter((row) => row.due > 0)
    .sort((a, b) => b.due - a.due)
    .slice(0, 3);
  const lowPurchases = sum(monthPurchases().map((item) => item.cost)) < 5000;
  const entries = [];

  dueRows.forEach((row) => {
    entries.push([`${row.name} needs ${money(row.due)} more`, `Room ${row.room} has not covered their meal share yet.`]);
  });

  if (lowPurchases) {
    entries.push(["Market cost looks low", "Check if all grocery bills for this month are entered."]);
  }

  if (!state.menus.some((item) => item.date === todayIso())) {
    entries.push(["Today's menu is missing", "Publish breakfast, lunch, and dinner for residents."]);
  }

  if (!entries.length) {
    entries.push(["All clear", "Fund, meals, market, and menu are looking balanced."]);
  }

  els.attentionList.innerHTML = entries
    .slice(0, 3)
    .map(
      ([title, body]) => `
        <article>
          <strong>${escapeHtml(title)}</strong>
          <span>${escapeHtml(body)}</span>
        </article>
      `,
    )
    .join("");
}

function renderResidents() {
  const rows = state.residents
    .slice()
    .sort((a, b) => a.room.localeCompare(b.room))
    .map((resident) => {
      const report = buildResidentReport(resident.id);
      return `
        <tr>
          <td><strong>${escapeHtml(resident.name)}</strong></td>
          <td>${escapeHtml(resident.room)}</td>
          <td>${escapeHtml(resident.phone)}</td>
          <td>${money(report.contributed)}</td>
          <td>${escapeHtml(capitalize(resident.status))}</td>
          <td class="${report.due > 0 ? "amount-due" : "amount-positive"}">${money(report.due)}</td>
          <td>
            <div class="table-actions">
              <button class="button ghost" data-action="toggle-resident" data-id="${resident.id}" type="button">${resident.status === "active" ? "Mark away" : "Mark active"}</button>
              <button class="button danger" data-action="delete-resident" data-id="${resident.id}" type="button">Delete</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  els.residentTable.innerHTML = table(
    ["Name", "Room", "Phone", "Fund added", "Status", "Net balance", ""],
    rows,
    "No residents added yet.",
  );

  bindTableActions(els.residentTable, {
    "toggle-resident": (id) => {
      const resident = state.residents.find((item) => item.id === id);
      resident.status = resident.status === "active" ? "away" : "active";
      persistAndRender("Resident status updated");
    },
    "delete-resident": (id) => {
      state.residents = state.residents.filter((resident) => resident.id !== id);
      state.meals = state.meals.filter((meal) => meal.residentId !== id);
      state.payments = state.payments.filter((payment) => payment.residentId !== id);
      persistAndRender("Resident removed");
    },
  });
}

function renderMeals() {
  const meals = monthMeals().sort((a, b) => b.date.localeCompare(a.date));
  const total = sum(meals.map(mealCount));
  const guest = sum(meals.map((meal) => meal.guest || 0));
  const byResident = state.residents.map((resident) => ({
    resident,
    count: sum(meals.filter((meal) => meal.residentId === resident.id).map(mealCount)),
  }));
  const highest = byResident.sort((a, b) => b.count - a.count)[0];

  els.mealSummary.innerHTML = miniStats([
    ["Total meals", total],
    ["Guest meals", guest],
    ["Meal entries", meals.length],
    ["Highest count", highest ? `${highest.resident.name}: ${highest.count}` : "0"],
  ]);

  const rows = meals
    .map((meal) => {
      const resident = findResident(meal.residentId);
      return `
        <tr>
          <td>${formatDate(meal.date)}</td>
          <td><strong>${escapeHtml(resident?.name || "Unknown")}</strong></td>
          <td>${meal.breakfast}</td>
          <td>${meal.lunch}</td>
          <td>${meal.dinner}</td>
          <td>${meal.guest || 0}</td>
          <td><strong>${mealCount(meal)}</strong></td>
          <td><div class="table-actions"><button class="button danger" data-action="delete-meal" data-id="${meal.id}" type="button">Delete</button></div></td>
        </tr>
      `;
    })
    .join("");

  els.mealTable.innerHTML = table(["Date", "Resident", "B", "L", "D", "Guest", "Total", ""], rows, "No meal entries in this month.");
  bindTableActions(els.mealTable, {
    "delete-meal": (id) => {
      state.meals = state.meals.filter((meal) => meal.id !== id);
      persistAndRender("Meal entry deleted");
    },
  });
}

function renderPurchases() {
  const purchases = monthPurchases().sort((a, b) => b.date.localeCompare(a.date));
  const categoryTotals = groupSum(purchases, "category", "cost");
  const topCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([category, amount]) => [category, money(amount)]);

  els.categoryBreakdown.innerHTML = miniStats(topCategories.length ? topCategories : [["No purchase", money(0)]]);

  const rows = purchases
    .map(
      (purchase) => `
        <tr>
          <td>${formatDate(purchase.date)}</td>
          <td><strong>${escapeHtml(purchase.item)}</strong></td>
          <td>${escapeHtml(purchase.category)}</td>
          <td>${purchase.quantity} ${escapeHtml(purchase.unit)}</td>
          <td>${money(purchase.cost)}</td>
          <td>${escapeHtml(purchase.buyer)}</td>
          <td><div class="table-actions"><button class="button danger" data-action="delete-purchase" data-id="${purchase.id}" type="button">Delete</button></div></td>
        </tr>
      `,
    )
    .join("");

  els.purchaseTable.innerHTML = table(["Date", "Item", "Category", "Qty", "Cost", "Bought by", ""], rows, "No purchases in this month.");
  bindTableActions(els.purchaseTable, {
    "delete-purchase": (id) => {
      state.purchases = state.purchases.filter((purchase) => purchase.id !== id);
      persistAndRender("Purchase deleted");
    },
  });
}

function renderMenus() {
  const rows = state.menus
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6)
    .map(
      (menu) => `
        <article>
          <strong>${formatDate(menu.date)}</strong>
          <span>Breakfast: ${escapeHtml(menu.breakfast)}</span>
          <span>Lunch: ${escapeHtml(menu.lunch)}</span>
          <span>Dinner: ${escapeHtml(menu.dinner)}</span>
          <span>Note: ${escapeHtml(menu.note || "No note")}</span>
          <button class="button danger" data-action="delete-menu" data-id="${menu.id}" type="button">Delete</button>
        </article>
      `,
    )
    .join("");

  els.menuHistory.innerHTML = rows || `<div class="empty-state">No menu history yet.</div>`;
  bindTableActions(els.menuHistory, {
    "delete-menu": (id) => {
      state.menus = state.menus.filter((menu) => menu.id !== id);
      persistAndRender("Menu deleted");
    },
  });
}

function renderPayments() {
  const payments = monthPayments().sort((a, b) => b.date.localeCompare(a.date));
  const rows = payments
    .map((payment) => {
      const resident = findResident(payment.residentId);
      return `
        <tr>
          <td>${formatDate(payment.date)}</td>
          <td><strong>${escapeHtml(resident?.name || "Unknown")}</strong></td>
          <td>${escapeHtml(formatContributionType(payment.type))}</td>
          <td class="amount-positive">${money(payment.amount)}</td>
          <td>${escapeHtml(payment.mode)}</td>
          <td><div class="table-actions"><button class="button danger" data-action="delete-payment" data-id="${payment.id}" type="button">Delete</button></div></td>
        </tr>
      `;
    })
    .join("");

  els.paymentTable.innerHTML = table(["Date", "Resident", "Purpose", "Fund added", "Mode", ""], rows, "No fund contributions in this month.");
  bindTableActions(els.paymentTable, {
    "delete-payment": (id) => {
      state.payments = state.payments.filter((payment) => payment.id !== id);
      persistAndRender("Fund contribution deleted");
    },
  });
}

function renderSettlement() {
  const report = buildSettlementReport();
  els.settlementStats.innerHTML = miniStats([
    ["Food spend", money(report.foodSpend)],
    ["Total meals", report.totalMeals],
    ["Cost per meal", money(report.mealRate)],
    ["Fund added", money(sum(report.rows.map((row) => row.contributed)))],
    ["Fund balance", money(sum(report.rows.map((row) => row.contributed)) - report.foodSpend)],
    ["Pending total", money(sum(report.rows.map((row) => Math.max(row.due, 0))))],
  ]);

  const rows = report.rows
    .map(
      (row) => `
        <tr>
          <td><strong>${escapeHtml(row.name)}</strong></td>
          <td>${escapeHtml(row.room)}</td>
          <td>${row.meals}</td>
          <td>${money(row.mealBill)}</td>
          <td>${money(row.contributed)}</td>
          <td class="${row.due > 0 ? "amount-due" : "amount-positive"}">${money(row.due)}</td>
        </tr>
      `,
    )
    .join("");

  els.settlementTable.innerHTML = table(["Resident", "Room", "Meals", "Meal share", "Fund added", "Net balance"], rows, "No settlement data.");
}

function updateResidentOptions() {
  const activeResidents = state.residents.filter((resident) => resident.status === "active");
  const options = activeResidents
    .map((resident) => `<option value="${resident.id}">${escapeHtml(resident.name)} - ${escapeHtml(resident.room)}</option>`)
    .join("");
  els.mealForm.elements.residentId.innerHTML = options;
  els.paymentForm.elements.residentId.innerHTML = state.residents
    .map((resident) => `<option value="${resident.id}">${escapeHtml(resident.name)} - ${escapeHtml(resident.room)}</option>`)
    .join("");
  if (els.profileForm?.elements.residentId) {
    els.profileForm.elements.residentId.innerHTML =
      `<option value="">No resident selected</option>` +
      state.residents
        .map((resident) => `<option value="${resident.id}">${escapeHtml(resident.name)} - ${escapeHtml(resident.room)}</option>`)
        .join("");
    els.profileForm.elements.residentId.value = localSettings.residentId || "";
  }
}

function buildSettlementReport() {
  const foodSpend = sum(monthPurchases().map((item) => item.cost));
  const totalMeals = sum(monthMeals().map(mealCount));
  const mealRate = totalMeals ? foodSpend / totalMeals : 0;
  const rows = state.residents.map((resident) => buildResidentReport(resident.id, mealRate));
  return { foodSpend, totalMeals, mealRate, rows };
}

function buildResidentReport(residentId, providedMealRate) {
  const resident = findResident(residentId);
  const meals = sum(monthMeals().filter((meal) => meal.residentId === residentId).map(mealCount));
  const mealRate = providedMealRate ?? buildSettlementReport().mealRate;
  const mealBill = meals * mealRate;
  const contributed = sum(monthPayments().filter((payment) => payment.residentId === residentId).map((payment) => payment.amount));
  const due = mealBill - contributed;
  return {
    id: residentId,
    name: resident?.name || "Unknown",
    room: resident?.room || "-",
    meals,
    mealBill,
    contributed,
    paid: contributed,
    due,
  };
}

function exportSettlementCsv() {
  const report = buildSettlementReport();
  const header = ["Resident", "Room", "Meals", "Meal Share", "Fund Added", "Net Balance"];
  const rows = report.rows.map((row) => [row.name, row.room, row.meals, Math.round(row.mealBill), row.contributed, Math.round(row.due)]);
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `mess-settlement-${selectedMonth()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  showToast("Monthly CSV exported");
}

function table(headers, rows, emptyText) {
  if (!rows) {
    return `<div class="empty-state">${escapeHtml(emptyText)}</div>`;
  }
  return `
    <table>
      <thead>
        <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function miniStats(items) {
  return items
    .map(
      ([label, value]) => `
        <article class="mini-stat">
          <span>${escapeHtml(String(label))}</span>
          <strong>${escapeHtml(String(value))}</strong>
        </article>
      `,
    )
    .join("");
}

function mealCard(letter, label, value, tone) {
  return `
    <article>
      <div class="meal-chip ${tone}">${letter}</div>
      <div>
        <strong>${escapeHtml(label)}</strong>
        <span>${escapeHtml(value)}</span>
      </div>
    </article>
  `;
}

function bindTableActions(root, actions) {
  root.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = actions[button.dataset.action];
      if (action) action(button.dataset.id);
    });
  });
}

function monthMeals() {
  return bySelectedMonth(state.meals);
}

function monthPurchases() {
  return bySelectedMonth(state.purchases);
}

function monthPayments() {
  return bySelectedMonth(state.payments);
}

function bySelectedMonth(items) {
  const month = selectedMonth();
  return items.filter((item) => item.date?.startsWith(month));
}

function selectedMonth() {
  return els.monthPicker.value || todayIso().slice(0, 7);
}

function todayMealTotal() {
  return sum(state.meals.filter((meal) => meal.date === todayIso()).map(mealCount));
}

function mealCount(meal) {
  return number(meal.breakfast) + number(meal.lunch) + number(meal.dinner) + number(meal.guest);
}

function groupSum(items, key, valueKey) {
  return items.reduce((acc, item) => {
    acc[item[key]] = (acc[item[key]] || 0) + number(item[valueKey]);
    return acc;
  }, {});
}

function latestByDate(items) {
  return items.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
}

function findResident(id) {
  return state.residents.find((resident) => resident.id === id);
}

function persistAndRender(message) {
  persist();
  renderAll();
  showToast(message);
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (!applyingRemoteState) {
    const cloud = getCloud();
    if (cloud?.saveState) cloud.saveState(state).catch(() => {});
  }
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return normalizeAppState(createDefaultState());
  try {
    return normalizeAppState({ ...createDefaultState(), ...JSON.parse(saved) });
  } catch {
    return normalizeAppState(createDefaultState());
  }
}

function mergeAppState(nextState) {
  const normalized = normalizeAppState({ ...createDefaultState(), ...nextState });
  APP_STATE_KEYS.forEach((key) => {
    state[key] = normalized[key];
  });
}

function normalizeAppState(appState) {
  const defaults = createDefaultState();
  const normalized = { ...defaults, ...appState };
  normalized.ui = { ...defaults.ui, ...(appState.ui || {}) };
  ["residents", "meals", "purchases", "menus", "payments"].forEach((key) => {
    normalized[key] = Array.isArray(appState[key]) ? appState[key] : defaults[key];
  });
  return normalized;
}

function loadSettings() {
  const saved = localStorage.getItem(SETTINGS_KEY);
  if (!saved) {
    const settings = defaultSettings();
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return settings;
  }
  try {
    return { ...defaultSettings(), ...JSON.parse(saved) };
  } catch {
    const settings = defaultSettings();
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return settings;
  }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(localSettings));
}

function defaultSettings() {
  return {
    messId: defaultMessId(),
    role: "manager",
    residentId: "",
  };
}

function defaultMessId() {
  const randomPart = Math.random().toString(36).slice(2, 8);
  return `mess-${randomPart}`;
}

function setFormDisabled(form, disabled) {
  form?.querySelectorAll("input, select, button").forEach((control) => {
    control.disabled = disabled;
  });
}

function createDefaultState() {
  const today = todayIso();
  const month = today.slice(0, 7);
  const currentDay = number(today.slice(8, 10));
  const sampleDate = (day) => `${month}-${String(Math.min(day, currentDay)).padStart(2, "0")}`;
  const dates = Array.from({ length: Math.max(1, Math.min(8, currentDay)) }, (_, index) => sampleDate(index + 1));
  const residents = [
    { id: "resident-1", name: "Aarav Singh", room: "A-101", phone: "9876543210", status: "active", joined: `${month}-01` },
    { id: "resident-2", name: "Riya Sharma", room: "A-102", phone: "9876501234", status: "active", joined: `${month}-01` },
    { id: "resident-3", name: "Imran Khan", room: "B-201", phone: "9888801234", status: "active", joined: `${month}-02` },
    { id: "resident-4", name: "Neha Das", room: "B-202", phone: "9899901234", status: "active", joined: `${month}-02` },
    { id: "resident-5", name: "Sayan Roy", room: "C-301", phone: "9877701234", status: "away", joined: `${month}-04` },
  ];

  const meals = [];
  dates.forEach((date, dayIndex) => {
    residents.forEach((resident, residentIndex) => {
      if (resident.status === "away" && dayIndex > 4) return;
      meals.push({
        id: uid("meal"),
        date,
        residentId: resident.id,
        breakfast: residentIndex % 2 === 0 ? 1 : 0,
        lunch: 1,
        dinner: dayIndex % 3 === 0 && residentIndex === 1 ? 0 : 1,
        guest: dayIndex === 6 && residentIndex === 0 ? 1 : 0,
      });
    });
  });

  return {
    ui: { month },
    residents,
    meals,
    purchases: [
      { id: "purchase-1", date: sampleDate(1), item: "Rice", category: "Grocery", quantity: 25, unit: "kg", cost: 1450, buyer: "Aarav" },
      { id: "purchase-2", date: sampleDate(2), item: "Potato", category: "Vegetable", quantity: 12, unit: "kg", cost: 360, buyer: "Riya" },
      { id: "purchase-3", date: sampleDate(3), item: "Eggs", category: "Protein", quantity: 60, unit: "piece", cost: 420, buyer: "Imran" },
      { id: "purchase-4", date: sampleDate(4), item: "Cooking oil", category: "Grocery", quantity: 5, unit: "litre", cost: 780, buyer: "Manager" },
      { id: "purchase-5", date: sampleDate(5), item: "Paneer", category: "Dairy", quantity: 3, unit: "kg", cost: 900, buyer: "Neha" },
      { id: "purchase-6", date: sampleDate(6), item: "Masala mix", category: "Spice", quantity: 5, unit: "packet", cost: 240, buyer: "Manager" },
    ],
    menus: [
      { id: "menu-1", date: offsetDate(-1), breakfast: "Poha + tea", lunch: "Rice + dal + potato fry", dinner: "Roti + egg curry", note: "Serve salad at dinner" },
      { id: "menu-2", date: today, breakfast: "Aloo paratha + curd", lunch: "Rice + dal + mixed veg", dinner: "Roti + paneer curry", note: "Keep one less-spicy portion" },
    ],
    payments: [
      { id: "payment-1", date: sampleDate(1), residentId: "resident-1", type: "fund", amount: 1000, mode: "UPI" },
      { id: "payment-2", date: sampleDate(1), residentId: "resident-2", type: "fund", amount: 900, mode: "UPI" },
      { id: "payment-3", date: sampleDate(2), residentId: "resident-3", type: "market", amount: 800, mode: "Cash" },
      { id: "payment-4", date: sampleDate(3), residentId: "resident-4", type: "fund", amount: 850, mode: "UPI" },
    ],
  };
}

function setDefaultDates() {
  const today = todayIso();
  [els.mealForm, els.purchaseForm, els.menuForm, els.paymentForm].forEach((form) => {
    if (form?.elements.date) form.elements.date.value = today;
  });
}

function todayIso() {
  return formatLocalDate(new Date());
}

function offsetDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatLocalDate(date);
}

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(isoDate) {
  if (!isoDate) return "-";
  return dateFormatter.format(new Date(`${isoDate}T00:00:00`));
}

function money(amount) {
  return currency.format(Math.round(number(amount)));
}

function sum(items) {
  return items.reduce((total, item) => total + number(item), 0);
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function text(value) {
  return String(value || "").trim();
}

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function capitalize(value) {
  const str = String(value || "");
  return str ? str[0].toUpperCase() + str.slice(1) : "";
}

function formatContributionType(value) {
  const labels = {
    ["r" + "ent"]: "Monthly fund",
    meal: "Monthly fund",
    fund: "Monthly fund",
    market: "Market advance",
    adjustment: "Adjustment",
    other: "Adjustment",
  };
  return labels[value] || capitalize(value);
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

let toastTimer;
function showToast(message) {
  clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  toastTimer = setTimeout(() => els.toast.classList.remove("is-visible"), 2200);
}
