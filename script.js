let currentMap, previousMap, usaMap; // Added usaMap
let voterData = []; // Original Indiana data
let icpsrData = []; // New National ICPSR data
let countyBoundariesIndiana; // Renamed for clarity
let countyBoundariesUSA; // New variable for full US GeoJSON
let selectedCounty = "Indiana"; 
let selectedElectionTypeCurrent = "General"; 
let selectedElectionTypePrevious = "General"; 

// --- Helper function to get a simple turnout value from ICPSR data ---
function getNationalTurnout(fipsCode, year) {
    // FIPS code is a string like "01001"
    const record = icpsrData.find(record => 
        record.STCOFIPS10 == fipsCode && 
        record.YEAR == year
    );
    
    // We will use the VOTER_TURNOUT_POP field, which is a decimal (e.g., 0.61)
    return record ? record.VOTER_TURNOUT_POP : null;
}

// --- Helper function to get color for national map (uses decimal turnout) ---
function getNationalColor(turnoutDecimal) {
    if (turnoutDecimal === null) return '#c0d8c1'; // Default for no data
    
    // Convert decimal to percentage for easier comparison
    let turnoutPercent = turnoutDecimal * 100;
    
    if (turnoutPercent >= 80) return '#173e19'; // Darkest green
    if (turnoutPercent >= 70) return '#205723'; // Dark green
    if (turnoutPercent >= 60) return '#29702d'; // Medium green
    if (turnoutPercent >= 50) return '#428a46'; // Light green
    if (turnoutPercent >= 40) return '#6ca46f'; // Lighter green
    if (turnoutPercent >= 30) return '#96be98'; // Lightest green
    return '#c0d8c1'; // Very light green
}

// Fetch all data
async function fetchData() {
    try {
        const [voterResponse, icpsrResponse, indianaBoundariesResponse, usaBoundariesResponse] = await Promise.all([
            // 1. Original Indiana data
            fetch('voterdata.json'),
            // 2. New national ICPSR data
            fetch('voterturnoutdata-ICPSR.json'),
            // 3. Indiana GeoJSON (for comparison maps)
            fetch('indianaCounties.geojson'),
            // 4. Full USA GeoJSON (for national map)
            fetch('counties.geojson') 
        ]);
        
        voterData = await voterResponse.json();
        icpsrData = await icpsrResponse.json();
        countyBoundariesIndiana = await indianaBoundariesResponse.json();
        countyBoundariesUSA = await usaBoundariesResponse.json();

        initMaps();
        displayCountyInfo(selectedCounty);

    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

// Function to color counties based on voter turnout (uses original string format)
function getColor(turnout) {
    let turnoutPercent = parseFloat(turnout.replace('%', ''));
    
    if (turnoutPercent >= 80) return '#173e19'; 
    if (turnoutPercent >= 70) return '#205723'; 
    if (turnoutPercent >= 60) return '#29702d'; 
    if (turnoutPercent >= 50) return '#428a46'; 
    if (turnoutPercent >= 40) return '#6ca46f'; 
    if (turnoutPercent >= 30) return '#96be98'; 
    return '#c0d8c1'; 
}

// Get county data by year, county name, and election type (Uses original Indiana data)
function getCountyData(year, countyName, electionType) {
    return voterData.find(record => 
        record.Year == year && 
        record.County === countyName && 
        record["Election Type"] === electionType
    );
}

// Initialize the maps
function initMaps() {
    // --- 1. Initialize USA Map ---
    usaMap = L.map('usa-map', {
        center: [39.8, -98.5], // Center of the US
        zoom: 4,
        zoomControl: true,
        scrollWheelZoom: true,
        dragging: true,
        touchZoom: true,
        doubleClickZoom: true,
        boxZoom: true,
        keyboard: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    } ).addTo(usaMap);

    // Add USA County Boundaries
    L.geoJSON(countyBoundariesUSA, {
        style: function(feature) {
            // FIPS code is the key for the national data
            const fipsCode = feature.properties.STATEFP + feature.properties.COUNTYFP;
            // Using a fixed year for the national map for simplicity (e.g., 2022)
            const nationalTurnout = getNationalTurnout(fipsCode, 2022); 

            return {
                fillColor: getNationalColor(nationalTurnout),
                weight: 0.5,
                opacity: 1,
                color: 'white',
                fillOpacity: 0.7
            };
        },
        onEachFeature: function(feature, layer) {
            // Optional: Add a tooltip with County Name and Turnout
            const fipsCode = feature.properties.STATEFP + feature.properties.COUNTYFP;
            const nationalTurnout = getNationalTurnout(fipsCode, 2022);
            const turnoutText = nationalTurnout ? (nationalTurnout * 100).toFixed(1) + '%' : 'N/A';

            layer.bindTooltip(`${feature.properties.NAME} County, ${feature.properties.LSAD}  
Turnout (2022): ${turnoutText}`);
        }
    }).addTo(usaMap);

    // --- 2. Initialize Indiana Comparison Maps (Existing Logic) ---
    currentMap = L.map('current-year-map', {
        center: [39.8, -86.1349],
        zoom: 7,
        zoomControl: false,
        scrollWheelZoom: false,
        dragging: false,
        touchZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false
    });

    previousMap = L.map('previous-year-map', {
        center: [39.8, -86.1349],
        zoom: 7,
        zoomControl: false,
        scrollWheelZoom: false,
        dragging: false,
        touchZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    } ).addTo(currentMap);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    } ).addTo(previousMap);

    currentMap.touchZoom.disable();
    currentMap.doubleClickZoom.disable();
    currentMap.boxZoom.disable();
    currentMap.keyboard.disable();

    previousMap.touchZoom.disable();
    previousMap.doubleClickZoom.disable();
    previousMap.boxZoom.disable();
    previousMap.keyboard.disable();

    // Function to add county boundaries to a map (for Indiana)
    function addCountyBoundaries(map, year, electionType) {
        L.geoJSON(countyBoundariesIndiana, { // Use Indiana GeoJSON
            style: function(feature) {
                const countyName = feature.properties.name;
                const countyData = getCountyData(year, countyName, electionType);

                return {
                    fillColor: countyData ? getColor(countyData["Turnout (%)"]) : '#c0d8c1',
                    weight: 1,
                    opacity: 1,
                    color: 'white',
                    fillOpacity: 0.7
                };
            },
            onEachFeature: function(feature, layer) {
                layer.on('click', function() {
                    highlightCounty(feature.properties.name);
                });
            }
        }).addTo(map);
    }

    // Add boundaries for current and previous years
    const currentYear = document.getElementById('current-year').value;
    const previousYear = document.getElementById('previous-year').value;

    addCountyBoundaries(currentMap, currentYear, selectedElectionTypeCurrent);
    addCountyBoundaries(previousMap, previousYear, selectedElectionTypePrevious);
}

