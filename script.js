let currentMap, previousMap;
let voterData = [];
let selectedCounty = "Indiana"; // Default county is Indiana
let selectedElectionTypeCurrent = "General"; // For current year
let selectedElectionTypePrevious = "General"; // For previous year
let currentHighlightedMarker = null;

// Fetch voter data from the JSON file
async function fetchVoterData() {
    const response = await fetch('voterdata.json');
    voterData = await response.json();
}

// Initialize the maps
function initMaps() {
    currentMap = L.map('current-year-map', {
        center: [39.8, -86.1349],
        zoom: 7,
        zoomControl: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        dragging: false
    });

    previousMap = L.map('previous-year-map', {
        center: [39.8, -86.1349],
        zoom: 7,
        zoomControl: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        dragging: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(currentMap);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(previousMap);
}

// Function to color counties based on voter turnout
function getColor(turnout) {
    let turnoutPercent = parseFloat(turnout.replace('%', ''));
    
    if (turnoutPercent >= 80) return '#173e19'; // Dark green
    if (turnoutPercent >= 70) return '#205723'; // Dark green
    if (turnoutPercent >= 60) return '#29702d'; // Medium green
    if (turnoutPercent >= 50) return '#428a46'; // Light green
    if (turnoutPercent >= 40) return '#6ca46f'; // Light green
    if (turnoutPercent >= 30) return '#96be98'; // Light green
    return '#c0d8c1'; // Very light green
}

// Get county data by year, county name, and election type
function getCountyData(year, countyName, electionType) {
    return voterData.find(record => record.Year == year && record.County === countyName && record["Election Type"] === electionType);
}

// Display the county information in the info box
function displayCountyInfo(countyName) {
    const currentYear = document.getElementById('current-year').value;
    const previousYear = document.getElementById('previous-year').value;

    // Get current and previous data for the selected election type
    const currentData = getCountyData(currentYear, countyName, selectedElectionTypeCurrent);
    const previousData = getCountyData(previousYear, countyName, selectedElectionTypePrevious);

    // Display current year data
    const currentInfoDiv = document.getElementById('current-year-details');
    currentInfoDiv.innerHTML = `
        <h3>${countyName === "Indiana" ? 'Indiana' : `${countyName} county`}: ${currentYear}
        <div class="button-container">
        <button id="current-general-btn" class="toggle-button ${selectedElectionTypeCurrent === 'General' ? 'selected' : ''}">General</button>
        <button id="current-primary-btn" class="toggle-button ${selectedElectionTypeCurrent === 'Primary' ? 'selected' : ''}">Primary</button>
        </div></h3><br>
        <strong>Registered Voters:</strong> ${currentData ? currentData["Registered Voters"] : 'N/A'}<br>
        <strong>Voters Voting:</strong> ${currentData ? currentData["Voters Voting"] : 'N/A'}<br>
        <strong>Turnout (%):</strong> ${currentData ? currentData["Turnout (%)"] : 'N/A'}<br>
        <strong>Election Day Vote:</strong> ${currentData ? currentData["Election Day Vote"] : 'N/A'}<br>
        <strong>Absentee:</strong> ${currentData ? currentData["Absentee"] : 'N/A'}<br>
        <strong>Absentee (%):</strong> ${currentData ? currentData["Absentee (%)"] : 'N/A'}
    `;

    // Display previous year data
    const previousInfoDiv = document.getElementById('previous-year-details');
    previousInfoDiv.innerHTML = `
        <h3>${countyName === "Indiana" ? 'Indiana' : `${countyName} county`}: ${previousYear}
        <div class="button-container">
        <button id="previous-general-btn" class="toggle-button ${selectedElectionTypePrevious === 'General' ? 'selected' : ''}">General</button>
        <button id="previous-primary-btn" class="toggle-button ${selectedElectionTypePrevious === 'Primary' ? 'selected' : ''}">Primary</button>
        </div></h3><br>
        <strong>Registered Voters:</strong> ${previousData ? previousData["Registered Voters"] : 'N/A'}<br>
        <strong>Voters Voting:</strong> ${previousData ? previousData["Voters Voting"] : 'N/A'}<br>
        <strong>Turnout (%):</strong> ${previousData ? previousData["Turnout (%)"] : 'N/A'}<br>
        <strong>Election Day Vote:</strong> ${previousData ? previousData["Election Day Vote"] : 'N/A'}<br>
        <strong>Absentee:</strong> ${previousData ? previousData["Absentee"] : 'N/A'}<br>
        <strong>Absentee (%):</strong> ${previousData ? previousData["Absentee (%)"] : 'N/A'}
    `;

    // Calculate and display percent change if both data points exist
    if (currentData && previousData) {
        const registeredVotersChange = Intl.NumberFormat().format(parseInt(currentData["Registered Voters"].replace(/,/g, '')) - parseInt(previousData["Registered Voters"].replace(/,/g, '')));
        const votersVotingChange = Intl.NumberFormat().format(parseInt(currentData["Voters Voting"].replace(/,/g, '')) - parseInt(previousData["Voters Voting"].replace(/,/g, '')));
        //const turnoutChange = (parseFloat(currentData["Turnout (%)"]) - parseFloat(previousData["Turnout (%)"])).toFixed(0);
        const electionDayVoteChange = Intl.NumberFormat().format(parseInt(currentData["Election Day Vote"].replace(/,/g, '')) - parseInt(previousData["Election Day Vote"].replace(/,/g, '')));
        let absenteeChange = Intl.NumberFormat().format(parseInt(currentData["Absentee"].replace(/,/g, '')) - parseInt(previousData["Absentee"].replace(/,/g, '')));
        //const absenteePercent = (parseFloat(currentData["Absentee (%)"]) - parseFloat(previousData["Absentee (%)"])).toFixed(0);
        const registeredVotersPercentChange = (((parseInt(currentData["Registered Voters"].replace(/,/g, '')) / parseInt(previousData["Registered Voters"].replace(/,/g, ''))) - 1) * 100).toFixed(2);
        const votersVotingPercentChange = (((parseInt(currentData["Voters Voting"].replace(/,/g, '')) / parseInt(previousData["Voters Voting"].replace(/,/g, ''))) - 1) * 100).toFixed(2);
        const turnoutPercentChange = (((parseInt(currentData["Turnout (%)"].replace(/,/g, '')) / parseInt(previousData["Turnout (%)"].replace(/,/g, ''))) - 1) * 100).toFixed(2);
        const electionDayVotePercentChange = (((parseInt(currentData["Election Day Vote"].replace(/,/g, '')) / parseInt(previousData["Election Day Vote"].replace(/,/g, ''))) - 1) * 100).toFixed(2);
        const absenteePercentChange = (((parseInt(currentData["Absentee"].replace(/,/g, '')) / parseInt(previousData["Absentee"].replace(/,/g, ''))) - 1) * 100).toFixed(2);
        const absenteePercentPercentChange = (((parseInt(currentData["Absentee (%)"].replace(/,/g, '')) / parseInt(previousData["Absentee (%)"].replace(/,/g, ''))) - 1) * 100).toFixed(2);

        document.getElementById('percent-change-details').innerHTML = `
            <h3>${countyName === "Indiana" ? 'Indiana' : `${countyName} county`}<br>
            ${previousYear} ${selectedElectionTypePrevious} to ${currentYear} ${selectedElectionTypeCurrent}</h3><br>
            <strong>Registered Voters (Percent Change):</strong> ${registeredVotersChange} (${registeredVotersPercentChange}%)<br>
            <strong>Voters Voting (Percent Change):</strong> ${votersVotingChange} (${votersVotingPercentChange}%)<br>
            <strong>Turnout Percent:</strong> ${turnoutPercentChange}%<br>
            <strong>Election Day Vote (Percent Change):</strong> ${electionDayVoteChange} (${electionDayVotePercentChange}%)<br>
            <strong>Absentee (Percent Change):</strong> ${absenteeChange} (${absenteePercentChange}%) <br>
            <strong>Absentee Percent Change:</strong> ${absenteePercentPercentChange}%<br>
        `;
    }

    // Attach event listeners to the buttons for current year data
    document.getElementById('current-general-btn').addEventListener('click', () => {
        selectedElectionTypeCurrent = "General";
        displayCountyInfo(selectedCounty);  // Refresh the info box for current year
    });

    document.getElementById('current-primary-btn').addEventListener('click', () => {
        selectedElectionTypeCurrent = "Primary";
        displayCountyInfo(selectedCounty);  // Refresh the info box for current year
    });

    // Attach event listeners to the buttons for previous year data
    document.getElementById('previous-general-btn').addEventListener('click', () => {
        selectedElectionTypePrevious = "General";
        displayCountyInfo(selectedCounty);  // Refresh the info box for previous year
    });

    document.getElementById('previous-primary-btn').addEventListener('click', () => {
        selectedElectionTypePrevious = "Primary";
        displayCountyInfo(selectedCounty);  // Refresh the info box for previous year
    });
}

// Function to reset to state view if the year is changed
function resetToStateView() {
    selectedCounty = "Indiana";  // Reset to Indiana by default
    displayCountyInfo("Indiana");
}

// Add click functionality for counties
function addCountyClickFunctionality() {
    voterData.forEach(record => {
        const countyMarkerCurrent = L.circleMarker([record.Latitude, record.Longitude], {
            radius: 8,
            fillColor: getColor(record["Turnout (%)"]),
            color: '#fff',
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8
        }).addTo(currentMap);

        countyMarkerCurrent.on('click', () => {
            highlightCounty(record.County);
        });

        const countyMarkerPrevious = L.circleMarker([record.Latitude, record.Longitude], {
            radius: 8,
            fillColor: getColor(record["Turnout (%)"]),
            color: '#fff',
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8
        }).addTo(previousMap);

        countyMarkerPrevious.on('click', () => {
            highlightCounty(record.County);
        });
    });
}

// Highlight county on both maps
function highlightCounty(countyName) {
    // Reset previously highlighted county
    if (currentHighlightedMarker) {
        currentHighlightedMarker.setStyle({ fillOpacity: 0.8 });
    }

    voterData.forEach(record => {
        if (record.County === countyName) {
            // Highlight on current year map
            currentMap.eachLayer(layer => {
                if (layer instanceof L.CircleMarker && layer.getLatLng().lat === parseFloat(record.Latitude) && layer.getLatLng().lng === parseFloat(record.Longitude)) {
                    layer.setStyle({ fillOpacity: 1.0 });
                    currentHighlightedMarker = layer;
                }
            });

            // Highlight on previous year map
            previousMap.eachLayer(layer => {
                if (layer instanceof L.CircleMarker && layer.getLatLng().lat === parseFloat(record.Latitude) && layer.getLatLng().lng === parseFloat(record.Longitude)) {
                    layer.setStyle({ fillOpacity: 1.0 });
                }
            });
        }
    });

    selectedCounty = countyName;
    displayCountyInfo(countyName);
}

// Update the maps when a new year is selected
function updateMap() {
    const currentYear = document.getElementById('current-year').value;
    const previousYear = document.getElementById('previous-year').value;

    resetToStateView();  // Reset to state info when year changes

    // Update current year map
    currentMap.eachLayer(layer => {
        if (layer instanceof L.CircleMarker) {
            const countyData = voterData.find(record => record.Latitude == layer.getLatLng().lat && record.Longitude == layer.getLatLng().lng && record.Year == currentYear);
            if (countyData) {
                layer.setStyle({ fillColor: getColor(countyData["Turnout (%)"]) });
            }
        }
    });

    // Update previous year map
    previousMap.eachLayer(layer => {
        if (layer instanceof L.CircleMarker) {
            const countyData = voterData.find(record => record.Latitude == layer.getLatLng().lat && record.Longitude == layer.getLatLng().lng && record.Year == previousYear);
            if (countyData) {
                layer.setStyle({ fillColor: getColor(countyData["Turnout (%)"]) });
            }
        }
    });

    // If a county is selected, update the data for the selected county
    if (selectedCounty) {
        displayCountyInfo(selectedCounty);
    }
}

// Event listeners for year changes
document.getElementById('current-year').addEventListener('change', updateMap);
document.getElementById('previous-year').addEventListener('change', updateMap);

// Initialize everything
document.addEventListener('DOMContentLoaded', async () => {
    await fetchVoterData();
    initMaps();
    addCountyClickFunctionality();
    resetToStateView();
});
