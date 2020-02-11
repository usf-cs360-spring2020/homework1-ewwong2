let dataWrangling = function(data) {
  // Summing by region to calculate max
  let agg = new Map();
  let airlines = new Map();
  let regions = new Set();
  data.forEach(val => {
    regions.add(val['GEO Region']);
    if (!airlines.has(val['Operating Airline'])) {
      airlines.set(val['Operating Airline'], 0);
    }
    airlines.set(val['Operating Airline'], airlines.get(val['Operating Airline']) + val['Passenger Count']);
  });

  airlines = new Map([...airlines.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30));

  let series = new Map();
  data.forEach(val => {
   if (airlines.has(val['Operating Airline'])) {
     if (!series.has(val['Operating Airline'])) {
       let temp = {};
       temp.name = val['Operating Airline'];
       temp.total = airlines.get(val['Operating Airline']);
       series.set(val['Operating Airline'], temp);
     }
     series.get(val['Operating Airline'])[val['GEO Region']] = val['Passenger Count'];
   }
  });
  series.set('columns', [...regions]);

  let seriesArr = [...series.values()];
  seriesArr.slice(0, 1).forEach(d => {
    [...regions].forEach(r => {
      if (!d.hasOwnProperty(r)) {
        d[r] = 0;
      }
    });
  });

  d3Series = d3.stack()
    .keys([...regions])(seriesArr)
    .map(d => (d.forEach(v => v.key = d.key), d))
  d3Series.forEach(d => {
    d.forEach(d2 => {
      if (isNaN(d2[1])) {
        d2[1] = d2[0];
      }
    });
  });
  return [airlines, d3Series];
}

/* For many parts (particularly the d3.stack) was taken from the example:
 * https://observablehq.com/@d3/stacked-horizontal-bar-chart
 */
let drawBarChart = function(data) {
  let svg = d3.select("body").select("#bar-chart");

  console.assert(svg.size() == 1);

  let [airlines, series] = dataWrangling(data);
  console.log(series);

  let countMin = 0; // always include 0 in a bar chart!
  let countMax = d3.max(airlines.values());

  if (isNaN(countMax)) {
    countMax = 0;
  }

  console.log("count bounds:", [countMin, countMax]);

  /*
   * before we draw, we should decide what kind of margins we
   * want. this will be the space around the core plot area,
   * where the tick marks and axis labels will be placed
   * https://bl.ocks.org/mbostock/3019563
   */
  let margin = {
    top:    10,
    right:  20,
    bottom: 30, // leave space for x-axis
    left:   210 // leave space for y-axis
  };

  // now we can calculate how much space we have to plot
  let bounds = svg.node().getBoundingClientRect();
  let plotWidth = bounds.width - margin.right - margin.left;
  let plotHeight = bounds.height - margin.top - margin.bottom;

  /*
   * https://github.com/d3/d3-scale#api-reference
   */
  let amountScale = d3.scaleLinear()
    .domain([countMin, countMax])
    .range([0, plotWidth - margin.right])
    .nice()

  let airlineScale = d3.scaleBand()
    .domain([...airlines.keys()])
    .range([margin.top, plotHeight])
    .padding(0.08)

  let plot = svg.append("g").attr("id", "plot");

  // shift the plot area over by our margins to leave room
  // for the x- and y-axis
  plot.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  console.assert(plot.size() == 1);

  // now lets draw our x- and y-axis
  // these require our x (count) and y (airline) scales
  let xAxis = d3.axisBottom(amountScale);
  let yAxis = d3.axisLeft(airlineScale);

  let xGroup = plot.append("g").attr("id", "x-axis");
  xGroup.call(xAxis.tickFormat(d3.formatPrefix(".1", 1e6)));

  // notice it is at the top of our svg
  // we need to translate/shift it down to the bottom
  xGroup.attr("transform", "translate(0," + plotHeight + ")");

  // do the same for our y axix
  let yGroup = plot.append("g").attr("id", "y-axis");
  yGroup.call(yAxis);
  yGroup.attr("transform", "translate(0," + 0 + ")");

  let color = d3.scaleOrdinal()
    .domain(series.map(d => d.key))
    // .range(d3.schemeSpectral[series.length])
    .range(d3.schemeTableau10)
    .unknown("#ccc");

  let pairs = Array.from(series.values());
  console.log("pairs:", pairs);

  let bars = plot.selectAll("rect")
    .data(series);

  /*
   * okay, this is where things get weird. d3 uses an enter, update,
   * exit pattern for dealing with data. think of it as new data,
   * existing data, and old data. for the first time, everything is new!
   * https://bost.ocks.org/mike/selection/
   * https://bost.ocks.org/mike/join/
   */

  // we use the enter() selection to add new bars for new data
  formatValue = x => isNaN(x) ? "N/A" : x.toLocaleString("en")

  bars.enter().append("g")
    .selectAll("g")
    .data(series)
    .join("g")
    // Color by region
      .attr("fill", d => color(d.key))
    // Draw bars
    .selectAll("rect")
    .data(d => d)
    .join("rect")
      .attr("x", d => amountScale(d[0]))
      .attr("y", (d, i) => airlineScale(d.data.name))
      .attr("width", d => amountScale(d[1]) - amountScale(d[0]))
      .attr("height", airlineScale.bandwidth())
    // On hover text
    .append("title")
      .text(d => `${d.data.name} ${d.key}
  ${formatValue(d.data[d.key])}`);
};
