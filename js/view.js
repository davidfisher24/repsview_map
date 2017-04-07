var MapView = Backbone.View.extend({

	el: '#map-panel',

	initialize: function(options) {
		this.renderMap();
	},

	events: {
		'click #returnLevel' : "moveUpALevel",
		"click .selector" : "showHideElement",
		"click #controlCities" : "showHideCities",
		"change #controlCitiesSize" : "showHideCitiesBySize",
	},


	//----------------------------------------------------------------------------------------------------
	// RENDERS THE MAP ON FIRST LOAD
	//-----------------------------------------------------------------------------------------------------

	renderMap: function() {
		var that = this;

		var svg = d3.json("./geoJson/FRA_adm2.json", function(json) {
			regions = topojson.feature(json, json.objects.FRA_adm2);
			var zoom = d3.behavior.zoom()
			    .scaleExtent([1, 100])
			    .on("zoom", zoomhandler);

			
			function zoomhandler() {
				//svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")"); //AUTOMATIC D3 ZOOM
				//zoom.translate([0,0]).scale(1); ZOOM RESET FUNCTION
				var currentZoom = $('#zoomgroup').css('transform') === "none" ? 1 : parseFloat($('#zoomgroup').css('transform').split("(")[1].split(",")[0]);
				if (that.model.get("currentAutoZoomEvent")) {
					zoom.translate([
						that.model.get("currentAutoZoomEvent").translate[0],
						that.model.get("currentAutoZoomEvent").translate[1]
					])
					.scale(that.model.get("currentAutoZoomEvent").scale); 
					that.model.set("currentAutoZoomEvent",null);
					return
				} else {
					// Zoom group
					svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
					// Pies
					svg.selectAll('.pie')
					.attr("transform", function(d){
						return "translate(" + (projection([d.lon, d.lat])[0]) + "," + (projection([d.lon, d.lat])[1]) + ")scale(" + (currentZoom/d3.event.scale) + ")";
					});
				}
			}

			svg = d3.select("#map")
				.append("svg")
				.attr("width", that.model.get("width"))
				.attr("height", that.model.get("height"))
				.attr("id",'franceMap')
				.append("g")
			    .attr("id","zoomgroup")
			    .call(zoom)

			svg.append("rect")
			    .attr("class", "overlay")
			    .attr("width", that.model.get("width"))
			    .attr("height", that.model.get("height"));

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
				if (i % 2 === 0) return '#5bc0de';
					else return '#f9f9f9';
				})
				.style("stroke", function(d,i){
					return "#000000";
				})

			that.drawRegions(true);
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
			.attr("transform", function(d,i) { 
				var target = projection([d.lon,d.lat]);
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
		
		this.removeElementsOnChange(svg);
		if (!initialLoad) {
			this.zoomToBoundingBox(svg,projection,dataArray)
		};

		var delay = 750;
		if (initialLoad) delay = 0;

		window.setTimeout(function(){
			var currentScale = svg.attr('transform') ? svg.attr('transform').split(",")[3].replace(")","") : 1;
			that.addCities(currentScale);
			var cities = that.model.get("currentCities");

	
			var tip = d3.tip()
			  .attr('class', 'd3-tip')
			  .offset([-10, 0])
			  .html(function(d) {
			  	var data = [
					{name:"doctors", value:d.doctors, label: "medecins"},
					{name:"contacts", value:d.contacts, label: "hors cible"},
					{name:"visits", value:d.visits, label: "cible"},
				];

			  	that.appendPieChartInToolTip(150,data);
			  	//that.appendBarChartInToolTip(80,data);
			  	var toolTipSvg = $('#tooltipGenerator').html();
			  	$('#tooltipGenerator').html('');
			    return toolTipSvg;
			 })


			var arc = d3.svg.arc().innerRadius(0).outerRadius(10/currentScale);        
	      	var pie = d3.layout.pie().value(function(d){ return d });


			var pies = svg.selectAll('.pie')
				.data(dataArray)
				.enter()
				.append('g')
				.attr('class', 'area-element')
				.attr("transform", function(d) {
					return "translate(" + (projection([d.lon, d.lat])[0]) + "," + (projection([d.lon, d.lat])[1]) + ")";
				})
				.attr('stroke','#000')
				.attr('stroke-width',function(d){
					return (1.3/currentScale) + "px";
				})
				.call(tip)
				.on("click",function(d,i){
					if (that.model.get("level") < that.model.get("deepestLevel")) {
						tip.hide();
						$('#selection').html('');
						that.model.increaseLevel(d);
						that.drawRegions()
					};
				})
				.on('mouseover', tip.show)
	      		.on('mouseout', tip.hide)

			var colors = that.model.get("pieColors");

			pies.selectAll('.slice')
				.data(function(d){
					return pie([d.contacts,d.visits,d.doctors]); 
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
		        });

			that.model.set("currentRegions",dataArray);


			var clashes = that.model.testAreaBoundingBoxesForCollisions('.area-element',projection);
			console.log(clashes);
			$.each(dataArray,function(index,element){
				$('#selection').append("<span class='selector' data-value='on' id='"+element.name+"''>"+element.name+"</span>");
			});

		},delay);
		
	},

	
	//----------------------------------------------------------------------------------------------------
	// FUNCTIONS TO APPEND CHARTS DIRECTLY TO THE GRAPHIC
	//-----------------------------------------------------------------------------------------------------

	appendBarCharts: function(svg,projection,dataArray,currentScale) {
		var contactsData = this.model.getTestContactsData(dataArray);
		var height = this.model.get("height");
		svg.selectAll("rect")
			.data(contactsData).enter()
			.append("rect")
			.attr("width", function(){
				return 10/currentScale;
			})
			.attr("x", function (d) { return projection([d.lon,d.lat])[0]; })
			.attr('y', function (d) { 
				return (parseInt(projection([d.lon,d.lat])[1]) - ((d.value / 10) /currentScale));
			})
			.attr("height", function(d){
				return (d.value / 10) / currentScale;
			})
			
			.attr("class","graphic")
			.attr("fill", function(d){
				if (d.measure === 'contacts') return 'red';
				if (d.measure === 'visits') return 'blue';
			})
			.attr("transform", function(d){
				if (d.measure === 'contacts') return 'translate('+ (6/currentScale) +','+ (-(6/currentScale)) +')';
				if (d.measure === 'visits') return 'translate('+ (18/currentScale) +','+ (-(18/currentScale)) +')';
			})
	},

	appendPieCharts: function(svg,projection,dataArray,currentScale) {

		var pieData = this.model.getTestPieData(dataArray);

		var arc = d3.svg.arc().innerRadius(0).outerRadius(15/currentScale);         
      	var pie = d3.layout.pie().value(function(d){ return d });

		var pies = svg.selectAll('.pie')
			.data(pieData)
			.enter()
			.append('g')
			.attr('class', 'pie')
			.attr("transform", function(d) {
				return "translate(" + (projection([d.lon, d.lat])[0] + (12/currentScale)) + "," + (projection([d.lon, d.lat])[1] - (22/currentScale))  + ")";
			})
			.attr('stroke','#000')
			.attr('stroke-width',function(d){
				return (2/currentScale) + "px";
			})

		var colors = this.model.get("pieColors");

		pies.selectAll('.slice')
			.data(function(d){
				return pie([d.contacts, d.doctors, d.visits]); 
			})
			.enter()
			.append('path')
			.attr('d',  arc)
			.style('fill', function(d,i){
				return colors[i];
			});
	},

	//----------------------------------------------------------------------------------------------------
	// FUNCTIONS TO APPEND CHARTS TO TOOLTIPS ABOVE GRAPHICS
	//-----------------------------------------------------------------------------------------------------

	appendBarChartInToolTip:function(size,data){
		var x = d3.scale.ordinal().rangeRoundBands([0, size], .05);
		var y = d3.scale.linear().range([size, 0]);
		x.domain(data.map(function(d,i) { return i; }));
		y.domain([0, d3.max(data, function(d) { return d.value; })]);

      	var svg = d3.select('#tooltipGenerator')
      		.append("svg")
			.attr("width", size)
			.attr("height", size)
			.attr("class",'tooltip-canvas')

      	var bar = svg.selectAll("rect")
			.data(data)
			.enter()
			.append("rect")
			.attr("width", function(d){
				 return (size / data.length) * 0.75; 
			})
			.attr("height",function(d){
				return size + "px";
			})
			.attr("fill", function(d,i){
				if(i===0) return "red";
				if(i===1) return "blue";
				if(i===2) return "green";
				if(i===3) return "yellow";
			})
			.attr("x", function(d,i) { return x(i); })
			.attr("y", function(d,i) { return y(d.value); })
	},

	appendPieChartInToolTip:function(size,data){
		var region = "01";
		var colors = this.model.get("pieColors");
		var labels = [];
		var values = [];
		$.each(data, function(index,obj) {
			labels.push(obj.label);
			values.push(obj.value);
		});

		/*var computeAngle = function(d) {
			var a = (d.startAngle + d.endAngle) * 90 / Math.PI - 90;
			return a > 90 ? a - 180 : a;
		};*/
		var arc = d3.svg.arc().innerRadius(0).outerRadius(size/4);   
		var outerArc = d3.svg.arc().innerRadius(size/2).outerRadius(size/4);
		var pie = d3.layout.pie() 
      		.value(function(d) { return d.value; }) 

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

		var arcs = tooltipElement.selectAll("g.slice")
			.data(function(d){
				return pie(data);
			})
			.enter()
			.append("g")
			.attr("class", "slice");  


		arcs.append("path")
			.attr("fill", function(d, i) { return colors[i]; } )
			.attr("d", arc);

		arcs.append("text")
			.attr("transform", function(d) {
				d.outerRadius = (size/2);
				d.innerRadius = (size/2); 
				return "translate(" + arc.centroid(d) + ")";
			})
			.attr("text-anchor", "middle") //center the text on it's origin
			.style("stroke", "000")
			.style("font", "10px verdana")
			.text(function(d, i) { 
				return values[i]; 
			});

		arcs.filter(function(d) { 
				return d.endAngle - d.startAngle > .2; 
			}).append("text")
			.attr("dy", ".35em")
			.attr("text-anchor", "middle")
			.attr("transform", function(d) { 
				d.outerRadius = (size/2); 
				d.innerRadius = (size/2); 
				//return "translate(" + outerArc.centroid(d) + ")rotate(" + computeAngle(d) + ")";
				return "translate(" + outerArc.centroid(d) + ")";
			})
			.style("stroke", "428bca")
			.style("font", "10px verdana")
			.text(function(i) { 
				return i.data.label; 
			});
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
	},



	zoomToBoundingBox:function(svg,projection,dataArray) {
		var that = this;

		if (this.model.get("level") === 0) {
			svg.transition()
				.duration(750)
				.attr("transform", "translate(0,0)scale(1)")

			this.model.set("currentBoundingBox",null);
			this.model.set("currentAutoZoomEvent",{translate: [0,0], scale: 1});
			return;
		} 

		this.model.set("currentBoundingBox",[
			[Math.max.apply(Math,dataArray.map(function(d){return d.lon})),Math.max.apply(Math,dataArray.map(function(d){return d.lat}))],
			[Math.min.apply(Math,dataArray.map(function(d){return d.lon})),Math.min.apply(Math,dataArray.map(function(d){return d.lat}))]
		]);

		var maxProj = projection([
			Math.max.apply(Math,dataArray.map(function(d){return d.lon})),
			Math.max.apply(Math,dataArray.map(function(d){return d.lat}))
		]);

		var minProj = projection([
			Math.min.apply(Math,dataArray.map(function(d){return d.lon})),
			Math.min.apply(Math,dataArray.map(function(d){return d.lat}))
		]);


		var bounds = [[maxProj[0],maxProj[1]],[minProj[0],minProj[1]]];
		var dx = bounds[1][0] - bounds[0][0];
		var dy = bounds[1][1] - bounds[0][1];
		var x = (bounds[0][0] + bounds[1][0]) / 2;
		var y = (bounds[0][1] + bounds[1][1]) / 2;
		var scale = .7 / Math.max(dx / this.model.get("width"), dy / this.model.get("height"));
		var translate = [this.model.get("width") / 2 - scale * x, this.model.get("height") / 2 - scale * y];

		svg.transition()
			.duration(750)
			.attr("transform", "translate(" + translate + ")scale(" + scale + ")")


		svg.selectAll('path')
			.transition()
			.duration(750)
			.style("stroke-width", 1.5 / scale + "px");

		this.model.set("currentAutoZoomEvent",{
			translate:translate,
			scale:scale,
		});

	},

	flagTransitionEnd:function(transition, callback) { 
		if (transition.size() === 0) { callback() }
		var n = 0; 
		transition 
			.each(function() { ++n; }) 
			.each("end", function() { if (!--n) callback.apply(this, arguments); }); 
	},

	

	//----------------------------------------------------------------------------------------------------
	// EVENTS
	//-----------------------------------------------------------------------------------------------------

	moveUpALevel:function(){
		$('#selection').html('');
		if (this.model.get("level") > 0) {
			this.model.decreaseLevel();
			this.drawRegions()
		};
	},

	showHideElement:function(e){
		var id = e.target.id;
		var state = $(e.target).data('value');

		var element = d3.selectAll('.area-element')
			.filter(function(d,i){
				return d.name === id;
			})
			.style('display',function(d){
				var then = state == 'on' ? 'none' : 'inline';
				return then;
			})

		var now = state == 'on' ? 'off' : 'on';
		$(e.target).data('value',now);
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




	


});