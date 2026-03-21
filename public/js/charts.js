$(function () {
  // Area Chart
  const areaChartCanvas = $('#areaChart').get(0)?.getContext('2d');
  if (areaChartCanvas) {
    const areaChartData = {
      labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
      datasets: [
        {
          label: 'Digital Goods',
          backgroundColor: 'rgba(60,141,188,0.9)',
          borderColor: 'rgba(60,141,188,0.8)',
          pointRadius: false,
          pointColor: '#3b8bba',
          pointStrokeColor: 'rgba(60,141,188,1)',
          pointHighlightFill: '#fff',
          pointHighlightStroke: 'rgba(60,141,188,1)',
          data: [28, 48, 40, 19, 86, 27, 90]
        },
        {
          label: 'Electronics',
          backgroundColor: 'rgba(210, 214, 222, 1)',
          borderColor: 'rgba(210, 214, 222, 1)',
          pointRadius: false,
          pointColor: 'rgba(210, 214, 222, 1)',
          pointStrokeColor: '#c1c7d1',
          pointHighlightFill: '#fff',
          pointHighlightStroke: 'rgba(220,220,220,1)',
          data: [65, 59, 80, 81, 56, 55, 40]
        }
      ]
    };

    const areaChartOptions = {
      maintainAspectRatio: false,
      responsive: true,
      legend: { display: false },
      scales: {
        xAxes: [{ gridLines: { display: false } }],
        yAxes: [{ gridLines: { display: false } }]
      }
    };

    new Chart(areaChartCanvas, {
      type: 'line',
      data: areaChartData,
      options: areaChartOptions
    });

    // Line Chart
    const lineChartCanvas = $('#lineChart').get(0)?.getContext('2d');
    if (lineChartCanvas) {
      const lineChartData = $.extend(true, {}, areaChartData);
      const lineChartOptions = $.extend(true, {}, areaChartOptions);
      lineChartData.datasets.forEach(ds => ds.fill = false);
      lineChartOptions.datasetFill = false;

      new Chart(lineChartCanvas, {
        type: 'line',
        data: lineChartData,
        options: lineChartOptions
      });
    }

    // Donut Chart
    const donutChartCanvas = $('#donutChart').get(0)?.getContext('2d');
    if (donutChartCanvas) {
      const donutData = {
        labels: ['Chrome', 'IE', 'FireFox', 'Safari', 'Opera', 'Navigator'],
        datasets: [{
          data: [700, 500, 400, 600, 300, 100],
          backgroundColor: ['#f56954', '#00a65a', '#f39c12', '#00c0ef', '#3c8dbc', '#d2d6de']
        }]
      };
      const donutOptions = {
        maintainAspectRatio: false,
        responsive: true
      };

      new Chart(donutChartCanvas, {
        type: 'doughnut',
        data: donutData,
        options: donutOptions
      });

      // Pie Chart (pakai data yang sama dengan donut)
      const pieChartCanvas = $('#pieChart').get(0)?.getContext('2d');
      if (pieChartCanvas) {
        new Chart(pieChartCanvas, {
          type: 'pie',
          data: donutData,
          options: donutOptions
        });
      }
    }

    // Bar Chart
    const barChartCanvas = $('#barChart').get(0)?.getContext('2d');
    if (barChartCanvas) {
      const barChartData = $.extend(true, {}, areaChartData);
      [barChartData.datasets[0], barChartData.datasets[1]] = [areaChartData.datasets[1], areaChartData.datasets[0]];

      const barChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        datasetFill: false
      };

      new Chart(barChartCanvas, {
        type: 'bar',
        data: barChartData,
        options: barChartOptions
      });

      // Stacked Bar Chart
      const stackedBarChartCanvas = $('#stackedBarChart').get(0)?.getContext('2d');
      if (stackedBarChartCanvas) {
        const stackedBarChartOptions = {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            xAxes: [{ stacked: true }],
            yAxes: [{ stacked: true }]
          }
        };

        new Chart(stackedBarChartCanvas, {
          type: 'bar',
          data: barChartData,
          options: stackedBarChartOptions
        });
      }
    }
  }
});
