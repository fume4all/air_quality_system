// Point directly to your live Railway backend telemetry endpoint
const API_URL = "https://airqualitysystem-production.up.railway.app/telemetry";

async function fetchLatestData() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        // Check if valid telemetry data exists
        if (data && data.device_id) {
            // Update Device ID and Timestamp display elements
            const deviceIdElem = document.getElementById("device-id-display");
            if (deviceIdElem) deviceIdElem.innerText = data.device_id;

            const timestampElem = document.getElementById("timestamp-display");
            if (timestampElem && data.timestamp) {
                timestampElem.innerText = new Date(data.timestamp).toLocaleString();
            }

            // Update all pollutant and environmental metrics
            const pm25Elem = document.getElementById("pm25-val");
            if (pm25Elem) pm25Elem.innerText = data.pm25 ?? "--";

            const pm10Elem = document.getElementById("pm10-val");
            if (pm10Elem) pm10Elem.innerText = data.pm10 ?? "--";

            const coElem = document.getElementById("co-val");
            if (coElem) coElem.innerText = data.co ?? "--";

            const co2Elem = document.getElementById("co2-val");
            if (co2Elem) co2Elem.innerText = data.co2 ?? "--";

            const tempElem = document.getElementById("temp-val");
            if (tempElem) tempElem.innerText = (data.temperature !== undefined ? data.temperature + " °C" : "--");

            const humidityElem = document.getElementById("humidity-val");
            if (humidityElem) humidityElem.innerText = (data.humidity !== undefined ? data.humidity + " %" : "--");

            const pressureElem = document.getElementById("pressure-val");
            if (pressureElem) pressureElem.innerText = (data.pressure !== undefined ? data.pressure + " hPa" : "--");

        } else {
            console.log("No telemetry records found in database yet.");
        }
    } catch (error) {
        console.error("Error fetching telemetry data:", error);
    }
}

// Automatically refresh data every 5 seconds for live updates
setInterval(fetchLatestData, 5000);

// Run immediately when the page loads
window.onload = fetchLatestData;