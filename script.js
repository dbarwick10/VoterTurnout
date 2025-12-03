let mainMap; 
let icpsrData = []; 
let countyBoundariesUSA; 
let selectedCountyFIPS = null; 

// --- Helper function to get a single record from ICPSR data ---
function getNationalRecord(fipsCode, year) {
    return icpsrData.find(record => 
        String(record.STCOFIPS10) === String(fipsCode) && 
        String(record.YEAR) === String(year)
    );
}

// --- Helper function to get the change in turnout between two years ---
function getTurnoutChange(fipsCode, currentYear, previousYear) {
    const currentRecord = getNationalRecord(fipsCode, currentYear);
    const previousRecord = getNationalRecord(fipsCode, previousYear);

    if (!currentRecord || !previousRecord) {
        return null;
    }

    // VOTER_TURNOUT_POP is a decimal (e.g., 0.61)
    const currentTurnout = currentRecord.VOTER_TURNOUT_POP;
    const previousTurnout = previousRecord.VOTER_TURNOUT_POP;

    // Return the change in percentage points (e.g., 0.61 - 0.59 = 0.02)
    return currentTurnout - previousTurnout;
}

// --- Helper function to get color based on turnout change ---
function getChangeColor(change) {
    if (change === null) return '#c0d8c1'; // Default for no data

    // Convert change to percentage points
    const changePercent = change * 100;

    // Green for increase, Red for decrease, White/Gray for no change
    if (changePercent >= 5) return '#00441b'; // Strong Increase
    if (changePercent >= 2) return '#238b45'; // Moderate Increase
    if (changePercent >= 0.5) return '#a1d99b'; // Slight Increase
    if (changePercent > -0.5) return '#f7f7f7'; // Near Zero Change
    if (changePercent > -2) return '#fcae91'; // Slight Decrease
    if (changePercent > -5) return '#de2d26'; // Moderate Decrease
    return '#a50f15'; // Strong Decrease
}

// Fetch all data
async function fetchData() {
    try {
        const [icpsrResponse, usaBoundariesResponse] = await Promise.all([
            // 1. New national ICPSR data - UPDATED PATH
            fetch('/VoterTurnout/json/voterturnoutdata-ICPSR.json'),
            // 2. Full USA GeoJSON (for national map) - UPDATED PATH
            fetch('/VoterTurnout/json/counties.geojson') 
        ]);
        
        icpsrData = await icpsrResponse.json();
        countyBoundariesUSA = await usaBoundariesResponse.json();

        initMap();

    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

// Initialize the map
function initMap() {
    // --- 1. Initialize USA Map ---
    mainMap = L.map('main-map', { 
        center: [39.8, -98.5], // Center of the US
        zoom: 4,
        zoomControl: true,
        scrollWheelZoom: true,
        dragging: true,
        touchZoom: true,
        doubleClickZoom: false, 
        boxZoom: true,
        keyboard: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mainMap);

    // Initial draw of the map
    updateMap();

    // Event listeners for year selection
    document.getElementById('current-year').addEventListener('change', updateMap);
    document.getElementById('previous-year').addEventListener('change', updateMap);
}

// Display the county information in the info box
function displayCountyInfo(fipsCode) {
    const currentYear = document.getElementById('current-year').value;
    const previousYear = document.getElementById('previous-year').value;
    const infoDiv = document.getElementById('county-details');
    
    if (!fipsCode) {
        infoDiv.innerHTML = `<h2>Click a County for Details</h2>
            <p>Map shows the percentage point change in Voter Turnout (VAP) between the selected years.</p>`;
        return;
    }

    const currentRecord = getNationalRecord(fipsCode, currentYear);
    const previousRecord = getNationalRecord(fipsCode, previousYear);
    const change = getTurnoutChange(fipsCode, currentYear, previousYear);

    const countyName = currentRecord ? currentRecord.COUNTY : 'N/A';
    const stateName = currentRecord ? currentRecord.STATE : 'N/A';
    
    const currentTurnout = currentRecord ? (currentRecord.VOTER_TURNOUT_POP * 100).toFixed(2) + '%' : 'N/A';
    const previousTurnout = previousRecord ? (previousRecord.VOTER_TURNOUT_POP * 100).toFixed(2) + '%' : 'N/A';
    const changeText = change !== null ? (change * 100).toFixed(2) + ' percentage points' : 'N/A';

    infoDiv.innerHTML = `
        <h2>${countyName} County, ${stateName}</h2>
        <p><strong>FIPS Code:</strong> ${fipsCode}</p>
        <hr>
        <h3>Turnout Comparison</h3>
        <p><strong>Turnout (${currentYear}):</strong> ${currentTurnout}</p>
        <p><strong>Turnout (${previousYear}):</strong> ${previousTurnout}</p>
        <p><strong>Change (${previousYear} to ${currentYear}):</strong> ${changeText}</p>
        <hr>
        <h3>Partisan Index (${currentYear})</h3>
        <p><strong>Partisan Index (Dem):</strong> ${(currentRecord.PARTISAN_INDEX_DEM * 100).toFixed(2)}%</p>
        <p><strong>Partisan Index (Rep):</strong> ${(currentRecord.PARTISAN_INDEX_REP * 100).toFixed(2)}%</p>
    `;
}

// Highlight county function
function highlightCounty(fipsCode) {
    // Reset if same county is clicked
    if (selectedCountyFIPS === fipsCode) {
        selectedCountyFIPS = null;
        displayCountyInfo(null);
    } else {
        selectedCountyFIPS = fipsCode;
        displayCountyInfo(fipsCode);
    }
    updateMap();
}

// Update map function
function updateMap() {
    // Clear existing GeoJSON layer
    mainMap.eachLayer(layer => {
        if (layer instanceof L.GeoJSON) {
            mainMap.removeLayer(layer);
        }
    });

    const currentYear = document.getElementById('current-year').value;
    const previousYear = document.getElementById('previous-year').value;

    L.geoJSON(countyBoundariesUSA, {
        style: function(feature) {
            const fipsCode = feature.properties.STATEFP + feature.properties.COUNTYFP;
            const change = getTurnoutChange(fipsCode, currentYear, previousYear); 
            const isSelected = fipsCode === selectedCountyFIPS;

            return {
                fillColor: getChangeColor(change),
                weight: isSelected ? 3 : 0.5,
                opacity: 1,
                color: isSelected ? '#ffff00' : 'white',
                fillOpacity: 0.7
            };
        },
        onEachFeature: function(feature, layer) {
            const fipsCode = feature.properties.STATEFP + feature.properties.COUNTYFP;
            const change = getTurnoutChange(fipsCode, currentYear, previousYear);
            const changeText = change !== null ? (change * 100).toFixed(2) + ' pp' : 'N/A'; // pp = percentage points

            // Bind tooltip
            layer.bindTooltip(`${feature.properties.NAME} County, ${feature.properties.LSAD}<br>Change (${previousYear} to ${currentYear}): ${changeText}`);
            
            // Add click handler
            layer.on('click', function() {
                highlightCounty(fipsCode);
            });
        }
    }).addTo(mainMap);
}

// Initial call to fetch data and start the application
fetchData();