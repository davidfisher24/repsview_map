var MapView = Backbone.View.extend({

	el: '#map-panel',

	initialize: function(options) {
		this.renderMap();
	},

	events: {
		'click #returnLevel' : "moveUpALevel",
	},


	//----------------------------------------------------------------------------------------------------
	// RENDERS THE MAP ON FIRST LOAD
	//-----------------------------------------------------------------------------------------------------

	renderMap: function() {
		var that = this;

		var svg = d3.json("./geoJson/FRA_adm2.json", function(json) {
			regions = topojson.feature(json, json.objects.FRA_adm2);

			var zoom = d3.behavior.zoom()
			    .scaleExtent([1, 8])
			    .on("zoom", zoomhandler);

			function zoomhandler() {
			  svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
			}

			svg = d3.select("#map")
				.append("svg")
				.attr("width", that.model.get("width"))
				.attr("height", that.model.get("height"))
				.attr("id",'franceMap')
				.append("g")
			    .attr("id","zoomgroup")
			    .call(zoom);

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
			.attr("height",function(){ return 8/currentScale })
			.attr("width",function(){ return 8/currentScale })
			.attr("fill", "white")
			.attr("class", "city-label")
			.attr("stroke", "black")
			.attr("stroke-width",function(){ return 2/currentScale })

		svg.selectAll(".city-text")
			.data(cities).enter()
			.append("text")
			.attr("class", "city-text")
			.attr("font-size",function(){
				return 12/currentScale;
			})
			.attr("transform", function(d,i) { 
				var target = projection([d.lon,d.lat]);
				return "translate(" + (target[0] + (12/currentScale)) + "," + (target[1] + (8/currentScale)) + ")"; // Square pixels. Width add 1.5
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

			svg.selectAll("circle")
			.data(dataArray).enter()
			.append("circle")
			.attr("cx", function (d) { 
				var x = projection([d.lon,d.lat])[0];
				d.x = x;
				that.model.lookForCollisions(that.model.get("currentCities"),"x",x,20,d.name);
				return x; 
			})
			.attr("cy", function (d) { 
				var y = projection([d.lon,d.lat])[1];
				d.y = y;
				that.model.lookForCollisions(that.model.get("currentCities"),"y",y,20,d.name);
				return y; 
			})
			.attr("r", function(d){
				return (8/currentScale) + "px";
			})
			.attr("fill", "black")
			.attr("class", function(d,i) {return d.name})
			.on("click",function(d,i){
				if (that.model.get("level") < that.model.get("deepestLevel")) {
					that.model.increaseLevel(d);
					that.drawRegions()
				};
			})

			svg.selectAll(".region-label")
				.data(dataArray)
				.enter()
				.append("text")
				.attr("class", "region-label")
				.attr("font-size",function(){
					return (16/currentScale) + "px";
				})
				.attr("transform", function(d,i) { 
					var target = projection([d.lon,d.lat]);
					return "translate(" + (target[0] - (2/currentScale)) + "," + (target[1] + (25/currentScale)) + ")"; 
					//return "translate(" + projection([d.lon ,d.lat]) + ")"; 
				})
				.text(function(d,i) {return d.name})

			that.model.set("currentRegions",dataArray);

			//that.appendBarCharts(svg,projection,dataArray,currentScale);
			that.appendPieCharts(svg,projection,dataArray,currentScale);
		},delay);
		
	},

	
	//----------------------------------------------------------------------------------------------------
	// APPEND A SMALL BAR CHART TO EACH LABEL IN THE CURRENT REGIOn
	// Appends a bar at the lat/lon of each region (!! y axis needs to be return from the bottom)
	// Needs a translate function for spacing the bars according to the graphic
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
	// OTHER FUNCTIONS
	//-----------------------------------------------------------------------------------------------------

	removeElementsOnChange:function(svg){
		if ($('.city-label').length !== 0) svg.selectAll(".city-label").remove();
		if ($('.city-text').length !== 0) svg.selectAll(".city-text").remove();
		if ($('circle').length !== 0) svg.selectAll("circle").remove();
		if ($('.region-label').length !== 0) svg.selectAll(".region-label").remove();
		if ($('.graphic').length !== 0) svg.selectAll(".graphic").remove();
		if ($('.pie').length !== 0) svg.selectAll(".pie").remove();
	},



	zoomToBoundingBox:function(svg,projection,dataArray) {
		if (this.model.get("level") === 0) {
			svg.transition()
				.duration(750)
				.attr("transform", "translate(0,0)scale(1)")

			this.model.set("currentBoundingBox",null);
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
			.attr("transform", "translate(" + translate + ")scale(" + scale + ")");

		svg.selectAll('path')
			.transition()
			.duration(750)
			.style("stroke-width", 1.5 / scale + "px");
	},

	//----------------------------------------------------------------------------------------------------
	// EVENTS
	//-----------------------------------------------------------------------------------------------------

	moveUpALevel:function(){
		if (this.model.get("level") > 0) {
			this.model.decreaseLevel();
			this.drawRegions()
		};
	},




});