// Display the county information in the info box (No change needed here)
function displayCountyInfo(countyName) {
    const currentYear = document.getElementById('current-year').value;
    const previousYear = document.getElementById('previous-year').value;

    const currentData = getCountyData(currentYear, countyName, selectedElectionTypeCurrent);
    const previousData = getCountyData(previousYear, countyName, selectedElectionTypePrevious);

    const formatData = (data) => {
        if (!data) return 'N/A';
        return `
            <strong>Registered Voters:</strong> ${data["Registered Voters"]}  

            <strong>Voters Voting:</strong> ${data["Voters Voting"]}  

            <strong>Turnout (%):</strong> ${data["Turnout (%)"]}  

            <strong>Election Day Vote:</strong> ${data["Election Day Vote"]}  

            <strong>Absentee:</strong> ${data["Absentee"]}  

            <strong>Absentee (%):</strong> ${data["Absentee (%)"]}
        `;
    };

    const currentInfoDiv = document.getElementById('current-year-details');
    currentInfoDiv.innerHTML = `
        <h3>${countyName === "Indiana" ? 'Indiana' : `${countyName} County`}: ${currentYear}
        <div class="button-container">
        <button id="current-general-btn" class="toggle-button ${selectedElectionTypeCurrent === 'General' ? 'selected' : ''}">General</button>
        <button id="current-primary-btn" class="toggle-button ${selectedElectionTypeCurrent === 'Primary' ? 'selected' : ''}">Primary</button>
        </div></h3>  

        ${formatData(currentData)}
    `;

    const previousInfoDiv = document.getElementById('previous-year-details');
    previousInfoDiv.innerHTML = `
        <h3>${countyName === "Indiana" ? 'Indiana' : `${countyName} County`}: ${previousYear}
        <div class="button-container">
        <button id="previous-general-btn" class="toggle-button ${selectedElectionTypePrevious === 'General' ? 'selected' : ''}">General</button>
        <button id="previous-primary-btn" class="toggle-button ${selectedElectionTypePrevious === 'Primary' ? 'selected' : ''}">Primary</button>
        </div></h3>  

        ${formatData(previousData)}
    `;

    if (currentData && previousData) {
        const registeredVotersChange = Intl.NumberFormat().format(parseInt(currentData["Registered Voters"].replace(/,/g, '')) - parseInt(previousData["Registered Voters"].replace(/,/g, '')));
        const votersVotingChange = Intl.NumberFormat().format(parseInt(currentData["Voters Voting"].replace(/,/g, '')) - parseInt(previousData["Voters Voting"].replace(/,/g, '')));
        const electionDayVoteChange = Intl.NumberFormat().format(parseInt(currentData["Election Day Vote"].replace(/,/g, '')) - parseInt(previousData["Election Day Vote"].replace(/,/g, '')));
        const absenteeChange = Intl.NumberFormat().format(parseInt(currentData["Absentee"].replace(/,/g, '')) - parseInt(previousData["Absentee"].replace(/,/g, '')));
        
        const registeredVotersPercentChange = (((parseInt(currentData["Registered Voters"].replace(/,/g, '')) / parseInt(previousData["Registered Voters"].replace(/,/g, ''))) - 1) * 100).toFixed(2);
        const votersVotingPercentChange = (((parseInt(currentData["Voters Voting"].replace(/,/g, '')) / parseInt(previousData["Voters Voting"].replace(/,/g, ''))) - 1) * 100).toFixed(2);
        const turnoutPercentChange = (((parseInt(currentData["Turnout (%)"].replace(/,/g, '')) / parseInt(previousData["Turnout (%)"].replace(/,/g, ''))) - 1) * 100).toFixed(2);
        const electionDayVotePercentChange = (((parseInt(currentData["Election Day Vote"].replace(/,/g, '')) / parseInt(previousData["Election Day Vote"].replace(/,/g, ''))) - 1) * 100).toFixed(2);
        const absenteePercentChange = (((parseInt(currentData["Absentee"].replace(/,/g, '')) / parseInt(previousData["Absentee"].replace(/,/g, ''))) - 1) * 100).toFixed(2);
        const absenteePercentPercentChange = (((parseInt(currentData["Absentee (%)"].replace(/,/g, '')) / parseInt(previousData["Absentee (%)"].replace(/,/g, ''))) - 1) * 100).toFixed(2);

        document.getElementById('percent-change-details').innerHTML = `
            <h3>${countyName === "Indiana" ? 'Indiana' : `${countyName} County`}  

            ${previousYear} ${selectedElectionTypePrevious} to ${currentYear} ${selectedElectionTypeCurrent}</h3>  

            <strong>Registered Voters (Percent Change):</strong> ${registeredVotersChange} (${registeredVotersPercentChange}%)  

            <strong>Voters Voting (Percent Change):</strong> ${votersVotingChange} (${votersVotingPercentChange}%)  

            <strong>Turnout Percent:</strong> ${turnoutPercentChange}%  

            <strong>Election Day Vote (Percent Change):</strong> ${electionDayVoteChange} (${electionDayVotePercentChange}%)  

            <strong>Absentee (Percent Change):</strong> ${absenteeChange} (${absenteePercentChange}%)   

            <strong>Absentee Percent Change:</strong> ${absenteePercentPercentChange}%  

        `;
    }

    document.getElementById('current-general-btn').addEventListener('click', () => {
        selectedElectionTypeCurrent = "General";
        updateMap();
        displayCountyInfo(selectedCounty);
    });

    document.getElementById('current-primary-btn').addEventListener('click', () => {
        selectedElectionTypeCurrent = "Primary";
        updateMap();
        displayCountyInfo(selectedCounty);
    });

    document.getElementById('previous-general-btn').addEventListener('click', () => {
        selectedElectionTypePrevious = "General";
        updateMap();
        displayCountyInfo(selectedCounty);
    });

    document.getElementById('previous-primary-btn').addEventListener('click', () => {
        selectedElectionTypePrevious = "Primary";
        updateMap();
        displayCountyInfo(selectedCounty);
    });
}

