<template>
  <div class="relative h-64 md:h-80 bg-bg-muted/50 rounded-lg p-2">
    <Line v-if="chartData && chartOptions" :data="chartData" :options="chartOptions" />
    <div v-else-if="!historyData || Object.keys(historyData).length === 0" class="absolute inset-0 flex items-center justify-center">
      <p class="text-sm text-fg-muted">No history data available.</p>
    </div>
     <!-- Consider adding a loading/error state specifically for the chart if needed,
          although the parent component will likely handle the main loading/error -->
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale, // Import TimeScale
  TimeSeriesScale // Import TimeSeriesScale if using time series specifically
} from 'chart.js';
import {
  Line
} from 'vue-chartjs';
import 'chartjs-adapter-date-fns'; // Import the date adapter

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale, // Register TimeScale
  TimeSeriesScale
);

const props = defineProps({
  historyData: { // Expects format: { "OutcomeName": [{t: unix_ts_seconds, p: probability_0_to_1}, ...] }
    type: Object,
    required: true,
    default: () => ({})
  },
});

// Predefined color palette for lines (using HSL/Hex from main.css)
const lineColors = [
  'hsl(22, 70%, 50%)', // --primary-500
  'hsl(22, 60%, 30%)', // --primary-700 
  '#502978',         // --secondary
  'hsl(22, 100%, 70%)',// --primary-300
  'hsl(22, 65%, 40%)', // --primary-600
  'hsl(22, 80%, 60%)', // --primary-400
];

const chartData = computed(() => {
  if (!props.historyData || typeof props.historyData !== 'object' || Object.keys(props.historyData).length === 0) {
    return null;
  }

  const datasets = [];
  let colorIndex = 0;

  for (const outcome in props.historyData) {
    if (Array.isArray(props.historyData[outcome]) && props.historyData[outcome].length > 0) {
        const dataPoints = props.historyData[outcome].map(point => ({
          x: new Date(point.t), // API already provides timestamp in milliseconds
          y: point.y * 100     // API provides probability as 'y' (0-1), convert to percentage
        }));
        
        // Sort data points by time just in case API doesn't guarantee order
        dataPoints.sort((a, b) => a.x - b.x);

        datasets.push({
          label: outcome,
          data: dataPoints,
          borderColor: lineColors[colorIndex % lineColors.length],
          backgroundColor: lineColors[colorIndex % lineColors.length] + '33', // Add some transparency for area fill if needed
          tension: .2, // Smoother line
          pointRadius: 0, // Hide points
          pointHoverRadius: 4, // Keep hover radius for interactivity
          borderWidth: 3, // Thicker line
        });
        colorIndex++;
    } else {
        console.warn(`[HistoryChart] Empty or invalid history array for outcome: ${outcome}`);
    }
  }
  
  if (datasets.length === 0) {
     return null; // No valid datasets could be created
  }

  return {
    // Labels are not needed when using time scale and providing {x, y} data
    // labels: [], 
    datasets: datasets,
  };
});

const chartOptions = computed(() => {
  if (!chartData.value) {
    return null;
  }
  const showLegend = chartData.value.datasets.length > 1;
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: showLegend, // Conditionally display legend
        position: 'top',
        labels: {
             color: '#9ca3af', // gray-400, adjust for dark mode if needed
             boxWidth: 12,
             padding: 15,
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
            // Format the tooltip title (timestamp)
            title: function(tooltipItems) {
                if (tooltipItems.length > 0) {
                     const date = new Date(tooltipItems[0].parsed.x);
                     return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
                }
                return '';
            },
             // Format the tooltip label (value)
            label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                    label += ': ';
                }
                if (context.parsed.y !== null) {
                     label += context.parsed.y.toFixed(1) + '%'; // Format to 1 decimal place
                }
                return label;
            }
        }
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
            // Adjust time units and display formats as needed
            tooltipFormat: 'PP', // Requires date-fns adapter - locale aware format
             displayFormats: {
                 hour: 'HH:mm',
                 day: 'MMM d',
                 week: 'MMM d yyyy',
                 month: 'MMM yyyy',
                 year: 'yyyy'
             }
        },
        title: {
            display: false, // Keep it clean, maybe add later
            // text: 'Date'
        },
        grid: {
             color: 'rgba(128, 128, 128, 0.1)', // Lighter grid lines
        },
        ticks: {
             color: '#9ca3af', // Tick label color
             maxRotation: 0,
             autoSkip: true,
             maxTicksLimit: 7 // Limit number of ticks shown
        }
      },
      y: {
        beginAtZero: true,
        max: 100,
        title: {
            display: false,
            // text: 'Probability (%)'
        },
        grid: {
             color: 'rgba(128, 128, 128, 0.1)', // Lighter grid lines
        },
         ticks: {
             color: '#9ca3af', // Tick label color
             // Format ticks as percentages
             callback: function(value) {
                 return value + '%';
             }
        }
      }
    }
  };
});

</script>

<style scoped>
/* Add any specific styles if needed */
</style> 