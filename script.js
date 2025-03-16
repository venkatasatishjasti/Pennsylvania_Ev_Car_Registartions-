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

        let selectedCounty = null; // Track the selected county

        // Define styles for selected and default counties
        const defaultStyle = {
            weight: 2,
            color: "#14213D",
            opacity: 0.8,
            fillOpacity: 0.1
        };
        
        const highlightStyle = {
            weight: 3,
            color: "#3388ff",
            fillOpacity: 0.4
        };
        
        // Function to highlight a county
        function highlightCounty(layer) {
            layer.setStyle(highlightStyle);
        }
        
        // Function to reset county highlight
        function resetHighlight() {
            geoLayer.eachLayer(layer => {
                layer.setStyle(defaultStyle);
            });
        }
        
        // Helper function to sum quarterly values
        function sumQuarters(feature, type) {
            return (feature.properties[`${type}_Q1`] || 0) +
                   (feature.properties[`${type}_Q2`] || 0) +
                   (feature.properties[`${type}_Q3`] || 0) +
                   (feature.properties[`${type}_Q4`] || 0);
        }
        
        // Function to create and render a Chart.js pie chart inside a Leaflet popup
        function renderPieChart(layer, HEV, PHEV, BEV) {
            let countyName = layer.feature.properties.COUNTY_NAM; // Get county name
        
            // Create a container for popup content
            let popupContent = document.createElement('div');
            popupContent.style.width = '180px'; 
            popupContent.style.height = '200px'; 
            popupContent.style.textAlign = 'center';
        
            // Add county name as a title
            let title = document.createElement('h3');
            title.innerText = countyName; 
            title.style.fontSize = '14px';
            title.style.fontWeight = 'bold';
            title.style.marginBottom = '8px';
            popupContent.appendChild(title);
        
            // Create a canvas for the chart
            let canvas = document.createElement('canvas');
            canvas.width = 160;
            canvas.height = 160;
            popupContent.appendChild(canvas);
        
            let ctx = canvas.getContext('2d');
        
            let hasData = HEV + PHEV + BEV > 0;
        
            // Create the pie chart
            new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: ['HEV', 'PHEV', 'BEV'],
                    datasets: [{
                        data: hasData ? [HEV, PHEV, BEV] : [1, 1, 1], // Placeholder if empty
                        backgroundColor: hasData ? ['#FF6384', '#36A2EB', '#f5b40f'] : ['#ddd', '#ccc', '#bbb']
                    }]
                },
                options: {
                    responsive: false,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: true },
                        tooltip: {
                            callbacks: {
                                label: function (tooltipItem) {
                                    let value = tooltipItem.raw;
                                    return value === 1 ? 'N/A' : `${tooltipItem.label}: ${value}`;
                                }
                            }
                        }
                    }
                }
            });
        
            // Ensure old popup is removed before binding new popup
            layer.unbindPopup();
            layer.bindPopup(popupContent).openPopup();
        }
        
        // Function to process data and update the pie charts based on selected year and quarter
        function updatePieCharts(year, quarter = 'all') {
            let countyData = {}; // Store county-wise totals
            let dataAvailable = false; // Track if data exists for selected filters
        
            // Aggregate totals per county based on selected year and quarter
            geoLayer.eachLayer(layer => {
                let feature = layer.feature;
                let countyName = feature.properties.COUNTY_NAM; 
                let featureYear = feature.properties.REGISTRATI;
        
                console.log(`County: ${countyName}, Year: ${featureYear}, Quarter: ${quarter}, HEV_Q4: ${feature.properties.HEV_Q4 || 'undefined'}`);
        
                if (!countyData[countyName]) {
                    countyData[countyName] = { HEV: 0, PHEV: 0, BEV: 0 };
                }
        
                if (year === 'all' && (featureYear === '2023' || featureYear === '2024')) {
                    if (quarter === 'all') {
                        countyData[countyName].HEV += sumQuarters(feature, 'HEV');
                        countyData[countyName].PHEV += sumQuarters(feature, 'PHEV');
                        countyData[countyName].BEV += sumQuarters(feature, 'BEV');
                    } else {
                        countyData[countyName].HEV += (feature.properties[`HEV_${quarter}`] || 0);
                        countyData[countyName].PHEV += (feature.properties[`PHEV_${quarter}`] || 0);
                        countyData[countyName].BEV += (feature.properties[`BEV_${quarter}`] || 0);
                    }
                } else if (year === featureYear) {
                    if (quarter === 'all') {
                        countyData[countyName].HEV += sumQuarters(feature, 'HEV');
                        countyData[countyName].PHEV += sumQuarters(feature, 'PHEV');
                        countyData[countyName].BEV += sumQuarters(feature, 'BEV');
                    } else {
                        countyData[countyName].HEV += feature.properties[`HEV_${quarter}`] || 0;
                        countyData[countyName].PHEV += feature.properties[`PHEV_${quarter}`] || 0;
                        countyData[countyName].BEV += feature.properties[`BEV_${quarter}`] || 0;
                    }
                }
        
                if (countyData[countyName].HEV + countyData[countyName].PHEV + countyData[countyName].BEV > 0) {
                    dataAvailable = true;
                }
            });
        
            // Second pass: Update charts for only the selected county
            geoLayer.eachLayer(layer => {
                let feature = layer.feature;
                let countyName = feature.properties.COUNTY_NAM; 
        
                if (countyData[countyName]) {
                    let { HEV, PHEV, BEV } = countyData[countyName];
        
                    if (selectedCounty === countyName) {
                        renderPieChart(layer, HEV, PHEV, BEV);
                    }
                }
            });
        
            // If no data is available for the selected filters, show an empty pie chart
            if (!dataAvailable) {
                console.log("No data available for this selection.");
                geoLayer.eachLayer(layer => {
                    if (layer.feature.properties.COUNTY_NAM === selectedCounty) {
                        renderPieChart(layer, 0, 0, 0); // Show empty pie chart
                    }
                });
            }
        }
        
        // Function to track and update the selected county
        function selectCounty(countyName) {
            selectedCounty = countyName; 
            console.log("Selected County:", selectedCounty);
        
            // Reset highlight before applying new one
            resetHighlight();
        
            let selectedYear = document.querySelector('input[name="toggle"]:checked').value;
            let selectedQuarter = document.querySelector('input[name="quarter-toggle"]:checked').value;
        
            // Find and highlight the selected county
            geoLayer.eachLayer(layer => {
                if (layer.feature.properties.COUNTY_NAM === selectedCounty) {
                    highlightCounty(layer);
                }
            });
        
            updatePieCharts(selectedYear, selectedQuarter);
        }
        
        // Optimized event listener for year and quarter selection
        document.getElementById('console').addEventListener('change', function (event) {
            if (event.target.name === "toggle" || event.target.name === "quarter-toggle") {
                let selectedYear = document.querySelector('input[name="toggle"]:checked').value;
                let selectedQuarter = document.querySelector('input[name="quarter-toggle"]:checked').value;
                updatePieCharts(selectedYear, selectedQuarter);
            }
        });
        
        // Add event listeners for county selection (when clicking on a county)
        geoLayer.eachLayer(layer => {
            layer.on('click', function () {
                let feature = layer.feature;
                selectCounty(feature.properties.COUNTY_NAM);
            });
        });
        
        // Initialize charts with all data when the page loads
        updatePieCharts('all', 'all');
        

    })
    .catch(error => console.error('Error loading GeoJSON:', error));
});