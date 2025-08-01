const form = document.getElementById("mileageForm");
const penaltyDisplay = document.getElementById("penalty");
const resetBtn = document.getElementById("resetBtn");

let entries = JSON.parse(localStorage.getItem("leaseMiles")) || [];

const minWeekly = 7500 / 156;
const maxWeekly = 10000 / 156;
const rate = 0.20;

form.addEventListener("submit", function (e) {
  e.preventDefault();
  const week = parseInt(document.getElementById("week").value);
  const odometer = parseInt(document.getElementById("odometer").value);

  entries[week - 1] = { week, odometer };
  localStorage.setItem("leaseMiles", JSON.stringify(entries));
  updateChart();
});

resetBtn.addEventListener("click", () => {
  if (confirm("Are you sure you want to reset all mileage data?")) {
    localStorage.removeItem("leaseMiles");
    entries = [];
    updateChart();
  }
});

function updateChart() {
  const actual = [];
  const min = [];
  const max = [];

  for (let i = 0; i < 156; i++) {
    const cumulativeMin = Math.round(minWeekly * (i + 1));
    const cumulativeMax = Math.round(maxWeekly * (i + 1));
    const actualMiles = entries[i]?.odometer || null;

    actual.push(actualMiles);
    min.push(cumulativeMin);
    max.push(cumulativeMax);
  }

  const lastOdo = actual.filter(m => m !== null).pop() || 0;
  const expectedMin = min[actual.findLastIndex(m => m !== null)];
  const overMiles = Math.max(0, lastOdo - expectedMin);
  const penalty = overMiles * rate;

  penaltyDisplay.textContent = `$${penalty.toFixed(2)}`;

  renderChart(actual, min, max);
}

let mileageChart;
function renderChart(actual, min, max) {
  const ctx = document.getElementById("mileageChart").getContext("2d");

  if (mileageChart) mileageChart.destroy();

  mileageChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: Array.from({ length: 156 }, (_, i) => `Week ${i + 1}`),
      datasets: [
        {
          label: 'Actual Odometer',
          data: actual,
          borderColor: 'blue',
          fill: false,
          tension: 0.2
        },
        {
          label: 'Cumulative Min',
          data: min,
          borderColor: 'green',
          borderDash: [5, 5],
          fill: false
        },
        {
          label: 'Cumulative Max',
          data: max,
          borderColor: 'red',
          borderDash: [5, 5],
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

updateChart();
