// Global variables to hold parsed data and chart instance
let rawData = []; // Stores the parsed data from CSV or JSON
let currentChart = null; // Holds the Chart.js instance or D3.js SVG for current visualization

async function uploadFile() {
    const fileInput = document.getElementById('dataFile');
    const file = fileInput.files[0];

    if (!file) {
        alert('Please select a file first.');
        return;
    }

    const formData = new FormData();
    formData.append('dataFile', file);

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('File uploaded successfully:', result);

        // Now fetch the uploaded file's content for parsing
        const fileContentResponse = await fetch(`/uploads/${result.filename}`);
        const fileContent = await fileContentResponse.text();

        if (result.mimetype === 'text/csv') {
            rawData = d3.csvParse(fileContent);
        } else if (result.mimetype === 'application/json') {
            rawData = JSON.parse(fileContent);
        } else {
            alert('Unsupported file type.');
            return;
        }

        console.log('Parsed Data:', rawData);
        populateColumnSelectors();
        renderChart();

    } catch (error) {
        console.error('Error uploading or processing file:', error);
        alert('Error uploading or processing file.');
    }
}

function populateColumnSelectors() {
    const xColumnSelect = document.getElementById('xColumn');
    const yColumnSelect = document.getElementById('yColumn');

    // Clear previous options
    xColumnSelect.innerHTML = '';
    yColumnSelect.innerHTML = '';

    if (rawData.length > 0) {
        const columns = Object.keys(rawData[0]);
        columns.forEach(col => {
            const optionX = document.createElement('option');
            optionX.value = col;
            optionX.textContent = col;
            xColumnSelect.appendChild(optionX);

            const optionY = document.createElement('option');
            optionY.value = col;
            optionY.textContent = col;
            yColumnSelect.appendChild(optionY);
        });
        // Select first two columns by default if available
        if (columns.length >= 2) {
            xColumnSelect.value = columns[0];
            yColumnSelect.value = columns[1];
        } else if (columns.length === 1) {
            xColumnSelect.value = columns[0];
            yColumnSelect.value = columns[0]; // Or disable Y if only one column
        }
    }
}

function renderChart() {
    if (rawData.length === 0) {
        console.log('No data to render.');
        return;
    }

    const chartType = document.getElementById('chartType').value;
    const xColumn = document.getElementById('xColumn').value;
    const yColumn = document.getElementById('yColumn').value;

    // Clear previous charts
    document.getElementById('d3-chart').innerHTML = '';
    const canvas = document.getElementById('myChart');
    if (currentChart) {
        currentChart.destroy();
    }
    canvas.style.display = 'none';

    if (!xColumn || !yColumn) {
        console.warn("X or Y column not selected.");
        return;
    }

    if (chartType === 'bar') {
        renderBarChart(xColumn, yColumn);
    } else if (chartType === 'scatter') {
        renderScatterPlot(xColumn, yColumn);
    } else if (chartType === 'line') {
        renderLineChart(xColumn, yColumn);
    } else if (chartType === 'pie') {
        renderPieChart(xColumn, yColumn);
    } else if (chartType === 'groupedBar') {
        renderGroupedBarChart(xColumn); // Pass only xColumn for auto-grouping Ys
    }
    // Add more chart types here
}

function renderBarChart(xCol, yCol) {
    const canvas = document.getElementById('myChart');
    canvas.style.display = 'block';
    const ctx = canvas.getContext('2d');

    const labels = rawData.map(d => d[xCol]);
    const dataValues = rawData.map(d => parseFloat(d[yCol].replace('%', '')));

    currentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: `${yCol} by ${xCol}`,
                data: dataValues,
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    type: 'category',
                    title: { display: true, text: xCol }
                },
                y: {
                    beginAtZero: true,
                    title: { display: true, text: yCol }
                }
            }
        }
    });
}

function renderScatterPlot(xCol, yCol) {
    const svgContainer = d3.select("#d3-chart");
    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const width = 800 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    const svg = svgContainer.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Convert data to numbers
    const data = rawData.map(d => ({
        x: +d[xCol],
        y: +d[yCol]
    }));

    // Scales
    const xScale = d3.scaleLinear()
        .domain(d3.extent(data, d => d.x)).nice()
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain(d3.extent(data, d => d.y)).nice()
        .range([height, 0]);

    // Axes
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale))
      .append("text")
        .attr("y", margin.bottom - 10)
        .attr("x", width / 2)
        .attr("fill", "#000")
        .text(xCol);

    svg.append("g")
        .call(d3.axisLeft(yScale))
      .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 20)
        .attr("x", -height / 2)
        .attr("fill", "#000")
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text(yCol);

    // Circles
    svg.selectAll("circle")
        .data(data)
        .enter().append("circle")
        .attr("cx", d => xScale(d.x))
        .attr("cy", d => yScale(d.y))
        .attr("r", 5)
        .attr("fill", "steelblue")
        .attr("opacity", 0.7);
}

function renderLineChart(xCol, yCol) {
    const canvas = document.getElementById('myChart');
    canvas.style.display = 'block';
    const ctx = canvas.getContext('2d');

    const labels = rawData.map(d => d[xCol]);
    const dataValues = rawData.map(d => parseFloat(d[yCol].replace('%', '')));

    currentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `${yCol} over ${xCol}`,
                data: dataValues,
                borderColor: 'rgba(54, 162, 235, 1)',
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                fill: true,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    type: 'category',
                    title: { display: true, text: xCol }
                },
                y: {
                    beginAtZero: true,
                    title: { display: true, text: yCol }
                }
            }
        }
    });
}

function renderPieChart(xCol, yCol) {
    const canvas = document.getElementById('myChart');
    canvas.style.display = 'block';
    const ctx = canvas.getContext('2d');

    // For a pie chart, xCol usually represents categories and yCol represents values
    const labels = rawData.map(d => d[xCol]);
    const dataValues = rawData.map(d => parseFloat(d[yCol].replace('%', '')));

    // Generate distinct colors for each slice
    const backgroundColors = dataValues.map(() => {
        const r = Math.floor(Math.random() * 255);
        const g = Math.floor(Math.random() * 255);
        const b = Math.floor(Math.random() * 255);
        return `rgba(${r}, ${g}, ${b}, 0.7)`;
    });
    const borderColors = backgroundColors.map(color => color.replace('0.7', '1'));

    currentChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                label: yCol,
                data: dataValues,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: `${yCol} Distribution by ${xCol}`
                }
            }
        }
    });
}

function renderGroupedBarChart(xCol) {
    const canvas = document.getElementById('myChart');
    canvas.style.display = 'block';
    const ctx = canvas.getContext('2d');

    const labels = rawData.map(d => d[xCol]);
    const inpatientPhysicianData = rawData.map(d => parseFloat(d['Inpatient Physician'].replace('%', '')));
    const outpatientPhysicianData = rawData.map(d => parseFloat(d['Outpatient Physician'].replace('%', '')));

    currentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Inpatient Physician',
                    data: inpatientPhysicianData,
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Outpatient Physician',
                    data: outpatientPhysicianData,
                    backgroundColor: 'rgba(255, 159, 64, 0.6)',
                    borderColor: 'rgba(255, 159, 64, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    type: 'category',
                    title: { display: true, text: xCol }
                },
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Physician Data' }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: `Inpatient vs. Outpatient Physician by ${xCol}`
                }
            }
        }
    });
}

// Initial render if data is somehow pre-loaded (not expected for this app but good practice)
// document.addEventListener('DOMContentLoaded', () => {
//     if (rawData.length > 0) {
//         populateColumnSelectors();
//         renderChart();
//     }
// });
