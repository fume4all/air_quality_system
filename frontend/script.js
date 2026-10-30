// 1. Initialize Chart.js for the 7-Parameter Pollutant Bar Chart
const pollutantCtx = document.getElementById('pollutantChart').getContext('2d');
const pollutantChart = new Chart(pollutantCtx, {
    type: 'bar',
    data: {
        labels: ['PM2.5', 'PM10', 'CO', 'CO₂', 'Temp (°C)', 'Humidity (%)', 'Pressure'],
        datasets: [{
            label: 'Latest Sensor Values',
            data: [0, 0, 0, 0, 0, 0, 0],
            backgroundColor: [
                '#38bdf8', // PM2.5 - Cyan
                '#3b82f6', // PM10 - Blue
                '#f59e0b', // CO - Amber
                '#10b981', // CO2 - Emerald
                '#ef4444', // Temperature - Red
                '#06b6d4', // Humidity - Light Blue
                '#a855f7'  // Pressure - Purple
            ],
            borderWidth: 1,
            borderRadius: 6
        }]
    },
    options: { 
        responsive: true, 
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false } 
        },
        scales: { 
            y: { 
                beginAtZero: true,
                max: 450,
                ticks: { 
                    stepSize: 50, 
                    color: '#cbd5e1' 
                },
                grid: { color: 'rgba(255, 255, 255, 0.1)' }
            },
            x: {
                grid: { display: false },
                ticks: { color: '#cbd5e1' }
            }
        } 
    }
});

// 2. Initialize Historical Trends Line Chart (Area fill style with 0-650 scale and 50-unit steps)
const trendCtx = document.getElementById('trendChart').getContext('2d');
const trendChart = new Chart(trendCtx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [
            { label: 'PM2.5', data: [], borderColor: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.15)', tension: 0.3, fill: true, yAxisID: 'y' },
            { label: 'PM10', data: [], borderColor: '#a855f7', backgroundColor: 'rgba(168, 85, 247, 0.15)', tension: 0.3, fill: true, yAxisID: 'y' },
            { label: 'CO', data: [], borderColor: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.15)', tension: 0.3, fill: true, yAxisID: 'y' },
            { label: 'CO₂', data: [], borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.15)', tension: 0.3, fill: true, yAxisID: 'y' },
            { label: 'Temp (°C)', data: [], borderColor: '#ef4444', tension: 0.3, fill: false, yAxisID: 'y' },
            { label: 'Humidity (%)', data: [], borderColor: '#06b6d4', tension: 0.3, fill: false, yAxisID: 'y' },
            { label: 'Pressure', data: [], borderColor: '#8b5cf6', tension: 0.3, fill: false, yAxisID: 'y1' }
        ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { 
            legend: { labels: { color: '#cbd5e1', font: { size: 9 } } } 
        },
        scales: {
            y: { 
                type: 'linear',
                position: 'left',
                beginAtZero: true,
                min: 0,
                max: 650, // Calibrated strictly from 0 to 650
                ticks: { 
                    stepSize: 50, // Clean 50-unit intervals (0, 50, 100... 650)
                    color: '#cbd5e1' 
                },
                grid: { color: 'rgba(255, 255, 255, 0.1)' } 
            },
            y1: {
                type: 'linear',
                position: 'right',
                grid: { drawOnChartArea: false },
                ticks: { color: '#a855f7' }
            },
            x: { grid: { display: false }, ticks: { color: '#cbd5e1' } }
        }
    }
});

// Global variable to track previous AQI for smooth number animation
let previousAqi = 0;

// Function to smoothly animate AQI number changes
function animateValue(id, start, end, duration) {
    if (start === end) return;
    const range = end - start;
    let current = start;
    const increment = end > start ? 1 : -1;
    const stepTime = Math.abs(Math.floor(duration / range));
    const obj = document.getElementById(id);
    if (!obj) return;

    const timer = setInterval(() => {
        current += increment;
        obj.innerText = `Calculated AQI: ${current}`;
        if (current === end) {
            clearInterval(timer);
        }
    }, Math.max(stepTime, 20));
}

