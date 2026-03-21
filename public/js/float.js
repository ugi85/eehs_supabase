function labelFormatter(label, series) {
  return (
    '<div style="font-size:13px; text-align:center; padding:2px; color: #fff; font-weight:600;">' +
    label + '<br>' + Math.round(series.percent) + '%</div>'
  );
}

$(function () {
  // === INTERACTIVE CHART ===
  if ($('#interactive').length) {
    let data = [];
    const totalPoints = 100;

    function getRandomData() {
      if (data.length > 0) data = data.slice(1);
      while (data.length < totalPoints) {
        let prev = data.length > 0 ? data[data.length - 1] : 50;
        let y = prev + Math.random() * 10 - 5;
        y = Math.max(0, Math.min(100, y));
        data.push(y);
      }
      return data.map((y, i) => [i, y]);
    }

    const interactive_plot = $.plot('#interactive', [{ data: getRandomData() }], {
      grid: {
        borderColor: '#f3f3f3',
        borderWidth: 1,
        tickColor: '#f3f3f3'
      },
      series: {
        color: '#3c8dbc',
        lines: { lineWidth: 2, show: true, fill: true }
      },
      yaxis: { min: 0, max: 100, show: true },
      xaxis: { show: true }
    });

    let realtime = 'on';
    const updateInterval = 500;

    function update() {
      interactive_plot.setData([getRandomData()]);
      interactive_plot.draw();
      if (realtime === 'on') setTimeout(update, updateInterval);
    }

    if (realtime === 'on') update();

    $('#realtime .btn').click(function () {
      realtime = $(this).data('toggle') === 'on' ? 'on' : 'off';
      update();
    });
  }

  // === LINE CHART ===
  if ($('#line-chart').length) {
    const sin = [], cos = [];
    for (let i = 0; i < 14; i += 0.5) {
      sin.push([i, Math.sin(i)]);
      cos.push([i, Math.cos(i)]);
    }

    const line_data1 = { data: sin, color: '#3c8dbc', label: 'Sin' };
    const line_data2 = { data: cos, color: '#00c0ef', label: 'Cos' };

    $.plot('#line-chart', [line_data1, line_data2], {
      grid: {
        hoverable: true,
        borderColor: '#f3f3f3',
        borderWidth: 1,
        tickColor: '#f3f3f3'
      },
      series: {
        shadowSize: 0,
        lines: { show: true },
        points: { show: true }
      },
      yaxis: { show: true },
      xaxis: { show: true }
    });

    $('<div class="tooltip-inner" id="line-chart-tooltip"></div>').css({
      position: 'absolute',
      display: 'none',
      opacity: 0.8
    }).appendTo('body');

    $('#line-chart').bind('plothover', function (event, pos, item) {
      if (item) {
        const x = item.datapoint[0].toFixed(2);
        const y = item.datapoint[1].toFixed(2);
        $('#line-chart-tooltip')
          .html(`${item.series.label} of ${x} = ${y}`)
          .css({ top: item.pageY + 5, left: item.pageX + 5 })
          .fadeIn(200);
      } else {
        $('#line-chart-tooltip').hide();
      }
    });
  }

  // === AREA CHART ===
  if ($('#area-chart').length) {
    const areaData = [
      [2, 88.0], [3, 93.3], [4, 102.0], [5, 108.5], [6, 115.7],
      [7, 115.6], [8, 124.6], [9, 130.3], [10, 134.3], [11, 141.4],
      [12, 146.5], [13, 151.7], [14, 159.9], [15, 165.4], [16, 167.8],
      [17, 168.7], [18, 169.5], [19, 168.0]
    ];

    $.plot('#area-chart', [areaData], {
      grid: { borderWidth: 0 },
      series: {
        shadowSize: 0,
        color: '#00c0ef',
        lines: { fill: true }
      },
      yaxis: { show: false },
      xaxis: { show: false }
    });
  }

  // === BAR CHART ===
  if ($('#bar-chart').length) {
    const bar_data = {
      data: [[1, 10], [2, 8], [3, 4], [4, 13], [5, 17], [6, 9]],
      bars: { show: true }
    };

    $.plot('#bar-chart', [bar_data], {
      grid: {
        borderWidth: 1,
        borderColor: '#f3f3f3',
        tickColor: '#f3f3f3'
      },
      series: {
        bars: { show: true, barWidth: 0.5, align: 'center' }
      },
      colors: ['#3c8dbc'],
      xaxis: {
        ticks: [
          [1, 'January'], [2, 'February'], [3, 'March'],
          [4, 'April'], [5, 'May'], [6, 'June']
        ]
      }
    });
  }

  // === DONUT CHART ===
  if ($('#donut-chart').length) {
    const donutData = [
      { label: 'Series2', data: 30, color: '#3c8dbc' },
      { label: 'Series3', data: 20, color: '#0073b7' },
      { label: 'Series4', data: 50, color: '#00c0ef' }
    ];

    $.plot('#donut-chart', donutData, {
      series: {
        pie: {
          show: true,
          radius: 1,
          innerRadius: 0.5,
          label: {
            show: true,
            radius: 2 / 3,
            formatter: labelFormatter,
            threshold: 0.1
          }
        }
      },
      legend: { show: false }
    });
  }
});
