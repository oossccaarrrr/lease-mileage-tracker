const form = document.getElementById("mileageForm");
const penaltyDisplay = document.getElementById("penalty");
const resetBtn = document.getElementById("resetBtn");
const progressBar = document.getElementById("progressBar");
const progressValue = document.getElementById("progressValue");
const weekInput = document.getElementById("week");
const dateInput = document.getElementById("date");
const odometerInput = document.getElementById("odometer");
const entriesTableBody = document.querySelector("#entriesTable tbody");

const LEASE_LIMIT = 22500;
const PENALTY_RATE = 0.20;
const LEASE_START = new Date(2025, 6, 29);
const MAX_WEEKS = 156;
const MIN_WEEKLY_MILES = 7500 / 156;
const MAX_WEEKLY_MILES = 10000 / 156;

let entries = JSON.parse(localStorage.getItem("leaseMiles")) || [];
let mileageChart;

function getWeekNumber(dateString) {
  const date = new Date(dateString);
  const diff = date.getTime() - LEASE_START.getTime();
  return Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1;
}

function getMonthKey(dateString) {
  const date = new Date(dateString);
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
}

function setDateForWeek(weekNum) {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const date = new Date(LEASE_START.getTime() + (weekNum - 1) * msPerWeek);
  dateInput.value = date.toISOString().slice(0, 10);
}

function resetInputs(clearAll = false) {
  if (clearAll) {
    weekInput.value = "";
    dateInput.value = "";
    odometerInput.value = "";
    return;
  }
  dateInput.value = new Date().toISOString().slice(0, 10);
  weekInput.value = getWeekNumber(dateInput.value);
  odometerInput.value = "";
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const week = parseInt(weekInput.value);
  const date = dateInput.value;
  const odometer = parseInt(odometerInput.value);

  if (!week || !date || !odometer) {
    alert("Please fill in all fields.");
    return;
  }
  const existing = entries.find((e) => e && e.date === date);
  if (existing && !confirm(`An entry already exists for this date. Overwrite?`)) return;
  entries = entries.filter((e) => e?.date !== date);
  entries.push({ week, date, odometer });
  localStorage.setItem("leaseMiles", JSON.stringify(entries));
  alert(`Entry saved for ${date}.`);
  resetInputs();
  updateChart();
  renderTable();
  renderMonthlySummary();
});

resetBtn.addEventListener("click", () => {
  if (confirm("Are you sure you want to reset all mileage data?")) {
    entries = [];
    localStorage.removeItem("leaseMiles");
    updateChart();
    resetInputs(true);
    renderTable();
    renderMonthlySummary();
  }
});

function updateChart() {
  const actual = new Array(MAX_WEEKS).fill(null);
  const min = [];
  const max = [];
  const averages = new Array(MAX_WEEKS).fill(null);
  const weekTotals = new Array(MAX_WEEKS).fill(null);

  entries.sort((a, b) => new Date(a.date) - new Date(b.date));

  for (let i = 0; i < MAX_WEEKS; i++) {
    const cumulativeMin = Math.round(MIN_WEEKLY_MILES * (i + 1));
    const cumulativeMax = Math.round(MAX_WEEKLY_MILES * (i + 1));
    min.push(cumulativeMin);
    max.push(cumulativeMax);
  }

  let lastOdo = 0;
  let weekOdometers = {};

  entries.forEach((entry) => {
    const wk = getWeekNumber(entry.date);
    if (!weekOdometers[wk]) weekOdometers[wk] = [];
    weekOdometers[wk].push(entry.odometer);
  });

  for (let i = 0; i < MAX_WEEKS; i++) {
    if (weekOdometers[i + 1]) {
      const sorted = weekOdometers[i + 1].sort((a, b) => new Date(a.date) - new Date(b.date));
      const start = sorted[0];
      const end = sorted[sorted.length - 1];
      actual[i] = end;
      weekTotals[i] = end - start;
    }
  }

  for (let i = 0; i < weekTotals.length; i++) {
    if (weekTotals[i] != null) {
      averages[i] = weekTotals[i];
    }
  }

  const actualValues = actual.filter((m) => m !== null);
  lastOdo = actualValues[actualValues.length - 1] || 0;
  const expectedMinIndex = actual.findLastIndex((m) => m !== null);
  const expectedMin = expectedMinIndex >= 0 ? min[expectedMinIndex] : 0;
  const overMiles = Math.max(0, lastOdo - expectedMin);
  const penalty = overMiles * PENALTY_RATE;

  penaltyDisplay.textContent = `$${penalty.toFixed(2)}`;
  progressBar.value = lastOdo;
  progressValue.textContent = `${lastOdo} / ${LEASE_LIMIT.toLocaleString()} mi`;

  renderChart(actual, min, max, averages);
}

