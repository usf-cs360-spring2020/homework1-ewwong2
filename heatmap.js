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

  return [airlines, boarding];
}

/* For many parts, the example followed was:
 * https://www.d3-graph-gallery.com/graph/heatmap_basic.html
 */
let drawHeatMap = function(data) {
  let svg = d3.select("body").select("#heatmap");

  console.assert(svg.size() == 1);

  let [airlines, boarding] = dataWrangling(data);
  data = data.filter(d => [...airlines.keys()].includes(d['Operating Airline']));

  let countMin = 0; // always include 0 in a bar chart!
  let countMax = d3.max(data.map(d => d['Passenger Count']));

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
    top:    25,
    right:  40,
    bottom: 50, // leave space for x-axis
    left:   230 // leave space for y-axis
  };

  // now we can calculate how much space we have to plot
  let bounds = svg.node().getBoundingClientRect();
  let plotWidth = bounds.width - margin.right - margin.left;
  let plotHeight = bounds.height - margin.top - margin.bottom;

  // Chart title from:
  //    http://www.d3noob.org/2013/01/adding-title-to-your-d3js-graph.html
  svg.append("g").append("text")
        .attr("x", (plotWidth / 2) + margin.left)
        .attr("y", margin.top)
        .attr("text-anchor", "middle")
        .style("font-size", "24px")
        .text("Passenger Count Density per Airline");

  /*
   * https://github.com/d3/d3-scale#api-reference
   */
  let boardArr = [...boarding];
  boardArr.sort();
  boardArr = boardArr.slice(1);

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
  // Axis labels were create by following this example:
  //    https://bl.ocks.org/d3noob/23e42c8f67210ac6c678db2cd07a747e
  let xAxis = d3.axisBottom(x);
  let yAxis = d3.axisLeft(y);

  let xGroup = plot.append("g").attr("id", "x-axis");
  xGroup.call(xAxis);
  // text label for the x axis
  plot.append("text")
      .attr("transform",
            `translate(${(plotWidth/2)} ,${(plotHeight + margin.top + 15)})`)
      .style("text-anchor", "middle")
      .text("Boarding Area");

  // notice it is at the top of our svg
  // we need to translate/shift it down to the bottom
  xGroup.attr("transform", "translate(0," + plotHeight + ")");

  // do the same for our y axix
  let yGroup = plot.append("g").attr("id", "y-axis");
  yGroup.call(yAxis);
  // text label for the y axis
  plot.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left + 10)
      .attr("x", 0 - (plotHeight / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .text("Operating Airline");
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
    .attr("y", d => y(d['Operating Airline']))
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

  svg.append("text")
    .attr("x", plotWidth + margin.left - 85)
    .attr("y", margin.top + 30)
    .text("Passenger Count");

  let legendScale = d3.scaleLinear()
    .domain(color.domain().reverse())
    .range([margin.top, plotHeight - margin.bottom])

  let legendAxis = g => g
    .attr("class", `x-axis`)
    .attr("transform", `translate(${plotWidth + margin.left - margin.right + 10}, ${margin.top + 15})`)
    .attr("height", plotHeight- margin.bottom - margin.top)
    .call(d3.axisRight(legendScale)
      .ticks(plotHeight / 70)
      .tickSize(-20));

  let defs = svg.append("defs");
  let linearGradient = defs.append("linearGradient")
      .attr("id", "linear-gradient")
      .attr("gradientTransform", "rotate(90)");

  linearGradient.selectAll("stop")
    .data(color.ticks().map((t, i, n) => ({ offset: `${100*i/n.length}%`, color: color(countMax - t) })))
    .enter().append("stop")
    .attr("offset", d => d.offset)
    .attr("stop-color", d => d.color);

  svg.append('g')
    .attr("transform", `translate(${plotWidth - margin.right - 10}, 65)`)
    .append("rect")
    .attr('transform', `translate(${margin.left}, 0)`)
	.attr("height", plotHeight- margin.bottom - margin.top)
	.attr("width", 20)
	.style("fill", "url(#linear-gradient)");

  svg.append('g')
    .call(legendAxis);

};
