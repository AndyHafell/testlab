let chart;

async function load() {
  const resp = await fetch("/api/stats?token=" + encodeURIComponent(window.DASH_TOKEN));
  if (!resp.ok) return;
  const data = await resp.json();

  document.getElementById("k-chats").textContent = data.totals.chats;
  document.getElementById("k-conv").textContent = data.totals.conversions;
  document.getElementById("k-rate").textContent = data.totals.rate + "%";

  const labels = data.series.map(r => r.date);
  const rates = data.series.map(r => r.rate);
  if (!chart) {
    chart = new Chart(document.getElementById("chart"), {
      type: "line",
      data: { labels, datasets: [{ label: "Conversion rate %", data: rates,
        borderColor: "#7c5cff", backgroundColor: "rgba(124,92,255,.15)", fill: true, tension: .3 }] },
      options: { plugins: { legend: { labels: { color: "#e6edf3" } } },
        scales: { x: { ticks: { color: "#7d8590" } }, y: { ticks: { color: "#7d8590" }, beginAtZero: true } } },
    });
  } else {
    chart.data.labels = labels; chart.data.datasets[0].data = rates; chart.update();
  }

  const tbody = document.getElementById("recent");
  tbody.innerHTML = "";
  data.recent.forEach(r => {
    const tr = document.createElement("tr");
    const tdTime = document.createElement("td");
    tdTime.textContent = r.created_at;
    const tdSess = document.createElement("td");
    tdSess.textContent = r.session_id;
    tr.append(tdTime, tdSess);
    tbody.appendChild(tr);
  });
}

load();
setInterval(load, 15000);