function renderChart(actual, min, max, averages) {
  const ctx = document.getElementById("mileageChart").getContext("2d");
  if (mileageChart) mileageChart.destroy();
  mileageChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: Array.from({ length: MAX_WEEKS }, (_, i) => `Week ${i + 1}`),
      datasets: [
        {
          label: "Actual Odometer",
          data: actual,
          borderColor: "#2563eb",
          backgroundColor: "rgba(37, 99, 235, 0.2)",
          fill: true,
          tension: 0.3,
          spanGaps: true,
        },
        {
          label: "Weekly Average Miles",
          data: averages,
          borderColor: "#f59e0b",
          backgroundColor: "transparent",
          fill: false,
          tension: 0.3,
          borderDash: [3, 3],
        },
        {
          label: "Cumulative Min",
          data: min,
          borderColor: "#10b981",
          borderDash: [5, 5],
          fill: false,
        },
        {
          label: "Cumulative Max",
          data: max,
          borderColor: "#ef4444",
          borderDash: [5, 5],
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      interaction: { mode: "nearest", intersect: false },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: "Miles" } },
        x: {
          title: { display: true, text: "Week Number" },
          ticks: { autoSkip: true, maxTicksLimit: 12 },
        },
      },
      plugins: {
        legend: { labels: { usePointStyle: true, padding: 15 } },
        tooltip: { mode: "index", intersect: false },
      },
    },
  });
}

function renderTable() {
  entriesTableBody.innerHTML = "";
  entries.sort((a, b) => new Date(a.date) - new Date(b.date));
  entries.forEach((entry) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${getWeekNumber(entry.date)}</td>
      <td>${entry.date}</td>
      <td>${entry.odometer}</td>
      <td><button class="delete-btn" data-date="${entry.date}">🗑️</button></td>
    `;
    entriesTableBody.appendChild(tr);
  });
}

entriesTableBody.addEventListener("click", (e) => {
  if (e.target.classList.contains("delete-btn")) {
    const date = e.target.getAttribute("data-date");
    if (confirm(`Delete entry for ${date}?`)) {
      entries = entries.filter((e) => e.date !== date);
      localStorage.setItem("leaseMiles", JSON.stringify(entries));
      updateChart();
      renderTable();
      renderMonthlySummary();
    }
  }
});

function renderMonthlySummary() {
  const container = document.getElementById("monthlySummary") || document.createElement("div");
  container.id = "monthlySummary";
  container.innerHTML = "<h3>📅 Monthly Summaries</h3>";
  const monthly = {};
  const sorted = entries.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
  sorted.forEach((entry, i) => {
    const key = getMonthKey(entry.date);
    if (!monthly[key]) monthly[key] = [];
    monthly[key].push(entry);
  });

  for (const key in monthly) {
    const list = monthly[key].sort((a, b) => new Date(a.date) - new Date(b.date));
    const start = list[0].odometer;
    const end = list[list.length - 1].odometer;
    const delta = end - start;
    const div = document.createElement("div");
    div.innerHTML = `<strong>${key}</strong>: ${delta} miles`;
    container.appendChild(div);
  }

  document.querySelector(".container").appendChild(container);
}

window.addEventListener("load", () => {
  resetInputs();
  updateChart();
  renderTable();
  renderMonthlySummary();
});
