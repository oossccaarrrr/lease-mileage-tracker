const form = document.getElementById("mileageForm");
const penaltyDisplay = document.getElementById("penalty");
const resetBtn = document.getElementById("resetBtn");
const progressBar = document.getElementById("progressBar");
const progressValue = document.getElementById("progressValue");
const weekInput = document.getElementById("week");
const dateInput = document.getElementById("date");
const odometerInput = document.getElementById("odometer");

const MAX_WEEKS = 156;
const LEASE_LIMIT = 22500;
const PENALTY_RATE = 0.20;

const MIN_WEEKLY_MILES = 7500 / 156;
const MAX_WEEKLY_MILES = 10000 / 156;

let entries = JSON.parse(localStorage.getItem("leaseMiles")) || [];

let mileageChart;

function setDateForWeek(weekNum) {
  const leaseStart = new Date(2025, 6, 29); // July is 6 (zero-indexed)
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const date = new Date(leaseStart.getTime() + (weekNum - 1) * msPerWeek);
  dateInput.value = date.toISOString().slice(0, 10);
}

function resetInputs(clearAll = false) {
  if (clearAll) {
    weekInput.value = "";
    dateInput.value = "";
    odometerInput.value = "";
    return;
  }

  let nextWeek = entries.findIndex((e) => !e) + 1;
  if (nextWeek === 0) nextWeek = MAX_WEEKS;

  weekInput.value = nextWeek;
  setDateForWeek(nextWeek);
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

  if (week < 1 || week > MAX_WEEKS) {
    alert(`Week must be between 1 and ${MAX_WEEKS}`);
    return;
  }

  if (entries[week - 1]) {
    if (!confirm(`Entry already exists for Week ${week}. Overwrite?`)) {
      return;
    }
  }

  entries[week - 1] = { week, date, odometer };
  localStorage.setItem("leaseMiles", JSON.stringify(entries));

  alert(`Entry saved for Week ${week}.`);
  resetInputs();
  updateChart();
});

resetBtn.addEventListener("click", () => {
  if (confirm("Are you sure you want to reset all mileage data?")) {
    entries = [];
    localStorage.removeItem("leaseMiles");
    updateChart();
    resetInputs(true);
  }
});

function updateChart() {
  const actual = [];
  const min = [];
  const max = [];

  for (let i = 0; i < MAX_WEEKS; i++) {
    const cumulativeMin = Math.round(MIN_WEEKLY_MILES * (i + 1));
    const cumulativeMax = Math.round(MAX_WEEKLY_MILES * (i + 1));
    const actualMiles = entries[i]?.odometer ?? null;

    actual.push(actualMiles);
    min.push(cumulativeMin);
    max.push(cumulativeMax);
  }

  const lastOdo = actual.filter((m) => m !== null).pop() || 0;
  const expectedMinIndex = actual.findLastIndex((m) => m !== null);
  const expectedMin = expectedMinIndex >= 0 ? min[expectedMinIndex] : 0;
  const overMiles = Math.max(0, lastOdo - expectedMin);
  const penalty = overMiles * PENALTY_RATE;

  penaltyDisplay.textContent = `$${penalty.toFixed(2)}`;
  progressBar.value = lastOdo;
  progressValue.textContent = `${lastOdo} / ${LEASE_LIMIT.toLocaleString()} mi`;

  renderChart(actual, min, max);
}

function renderChart(actual, min, max) {
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
      interaction: {
        mode: "nearest",
        intersect: false,
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Miles",
          },
        },
        x: {
          title: {
            display: true,
            text: "Week Number",
          },
          ticks: {
            autoSkip: true,
            maxTicksLimit: 12,
          },
        },
      },
      plugins: {
        legend: {
          labels: {
            usePointStyle: true,
            padding: 15,
          },
        },
        tooltip: {
          mode: "index",
          intersect: false,
        },
      },
    },
  });
}

window.addEventListener("load", () => {
  resetInputs();
  updateChart();
});
