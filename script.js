// Firebase + Chart.js Lease Mileage Tracker (Shared UID: "oscar")
let entries = [];
let chart;

// Shared UID (so data syncs across all devices)
const sharedUserPath = "entries/oscar";

function listenToChanges() {
  firebase.database().ref(sharedUserPath).on("value", snapshot => {
    const data = snapshot.val();
    entries = data ? Object.values(data) : [];
    entries.sort((a, b) => new Date(a.date) - new Date(b.date));
    updateUI();
  });
}

function saveToFirebase() {
  const updates = {};
  entries.forEach((entry, i) => {
    updates[i] = entry;
  });
  firebase.database().ref(sharedUserPath).set(updates);
}

// Elements
const form = document.getElementById("mileageForm");
const dateInput = document.getElementById("date");
const odometerInput = document.getElementById("odometer");
const progressBar = document.getElementById("progressBar");
const progressValue = document.getElementById("progressValue");
const penaltyEl = document.getElementById("penalty");
const tableBody = document.querySelector("#entriesTable tbody");
const monthlySummary = document.getElementById("monthlySummary");

form.addEventListener("submit", e => {
  e.preventDefault();
  const date = dateInput.value;
  const odometer = parseInt(odometerInput.value);
  if (!date || isNaN(odometer)) return;

  const existing = entries.find(e => e.date === date);
  if (existing) existing.odometer = odometer;
  else entries.push({ date, odometer });

  entries.sort((a, b) => new Date(a.date) - new Date(b.date));
  saveToFirebase();
  form.reset();
});

document.getElementById("resetBtn").addEventListener("click", () => {
  if (confirm("Reset all data?")) {
    firebase.database().ref(sharedUserPath).remove();
  }
});

function updateUI() {
  renderChart();
  updateProgress();
  updatePenalty();
  renderTable();
  renderMonthlySummary();
}

function renderChart() {
  const ctx = document.getElementById("mileageChart").getContext("2d");
  const labels = entries.map(e => e.date);
  const data = entries.map(e => e.odometer);

  if (!data.length) return;

  // Calculate projection
  const firstDate = new Date(entries[0].date);
  const lastDate = new Date(entries[entries.length - 1].date);
  const totalDays = (lastDate - firstDate) / (1000 * 60 * 60 * 24);
  const totalMiles = entries[entries.length - 1].odometer - entries[0].odometer;
  const dailyRate = totalDays > 0 ? totalMiles / totalDays : 0;
  const leaseEndDate = new Date("2028-07-29");
  const remainingDays = (leaseEndDate - lastDate) / (1000 * 60 * 60 * 24);
  const projectedOdometer = Math.round(entries[entries.length - 1].odometer + dailyRate * remainingDays);

  const projectionLabels = [...labels];
  const projectionData = [...data];
  if (dailyRate > 0) {
    projectionLabels.push("Lease End");
    projectionData.push(projectedOdometer);
  }

  // Ideal and max lines
  const totalWeeks = 156;
  const idealSlope = 22500 / totalWeeks;
  const maxSlope = 30000 / totalWeeks;
  const idealLine = labels.map((_, i) => Math.round(i * idealSlope));
  const maxLine = labels.map(() => 30000);

  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: projectionLabels,
      datasets: [
        {
          label: "Mileage",
          data,
          borderColor: "#3b82f6",
          backgroundColor: "#3b82f610",
          tension: 0.3,
          fill: true,
          pointRadius: 3,
          pointHoverRadius: 6
        },
        {
          label: "Projected Trend",
          data: projectionData,
          borderDash: [6, 4],
          borderColor: "#f97316",
          fill: false,
          pointRadius: 0
        },
        {
          label: "Ideal (22,500 mi)",
          data: idealLine,
          borderColor: "#10b981",
          borderDash: [4, 4],
          fill: false,
          pointRadius: 0
        },
        {
          label: "Max (30,000 mi)",
          data: maxLine,
          borderColor: "#ef4444",
          borderDash: [4, 2],
          fill: false,
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 40000
        }
      }
    }
  });
}

function updateProgress() {
  if (!entries.length) return;
  const current = entries[entries.length - 1].odometer;
  progressBar.value = current;
  progressValue.textContent = `${current.toLocaleString()} / 22,500 mi`;
}

function updatePenalty() {
  if (!entries.length) return;
  const firstDate = new Date(entries[0].date);
  const lastDate = new Date(entries[entries.length - 1].date);
  const totalDays = (lastDate - firstDate) / (1000 * 60 * 60 * 24);
  const totalMiles = entries[entries.length - 1].odometer - entries[0].odometer;
  const dailyRate = totalDays > 0 ? totalMiles / totalDays : 0;
  const leaseEndDate = new Date("2028-07-29");
  const totalLeaseDays = (leaseEndDate - firstDate) / (1000 * 60 * 60 * 24);
  const projected = Math.round(entries[0].odometer + dailyRate * totalLeaseDays);
  const over = projected - 22500;
  const penalty = over > 0 ? over * 0.2 : 0;
  penaltyEl.textContent = `$${penalty.toFixed(2)}`;
}

function renderTable() {
  tableBody.innerHTML = "";
  entries.forEach((e, i) => {
    const row = tableBody.insertRow();
    const weekNum = Math.floor((new Date(e.date) - new Date("2025-07-29")) / (7 * 24 * 60 * 60 * 1000)) + 1;
    row.innerHTML = `
      <td>${weekNum}</td>
      <td>${e.date}</td>
      <td>${e.odometer}</td>
      <td>
        <button onclick="editEntry('${e.date}')">✏️</button>
        <button onclick="deleteEntry(${i})">🗑️</button>
      </td>
    `;
  });
}

function editEntry(date) {
  const entry = entries.find(e => e.date === date);
  if (!entry) return;
  dateInput.value = entry.date;
  odometerInput.value = entry.odometer;
}

function deleteEntry(index) {
  if (confirm("Delete this entry?")) {
    entries.splice(index, 1);
    saveToFirebase();
  }
}

function renderMonthlySummary() {
  const grouped = {};
  entries.forEach(e => {
    const month = e.date.slice(0, 7);
    if (!grouped[month]) grouped[month] = [];
    grouped[month].push(e.odometer);
  });

  monthlySummary.innerHTML = "<h3>Monthly Mileage Summary</h3>";
  for (const month in grouped) {
    const miles = grouped[month];
    const total = miles[miles.length - 1] - miles[0];
    monthlySummary.innerHTML += `<div><strong>${month}:</strong> ${total.toLocaleString()} mi</div>`;
  }
}

// Start listening immediately
listenToChanges();
