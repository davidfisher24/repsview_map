var MapView = Backbone.View.extend({

	el: '#map_module',

	initialize: function(options) {
		this.renderMap();
		if (this.model.get("device") === "desktop") $('#map-panel-container-mobile').remove();
		if (this.model.get("device") === "mobile") $('#map-panel-container-desktop').remove();
		$('#informationPanel').html(this.model.get("infoPanelDefault"));
	},

	events: {
		'click #open-tree-control' : "openTreeControl", 
		'click #changeNetwork' : "changeNetwork",
		'click #returnLevel' : "moveUpALevel",
		"click #controlCities" : "showHideCities",
		"click #turnOnOffModificationMode" : "turnOnOffModificationMode",
		"change #controlCitiesSize" : "showHideCitiesBySize",
	},

	//----------------------------------------------------------------------------------------------------
	// RENDERS THE MAP ON FIRST LOAD
	//-----------------------------------------------------------------------------------------------------

	renderMap: function() {
		var that = this;

		var svg = d3.json("./geoJson/FRA_adm2.json", function(json) {

			var regions = topojson.feature(json, json.objects.FRA_adm2);

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
					return that.model.get("mapFill");
				})
				.style("stroke", function(d,i){
					return that.model.get("mapStroke");
				})

			that.drawRegions(true);
		});
	},

	//----------------------------------------------------------------------------------------------------
	// FUNCTION TO ADD CITIES TO THE MAP
	// Sends a bounding box to get a list of cities in that box and places squares and indented labels
	// params: currentScale
	//-----------------------------------------------------------------------------------------------------

	addCities:function(currentScale){
		var that = this;
		var cities = this.model.getCities(currentScale);

		var svg = d3.select($("#zoomgroup")[0]);
		var projection = d3.geo.mercator()
			.center(this.model.get("defaultCenter"))
			.scale(this.model.get("defaultScale"));
		var path = d3.geo.path().projection(projection);

		// Squares used to label the city points
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
			.attr("height",6/currentScale)
			.attr("width", 6/currentScale)
			.attr("fill", "#2E2E2E")
			.attr("class", "city-label")
			.attr("stroke-width",function(){ return 2/currentScale })
			.attr("opacity",function(d){
				var popLimit = parseInt(d.pop) > that.model.get("citiesVisibleLimit");
				var labelO = that.model.get("citiesVisible") === true && popLimit === true ? 1 : 0;
				return labelO;
			})

		// Text aligned to the right of the city label
		svg.selectAll(".city-text")
			.data(cities).enter()
			.append("text")
			.attr("class", "city-text")
			.attr("font-size",12/currentScale)
			.attr("transform", function(d,i) {				
				var target = projection([d.lon,d.lat]);
				return "translate(" + target[0] + "," + target[1] + ")"; 
			})
			.attr("dy", ".7em")
			.attr("dx", ".7em")
			.attr("opacity",function(d){
				var popLimit = parseInt(d.pop) > that.model.get("citiesVisibleLimit");
				var textO = that.model.get("citiesVisible") === true && popLimit === true ? 1 : 0;
				return textO;
			})
			.text(function(d,i) {
				return d.name.slice(0,1) + d.name.slice(1).toLowerCase();
			});

		this.model.set("currentCities",cities);
	},


	//----------------------------------------------------------------------------------------------------
	// DRAW A REGION/SECTOR/UGA SET
	// Removes all previous elements and gets the data for the current level we are at
	// Appends pies and labels for the current level, and adds click events to the pies for drilling down
	// Adds the tooltip event linked to the pie and the admin drag event
	// params: initialLoad (true||false)
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

		var delay = this.model.get("zoomPeriod");
		if (initialLoad) delay = 0;

		window.setTimeout(function(){

			var currentScale = (svg.attr('transform') && that.model.get("level") !== 0) ? svg.attr('transform').split(",")[3].replace(")","") : 1;
			that.addCities(currentScale);
			var cities = that.model.get("currentCities");
 			
			/////////////////////////////////////////////
			// Drag events and functions
			var drag = d3.behavior.drag()
				.on("drag", dragMove)
				.on("dragend", recordNewPosition);

			function dragMove(d) {
				if(!that.model.get("modificationModeOn")) return;
				d[0] = d3.event.x, d[1] = d3.event.y;
				d3.select(this).attr("transform", "translate(" + d[0] + "," + d[1] + ")");
				var baseProj = projection.invert([0,0]);
				var pointProj = projection.invert([d[0],d[1]]);
				var movement = [pointProj[0] - baseProj[0], pointProj[1] - baseProj[1]];
				var newLatLon = that.model.set("currentDragEventLatLon",[d.lon + movement[0], (d.lat + movement[1])]);
			}

			function recordNewPosition(d) {
				if(!that.model.get("modificationModeOn")) return;
				that.model.setNewLatLonForPoint(d);
			}
			/////////////////////////////////////////////

			/////////////////////////////////////////////
			// Tooltip events and functions
		 	var tip = d3.tip()
			  .attr('class', 'd3-tip')
			  .offset(function(d){
			  	var elementRef = d.name;
			  	var elementObject = d3.selectAll('.area-element').filter(function(d){return d.name === elementRef});
			  	var offset = that.model.calculateTooltipPosition(projection,elementObject.node().getBBox(),d,150);
			  	return offset;
			  })
			  .html(function(d) {
			  	that.appendPieChartInToolTip(150,d);
			  	var toolTipSvg = d3.select('#tooltipGenerator').html();
			  	$('#tooltipGenerator').html('');
			    return toolTipSvg;
			})
			/////////////////////////////////////////////

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
					if (that.model.get("device") === "desktop") {
						if (that.model.get("level") < that.model.get("deepestLevel") && !d.corsicaFlag && !that.model.get("modificationModeOn")) {
							if (d3.event.defaultPrevented) return;
							tip.hide();
							that.model.increaseLevel(d);
							that.drawRegions()
							$('#segmentationLegend').hide();
						};
					} else if (that.model.get("device") === "mobile") {
						$('#tooltipGenerator').show();
						that.hideTreeControl();
						$('#informationPanel').html('');
						$('#tooltipGenerator').html('');
						var arcElementMaxSize = Math.min(
							$(window).height() - $('#tooltipGenerator').offset().top,
							$('#tooltipGenerator').width()
						);
						that.appendBarChartInInfoPanel($('#informationPanel').width(),d);
						that.appendPieChartInToolTip(arcElementMaxSize,d);
					}
				})
				.on('mouseleave', function(d){
					if(that.model.get("device") === "mobile") return;
					if(that.model.get("modificationModeOn")) return;
					var elementSpace = d3.select(this).node().getBoundingClientRect();
					var centreAxisVertical = elementSpace.top + ((elementSpace.bottom - elementSpace.top)/2);
					var centreAxisHorizontal = elementSpace.left + ((elementSpace.right - elementSpace.left)/2);
					var tooltipOffset = that.model.get("tooltipOffsetPosition");

					var flagOut = null;
					if (tooltipOffset === 'top' && d3.event.y > centreAxisVertical) flagOut = true;
					if (tooltipOffset === 'bottom' && d3.event.y < centreAxisVertical) flagOut = true;
					if (tooltipOffset === 'left' && d3.event.x > centreAxisHorizontal) flagOut = true;
					if (tooltipOffset === 'right' && d3.event.x < centreAxisHorizontal) flagOut = true;
					if (flagOut) {
						tip.hide(d);
						that.resetElementsOnHoverOut(svg);
					}
					
				}) 
				.on('mouseenter', function(d){
					if(that.model.get("device") === "mobile") return;
					if(that.model.get("modificationModeOn")) return;
					that.hideTreeControl();
					$('#informationPanel').html('');
					that.appendBarChartInInfoPanel($('#informationPanel').width(),d);
					tip.show(d);
					// Tooltip specific events stored in the model
					d3.selectAll("g.slice").on('mouseover', function(d,i) {
		                d3.select('.tip-pie-hover-label').text(that.model.get("tooltipData")[i].label).style("font-size",14);
		                $('.tip-pie-hover-label').removeClass('bolded');
		                d3.select('.tip-pie-hover-value').text(that.model.get("tooltipData")[i].value);
		            })
		            .on('mouseleave', function(){
		            	d3.select('.tip-pie-hover-label').text(that.model.get("tooltipData")[that.model.get("tooltipData").length - 1].region).style("font-size",function(){
		            		var name = that.model.get("tooltipData")[that.model.get("tooltipData").length - 1].region;
		            		return name.length > 6 ? 14 : 16;
		            	});
		            	$('.tip-pie-hover-label').addClass('bolded');
		                d3.select('.tip-pie-hover-value').text(that.model.get("tooltipData")[that.model.get("tooltipData").length - 1].visits + "%");
		            });

		            d3.selectAll('#controls').on('mouseenter',function(){
		            	tip.hide();
		            })
				})

			var colors = that.model.get("pieColors");

			pies.selectAll('.slice')
				.data(function(d){
					return pie([d.visits,d.nonVisits]);
				})
				.enter()
				.append('path')
				.attr('d',  arc)
				.attr("class", function(d,i) {return d.name + " slice"})
				.style('fill', function(d,i){
					return colors[i];
				})


			pies.append("text")
				.data(dataArray)          
		        .attr("x", 0)
		        .attr("y", 25/currentScale)
		        .attr("text-anchor", "middle")
		        .attr("pointer-events", "none")
		        .style("font-size", function(d,i){
		        	return 13/currentScale + "px";
		        })
		        .text(function(d,i){
		        	return d.name;
		        })
		        .attr("class","region-text")


			that.model.set("currentRegions",dataArray);

			that.createTreeview();
		},delay);
	},

	//----------------------------------------------------------------------------------------------------
	// FUNCTIONS TO APPEND CHARTS AND OTHER SVGS TO pARTS OF THE MAP
	//-----------------------------------------------------------------------------------------------------

	/*
	/* Append a bar chart in the information panel
	/* Params: size - size of the area we are working with, data for region.
	*/

	appendBarChartInInfoPanel:function(size,dataForRegion){
		var data = [];
		var products = this.model.get("barProducts");
		if (this.model.get("server")) {
			for (var i=0; i < products.length; i++) {
				data.push({name:products[i], value:dataForRegion.quotas[products[i]], label: products[i].toUpperCase().substr(0,5)});
			}
		} else {
			products.sort(function() {
			  return .5 - Math.random();
			});
			var dynamicNumber = Math.floor(Math.random() * 3) + 3;
			for (var i=0; i < dynamicNumber; i++) {
				data.push({name:products[i], value:dataForRegion.quotas[products[i]], label: products[i].toUpperCase().substr(0,5)});
			}
		}
		

		// Variable definitions. Colours, range, and line points to be used
		var colors = this.model.get("barColors");
		var margin = 50;
		var dataMin = d3.min(data, function(d) {return d.value; });
		var dataMax = d3.max(data, function(d) {return d.value; });

		var linePoints = [];
	 	var minLine = dataMin > 100 ? 90 : dataMin;
	 	var interval = Math.ceil((((((dataMax - minLine)/10)/10) * 10)/20)) * 20;
		for (var i = Math.ceil(minLine / interval) * interval; i <= dataMax + interval; i = i + interval) {
			linePoints.push(i);
		} 

		// Scales and axis formats
		var x = d3.scale.ordinal().rangeRoundBands([0, size-(margin * 0.4)], .05);
		var y = d3.scale.linear().range([size, 0]);

		var xAxis = d3.svg.axis()
		    .scale(x)
		    .orient("bottom")

		var yAxis = d3.svg.axis()
		    .scale(y)
		    .orient("left")
		    .tickValues(linePoints);

		// Main SVG Element
		var svg = d3.select("#informationPanel").append("svg")
		    .attr("width", size)
		    .attr("height", size)
		  	.append("g")
		    .attr("transform","translate("+margin/2+",-"+margin/2+")");

		// Domains
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
		      .attr("class",'bar-chart-text')
		      .style("font-size",function(d){
		      	if (data.length === 6) return 10;
		      	if (data.length === 5) return 12;
		      	if (data.length === 4) return 14;
		      	if (data.length === 3) return 16;
		      })
		      .text(function(d){
		      	var string = d.toLowerCase();
		      	return string.charAt(0).toUpperCase() + string.slice(1);
		      });

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
		      .attr("class",'bar-chart-text')
		      .style("font-size",12)


		  // line points
			linePoints.forEach(function(line){
				svg.append("line")
					.attr("x1", 0)
		            .attr("y1", y(line))
		            .attr("x2", size)
		            .attr("y2", y(line))
		            .attr("class", "bar-line-point")
		            .attr("stroke-width", function(d,i){
		            	return line === 100 ? 2 : 2;
		            })
		            .attr("stroke", function(d,i){
		            	return line === 100 ? "#d9534f" : "#A8A8A8";
		            })
			})

	     // Bar elements
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

		  // Bar number labels
		  var labels = svg.selectAll("label")
		  	  .data(data)
		      .enter().append("text")
		      .text(function(d,i){
		      	return d.value + "%";
		      })
		      .attr("class","bar-label")
		      .style("text-anchor", "middle")
		      .attr("x", function(d) { 
		      	// Starting point + (range band width less the margin divided by the data length and divided by two to find the central point)
		      	return (x(d.label) + ((x.rangeBand() - margin/data.length)/2));
		      })
		      .attr("opacity",0)
		      .attr("fill", function(d,i){
		      	return d.value <= dataMin ? "#333333" : "#f9f9f9";
		      })
		      .attr("font-size",function(d){
		      	if (data.length === 6) return 10;
		      	if (data.length === 5) return 12;
		      	if (data.length === 4) return 14;
		      	if (data.length === 3) return 16;
		      })
		      .attr("y", function(d) { 
		      	// Looks at the font-size above. Outide the bar: Line + 4px of margin. Inside the bar: reduce the height of the font and 2px margin
		      	var fontSize;
		      	if (data.length === 6) fontSize = 10;
		      	if (data.length === 5) fontSize = 12;
		      	if (data.length === 4) fontSize = 14;
		      	if (data.length === 3) fontSize = 16;
		      	return d.value  <= dataMin ? y(d.value) - 4 : y(d.value) + fontSize + 2;
		      })
		      .transition()
			  .duration(400)
			  .delay(400)
			  .attr("opacity",1)
			  .attr("class","bar-chart-text")

			// CSS Modifications to final bar - hide the tick marks,c hange the 100 marker for a bold red marker
			// and hide the top line point if it is too high
			$('.tick line').hide(); 
			$('.y text').filter(function(i,e){
				return e.innerHTML === "100"
			}).css({
				"fill": "#d9534f", "color": "#d9534f", "font-weight" : "700"
			}) 

			if ($('.y .tick').last().offset().top - $('#informationPanel').offset().top < 4) {
				$('.y .tick').last().hide();
				$('.bar-line-point').last().hide();
			} 

			// Add a title to the extra div above the bar chart
			var regionName = dataForRegion.name.length === 2 ? "Region " + dataForRegion.name : dataForRegion.name;
			$('#informationPanelTitle').html('Quota Data - ' + regionName);

	},



	appendPieChartInToolTip:function(size,d){
		var region = d.name;
		var visits = d.visits;
		var data = [];

		if (d.segmentation) {
	 		this.model.get("pieLegendSegmentation").forEach(function(seg){
				if (seg.measure !== "autres") {
					data.push({
						label: seg.label,
						value: d.segmentation[seg.measure],
						legendLabel: seg.legendLabel,
					})
				}
			});
	 	}

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


		var legend = this.model.get("pieLegendSegmentation"); 
		var labels = []; 
		var values = [];
		var legendLabels = [];
		$.each(data, function(index,obj) {
			labels.push(obj.label);
			values.push(obj.value);
			legendLabels.push(obj.legendLabel);
		});

		var radius = size/2;
		var arc = d3.svg.arc().innerRadius(radius * 0.5).outerRadius(radius * 1); 
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
			.attr("y", function(){
				if (d.segmentation) return radius * 0.975;
				else return radius * 0.8;
			})
			.text(region)
			.attr("class","tip-pie-hover-label bolded")
			.style("fill", "none")
			.style("stroke", "#DDDDDD")
			.style("text-anchor","middle")
			.style("font-size",function(d){
				return region.length > 6 ? 14 : 16;
			})

		var centreValue = d3.select(".tooltip-canvas")
			.append("text")
			.attr("x", radius)
			.attr("y", function(){
				if(d.segmentation) return radius * 1.2;
				else return radius;
			})
			.text(visits + "%")
			.attr("class","tip-pie-hover-value")
			.style("fill", "none")
			.style("stroke", "#DDDDDD")
			.style("text-anchor","middle")
			.style("font-size",12);

		if (d.segmentation) {
			var arcs = tooltipElement.selectAll("g.slice")
				.data(function(d){
					return pie(data);
				})
				.enter()
				.append("g")
				.attr("class", function(d){
					return "slice";
				})
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
		} else {
			var arcText1 = d3.select(".tooltip-canvas")
				.append("text")
				.attr("x",radius)
				.attr("y",radius * 1.3)
				.html("Les données de segmentation")
				.attr("class","tip-pie-hover-value")
				.style("stroke", "#DDDDDD")
				.style("text-anchor","middle")
				.style("font-size",8);

			var arcText2 = d3.select(".tooltip-canvas")
				.append("text")
				.attr("x",radius)
				.attr("y",radius * 1.3)
				.attr("dy",12)
				.html("ne sont pas disponibles")
				.attr("class","tip-pie-hover-value")
				.style("stroke", "#DDDDDD")
				.style("text-anchor","middle")
				.style("font-size",8);
		}
	},

	appendSegmentationLegend:function(data){
		$('#segmentationLegend').show();
		data = data.slice(0,data.length-1);
		data = data.filter(function(d){
			return d.value > 0;
		});
		var width = $("#segmentationLegend").width();
		var numElements = data.length;
		var halfPoint = Math.ceil(numElements/2);

		var svg = d3.select("#segmentationLegend").append("svg")
		    .attr("width", width)
		    .attr("height", halfPoint * 20) // Height depends on elements
		  	.append("g")

		var legends = svg.selectAll("leg")
		      .data(data)
		      .enter().append("rect")
		      .style("fill", function(d,i){
		      	return d.color;
		      })
		      .attr("x", function(d,i){
		      	return (i+1 <= halfPoint) ? 25 : width/2 + 25;
		      })
		      .attr("width", 25)
		      .attr("height",14)
		      .attr("y",function(d,i){
		      	return (i+1 <= halfPoint) ? 3 + i * 20 : (3 + i * 20) - halfPoint * 20;
		      })

		 var labels = svg.selectAll("label")
		  	  .data(data)
		      .enter().append("text")
		      .text(function(d,i){
		      	return d.legendLabel;
		      })
		      .attr("x", function(d,i){
		      	return (i+1 <= halfPoint) ? 55 : width/2 + 55;
		      })
		      .attr("y", function(d,i){
		      	return (i+1 <= halfPoint) ? 14 + i * 20 : (14 + i * 20) - halfPoint * 20;
		      })
		      .attr("fill", "black")
		      .attr("font-size",14)
		      .attr("class","segmentation_legend_text")
		 
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
		$('#informationPanelTitle').html('');
		$('#segmentationLegend').html('');
	},

	resetElementsOnHoverOut:function(svg){
		$('#informationPanel').html(this.model.get("infoPanelDefault"));
		$('#informationPanelTitle').html('')
		$('#segmentationLegend').html('')
	},



	zoomToBoundingBox:function(svg,projection,dataArray,flagRezoom) {
		var that = this;

		if (this.model.get("level") === 0 && !flagRezoom) {
			svg.transition()
				.duration(that.model.get("zoomPeriod"))
				.attr("transform", "translate(0,0)scale(1)")
			this.model.set("currentBoundingBox",null);
			this.model.set("currentMapBounds",null);
			return;
		}
		// Calculate the projection points of the corners from the longitudes and latitudes to make
		// an appropriate geographical bounding box
		var leftBottom = projection([
			Math.min.apply(Math,dataArray.map(function(d){return d.lon})), // Projection of west longitude (left)
			Math.min.apply(Math,dataArray.map(function(d){return d.lat})) // Projection southern latitude (bottom)
		]);
		var rightTop = projection([
			Math.max.apply(Math,dataArray.map(function(d){return d.lon})), // Projection of east longtude (right)
			Math.max.apply(Math,dataArray.map(function(d){return d.lat}))  // Projection of north latitude (top)
		]);
		// set the bounding box of lat/lon coords and the mapbound of projection pixels
		this.model.set("currentBoundingBox",[
			[Math.max.apply(Math,dataArray.map(function(d){return d.lon})),Math.max.apply(Math,dataArray.map(function(d){return d.lat}))],
			[Math.min.apply(Math,dataArray.map(function(d){return d.lon})),Math.min.apply(Math,dataArray.map(function(d){return d.lat}))]
		]);

		// Caluclate the base bounds and modifiy the shoter axis to make a square.
		// Add a buffer to each side of the square to prevent overflow


		var bounds = [[leftBottom[0],leftBottom[1]],[rightTop[0],rightTop[1]]];
		if (dataArray.length < 3 && !flagRezoom) 
			bounds = [[bounds[0][0] * 0.8, bounds[0][1] * 0.8],[bounds[1][0] * 1.2,bounds[1][1] * 1.2]];
		if (dataArray.length === 1 && flagRezoom) 
			bounds = [[bounds[0][0] * 0.95, bounds[0][1] * 0.95],[bounds[1][0] * 1.05,bounds[1][1] * 1.05]];


		var xAxisLength = bounds[1][0] - bounds[0][0];
		var yAxisLength = bounds[0][1] - bounds[1][1]; 


		var mapRatio = parseInt(this.model.get("mapRatio").split(":")[1]) / 10;
		var axisRatio = yAxisLength/xAxisLength;

		var difference;
		var bufferX;
		var bufferY;
		if (axisRatio < mapRatio) { 
			difference = ((xAxisLength * mapRatio) - yAxisLength) / 2;
			bufferX = xAxisLength * 0.1;
			bufferY = bufferX/mapRatio;
			bounds[0][0] = bounds[0][0] - bufferX;
			bounds[0][1] = bounds[0][1] + difference + bufferY;
			bounds[1][0] = bounds[1][0] + bufferX;
			bounds[1][1] = bounds[1][1] - difference - bufferY;
		} else if (axisRatio > mapRatio) { 

			difference = (yAxisLength - (xAxisLength * mapRatio)) / 2;
			bufferY = yAxisLength * 0.125;
			bufferX = bufferY * (1 / mapRatio);
			bounds[0][0] = bounds[0][0] - difference - bufferX;
			bounds[0][1] = bounds[0][1] + bufferY;
			bounds[1][0] = bounds[1][0] + difference + bufferX;
			bounds[1][1] = bounds[1][1] - bufferY;
		}
		

 		this.model.set("currentMapBounds",bounds);

		var dx = bounds[1][0] - bounds[0][0];
		var dy = bounds[1][1] - bounds[0][1];
		var x = (bounds[0][0] + bounds[1][0]) / 2;
		var y = (bounds[0][1] + bounds[1][1]) / 2;

		var currentScale = (svg.attr('transform')) ? svg.attr('transform').split(",")[3].replace(")","") : 1;		
		var scale = 1 / Math.max(dx / this.model.get("width"), dy / this.model.get("height"));


		var translate = [this.model.get("width") / 2 - scale * x, this.model.get("height") / 2 - scale * y];
		svg.transition()
			.duration(that.model.get("zoomPeriod"))
			.attr("transform", "translate(" + translate + ")scale(" + scale + ")")


		svg.selectAll('path')
			.transition()
			.duration(that.model.get("zoomPeriod"))
			.style("stroke-width", 1.5 / scale + "px");

		if (!flagRezoom) return; 
		var moddedScale = currentScale / scale;

		svg.selectAll('.area-element')
			.transition()
			.duration(that.model.get("zoomPeriod"))
			.attr("transform",function(d){
				return d3.select(this).attr("transform") + "scale("+moddedScale+")";
			});


		svg.selectAll('.city-text')
			.transition()
			.duration(that.model.get("zoomPeriod"))
			.attr("font-size",function(d){
				var original = d3.select(this).attr("font-size");
				return original * moddedScale;
			})
			.attr("dx",function(d){
				var original = parseFloat(d3.select(this).attr("dx").replace("em",""));
				return (original * moddedScale) + "em";
			})
			.attr("dy",function(d){
				var original = parseFloat(d3.select(this).attr("dy").replace("em",""));
				return (original * moddedScale) + "em";
			})

		svg.selectAll('.city-label')
			.transition()
			.duration(that.model.get("zoomPeriod"))
			.attr("height",function(d){
				var original = d3.select(this).attr("height");
				return original * moddedScale;
			})
			.attr("width",function(d){
				var original = d3.select(this).attr("width");
				return original * moddedScale;
			})
	},


	//----------------------------------------------------------------------------------------------------
	// EVENTS
	//-----------------------------------------------------------------------------------------------------

	changeNetwork:function(e){
		var svg = d3.select($("#zoomgroup")[0]);
		this.removeElementsOnChange(svg);
		$('#segmentationLegend').html('');
		var changeTo = $(e.target).val() === "gp" ? "sp" : "gp";
		$(e.target).html(changeTo.toUpperCase());
		$(e.target).val(changeTo);
		this.model.changeNetwork(changeTo);
		d3.selectAll("#franceMap").remove();
		this.renderMap();
	},

	moveUpALevel:function(e){
		if (this.model.get("level") === 0) return;

		$(e.target).addClass('disabled');
		window.setTimeout(function(){
			$(e.target).removeClass('disabled');
		},this.model.get("zoomPeriod"));

		this.hideTreeControl();
		$('#selection').html('');
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

	openTreeControl:function(){
		if ($('#treeControl').css('display') === "none") this.showTreeControl();
		else this.hideTreeControl();
	},

	hideTreeControl:function(){
		$('#treeControl').slideUp()
		$('#open-tree-control .caret').css('transform','none')
	},
	showTreeControl:function(){
		$('#treeControl').slideDown().css('display','inline-block')
		$('#open-tree-control .caret').css('transform','rotate(180deg)');
	},


	createTreeview:function () {
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

		var tree = $('#treeControl').treeview({
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
				that.rezoomFromTree(dataArray);
			},
			onNodeUnchecked: function(event, data) {
				that.showHideElement(data.id,data.state.checked);
				that.rezoomFromTree(dataArray);
				
			},
		});
		$('#treeControl').treeview("checkAll",{silent:true});
	},

	rezoomFromTree:function(dataArray){
		var svg = d3.select($("#zoomgroup")[0]);
		var projection = d3.geo.mercator()
			.center(this.model.get("defaultCenter"))
			.scale(this.model.get("defaultScale"));

		var moddedArray = [];
		dataArray.filter(function(d){
			$('#treeControl').treeview('getChecked').forEach(function(t){
				if (d.name === t.id) moddedArray.push(d);
			});
		});
		
		if (moddedArray.length > 0) this.zoomToBoundingBox(svg,projection,moddedArray,true);
	},


	turnOnOffModificationMode:function(e){
		if ($(e.target).hasClass('btn-primary') === true) {
			$(e.target).removeClass('btn-primary').addClass('btn-danger');
			this.model.set("modificationModeOn",true);
			if ($('.tooltip-canvas').length !== 0) d3.selectAll(".tooltip-canvas").remove();
			if ($('.d3-tip').length !== 0) d3.selectAll(".d3-tip").remove();
		} else {
			$(e.target).removeClass('btn-danger').addClass('btn-primary');
			this.model.set("modificationModeOn",false);
		}
	},


});
