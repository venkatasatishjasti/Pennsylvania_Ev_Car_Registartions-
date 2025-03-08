document.addEventListener("DOMContentLoaded", function () {
    var map = L.map('map').setView([41.203323, -77.194527], 8);

    var tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    // Load the GeoJSON file
    fetch('EV_Registrations_County.geojson')
    .then(response => response.json())
    .then(data => {
        // Add GeoJSON layer to the map
        let geoLayer = L.geoJSON(data, {
            style: function (feature) {
                return {
                    color: "#14213D",
                    weight: 2,
                    opacity: 0.8,
                    fillOpacity: 0.05
                };
            }
        }).addTo(map);

        // Function to create and render a Chart.js pie chart inside a Leaflet popup
        function renderPieChart(layer, HEV, PHEV, BEV) {
            let popupContent = document.createElement('div');
            popupContent.style.width = '150px'; 
            popupContent.style.height = '150px';

            let canvas = document.createElement('canvas');
            canvas.width = 150;
            canvas.height = 150;
            popupContent.appendChild(canvas);

            let ctx = canvas.getContext('2d');

            // Check if at least one category has nonzero values before rendering
            if (HEV + PHEV + BEV > 0) {
                new Chart(ctx, {
                    type: 'pie',
                    data: {
                        labels: ['HEV', 'PHEV', 'BEV'],
                        datasets: [{
                            data: [HEV, PHEV, BEV],
                            backgroundColor: ['#FF6384', '#36A2EB', '#f5b40f']
                        }]
                    },
                    options: {
                        responsive: false,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: true }
                        }
                    }
                });

                layer.bindPopup(popupContent).openPopup();
            } else {
                console.warn("Skipping chart for layer - All values are zero.");
            }
        }

// Function to process data and update the pie charts
function updatePieCharts(year) {
    let countyData = {}; // Object to store county-wise totals

    // First pass: Aggregate totals per county based on selected year
    geoLayer.eachLayer(layer => {
        let feature = layer.feature;
        let countyName = feature.properties.COUNTY_NAM; // Identify county
        let featureYear = feature.properties.REGISTRATI;

        // Initialize county in dictionary if not present
        if (!countyData[countyName]) {
            countyData[countyName] = { HEV: 0, PHEV: 0, BEV: 0 };
        }

        // Handle "All" option (sum 2023 + 2024)
        if (year === 'all' && (featureYear === '2023' || featureYear === '2024')) {
            countyData[countyName].HEV += (feature.properties.HEV_Q1 || 0) + (feature.properties.HEV_Q2 || 0) +
                                          (feature.properties.HEV_Q3 || 0) + (feature.properties.HEV_Q4 || 0);

            countyData[countyName].PHEV += (feature.properties.PHEV_Q1 || 0) + (feature.properties.PHEV_Q2 || 0) +
                                           (feature.properties.PHEV_Q3 || 0) + (feature.properties.PHEV_Q4 || 0);

            countyData[countyName].BEV += (feature.properties.BEV_Q1 || 0) + (feature.properties.BEV_Q2 || 0) +
                                          (feature.properties.BEV_Q3 || 0) + (feature.properties.BEV_Q4 || 0);
        }
        // Handle specific year selection (2023 or 2024)
        else if (year === featureYear) {
            countyData[countyName].HEV = (feature.properties.HEV_Q1 || 0) + (feature.properties.HEV_Q2 || 0) +
                                         (feature.properties.HEV_Q3 || 0) + (feature.properties.HEV_Q4 || 0);

            countyData[countyName].PHEV = (feature.properties.PHEV_Q1 || 0) + (feature.properties.PHEV_Q2 || 0) +
                                          (feature.properties.PHEV_Q3 || 0) + (feature.properties.PHEV_Q4 || 0);

            countyData[countyName].BEV = (feature.properties.BEV_Q1 || 0) + (feature.properties.BEV_Q2 || 0) +
                                         (feature.properties.BEV_Q3 || 0) + (feature.properties.BEV_Q4 || 0);
        }
    });

    // Second pass: Update charts for each county
    geoLayer.eachLayer(layer => {
        let feature = layer.feature;
        let countyName = feature.properties.COUNTY_NAM; 

        if (countyData[countyName]) {
            let { HEV, PHEV, BEV } = countyData[countyName];

            // Debugging: Check per county
            console.log("County:", countyName, "Year Filter:", year, "HEV:", HEV, "PHEV:", PHEV, "BEV:", BEV);

            // Ensure at least one category has data before rendering
            if (HEV + PHEV + BEV > 0) {
                renderPieChart(layer, HEV, PHEV, BEV);
            }
        }
    });
}

// Add event listeners for all year options ("All", "2023", "2024")
document.querySelectorAll('input[name="toggle"]').forEach(input => {
    input.addEventListener('change', function () {
        updatePieCharts(this.value);
    });
});

// Initialize charts with all data when the page loads
updatePieCharts('all');

    })
    .catch(error => console.error('Error loading GeoJSON:', error));
});