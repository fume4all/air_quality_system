const API_URL = "https://air-quality-system-r8np.onrender.com/telemetry";

let pollutantChart, trendChart;

function getAqiColor(level) {
    switch ((level || '').toLowerCase()) {
        case 'very good': case 'good': return '#22c55e';
        case 'fair': return '#eab308';
        case 'poor': return '#f97316';
        case 'very poor': return '#ef4444';
        case 'hazardous': return '#991b1b';
        default: return '#38bdf8';
    }
}

function initCharts() {
    // Pollutant Breakdown Bar Chart
    const ctxPollutant = document.getElementById('pollutantChart').getContext('2d');
    pollutantChart = new Chart(ctxPollutant, {
        type: 'bar',
        data: {
            labels: ['PM2.5 (µg/m³)', 'PM10 (µg/m³)', 'CO (ppm)', 'CO₂ (ppm)'],
            datasets: [{
                label: 'Concentration Level',
                data: [0, 0, 0, 0],
                backgroundColor: ['#38bdf8', '#818cf8', '#f59e0b', '#10b981'],
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { ticks: { color: '#cbd5e1' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
                x: { ticks: { color: '#cbd5e1' }, grid: { display: false } }
            }
        }
    });

    // Historical Telemetry Trends Line Chart
    const ctxTrend = document.getElementById('trendChart').getContext('2d');
    trendChart = new Chart(ctxTrend, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                { label: 'AQI Index', data: [], borderColor: '#38bdf8', tension: 0.3, fill: false },
                { label: 'PM2.5', data: [], borderColor: '#f97316', tension: 0.3, fill: false },
                { label: 'Temperature (°C)', data: [], borderColor: '#ef4444', tension: 0.3, fill: false }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#cbd5e1' } } },
            scales: {
                y: { ticks: { color: '#cbd5e1' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
                x: { ticks: { color: '#cbd5e1' }, grid: { display: false } }
            }
        }
    });
}

async function fetchTelemetryData() {
    const refreshIcon = document.getElementById("refreshIcon");
    if (refreshIcon) refreshIcon.classList.add("fa-spin");

    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error("API request failed");
        const data = await response.json();

        if (data && data.length > 0) {
            const latest = data[data.length - 1];

            // Update Header Meta
            document.getElementById("device_id").innerText = latest.device_id || "ESP32_SENSOR_01";
            // Update Header Meta (Fixed to Nigeria Lagos Local Time)
            document.getElementById("device_id").innerText = latest.device_id || "ESP32_SENSOR_01";
            const timestampObj = new Date(latest.created_at || Date.now());
            document.getElementById("timestamp").innerText = timestampObj.toLocaleTimeString('en-GB', {
                timeZone: 'Africa/Lagos',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            });
            document.getElementById("pm25").innerText = latest.pm25;
            document.getElementById("pm10").innerText = latest.pm10;
            document.getElementById("co").innerText = latest.co;
            document.getElementById("co2").innerText = latest.co2;
            document.getElementById("temperature").innerText = latest.temperature;
            document.getElementById("humidity").innerText = latest.humidity;
            document.getElementById("pressure").innerText = latest.pressure;

            // AI Classification Card
            const aiPredElem = document.getElementById("ai_prediction");
            aiPredElem.innerText = latest.aqi_level || "Analyzing...";
            aiPredElem.style.color = getAqiColor(latest.aqi_level);
            document.getElementById("ai_aqi_index").innerText = `AQI Index: ${latest.aqi || '--'}`;

            // Update Pollutant Bar Chart
            pollutantChart.data.datasets[0].data = [latest.pm25, latest.pm10, latest.co, latest.co2];
            pollutantChart.update();

            // Update Trend Line Chart (Last 10 Records with safe fallbacks)
            const recentData = data.slice(-10);
            trendChart.data.labels = recentData.map(r => new Date(r.created_at || Date.now()).toLocaleTimeString('en-GB', {
                timeZone: 'Africa/Lagos',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }));
            
            // Map values safely (calculating AQI from PM2.5 if r.aqi is missing)
            trendChart.data.datasets[0].data = recentData.map(r => r.aqi !== undefined ? r.aqi : (r.pm25 ? (50 / 12.0) * r.pm25 : 0));
            trendChart.data.datasets[1].data = recentData.map(r => r.pm25 || 0);
            trendChart.data.datasets[2].data = recentData.map(r => r.temperature || 0);
            trendChart.update();

            // Update Hourly Forecast Section
            const now = new Date();
            for (let i = 0; i < 5; i++) {
                const targetTime = new Date(now.getTime() + i * 3600000);
                const timeStr = i === 0 ? "Now" : targetTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                if (i > 0) document.getElementById(`htime${i}`).innerText = timeStr;
                document.getElementById(`hf${i}`).innerText = Math.max(10, latest.aqi - (i * 2));
                document.getElementById(`ht${i}`).innerText = `${Math.round(latest.temperature + (i * 0.5))}°`;
            }
        }
    } catch (err) {
        console.error("Error fetching telemetry:", err);
    } finally {
        if (refreshIcon) refreshIcon.classList.remove("fa-spin");
    }
}

// Initialize charts and triggers on DOM Load
window.addEventListener("DOMContentLoaded", () => {
    initCharts();
    fetchTelemetryData();
    setInterval(fetchTelemetryData, 15000); // Refresh every 15s
});