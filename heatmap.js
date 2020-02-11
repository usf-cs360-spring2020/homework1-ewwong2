let dataWrangling = function(data) {
  // Summing by region to calculate max
  let agg = new Map();
  let airlines = new Map();
  let boarding = new Set();
  data.forEach(val => {
    boarding.add(val['Boarding Area']);
    if (!airlines.has(val['Operating Airline'])) {
      airlines.set(val['Operating Airline'], 0);
    }
    airlines.set(val['Operating Airline'], airlines.get(val['Operating Airline']) + val['Passenger Count']);
  });

  airlines = new Map([...airlines.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20));

  data.filter(d => [...airlines.keys()].includes(d['Operating Airline']));
  return [airlines, boarding];
}

/* For many parts, the example followed was:
 * https://www.d3-graph-gallery.com/graph/heatmap_basic.html
 */
let drawBarChart = function(data) {
  let svg = d3.select("body").select("#bar-chart");

  console.assert(svg.size() == 1);

  let [airlines, boarding] = dataWrangling(data);

  let countMin = 0; // always include 0 in a bar chart!
  let countMax = d3.max(data.map(d => d['Passenger Count']));
  console.log(data.map(d => d['Passenger Count']));

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
  let boardArr = [...boarding];
  boardArr.sort();
  boardArr = boardArr.slice(1);
  console.log(boardArr);
  let x = d3.scaleBand()
    .domain(boardArr)
    .range([0, plotWidth - margin.right])
    .padding(0.08);

  let y = d3.scaleBand()
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
  let xAxis = d3.axisBottom(x);
  let yAxis = d3.axisLeft(y);

  let xGroup = plot.append("g").attr("id", "x-axis");
  xGroup.call(xAxis);

  // notice it is at the top of our svg
  // we need to translate/shift it down to the bottom
  xGroup.attr("transform", "translate(0," + plotHeight + ")");

  // do the same for our y axix
  let yGroup = plot.append("g").attr("id", "y-axis");
  yGroup.call(yAxis);
  yGroup.attr("transform", "translate(0," + 0 + ")");

  // Sequential color scale
  let color = d3.scaleSequential(d3.interpolateGnBu)
    .domain([countMin, countMax]);

  let bars = plot.selectAll("rect")
    .data(data);

  /*
   * okay, this is where things get weird. d3 uses an enter, update,
   * exit pattern for dealing with data. think of it as new data,
   * existing data, and old data. for the first time, everything is new!
   * https://bost.ocks.org/mike/selection/
   * https://bost.ocks.org/mike/join/
   */

  // we use the enter() selection to add new bars for new data
  let formatValue = x => isNaN(x) ? "N/A" : x.toLocaleString("en");

  bars.enter().append("rect")
    .attr("class", "bar")
    .attr("x", d => x(d['Boarding Area']))
    .attr("y", d => {
      let val = y(d['Operating Airline']) - margin.top;
      if (isNaN(val)) {
        return -plotHeight;
      } else {
        return val;
      }
    })
    .attr("rx", 2)
    .attr("ry", 2)
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("fill", d => color(d['Passenger Count']))
    .append("title")
        .text(d => `${d['Operating Airline']}
        Boaring Area: ${d['Boarding Area']}
        Passenger Count: ${formatValue(d['Passenger Count'])}`)
    .each(function(d, i, nodes) {
      // console.log(`Added bar for: ${d['Operating Airline']}`);
    });
};
