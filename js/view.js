var MapView = Backbone.View.extend({

	el: '#map-panel-container',

	initialize: function(options) {
		this.renderMap();
		$('#informationPanel').html(this.model.get("infoPanelDefault"));
	},

	events: {
		'click #changeNetwork' : "changeNetwork",
		'click #returnLevel' : "moveUpALevel",
		"click #controlCities" : "showHideCities",
		"change #controlCitiesSize" : "showHideCitiesBySize",
	},

	//----------------------------------------------------------------------------------------------------
	// RENDERS THE MAP ON FIRST LOAD
	//-----------------------------------------------------------------------------------------------------

	renderMap: function() {
		var that = this;

		
		var testCities = ["Lyon","Marseille","Nantes","Nancy","Toulouse"];
		

		var svg = d3.json("./geoJson/FRA_adm2.json", function(json) {
		//d3.csv("./geoJson/FRA_adm4.csv", function(data) {
	  	//d3.json("./geoJson/FRA_adm4.json", function(json2){

			var regions = topojson.feature(json, json.objects.FRA_adm2);
			/*var cities = topojson.feature(json2, json2.objects.FRA_adm4);
			cities.features = cities.features.filter(function(e,i){
				e.properties.flagCity = true;
				e.properties.name = data[i].NAME_3;
	  			return testCities.indexOf(data[i].NAME_3) !== -1 && data[i].NAME_4.search(data[i].NAME_3) !== -1;
	  		})
	  		console.log(cities)
			cities.features.forEach(function(el){
				regions.features.push(el);
			})*/

			svg = d3.select("#map")
				.append("svg")
				.attr("width", that.model.get("width"))
				.attr("height", that.model.get("height"))
				.attr("id",'franceMap')
				.append("g")
			    .attr("id","zoomgroup")
			    .attr("width",that.model.get("width"))
			    .attr("height",that.model.get("height"))

			var projection = d3.geo.mercator()
				.center(that.model.get("defaultCenter"))
				.scale(that.model.get("defaultScale"));
			var path = d3.geo.path().projection(projection);


			svg.selectAll("path")
			.data(regions.features)
				.enter()
				.append('path')
				.attr("d", path)
				.style("stroke-width", "0.5px")
				.attr("class","stroke-path")
				.style("fill",function(d,i){
					//return " #5bc0de";
					return d.properties.flagCity ? "white" : " #5bc0de";
				})
				.style("stroke", function(d,i){
					//return "#f9f9f9";
					return d.properties.flagCity ? "#cccccc" : " #f9f9f9";
				})

			that.drawRegions(true);
		//});
		//});
		});
	},

	//----------------------------------------------------------------------------------------------------
	// FUNCTION TO ADD CITIES TO THE MAP
	// Sends a bounding box to get a list of cities in that box and places squares and indented labels
	//-----------------------------------------------------------------------------------------------------

	addCities:function(currentScale){
		var that = this;
		var cities = this.model.getCities();

		var svg = d3.select($("#zoomgroup")[0]);
		var projection = d3.geo.mercator()
			.center(this.model.get("defaultCenter"))
			.scale(this.model.get("defaultScale"));
		var path = d3.geo.path().projection(projection);

		svg.selectAll(".city-label")
			.data(cities).enter()
			.append("rect")
			.attr("x", function (d) {
				var x = projection([d.lon,d.lat])[0];
				d.x = x;
				return x;
			})
			.attr("y", function (d) {
				var y = projection([d.lon,d.lat])[1];
				d.y = y;
				return y;
			})
			.attr("height",8/currentScale)
			.attr("width", 8/currentScale)
			.attr("fill", "white")
			.attr("class", "city-label")
			.attr("stroke", "black")
			.attr("stroke-width",function(){ return 2/currentScale })
			.attr("opacity",function(d){
				var popLimit = parseInt(d.pop) > that.model.get("citiesVisibleLimit");
				var labelO = that.model.get("citiesVisible") === true && popLimit === true ? 1 : 0;
				return labelO;
			})
			.on("click",function(d){
				if (that.model.get("level") === 2 && that.model.get("citiesWithGroupedUgas").indexOf(d.name) !== -1){
					console.log(that.model.get("cityUgaGroups")[d.name]);
				}
			})

		svg.selectAll(".city-text")
			.data(cities).enter()
			.append("text")
			.attr("class", "city-text")
			.attr("font-size",12/currentScale)
			.attr("transform", function(d,i) {				var target = projection([d.lon,d.lat]);
				return "translate(" + (target[0] + (12/currentScale)) + "," + (target[1] + (8/currentScale)) + ")"; // Square pixels. Width add 1.5
			})
			.attr("opacity",function(d){
				var popLimit = parseInt(d.pop) > that.model.get("citiesVisibleLimit");
				var textO = that.model.get("citiesVisible") === true && popLimit === true ? 1 : 0;
				return textO;
			})
			.text(function(d,i) {return d.name});

		this.model.set("currentCities",cities);
	},


	//----------------------------------------------------------------------------------------------------
	// DRAW A REGION/SECTOR/UGA SET
	// Removes all previous elements and gets the data for the current level we are aut
	// Appends circles and labels for the current level, and adds click events to the circles for drilling
	// The chooses a type of graph to append to the labels
	//-----------------------------------------------------------------------------------------------------

		drawRegions:function(initialLoad) {
		var that = this;
		var svg = d3.select($("#zoomgroup")[0]);
		var projection = d3.geo.mercator()
			.center(that.model.get("defaultCenter"))
			.scale(that.model.get("defaultScale"));
		var path = d3.geo.path().projection(projection);

		var dataArray = that.model.getData();

		
		if (!initialLoad) {
			this.removeElementsOnChange(svg);
			this.zoomToBoundingBox(svg,projection,dataArray)
		};

		var delay = 750;
		if (initialLoad) delay = 0;

		window.setTimeout(function(){

			var currentScale = (svg.attr('transform') && that.model.get("level") !== 0) ? svg.attr('transform').split(",")[3].replace(")","") : 1;
			that.addCities(currentScale);
			var cities = that.model.get("currentCities");
 			

			var drag = d3.behavior.drag()
				.on("drag", dragMove)
				.on("dragend", recordNewPosition);

			function dragMove(d) {
				d[0] = d3.event.x, d[1] = d3.event.y;
				d3.select(this).attr("transform", "translate(" + d[0] + "," + d[1] + ")");
				var baseProj = projection.invert([0,0]);
				var pointProj = projection.invert([d[0],d[1]]);
				var movement = [pointProj[0] - baseProj[0], pointProj[1] - baseProj[1]];
				var newLatLon = that.model.set("currentDragEventLatLon",[d.lon + movement[0], (d.lat + movement[1])]);
			}

			function recordNewPosition(d) {
				that.model.setNewLatLonForPoint(d);
			}


		 	var tip = d3.tip()
			  .attr('class', 'd3-tip')
			  .offset(function(d){
			  	var elementRef = d.name;
			  	var elementObject = d3.selectAll('.area-element').filter(function(d){return d.name === elementRef});
			  	return that.model.calculateTooltipPosition(projection,elementObject.node().getBBox(),d,150);
			  })
			  .html(function(d) {
			  	that.appendPieChartInToolTip(150,d);
			  	var toolTipSvg = d3.select('#tooltipGenerator').html();
			  	$('#tooltipGenerator').html('');
			    return toolTipSvg;
			 })

			var arc = d3.svg.arc().innerRadius(0).outerRadius(10/currentScale);
	      	var pie = d3.layout.pie().value(function(d){ return d });

	      	var areas = svg.selectAll('g')
	      		.data(dataArray)
				.enter()
				.append('g')
				.attr('class', 'area-element')
				.attr("transform", function(d) {
					return "translate(" + (projection([d.lon, d.lat])[0]) + "," + (projection([d.lon, d.lat])[1]) + ")";
				})
				.on('mouseleave', function(d){
					//tip.hide();
				}) 

			var pies = svg.selectAll('g.area-element')
				.append('g')
				.attr('class', 'area-pie')
				.attr('stroke','#000')
				.attr('stroke-width',function(d){
					return (1.3/currentScale) + "px";
				})
				.call(drag)
				.call(tip)
				.on("click",function(d,i){
					if (that.model.get("level") < that.model.get("deepestLevel") && !d.corsicaFlag) {
						if (d3.event.defaultPrevented) return;
						tip.hide();
						that.model.increaseLevel(d);
						that.drawRegions()
						$('#graphs').show();
						$('#segmentationLegend').hide();
					};
				})
				.on('mouseenter', function(d){
					$('#graphs').hide();
					$('#informationPanel').html('');
					that.appendBarChartInToolTip($('#informationPanel').width(),d);
					tip.show(d);
					// Tooltip specific events
					d3.selectAll("g.slice").on('mouseover', function(d,i) {
		                d3.select('.tip-pie-hover-label').text(that.model.get("tooltipData")[i].label);
		                d3.select('.tip-pie-hover-value').text(that.model.get("tooltipData")[i].value);
		            })
		            .on('mouseleave', function(){
		            	d3.select('.tip-pie-hover-label').text(that.model.get("tooltipData")[that.model.get("tooltipData").length - 1].region);
		                d3.select('.tip-pie-hover-value').text(that.model.get("tooltipData")[that.model.get("tooltipData").length - 1].visits + " %");
		            });
				})
			

			var colors = that.model.get("pieColors");

			pies.selectAll('.slice')
				.data(function(d){
					return pie([d.visits,d.nonVisits]);
				})
				.enter()
				.append('path')
				.attr('d',  arc)
				.attr("class", function(d,i) {return d.name})
				.style('fill', function(d,i){
					return colors[i];
				})


			pies.append("text")
				.data(dataArray)          
		        .attr("x", 0)
		        .attr("y", 25/currentScale)
		        .attr("text-anchor", "middle")
		        .style("font-size", function(d,i){
		        	return 16/currentScale + "px";
		        })
		        .text(function(d,i){
		        	return d.name;
		        })
		        .attr("class","region-text")


			that.model.set("currentRegions",dataArray);

			that.createview();
			// Testing clashes. Can log out the clashing elements
			var clashes = that.model.testAreaBoundingBoxesForCollisions('.area-element',projection);

		},delay);

	},



	//----------------------------------------------------------------------------------------------------
	// FUNCTIONS TO APPEND CHARTS TO TOOLTIPS ABOVE GRAPHICS
	//-----------------------------------------------------------------------------------------------------

	appendBarChartInToolTip:function(size,dataForRegion){

		// RANDOM DATA PARSING
		// NEEDS TO COME OUT IN THE CORRECT FORMAT {name, label,value}
		var data = [];
		var products = ["creon","tarka","lamaline","dymista","ceris"];
		products.sort(function() {
		  return .5 - Math.random();
		});
		var dynamicNumber = Math.floor(Math.random() * 3) + 3;
		for (var i=0; i < dynamicNumber; i++) {
			data.push({name:products[i], value:dataForRegion[products[i]], label: products[i].toUpperCase().substr(0,5)});
		}

		// Define colours and margin and minimum and maximum values
		var colors = this.model.get("barColors");
		var margin = 50;
		var dataMin = d3.min(data, function(d) {return d.value; });
		var dataMax = d3.max(data, function(d) {return d.value; });

		// Scales and axis formats
		var x = d3.scale.ordinal().rangeRoundBands([0, size-(margin * 0.4)], .05);
		var y = d3.scale.linear().range([size, 0]);

		var xAxis = d3.svg.axis()
		    .scale(x)
		    .orient("bottom")

		var yAxis = d3.svg.axis()
		    .scale(y)
		    .orient("left")
		    .ticks(5)

		// Main SVG Element
		var svg = d3.select("#informationPanel").append("svg")
		    .attr("width", size)
		    .attr("height", size)
		  	.append("g")
		    .attr("transform","translate("+margin/2+",-"+margin/2+")");

		// Definition of minimums and maximums. Absolute min and max are 90 and 100
		  x.domain(data.map(function(d) { return d.label; }));
		  y.domain([
			(dataMin >= 100) ? 90 : dataMin * 0.9, 
			(dataMax <= 100) ? 110 : dataMax * 1.1,
		  ]);

		  // x axis and labels
		  svg.append("g")
		      .attr("class", "x axis")
		      .attr("transform", "translate(0," + (size + 1) + ")")
		      .call(xAxis)
		    .selectAll("text")
		      .style("text-anchor", "middle")
		      .attr("dx","-0.5em")

		 // y axis and labels
		  svg.append("g")
		      .attr("class", "y axis")
		      .call(yAxis)
		    .append("text")
		      .attr("transform", "rotate(-90)")
		      .attr("y", 6)
		      .attr("dx","1em")
		      .attr("dy", ".71em")
		      .style("text-anchor", "middle")


		  // LINE POINTS
		 	var linePoints = [];
			for (var i = Math.ceil(dataMin / 20) * 20; i <= dataMax + 20; i = i + 20) {
				linePoints.push(i);
			} 
			linePoints.forEach(function(line){
				svg.append("line")
					.attr("x1", 0)
		            .attr("y1", y(line))
		            .attr("x2", size)
		            .attr("y2", y(line))
		            .attr("stroke-width", function(d,i){
		            	return line === 100 ? 2 : 2;
		            })
		            .attr("stroke", function(d,i){
		            	return line === 100 ? "#d9534f" : "#A8A8A8";
		            })
			})

	     // BARS
		  var bars = svg.selectAll("bar")
		      .data(data)
		      .enter().append("rect")
		      .style("fill", function(d,i){
		      	return colors[i];
		      })
		      .attr("x", function(d) { return x(d.label); })
		      .attr("width", x.rangeBand() - margin/data.length)
		      .attr("height",0)
		      .attr("y",size)
		      .transition()
			  .duration(400)
			  .delay(function (d, i) {
					return (i === 0) ? 400 : 400/(i+1);
				})
			  .attr("height", function(d) { return size - y(d.value); })
		      .attr("y", function(d) { return y(d.value); })

		  // LABELS
		  var labels = svg.selectAll("label")
		  	  .data(data)
		      .enter().append("text")
		      .text(function(d,i){
		      	return d.value + "%";
		      })
		      .attr("class","bar-label")
		      .attr("x", function(d) { 
		      	return d.value > 99 ? x(d.label) : x(d.label) + 5; 
		      })
		      .attr("y", function(d) { 
		      	return d.value  <= dataMin ? y(d.value) - 5 : y(d.value) + 14;
		      })
		      .attr("opacity",0)
		      .attr("fill", function(d,i){
		      	return d.value <= dataMin ? "#333333" : "#f9f9f9";
		      })
		      .attr("font-size",function(d){
		      	return 50 / data.length;
		      })
		      .transition()
			  .duration(400)
			  .delay(400)
			  .attr("opacity",1)

			// CSS MODS - hide the tick marks, and change the 100 marker for a bold red marker
			$('.tick line').hide();
			$('.y text').filter(function(i,e){
				return e.innerHTML === "100"
			}).css({
				"fill": "#d9534f", "color": "#d9534f", "font-weight" : "700"
			})


	},



		appendPieChartInToolTip:function(size,d){
		var region = d.name;
		var visits = d.visits;
		var data = [];

		this.model.get("pieLegendSegmentation").forEach(function(seg){
			if (seg.measure !== "autres") {
				data.push({
					label: seg.label,
					value: d[seg.measure],
					legendLabel: seg.measure,
				})
			}
		});

		/* Adding orders and sorting data */
		var total = 0;
		var autres = {label:"Autres",value:0,legendLabel:"Autres"};
		data.forEach(function(d){
			total += d.value;
		});
		data.forEach(function(d,i){
			if ((d.value/total) * 100 < 5) {
				autres.value += d.value;
				d.value = 0;
			}
		});
		data.sort(function(a,b) {return (a.value > b.value) ? -1 : ((b.value > a.value) ? 1 : 0);} ); 
		data.push(autres);


		var legend = this.model.get("pieLegendSegmentation");  // Colors array
		var labels = []; 
		var values = [];
		var legendLabels = [];
		$.each(data, function(index,obj) {
			labels.push(obj.label);
			values.push(obj.value);
			legendLabels.push(obj.legendLabel);
		});

		var radius = size/2;
		var arc = d3.svg.arc().innerRadius(radius * 0.45).outerRadius(radius * 0.9); 
		var pie = d3.layout.pie().value(function(d) { return d.value; }).sort(null);


		var tooltipElement = d3.select("#tooltipGenerator")
			.append("svg") 
			.data(data) 
			.attr("width", size) 
			.attr("height", size) 
			.attr("class","tooltip-canvas")
			.append("g") 
			.attr("transform", "translate(" + (size/2) + "," + (size/2) + ")")
			.attr('stroke','#000')
			.attr('stroke-width',2);


		var centreLabel = d3.select(".tooltip-canvas")
			.append("text")
			.attr("x", radius)
			.attr("y", radius * 0.9)
			.text(region)
			.attr("class","tip-pie-hover-label")
			.style("fill", "none")
			.style("stroke", "#AAAAAA")
			.style("text-anchor","middle");

		var centreValue = d3.select(".tooltip-canvas")
			.append("text")
			.attr("x", radius)
			.attr("y", radius * 1.1)
			.text(visits + " %")
			.attr("class","tip-pie-hover-value")
			.style("fill", "none")
			.style("stroke", "#AAAAAA")
			.style("text-anchor","middle");

		var arcs = tooltipElement.selectAll("g.slice")
			.data(function(d){
				return pie(data);
			})
			.enter()
			.append("g")
			.attr("class", "slice")
			.append("path")
			.attr("fill", function(d, i) {
				var color = legend.filter(function(l){ 
					return l.label == d.data.label;
				});
				d.data.color = color[0].color;
				return color[0].color;
			})
			.attr("d", arc);

		var eventStorageData = data;
		eventStorageData.push({region: region, visits: visits});
		this.model.set("tooltipData",eventStorageData);
		$('#segmentationLegend').html('');
		this.appendSegmentationLegend(data);
	},

	appendSegmentationLegend:function(data){
		$('#segmentationLegend').show();
		data = data.slice(0,data.length-2);
		var width = $("#segmentationLegend").width();
		var numElements = data.length;
		var halfPoint = Math.ceil(numElements/2);

		var svg = d3.select("#segmentationLegend").append("svg")
		    .attr("width", width)
		    .attr("height", halfPoint * 15) // Height depends on elements
		  	.append("g")

		var legends = svg.selectAll("leg")
		      .data(data)
		      .enter().append("rect")
		      .style("fill", function(d,i){
		      	return d.color;
		      })
		      .attr("x", function(d,i){
		      	return (i+1 <= halfPoint) ? 0 : width/2;
		      })
		      .attr("width", 25)
		      .attr("height",14)
		      .attr("y",function(d,i){
		      	return (i+1 <= halfPoint) ? 3 + i * 15 : (3 + i * 15) - halfPoint * 15;
		      })

		 var labels = svg.selectAll("label")
		  	  .data(data)
		      .enter().append("text")
		      .text(function(d,i){
		      	return d.legendLabel;
		      })
		      .attr("class","bar-label")
		      .attr("x", function(d,i){
		      	return (i+1 <= halfPoint) ? 30 : width/2 + 30;
		      })
		      .attr("y", function(d,i){
		      	return (i+1 <= halfPoint) ? 14 + i * 15 : (14 + i * 15) - halfPoint * 15;
		      })
		      .attr("fill", "black")
		      .attr("font-size",14)
		      .attr("class","test")
		 
	},



	//----------------------------------------------------------------------------------------------------
	// OTHER FUNCTIONS
	//-----------------------------------------------------------------------------------------------------

	removeElementsOnChange:function(svg){
		if ($('.city-label').length !== 0) svg.selectAll(".city-label").remove();
		if ($('.city-text').length !== 0) svg.selectAll(".city-text").remove();
		if ($('circle').length !== 0) svg.selectAll("circle").remove();
		if ($('.region-label').length !== 0) svg.selectAll(".region-label").remove();
		if ($('.graphic').length !== 0) svg.selectAll(".graphic").remove();
		if ($('.area-element').length !== 0) svg.selectAll(".area-element").remove();
		if ($('.tooltip-canvas').length !== 0) d3.selectAll(".tooltip-canvas").remove();
		if ($('.d3-tip').length !== 0) d3.selectAll(".d3-tip").remove();
		$('#informationPanel').html(this.model.get("infoPanelDefault"));
	},



	zoomToBoundingBox:function(svg,projection,dataArray) {
		var that = this;

		if (this.model.get("level") === 0) {
			svg.transition()
				.duration(750)
				.attr("transform", "translate(0,0)scale(1)")
			this.model.set("currentBoundingBox",null);
			this.model.set("currentMapBounds",null);
			return;
		}

		// Calculate the projection points of the corners from the longitudes and latitudes to make
		// an appropriate geographical bounding box
		var leftBottom = projection([
			Math.min.apply(Math,dataArray.map(function(d){return d.lon})),
			Math.min.apply(Math,dataArray.map(function(d){return d.lat}))
		]);
		var rightTop = projection([
			Math.max.apply(Math,dataArray.map(function(d){return d.lon})),
			Math.max.apply(Math,dataArray.map(function(d){return d.lat}))
		]);
		// set the bounding box of lat/lon coords and the mapbound of projection pixels
		this.model.set("currentBoundingBox",[
			[Math.max.apply(Math,dataArray.map(function(d){return d.lon})),Math.max.apply(Math,dataArray.map(function(d){return d.lat}))],
			[Math.min.apply(Math,dataArray.map(function(d){return d.lon})),Math.min.apply(Math,dataArray.map(function(d){return d.lat}))]
		]);
		console.log(this.model.get("currentBoundingBox"));
		this.model.set("currentMapBounds",[leftBottom,rightTop]);

		// Caluclate the base bounds and modifiy the shoter axis to make a square.
		// Add a buffer to each side of the square to prevent overflow
		var bounds = [[leftBottom[0],leftBottom[1]],[rightTop[0],rightTop[1]]];
		if (bounds[0][0] === bounds[1][0] && bounds[0][1] === bounds[1][1])
			bounds = [[bounds[0][0] * 0.9, bounds[0][1] * 0.9],[bounds[1][0] * 1.1,bounds[1][1] * 1.1]];

		var xAxisLength = bounds[1][0] - bounds[0][0];
		var yAxisLength = bounds[0][1] - bounds[1][1];
		var xAndYAxis = [bounds[1][0] - bounds[0][0], bounds[0][1] - bounds[1][1]]
		var longerAxisSize = Math.max.apply(Math,xAndYAxis.map(function(d){return d}));
		var longerAxisDiff = Math.max.apply(Math,xAndYAxis.map(function(d){return d})) - Math.min.apply(Math,xAndYAxis.map(function(d){return d}));
		var shorterAxisId = longerAxisSize === xAndYAxis[0] ? "Y" : "X";
		var amountToAddToShorterAxis = longerAxisDiff/2;
		var buffer = Math.max(xAxisLength,yAxisLength) / 8;
		bounds[0][0] = shorterAxisId === "X" ? bounds[0][0] - amountToAddToShorterAxis - buffer : bounds[0][0] - buffer;
		bounds[0][1] = shorterAxisId === "Y" ? bounds[0][1] + amountToAddToShorterAxis + buffer : bounds[0][1] + buffer;
		bounds[1][0] = shorterAxisId === "X" ? bounds[1][0] + amountToAddToShorterAxis + buffer : bounds[1][0] + buffer;
		bounds[1][1] = shorterAxisId === "Y" ? bounds[1][1] - amountToAddToShorterAxis - buffer : bounds[1][1] - buffer;
 		this.model.set("currentMapBounds",bounds);

		var dx = bounds[1][0] - bounds[0][0];
		var dy = bounds[1][1] - bounds[0][1];
		var x = (bounds[0][0] + bounds[1][0]) / 2;
		var y = (bounds[0][1] + bounds[1][1]) / 2;


		var scale = 1 / Math.max(dx / this.model.get("width"), dy / this.model.get("height"));
		var translate = [this.model.get("width") / 2 - scale * x, this.model.get("height") / 2 - scale * y];
		svg.transition()
			.duration(750)
			.attr("transform", "translate(" + translate + ")scale(" + scale + ")")


		svg.selectAll('path')
			.transition()
			.duration(750)
			.style("stroke-width", 1.5 / scale + "px");


	},


	flagTransitionEnd:function(transition, callback) {
		if (transition.size() === 0) {
		 callback();
		}
	},


	//----------------------------------------------------------------------------------------------------
	// EVENTS
	//-----------------------------------------------------------------------------------------------------

	changeNetwork:function(e){
		var changeTo = $(e.target).val() === "gp" ? "sp" : "gp";
		$(e.target).html(changeTo.toUpperCase());
		$(e.target).val(changeTo);
		this.model.changeNetwork(changeTo);
		d3.selectAll("#franceMap").remove();
		this.renderMap();
	},

	moveUpALevel:function(){
		$('#selection').html('');
		$('#graphs').show();
		$('#segmentationLegend').hide();
		if (this.model.get("level") > 0) {
			this.model.decreaseLevel();
			this.drawRegions()
		};
	},

	showHideElement:function(id,state){
		var element = d3.selectAll('.area-element')
			.filter(function(d,i){
				return d.name === id;
			})
			.style('display',function(d){
				var then = state == false ? 'none' : 'inline';
				return then;
			})

		var now = state == true ? false : true;
	},

	showHideCities:function(e){
		var that = this;
		if (e.target.checked === false) {
			d3.selectAll('.city-label').attr('opacity',0)
			d3.selectAll('.city-text').attr('opacity',0)
			this.model.set("citiesVisible",false);
		} else if (e.target.checked === true) {
			d3.selectAll('.city-label')
				.attr("opacity",function(d){
					var popLimit = parseInt(d.pop) > that.model.get("citiesVisibleLimit");
					var labelO =  popLimit === true ? 1 : 0;
					return labelO;
				})
			d3.selectAll('.city-text')
				.attr("opacity",function(d){
					var popLimit = parseInt(d.pop) > that.model.get("citiesVisibleLimit");
					var labelO =  popLimit === true ? 1 : 0;
					return labelO;
				})

			this.model.set("citiesVisible",true);
		}
	},

	showHideCitiesBySize:function(e){
		var that = this;
		var populationLimit = e.target.value;
		this.model.set("citiesVisibleLimit",populationLimit);

		d3.selectAll('.city-label')
			.attr("opacity",function(d){
				var popLimit = parseInt(d.pop) > that.model.get("citiesVisibleLimit");
				var labelO = that.model.get("citiesVisible") === true && popLimit === true ? 1 : 0;
				return labelO;
			})

		d3.selectAll('.city-text')
			.attr("opacity",function(d){
				var popLimit = parseInt(d.pop) > that.model.get("citiesVisibleLimit");
				var labelO = that.model.get("citiesVisible") === true && popLimit === true ? 1 : 0;
				return labelO;
			})
	},


	createview:function () {
		that =this;
		var dataArray = that.model.getData();
		var arr = [];
		var newArray = [];

		function compare(a,b) {
			if (a.name < b.name) return -1;
			if (a.name > b.name) return 1;
			return 0;
		}

		dataArray = dataArray.sort(compare);
		$.each(dataArray,function(index,element){
			arr.push({
				text: element.name,
				id : element.name,
				checked: true,
			})
		});

		var tree = $('#graphs').treeview({
			data: arr,
			levels: 1,
			showTags:true,
			showCheckbox: true,
			disabled:false,
			multiSelect: false,
			icon: "glyphicon glyphicon-unchecked",
			state: {
				checked: true,
				disabled: true,
				expanded: true,
			},
			onNodeChecked: function(event, data) {
				that.showHideElement(data.id,data.state.checked);
			},
			onNodeUnchecked: function(event, data) {
				that.showHideElement(data.id,data.state.checked);
			},
			onNodeSelected: function(event, data) {
				$('#informationPanel').html('');
				var dataForRegion;
				dataArray.filter(function(obj){
					if (obj.name === data.id) {dataForRegion = obj; return false;}
					return obj.name === data.id;
				});
				//that.appendBarChartInToolTip($('#informationPanel').width(),dataForRegion);
			},
			onNodeUnselected: function(){
				$('#informationPanel').html(that.model.get("infoPanelDefault"));
			},
		});
		$('#graphs').treeview("checkAll",{silent:true});
	},





});
