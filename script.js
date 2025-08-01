// Firebase + Chart.js Lease Mileage Tracker
let entries = \[];
let chart;
let userId = null;

// Wait for auth
firebase.auth().signInAnonymously()
.then(() => {
userId = firebase.auth().currentUser.uid;
listenToChanges();
})
.catch(console.error);

function listenToChanges() {
firebase.database().ref("entries/" + userId).on("value", snapshot => {
const data = snapshot.val();
entries = data ? Object.values(data) : \[];
entries.sort((a, b) => new Date(a.date) - new Date(b.date));
updateUI();
});
}

function saveToFirebase() {
const updates = {};
entries.forEach((entry, i) => {
updates\[i] = entry;
});
firebase.database().ref("entries/" + userId).set(updates);
}

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
firebase.database().ref("entries/" + userId).remove();
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

if (chart) chart.destroy();
chart = new Chart(ctx, {
type: "line",
data: {
labels,
datasets: \[{
label: "Mileage",
data,
borderColor: "#3b82f6",
backgroundColor: "#3b82f610",
tension: 0.3,
fill: true,
pointRadius: 3,
pointHoverRadius: 6
}]
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
const current = entries\[entries.length - 1].odometer;
progressBar.value = current;
progressValue.textContent = `${current.toLocaleString()} / 22,500 mi`;
}

function updatePenalty() {
if (!entries.length) return;
const over = entries\[entries.length - 1].odometer - 22500;
const penalty = over > 0 ? over \* 0.2 : 0;
penaltyEl.textContent = `$${penalty.toFixed(2)}`;
}

function renderTable() {
tableBody.innerHTML = "";
entries.forEach((e, i) => {
const row = tableBody.insertRow();
const weekNum = Math.floor((new Date(e.date) - new Date("2025-07-29")) / (7 \* 24 \* 60 \* 60 \* 1000)) + 1;
row\.innerHTML = `       <td>${weekNum}</td>       <td>${e.date}</td>       <td>${e.odometer}</td>       <td>         <button onclick="editEntry('${e.date}')">✏️</button>         <button onclick="deleteEntry(${i})">🗑️</button>       </td>
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
if (!grouped\[month]) grouped\[month] = \[];
grouped\[month].push(e.odometer);
});
monthlySummary.innerHTML = "<h3>Monthly Mileage Summary</h3>";
for (const month in grouped) {
const miles = grouped\[month];
const total = miles\[miles.length - 1] - miles\[0];
monthlySummary.innerHTML += `<div><strong>${month}:</strong> ${total.toLocaleString()} mi</div>`;
}
}
