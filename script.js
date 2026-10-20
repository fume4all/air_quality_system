const API_BASE = "https://airqualitysystem-production.up.railway.app";

let pollutantChart = null;
let historicalChart = null;

async function fetchLatestData() {
    try {
        // Fetch Latest Record for Cards & Timestamp
        const resLatest = await fetch(`${API_BASE}/telemetry`);
        if (resLatest.ok) {
            const data = await resLatest.json();
            if (data && data.device_id) {
                document.getElementById("device-id-display").innerText = data.device_id;
                
                if (data.timestamp) {
                    document.getElementById("timestamp-display").innerText = new Date(data.timestamp).toLocaleString();
                }

                document.getElementById("pm25-val").innerText = data.pm25 ?? "--";
                document.getElementById("pm10-val").innerText = data.pm10 ?? "--";
                document.getElementById("co-val").innerText = data.co ?? "--";
                document.getElementById("co2-val").innerText = data.co2 ?? "--";
                document.getElementById("temp-val").innerText = (data.temperature !== undefined ? data.temperature + " °C" : "--");
                document.getElementById("humidity-val").innerText = (data.humidity !== undefined ? data.humidity + " %" : "--");
                document.getElementById("pressure-val").innerText = (data.pressure !== undefined ? data.pressure + " hPa" : "--");
            }
        }

        // Fetch History for Charts & Trends
        const resHistory = await fetch(`${API_BASE}/telemetry/history?limit=15`);
        if (resHistory.ok) {
            const historyData = await resHistory.json();
            if (Array.isArray(historyData) && historyData.length > 0) {
                updateCharts(historyData);
            }
        }

    } catch (error) {
        console.error("Error fetching telemetry data:", error);
    }
}

function updateCharts(history) {
    const labels = history.map(item => new Date(item.timestamp).toLocaleTimeString());
    const pm25Values = history.map(item => item.pm25);
    const pm10Values = history.map(item => item.pm10);
    const tempValues = history.map(item => item.temperature);

    const pollutantCanvas = document.getElementById("pollutantChart");
    if (pollutantCanvas) {
        if (!pollutantChart) {
            pollutantChart = new Chart(pollutantCanvas, {
                type: 'bar',
                data: {
                    labels: ['PM2.5', 'PM10'],
                    datasets: [{
                        label: 'Latest Pollutants',
                        data: [pm25Values[pm25Values.length - 1], pm10Values[pm10Values.length - 1]],
                        backgroundColor: ['#00d2ff', '#3a7bd5']
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        } else {
            pollutantChart.data.datasets[0].data = [pm25Values[pm25Values.length - 1], pm10Values[pm10Values.length - 1]];
            pollutantChart.update();
        }
    }

    const historicalCanvas = document.getElementById("historicalChart");
    if (historicalCanvas) {
        if (!historicalChart) {
            historicalChart = new Chart(historicalCanvas, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        { label: 'PM2.5', data: pm25Values, borderColor: '#00d2ff', tension: 0.3 },
                        { label: 'Temperature (°C)', data: tempValues, borderColor: '#ff9900', tension: 0.3 }
                    ]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        } else {
            historicalChart.data.labels = labels;
            historicalChart.data.datasets[0].data = pm25Values;
            historicalChart.data.datasets[1].data = tempValues;
            historicalChart.update();
        }
    }
}

function setupDownloadButton() {
    document.querySelectorAll("button, a").forEach(el => {
        if (el.innerText && el.innerText.includes("Download Dataset")) {
            el.onclick = (e) => {
                e.preventDefault();
                window.location.href = `${API_BASE}/telemetry/export`;
            };
        }
    });
}

setInterval(fetchLatestData, 5000);

window.onload = () => {
    fetchLatestData();
    setupDownloadButton();
};