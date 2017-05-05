/* jshint ignore:start */
//SERVER var Config = require('../../config');
MapModel = Backbone.Model.extend({

	defaults: {

		/* DATA AND VERSION */
		"server" : false, // Version - server data is true or false
		"device" : "desktop", // Device = desktop or mobile
		"gpdata" : "", // GP Data
		"spdata" : "", // SP Data
		"network" : "gp", // Current Selected Network
		"deepestLevel" : 2,  // Maximum level that can be drilled to. Is set to 2 for gp and 3 for sp.
		"reservedKeys" : ["lat","lon","segmentation","contacts","quotas"], // Reserved keys in the current data array

		/* MAP SCALES AND PROJECTION DATA */
		"width" : 800, // Width of the svg element. Defaults at 800, measure dynamically
		"height" : 600, // Height of the svg element. Scaled from the mapRatio and width parameter.
		"mapRatio" : "10:8", // Defines the x to y ratio of the map
		"zoomPeriod" : 750, // time between zoom in/out periods used for timeout functions
		"defaultCenter" : [4.8, 47.35], // Default centre (France)
		"defaultScale" : 2400, // Default scale (France). Scaled via the width parameter on load
		"defaultBoundingBox" : [[100,100],[-100,-100]], // Default bounding box [[max longitude, max latitiude],[min longitude, in latitiude]]
		"currentBoundingBox" : null, // Current bounding box [[max longitude, max latitiude],[min longitude, in latitiude]]
		"currentMapBounds" : null, // current lat/lon bounds of the map
		
		/* COLOUR AND LEGEND DEFINITIONS */
		"mapFill" : '#bbdefb',  // Map fill colour
		"mapStroke" : '#f9f9f9', // Map stroke colour
		"pieColors" :  ['#007E33','#CC0000'], // Colours to use in the segments of the contacts data pies
		"barColors" : ['#aa66cc','#4285F4','#00C851','#ffbb33','#ff4444','#90a4ae'],  // Bar chart colours
		"barProducts" : ["creon","tarka","lamaline","dymista","ceris","tadenan"], // Bar chart products
		// Segmentation data parameters for legend and graphic. Labels and colours
		"pieLegendSegmentation" :  [
			{measure: "VIP", color: '#7cb5ec', label: "VIP", legendLabel: "VIP"}, 
			{measure: "fideliserG", color: '#90ed7d', label: "Fid. G", legendLabel: "FidéliserG"}, 
			{measure: "fideliserM", color: '#f7a35c', label: "Fid. M", legendLabel: "FidéliserM"}, 
			{measure: "conquerir", color: '#8085e9', label: "Conq", legendLabel: "Conquérir"}, 
			{measure: "rhumato", color: '#f15c80', label: "Rhumato", legendLabel: "Rhumato"}, 
			{measure: "pharm_hosp", color: '#e4d354', label: "Ph Hosp", legendLabel: "Pharm Hosp"}, 
			{measure: "geriatrie", color: '#2b908f', label: "Geriatrie", legendLabel: "Gériatrie"}, 
			{measure: "chirugerie", color: '#f45b5b', label: "Chir", legendLabel: "Chirurgie"}, 
			{measure: "douleur", color: '#91e8e1', label: "Douleur", legendLabel: "Douleur"}, 
			{measure: "cardio", color: '#DA70D6', label: "Cardio", legendLabel: "Cardio"}, 
			{measure: "uro", color: '#1E90FF', label: "Uro", legendLabel: "Uro"}, 
			{measure: "gastro", color: '#E0F000', label: "Gastro", legendLabel: "Gastro"},
			{measure: "muco", color: '#AA4643', label: "Muco", legendLabel: "Muco"},
			{measure: "arv", color: '#89A54E', label: "ARV", legendLabel: "ARV"},
			{measure: "ajout_vm", color: '#d84315', label: "Ajout VM", legendLabel: "Ajout VM"},
			{measure: "urg_anest", color: '#9e9d24', label: "Urg Anest", legendLabel: "Urg Anest"},
			{measure: "autres", color: '#80699B', label: "Autres", legendLabel: "Autres"}
		],
		"infoPanelDefault" : "<p class='panel-title'>To see more information about a level, select the element from the tree or the map.</p>",
		
		/* DYNAMICALLY STORED ATTRIBUTES */
		"level" : 0, // Level of drilling of data
		"currentRegion" : null, // Current region selected for setting data
		"currentSector" : null, // Current secot select for setting data
		"currentUgaGroup" : null, // Current uga group selected for setting data
		"currentCities" : null,  // Current cities on the map
		"currentRegions" : null, // current regions on the map

		/* HTML CONTROLS */
		"citiesVisible" : true, // Linked to the checkbox for this element. If the cities are visible or not
		"citiesVisibleLimit" : 250000, // Linked to the range input for showing cities
		"modificationModeOn" : false, // Are we in modification mode, where an admin can move elements

		/* TEMPORARILY STORED DATA */
		"tooltipData" : null, // Data stored for use in the hover arc tooltip
		"tooltipOffsetPosition" : null,// Positon of the for hover out events
		"currentDragEventLatLon" : null, // Temporary storage of a drag event for updating the database	
	},

	data:function(){
		if (this.get("network") === "gp") return this.get("gpdata");
		if (this.get("network") === "sp") return this.get("spdata");
	},

	initialize:function(options){
		// Ratio is defined in the model
		var mapRatio = parseInt(this.get("mapRatio").split(":")[1]) / 10;
		// Width comes from the width of the div we have via jquery
		this.set("width",options.mapWidth);
		// Height is width * by the ratio defined
		this.set("height",options.mapWidth * mapRatio);
		// The default scale is set as triple the defined with
		this.set("defaultScale",options.mapWidth * 3);
		// Data and version
		this.set("gpdata",options.gpdata);
		this.set("spdata",options.spdata);
		this.set("server",options.server);
		this.set("device",options.device);
	},

	increaseLevel: function(data){
		if (data.level === 0) this.set("currentRegion",data.name);
		if (data.level === 1) this.set("currentSector",data.name);
		if (data.level === 2) this.set("currentUgaGroup", data.name);
		this.set("level", this.get("level") + 1);
	},

	decreaseLevel: function(data){
		this.set("level", this.get("level") - 1);
	},

	changeNetwork: function(changeTo) {
		if (changeTo === "gp") {
			this.set("network","gp");
			this.set("deepestLevel",2);
		}
		if (changeTo === "sp") {
			this.set("network","sp");
			this.set("deepestLevel",3);
		}
		this.set("level",0);
	},

	//----------------------------------------------------------------------------------------------------
	// FUNCTIONS FOR GETTING DATA
	// getData() returns sector data for the level we are currently on
	// getCities() returns city data depending on the level of zoom and current bounding box
	// getRegion() getSectors() getUgagroupes() getUgas() return data for the specific level 
	// prepareSegmentaionDataArray() and prepareQuotasDataArray() prepare the server data for the regions
	// getSectors funcion has some flags for SPCorse region
	//-----------------------------------------------------------------------------------------------------

	getData: function(){
		var level = this.get("level");
		var network = this.get("network");
		if (level === 0) return this.getRegions();
		if (level === 1) return this.getSectors();
		if (level === 2) {
			if (network === "gp") return this.getUgas();
			if (network === "sp") return this.getUgaGroups();
		}
		if (level === 3) return this.getUgas();
	},

	getRegions:function(){
		var _this = this;
		var data = this.data();
		var regionsArray = [];
		for (var key in data) {
			if (_this.get("reservedKeys").indexOf(key) === -1) {
				var visits = _this.get("server") && key !== "SPCorse" ? ((data[key].contacts.visited / data[key].contacts.total) * 100).toFixed(2) : parseFloat((Math.random() * 100 +1).toFixed(2));
				if (isNaN(visits)) visits = 0;
				regionsArray.push({
					lat: data[key].lat,
					lon: data[key].lon,
					name: key,
					level: 0,
					visits: visits,
					nonVisits : 100 - visits, 

					segmentation: _this.prepareSegmentationDataArray(data,key),
					quotas: _this.prepareQuotaDataArray(data,key),
				});
		 	}
		}
		return regionsArray;
	},


	getSectors:function(){
		var corsicaFlagRegion = "SPCorse";
		var corsicaFlagSectors = ["20AJA","20BAS","20CAL","20SAR"];
		var sectorsArray = [];
		var _this = this;
		var data = this.data();
		var region = this.get("currentRegion");
		for (var key in data[region]) {
			if (_this.get("reservedKeys").indexOf(key) === -1) {
				var visits = _this.get("server") ? ((data[region][key].contacts.visited / data[region][key].contacts.total) * 100).toFixed(2) : parseFloat((Math.random() * 100 +1).toFixed(2));
				if (isNaN(visits)) visits = 0;
				sectorsArray.push({
					lat: data[region][key].lat,
					lon: data[region][key].lon,
					name: key,
					level: 1,
					visits: visits,
					nonVisits : 100 - visits, 

					segmentation: _this.prepareSegmentationDataArray(data[region],key),
					quotas: _this.prepareQuotaDataArray(data[region],key),

					corsicaFlag: (region === corsicaFlagRegion && (corsicaFlagSectors.indexOf(key) !== -1)) ? true : false,
				});
			}
		}
		return sectorsArray;
	},

	getUgaGroups:function(){
		var _this = this;
		var data = this.data();
		var region = this.get("currentRegion");
		var sector = this.get("currentSector");
		var ugaGroupsArray = [];
		for (var key in data[region][sector]) {
			if (_this.get("reservedKeys").indexOf(key) === -1) {
				var visits = _this.get("server") ? ((data[region][sector][key].contacts.visited / data[region][sector][key].contacts.total) * 100).toFixed(2) : parseFloat((Math.random() * 100 +1).toFixed(2));
				if (isNaN(visits)) visits = 0;
				ugaGroupsArray.push({
					lat: data[region][sector][key].lat,
					lon: data[region][sector][key].lon,
					name: key,
					level: 2,
					visits: visits,
					nonVisits : 100 - visits, 

					segmentation: _this.prepareSegmentationDataArray(data[region][sector],key),
					quotas: _this.prepareQuotaDataArray(data[region][sector],key),
				});
			} 
		}
		return ugaGroupsArray;
	},


	getUgas:function(){
		var _this = this;
		var data = this.data();
		var region = this.get("currentRegion");
		var sector = this.get("currentSector");
		var ugaGroup = this.get("currentUgaGroup");
		var ugasArray = [];

		var selectedData = this.get("network") === "gp" ? data[region][sector] : data[region][sector][ugaGroup];
		var level = this.get("network") === "gp" ? 2 : 3;

		for (var key in selectedData) {
			if (_this.get("reservedKeys").indexOf(key) === -1) {
				var visits = _this.get("server") ? ((selectedData[key].contacts.visited / selectedData[key].contacts.total) * 100).toFixed(2) : parseFloat((Math.random() * 100 +1).toFixed(2));
				if (isNaN(visits)) visits = 0;
				ugasArray.push({
					lat: selectedData[key].lat,
					lon: selectedData[key].lon,
					name: key,
					level: level,
					visits: visits,
					nonVisits : 100 - visits,

					segmentation: _this.prepareSegmentationDataArray(selectedData,key),
					quotas: _this.prepareQuotaDataArray(selectedData,key),
				});

			} 
		}
		return ugasArray;
	},


	prepareSegmentationDataArray:function(selectedData,key){
		var _this = this;
		if (selectedData[key].segmentation === null) return null;
		var segments = this.get("pieLegendSegmentation");
		var segmentation = {};
		segments.forEach(function(seg){
			segmentation[seg.measure] = _this.get("server") ? selectedData[key].segmentation[seg.measure] : Math.floor((Math.random() * 1000) + 1);
		});
		return segmentation;
	},

	prepareQuotaDataArray:function(selectedData,key){
		var _this = this;
		var products = this.get("barProducts");
		var quotas = {};
		products.forEach(function(prod){
			quotas[prod] = _this.get("server") ? Math.round(selectedData[key].quotas[prod]) : Math.floor((Math.random() * 100) + 51);
		});
		return quotas;
	},

	getCities:function(currentScale){
		var boundingBox = this.get("currentBoundingBox") ? this.get("currentBoundingBox") : this.get("defaultBoundingBox");
		var levelMinPopulation;
		switch (this.get("level")) {
		    case 0:
		        levelMinPopulation = 100000;
		        break;
		    case 1:
		        levelMinPopulation = 50000;
		        break;
		    case 2:
		        levelMinPopulation = 20000;
		        break;
		}
		var selection = cities.filter(function(obj){
			var pop = parseInt(obj.pop);
			var lon = parseFloat(obj.lon) < Math.max(boundingBox[0][0],boundingBox[1][0]) && parseFloat(obj.lon) > Math.min(boundingBox[0][0],boundingBox[1][0]);
			var lat = parseFloat(obj.lat) < Math.max(boundingBox[0][1],boundingBox[1][1]) && parseFloat(obj.lat) > Math.min(boundingBox[0][1],boundingBox[1][1]);
			return pop > levelMinPopulation && lat && lon;
		});

		return selection;
	},



	//----------------------------------------------------------------------------------------------------
	// AJAX CALLS
	// setNewLatLonForPoint() updates the database with a new lat lon
	//-----------------------------------------------------------------------------------------------------

	setNewLatLonForPoint:function(element){
		var that = this;
		var location = element.name;
		var level = element.level;
		var network = this.get("network");
		var newPosition = this.get("currentDragEventLatLon");

		var data = {
			location: location,
			level: level,
			network: network.toUpperCase(),
			lon: newPosition[0],
			lat: newPosition[1],
			version: that.get("server") ? "mylan" : "local",
		}
		//SERVER var url = Config.rootUrl + "/index.php?option=com_router&target=change_lat_lon";
		var url = "./php/update_lat_lon.php";
		$.ajax(url,{
			method: "POST",
			data: data,
			success: function (data){

			var data = network ==="gp" ? that.get("gpdata") : that.get("spdata");

			if (network === "gp") {
				for (var key in data) {
					if (level === 0 && key === location) {
						console.log("updating a GP region");
						data[key].lat = newPosition[1]; data[key].lon = newPosition[0];
					} else {
						for (var key2 in data[key]) {
							if (level === 1 && key2 === location) {
								console.log("Updating a GP Secteur");
								data[key][key2].lat = newPosition[1]; data[key][key2].lon = newPosition[0];
							} else {
								for (var key3 in data[key][key2]) {
									if (level === 2 && key3 === location) {
										console.log("Updating a GP uga");
										data[key][key2][key3].lat = newPosition[1]; data[key][key2][key3].lon = newPosition[0];
									}
								}
							}
						}
					}
				}
				that.set("gpdata",data);	
			} else if (network === "sp") {
				for (var key in data) {
					if (level === 0 && key === location) {
						console.log("updating a SP region");
						data[key].lat = newPosition[1]; data[key].lon = newPosition[0];
					} else {
						for (var key2 in data[key]) {
							if (level === 1 && key2 === location) {
								console.log("Updating a SP Secteur");
								data[key][key2].lat = newPosition[1]; data[key][key2].lon = newPosition[0];
							} else {
								for (var key3 in data[key][key2]) {
									if (level === 2 && key3 === location) {
										console.log("Updating a SP ugagroup");
										data[key][key2][key3].lat = newPosition[1]; data[key][key2][key3].lon = newPosition[0];
									} else {
										for (var key4 in data[key][key2][key3]) {
											if (level === 3 && key4 === location) {
												console.log("Updating a SP uga");
												data[key][key2][key3][key4].lat = newPosition[1]; data[key][key2][key3][key4].lon = newPosition[0];
											}
										}
									}
								}
							}
						}
					}
				}
				that.set("spdata",data);
			}


			},
			error:function(e){
				alert("There was an error updating the location");
			},
		});
	},

	/*******************************************************************************************
	/ FUNCTION TO CALCULATE LOGICAL TOOLTIP POSITION BASED ON PROJECTION AND POSITION OF ELEMENT
	params
	projection - projection of our map
	elementObject - The tooltip we will be placing
	element - The original element the tooltip is aligned to
	elementSize - the size of the tooltip element
	********************************************************************************************/

	calculateTooltipPosition:function(projection,elementObject,element,elementSize){
		var proj = projection([element.lon,element.lat]);  
		var elementX = proj[0];
		var elementY = proj[1];

		var mapBox = d3.select('#franceMap').node().getBBox();
		var zoomBox = d3.select('#zoomgroup').node().getBBox();
		var scale = mapBox.width/zoomBox.width;
		var top = zoomBox.y - (mapBox.y / (scale));
		var left = zoomBox.x - (mapBox.x / (scale));
		var right = left + zoomBox.width/scale;
		var bottom = top + zoomBox.height/scale;

		// calculations of offsets
		var offsetY = (elementY - ((elementSize + 10)/scale) < top) ? elementObject.height * scale + elementSize + 10 : -10;
		var offsetX = 0;
		if ((elementSize/scale)/2 > elementX - left) {
			offsetX = elementSize/2 + 15;
			if (elementY - (elementSize/scale/2) < top)  offsetY = elementObject.height * scale + -(elementSize) + 10;
			if (elementY + (elementSize/scale/2) > bottom) offsetY = -10;
			else offsetY = 100;
		}
		if (elementX > right) {
			offsetX = -(elementSize/2) - 15;
			if (elementY - (elementSize/scale/2) < top)  offsetY = elementObject.height * scale + -(elementSize) + 10;
			if (elementY + (elementSize/scale/2) > bottom)  offsetY = -10;
			else offsetY = 100;
		}
		this.storeTooltipOffsetAlignment(offsetY,offsetX);
		return [offsetY,offsetX];
		
	},

	storeTooltipOffsetAlignment:function(y,x){
		var direction;
		if (x === 0) {
			direction = y < 0 ? "top" : "bottom";
		} else {
			direction = x < 0 ? "left" : "right";
		}
		this.set("tooltipOffsetPosition",direction)
	},

});

//SERVER module.exports = MapModel;
/* jshint ignore:end */