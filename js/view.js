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

		var svg = d3.json("./geoJson/FRA_adm1.json", function(json) {
			regions = topojson.feature(json, json.objects.FRA_adm1);

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
			    .attr("width", 800)
			    .attr("height", 600);

			var projection = d3.geo.mercator()
				.center(that.model.get("defaultCenter"))
				.scale(that.model.get("defaultScale"));
			var path = d3.geo.path().projection(projection);


			svg.selectAll("path")
				.data(regions.features)
				.enter()
				.append('path')
				.attr("d", path)
				.style("fill",function(d,i){
				if (i % 2 === 0) return '#5bc0de';
				else return '#f9f9f9';
			})
			.style("stroke", function(d,i){
				return "#000000";
			})

			that.drawRegions();
		});
	},

	//----------------------------------------------------------------------------------------------------
	// DRAW A REGION/SECTOR/UGA SET
	// Removes all previous elements and gets the data for the current level we are aut
	// Appends circles and labels for the current level, and adds click events to the circles for drilling
	// The chooses a type of graph to append to the labels
	//-----------------------------------------------------------------------------------------------------

	drawRegions:function(svg,projection,path) {
		var that = this;
		var svg = d3.select($("#zoomgroup")[0]);
		var projection = d3.geo.mercator()
			.center(that.model.get("defaultCenter"))
			.scale(that.model.get("defaultScale"));
		var path = d3.geo.path().projection(projection);

		this.removeElementsOnChange(svg);
		
		var dataArray = that.model.getData();
		svg.selectAll("circle")
		.data(dataArray).enter()
		.append("circle")
		.attr("cx", function (d) { return projection([d.lon,d.lat])[0]; })
		.attr("cy", function (d) { return projection([d.lon,d.lat])[1]; })
		.attr("r", "8px")
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
			.attr("transform", function(d,i) { 
				return "translate(" + projection([d.lon ,d.lat*0.993]) + ")"; 
			})
			.text(function(d,i) {return d.name})

		//this.appendBarCharts(svg,projection,dataArray);
		this.appendPieCharts(svg,projection,dataArray);
		
	},

	
	//----------------------------------------------------------------------------------------------------
	// APPEND A SMALL BAR CHART TO EACH LABEL IN THE CURRENT REGIOn
	// Appends a bar at the lat/lon of each region (!! y axis needs to be return from the bottom)
	// Needs a translate function for spacing the bars according to the graphic
	//-----------------------------------------------------------------------------------------------------

	appendBarCharts: function(svg,projection,dataArray) {
		var contactsData = this.model.getTestContactsData(dataArray);
		var height = this.model.get("height");
		svg.selectAll("rect")
			.data(contactsData).enter()
			.append("rect")
			.attr("width", 10)
			.attr("x", function (d) { return projection([d.lon,d.lat])[0]; })
			.attr('y', function (d) { 
				return (parseInt(projection([d.lon,d.lat])[1]) - d.value / 10);
			})
			.attr("height", function(d){
				return d.value / 10;
			})
			
			.attr("class","graphic")
			.attr("fill", function(d){
				if (d.measure === 'contacts') return 'red';
				if (d.measure === 'visits') return 'blue';
			})
			.attr("transform", function(d){
				if (d.measure === 'contacts') return 'translate(6,-6)';
				if (d.measure === 'visits') return 'translate(18,-18)';
			})
	},

	appendPieCharts: function(svg,projection,dataArray) {

		var pieData = this.model.getTestPieData(dataArray);

		var arc = d3.svg.arc().innerRadius(0).outerRadius(15);         
      	var pie = d3.layout.pie().value(function(d){ return d });

		var pies = svg.selectAll('.pie')
			.data(pieData)
			.enter()
			.append('g')
			.attr('class', 'pie')
			.attr("transform", function(d) {
				return "translate(" + (projection([d.lon, d.lat])[0] + 12) + "," + (projection([d.lon, d.lat])[1] - 22)  + ")";
			})
			.attr('stroke','#000')

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
	// OTHER FUCNTIONS
	//-----------------------------------------------------------------------------------------------------

	removeElementsOnChange:function(svg){
		if ($('circle').length !== 0) svg.selectAll("circle").remove();
		if ($('.region-label').length !== 0) svg.selectAll(".region-label").remove();
		if ($('.graphic').length !== 0) svg.selectAll(".graphic").remove();
		if ($('.pie').length !== 0) svg.selectAll(".pie").remove();
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