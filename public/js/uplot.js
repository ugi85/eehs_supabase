$(function () {
  /**
   * uPlot Charts
   * ------------
   * Area & Line Chart using uPlot
   */

  function getSize(elementId) {
    const el = document.getElementById(elementId)
    return {
      width: el.offsetWidth || 600,
      height: el.offsetHeight || 300
    }
  }

  const data = [
    [0, 1, 2, 3, 4, 5, 6],           // x-axis (labels)
    [28, 48, 40, 19, 86, 27, 90],    // dataset 1
    [65, 59, 80, 81, 56, 55, 40]     // dataset 2
  ]

  // AREA CHART
  const optsAreaChart = {
    ...getSize('areaChart'),
    scales: {
      x: { time: false },
      y: { range: [0, 100] }
    },
    series: [
      {}, // x-axis
      {
        label: 'Digital Goods',
        stroke: 'rgba(60,141,188,1)',
        fill: 'rgba(60,141,188,0.7)'
      },
      {
        label: 'Electronics',
        stroke: '#c1c7d1',
        fill: 'rgba(210, 214, 222, .7)'
      }
    ]
  }

  const areaChartEl = document.getElementById('areaChart')
  if (areaChartEl) {
    var areaChart = new uPlot(optsAreaChart, data, areaChartEl)
  }

  // LINE CHART
  const optsLineChart = {
    ...getSize('lineChart'),
    scales: {
      x: { time: false },
      y: { range: [0, 100] }
    },
    series: [
      {},
      {
        label: 'Digital Goods',
        stroke: 'rgba(60,141,188,1)',
        width: 3,
        fill: 'transparent'
      },
      {
        label: 'Electronics',
        stroke: '#c1c7d1',
        width: 3,
        fill: 'transparent'
      }
    ]
  }

  const lineChartEl = document.getElementById('lineChart')
  if (lineChartEl) {
    var lineChart = new uPlot(optsLineChart, data, lineChartEl)
  }

  // RESPONSIVE
  window.addEventListener('resize', () => {
    if (areaChart && areaChartEl) {
      areaChart.setSize(getSize('areaChart'))
    }
    if (lineChart && lineChartEl) {
      lineChart.setSize(getSize('lineChart'))
    }
  })
})