// Highlight county function
function highlightCounty(countyName) {
    if (selectedCounty === countyName) {
        selectedCounty = "Indiana";
        selectedElectionTypeCurrent = "General";
        selectedElectionTypePrevious = "General";
        updateMap();
        displayCountyInfo("Indiana");
        return;
    }

    selectedCounty = countyName;
    displayCountyInfo(selectedCounty);
    updateMap();
}

// Update map function
function updateMap() {
    // Clear existing layers from Indiana maps
    currentMap.eachLayer(layer => {
        if (layer instanceof L.GeoJSON) {
            currentMap.removeLayer(layer);
        }
    });
    previousMap.eachLayer(layer => {
        if (layer instanceof L.GeoJSON) {
            previousMap.removeLayer(layer);
        }
    });

    // Re-initialize maps with new data/selection
    const currentYear = document.getElementById('current-year').value;
    const previousYear = document.getElementById('previous-year').value;

    function addCountyBoundaries(map, year, electionType) {
        L.geoJSON(countyBoundariesIndiana, {
            style: function(feature) {
                const currentName = feature.properties.name;
                const isSelectedCounty = currentName === selectedCounty;
                const countyData = getCountyData(year, currentName, electionType);

                return {
                    fillColor: countyData ? getColor(countyData["Turnout (%)"]) : '#c0d8c1',
                    weight: isSelectedCounty ? 3 : 1,
                    opacity: 1,
                    color: isSelectedCounty ? '#ffff00' : 'white',
                    fillOpacity: isSelectedCounty ? 0.9 : 0.7
                };
            },
            onEachFeature: function(feature, layer) {
                layer.on('click', function() {
                    highlightCounty(feature.properties.name);
                });
            }
        }).addTo(map);
    }

    addCountyBoundaries(currentMap, currentYear, selectedElectionTypeCurrent);
    addCountyBoundaries(previousMap, previousYear, selectedElectionTypePrevious);
}

// Event listeners for year selection
document.getElementById('current-year').addEventListener('change', updateMap);
document.getElementById('previous-year').addEventListener('change', updateMap);

// Initial call to fetch data and start the application
fetchData();