// 3. Main Data Fetching and UI Update Function
async function fetchAllData() {
    try {
        const response = await fetch('/api/latest-sensor-data');
        if (!response.ok) throw new Error("Network response was not ok");
        
        const data = await response.json();

        // Update Header Meta Info
        if (data.device_id) document.getElementById('device_id').innerText = data.device_id;
        if (data.timestamp) document.getElementById('timestamp').innerText = data.timestamp;

        // Update the 7 Hardware Parameter Cards
        document.getElementById('pm25').innerText = data.pm25 ?? '--';
        document.getElementById('pm10').innerText = data.pm10 ?? '--';
        document.getElementById('co').innerText = data.co ?? '--';
        document.getElementById('co2').innerText = data.co2 ?? '--';
        document.getElementById('temperature').innerText = data.temperature ?? '--';
        document.getElementById('humidity').innerText = data.humidity ?? '--';
        document.getElementById('pressure').innerText = data.pressure ?? '--';

        // Update Dynamic AI Classification Card with Smooth Animation
        const aiPredElem = document.getElementById('ai_prediction');
        const aiIndexElem = document.getElementById('ai_aqi_index');
        if (data.aqi_status) {
            aiPredElem.innerText = data.aqi_status;
            
            // Animate AQI number change dynamically if it changes
            if (data.calculated_aqi !== previousAqi) {
                animateValue('ai_aqi_index', previousAqi, data.calculated_aqi, 500);
                previousAqi = data.calculated_aqi;
            } else {
                aiIndexElem.innerText = `Calculated AQI: ${data.calculated_aqi}`;
            }

            // Dynamic color coding based on status
            if (data.aqi_status === "Very Good" || data.aqi_status === "Good") {
                aiPredElem.style.color = "#4ade80"; // Green
            } else if (data.aqi_status.includes("Fair")) {
                aiPredElem.style.color = "#facc15"; // Yellow
            } else {
                aiPredElem.style.color = "#ef4444"; // Red
            }
        }
        async function updateAirQualityAnalysis() {
    try {
        const response = await fetch('/api/latest-sensor-data');
        const data = await response.json();

        // Update elements
        document.getElementById('aqi-status-text').textContent = data.aqi_status || 'Waiting for Data';
        document.getElementById('calculated-aqi-value').textContent = data.calculated_aqi || 0;

        // Optional: Dynamically color code the status text based on level
        const statusElement = document.getElementById('aqi-status-text');
        const aqi = data.calculated_aqi;
        
        if (aqi <= 50) statusElement.className = "text-3xl font-bold tracking-wide text-emerald-400 mb-1";
        else if (aqi <= 100) statusElement.className = "text-3xl font-bold tracking-wide text-yellow-400 mb-1";
        else if (aqi <= 150) statusElement.className = "text-3xl font-bold tracking-wide text-orange-400 mb-1";
        else statusElement.className = "text-3xl font-bold tracking-wide text-red-500 mb-1";

    } catch (error) {
        console.error("Failed to fetch live AQI analysis:", error);
    }
}

// Call on load and refresh every 30 seconds
updateAirQualityAnalysis();
setInterval(updateAirQualityAnalysis, 30000);

        // Update the 7-Parameter Pollutant Bar Chart
        pollutantChart.data.datasets[0].data = [
            data.pm25 || 0,
            data.pm10 || 0,
            data.co || 0,
            data.co2 || 0,
            data.temperature || 0,
            data.humidity || 0,
            data.pressure || 0
        ];
        pollutantChart.update();

    } catch (err) {
        console.error("Error fetching telemetry data:", err);
        document.getElementById('device_id').innerText = "Connection Failed";
    }

    // Fetch and Populate Hourly Forecast
    try {
        const forecastRes = await fetch('/api/hourly-forecast');
        if (forecastRes.ok) {
            const forecast = await forecastRes.json();
            forecast.forEach((item, index) => {
                const badge = document.getElementById(`hf${index}`);
                const timeElem = index === 0 ? null : document.getElementById(`htime${index}`);
                const tempElem = document.getElementById(`ht${index}`);

                if (badge) badge.innerText = item.aqi;
                if (tempElem) tempElem.innerText = `${Math.round(item.temperature)}°`;
                if (timeElem && index > 0) timeElem.innerText = item.time;
            });
        }
    } catch (e) {
        console.log("Hourly forecast fetch error:", e);
    }

    // Fetch Historical Trends for all 7 parameters
    try {
        const historyRes = await fetch('/api/historical-trends');
        if (historyRes.ok) {
            const history = await historyRes.json();
            trendChart.data.labels = history.map(item => item.timestamp);
            trendChart.data.datasets[0].data = history.map(item => item.pm25);
            trendChart.data.datasets[1].data = history.map(item => item.pm10);
            trendChart.data.datasets[2].data = history.map(item => item.co);
            trendChart.data.datasets[3].data = history.map(item => item.co2);
            trendChart.data.datasets[4].data = history.map(item => item.temperature);
            trendChart.data.datasets[5].data = history.map(item => item.humidity);
            trendChart.data.datasets[6].data = history.map(item => item.pressure);
            trendChart.update();
        }
    } catch (e) {
        console.log("Historical trend fetch error:", e);
    }
}

// Bind Refresh Button Event
document.getElementById('refreshBtn').addEventListener('click', () => {
    const icon = document.getElementById('refreshIcon');
    icon.classList.add('fa-spin');
    fetchAllData().finally(() => {
        setTimeout(() => icon.classList.remove('fa-spin'), 600);
    });
});

// Auto-poll every 15 seconds (15000ms) instead of 2 seconds to protect server resources
setInterval(fetchAllData, 15000);

// Initial load on window startup
window.onload = fetchAllData;