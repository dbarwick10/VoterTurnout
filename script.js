let usaMap; 
let icpsrData = []; 
let countyBoundariesUSA; 
let selectedCountyFIPS = null; // Use FIPS code for national map

// --- Helper function to get a simple turnout value from ICPSR data ---
function getNationalTurnout(fipsCode, year) {
    // The ICPSR data is for the whole US, so we only need the ICPSR data
    const record = icpsrData.find(record => 
        // Ensure both sides of the comparison are treated as strings
        String(record.STCOFIPS10) === String(fipsCode) && 
        String(record.YEAR) === String(year)
    );
    
    // We are using VOTER_TURNOUT_POP for the national map
    return record ? record.VOTER_TURNOUT_POP : null;
}

// --- Helper function to get color for national map (uses decimal turnout) ---
function getNationalColor(turnoutDecimal) {
    if (turnoutDecimal === null) return '#c0d8c1'; 
    
    let turnoutPercent = turnoutDecimal * 100;
    
    if (turnoutPercent >= 80) return '#173e19'; 
    if (turnoutPercent >= 70) return '#205723'; 
    if (turnoutPercent >= 60) return '#29702d'; 
    if (turnoutPercent >= 50) return '#428a46'; 
    if (turnoutPercent >= 40) return '#6ca46f'; 
    if (turnoutPercent >= 30) return '#96be98'; 
    return '#c0d8c1'; 
}

// Fetch all data
async function fetchData() {
    try {
        const [icpsrResponse, usaBoundariesResponse] = await Promise.all([
            // 1. New national ICPSR data - UPDATED PATH
            fetch('../json/voterturnoutdata-ICPSR.json'),
            // 2. Full USA GeoJSON (for national map) - UPDATED PATH
            fetch('../json/counties.geojson') 
        ]);
        
        icpsrData = await icpsrResponse.json();
        countyBoundariesUSA = await usaBoundariesResponse.json();

        initMap();
        displayCountyInfo(null); // Initial display with no county selected

    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

// Initialize the map
function initMap() {
    // --- 1. Initialize USA Map ---
    usaMap = L.map('main-map', { // Renamed to 'main-map'
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
    }).addTo(usaMap);

    // Initial draw of the map
    updateMap();

    // Event listener for year selection
    document.getElementById('current-year').addEventListener('change', updateMap);
}

// Display the county information in the info box
function displayCountyInfo(fipsCode) {
    const year = document.getElementById('current-year').value;
    const infoDiv = document.getElementById('county-details');
    
    if (!fipsCode) {
        infoDiv.innerHTML = `<h2>Click a County for Details</h2>
            <p>Turnout data is based on the Voting Age Population (VAP) from the ICPSR/NaNDA dataset.</p>`;
        return;
    }

    const record = icpsrData.find(r => 
        String(r.STCOFIPS10) === String(fipsCode) && 
        String(r.YEAR) === String(year)
    );

    const countyName = record ? record.COUNTY : 'N/A';
    const stateName = record ? record.STATE : 'N/A';
    const turnout = record ? (record.VOTER_TURNOUT_POP * 100).toFixed(2) + '%' : 'N/A';
    const registeredVoters = record ? record.VOTER_REG_POP : 'N/A'; // VAP is used as proxy for Registered Voters in this dataset

    infoDiv.innerHTML = `
        <h2>${countyName} County, ${stateName} (${year})</h2>
        <p><strong>FIPS Code:</strong> ${fipsCode}</p>
        <p><strong>Turnout (VAP):</strong> ${turnout}</p>
        <p><strong>Voting Age Population (VAP):</strong> ${Intl.NumberFormat().format(registeredVoters)}</p>
        <p><strong>Partisan Index (Dem):</strong> ${(record.PARTISAN_INDEX_DEM * 100).toFixed(2)}%</p>
        <p><strong>Partisan Index (Rep):</strong> ${(record.PARTISAN_INDEX_REP * 100).toFixed(2)}%</p>
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
    usaMap.eachLayer(layer => {
        if (layer instanceof L.GeoJSON) {
            usaMap.removeLayer(layer);
        }
    });

    const year = document.getElementById('current-year').value;

    L.geoJSON(countyBoundariesUSA, {
        style: function(feature) {
            const fipsCode = feature.properties.STATEFP + feature.properties.COUNTYFP;
            const nationalTurnout = getNationalTurnout(fipsCode, year); 
            const isSelected = fipsCode === selectedCountyFIPS;

            return {
                fillColor: getNationalColor(nationalTurnout),
                weight: isSelected ? 3 : 0.5,
                opacity: 1,
                color: isSelected ? '#ffff00' : 'white',
                fillOpacity: 0.7
            };
        },
        onEachFeature: function(feature, layer) {
            const fipsCode = feature.properties.STATEFP + feature.properties.COUNTYFP;
            const nationalTurnout = getNationalTurnout(fipsCode, year);
            const turnoutText = nationalTurnout ? (nationalTurnout * 100).toFixed(1) + '%' : 'N/A';

            // Bind tooltip
            layer.bindTooltip(`${feature.properties.NAME} County, ${feature.properties.LSAD}<br>Turnout (${year}): ${turnoutText}`);
            
            // Add click handler
            layer.on('click', function() {
                highlightCounty(fipsCode);
            });
        }
    }).addTo(usaMap);
}

// Initial call to fetch data and start the application
fetchData();