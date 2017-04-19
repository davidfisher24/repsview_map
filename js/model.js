MapModel = Backbone.Model.extend({

	defaults: {
		// Data for GP and SP networks
		"gpdata" : "",
		"spdata" : "",
		"network" : "gp",
		// Defined attribute
		"width" : 800, // Width of the svg element
		"height" : 600, // Height of the svg element
		"reservedKeys" : ["loc","lat","lon"], // Reserved keys in the current data array
		"defaultCenter" : [4.8, 47.35], // Default centre (France)
		"defaultScale" : 2400, // Default scale (France)
		"deepestLevel" : 2,  // Maximum level that can be drilled to. Is set to 2 for gp and 3 for sp.
		"pieColors" :  ['#55BF3B', '#DF5353'], // Colours to use in the segments of the pies
		"barColors" : ["#7cb5ec","#434348","#90ed7d","#f7a35c","#8085e9","#f15c80"],

		"pieLegendSegmentation" :  [
			{measure: "vip", color: '#7cb5ec', label: "VIP"}, 
			{measure: "priortitar", color: '#434348', label: "Prior."}, 
			{measure: "fideliserG", color: '#90ed7d', label: "Fid. G"}, 
			{measure: "fideliserM", color: '#f7a35c', label: "Fid. M"}, 
			{measure: "conquerir", color: '#8085e9', label: "Conq"}, 
			{measure: "rhumato", color: '#f15c80', label: "Rhumato"}, 
			{measure: "pharmHosp", color: '#e4d354', label: "Ph Hosp"}, 
			{measure: "geriatrie", color: '#2b908f', label: "Geriatrie"}, 
			{measure: "chirugerie", color: '#f45b5b', label: "Chir"}, 
			{measure: "douleur", color: '#91e8e1', label: "Douleur"}, 
			{measure: "cardio", color: '#DA70D6', label: "Cardio"}, 
			{measure: "uro", color: '#1E90FF', label: "Uro"}, 
			{measure: "gastro", color: '#E0F000', label: "Gastro"},
			{measure: "muco", color: '#AA4643', label: "Muco"},
			{measure: "arv", color: '#89A54E', label: "ARC"},
			{measure: "autres", color: '#80699B', label: "Autres"}
		],

		"defaultBoundingBox" : [[100,100],[-100,-100]], // Default bounding box [[max longitude, max latitiude],[min longitude, in latitiude]]
		"currentBoundingBox" : null, // Current bounding box [[max longitude, max latitiude],[min longitude, in latitiude]]
		"currentMapBounds" : null, // current ouzel bounds of the map
		// Dynamic attributes
		"level" : 0, // Level of drilling of data
		"currentRegion" : null, // Current region selected for setting data
		"currentSector" : null, // Current secot select for setting data
		"currentUgaGroup" : null, // Current uga group selected for setting data

		
		"currentCities" : null,
		"currentRegions" : null,

		"citiesVisible" : true, // Linked to the checkbox for this element. If the cities are visible or not
		"citiesVisibleLimit" : 250000,

		"infoPanelDefault" : "<p class='panel-title'>To see more information about a level, select the element from the tree or the map.</p>",
		"tooltipData" : null, // Problematic. This needs to be handled differently, but is the only way to get data back to the tooltip
	},

	data:function(){
		if (this.get("network") === "gp") return this.get("gpdata");
		if (this.get("network") === "sp") return this.get("spdata");
	},

	initialize:function(options){
		console.log(options);
		this.set("width",options.mapWidth);
		this.set("height",options.mapHeight);
		this.set("gpdata",options.gpdata);
		this.set("spdata",options.spdata);
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
			var visits = parseFloat((Math.random() * 100 +1).toFixed(2));
			if (_this.get("reservedKeys").indexOf(key) === -1) regionsArray.push({
				lat: data[key].lat,
				lon: data[key].lon,
				name: key,
				level: 0,
				visits: visits,
				nonVisits : 100 - visits, 
				vip: Math.floor((Math.random() * 1000) + 1),
				priortitar: Math.floor((Math.random() * 1000) + 1),
				fideliserG: Math.floor((Math.random() * 1000) + 1),
				fideliserM: Math.floor((Math.random() * 1000) + 1),
				conquerir: Math.floor((Math.random() * 1000) + 1),
				rhumato: Math.floor((Math.random() * 1000) + 1),
				pharmHosp: Math.floor((Math.random() * 1000) + 1),
				geriatrie: Math.floor((Math.random() * 1000) + 1),
				chirugerie: Math.floor((Math.random() * 1000) + 1),
				douleur: Math.floor((Math.random() * 1000) + 1),
				cardio: Math.floor((Math.random() * 1000) + 1),
				uro: Math.floor((Math.random() * 1000) + 1),
				gastro: Math.floor((Math.random() * 1000) + 1),
				muco: Math.floor((Math.random() * 1000) + 1),
				arv: Math.floor((Math.random() * 1000) + 1),
				creon: Math.floor((Math.random() * 100) + 51),
				tarka: Math.floor((Math.random() * 100) + 51),
				lamaline: Math.floor((Math.random() * 100) + 51),
				dymista: Math.floor((Math.random() * 100) + 51),
				ceris: Math.floor((Math.random() * 100) + 51),
			});
		}
		return regionsArray;
	},


	getSectors:function(){
		var corsicaFlagRegion = "SPCorse";
		var corsicaFlagSectors = ["20AJA","20BAS","20CAL","20SAR"];

		var _this = this;
		var data = this.data();
		var region = this.get("currentRegion");
		var sectorsArray = [];
		for (var key in data[region]) {
			var visits = parseFloat((Math.random() * 100 +1).toFixed(2));
			if (_this.get("reservedKeys").indexOf(key) === -1) sectorsArray.push({
				lat: data[region][key].lat,
				lon: data[region][key].lon,
				name: key,
				level: 1,
				visits: visits,
				nonVisits : 100 - visits, 
				vip: Math.floor((Math.random() * 1000) + 1),
				priortitar: Math.floor((Math.random() * 1000) + 1),
				fideliserG: Math.floor((Math.random() * 1000) + 1),
				fideliserM: Math.floor((Math.random() * 1000) + 1),
				conquerir: Math.floor((Math.random() * 1000) + 1),
				rhumato: Math.floor((Math.random() * 1000) + 1),
				pharmHosp: Math.floor((Math.random() * 1000) + 1),
				geriatrie: Math.floor((Math.random() * 1000) + 1),
				chirugerie: Math.floor((Math.random() * 1000) + 1),
				douleur: Math.floor((Math.random() * 1000) + 1),
				cardio: Math.floor((Math.random() * 1000) + 1),
				uro: Math.floor((Math.random() * 1000) + 1),
				gastro: Math.floor((Math.random() * 1000) + 1),
				muco: Math.floor((Math.random() * 1000) + 1),
				arv: Math.floor((Math.random() * 1000) + 1),
				creon: Math.floor((Math.random() * 100) + 51),
				tarka: Math.floor((Math.random() * 100) + 51),
				lamaline: Math.floor((Math.random() * 100) + 51),
				corsicaFlag: (region === corsicaFlagRegion && (corsicaFlagSectors.indexOf(key) !== -1)) ? true : false,
			});
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
			var visits = parseFloat((Math.random() * 100 +1).toFixed(2));
			if (_this.get("reservedKeys").indexOf(key) === -1) ugaGroupsArray.push({
				lat: data[region][sector][key].lat,
				lon: data[region][sector][key].lon,
				name: key,
				level: 2,
				visits: visits,
				nonVisits : 100 - visits, 
				vip: Math.floor((Math.random() * 1000) + 1),
				priortitar: Math.floor((Math.random() * 1000) + 1),
				fideliserG: Math.floor((Math.random() * 1000) + 1),
				fideliserM: Math.floor((Math.random() * 1000) + 1),
				conquerir: Math.floor((Math.random() * 1000) + 1),
				rhumato: Math.floor((Math.random() * 1000) + 1),
				pharmHosp: Math.floor((Math.random() * 1000) + 1),
				geriatrie: Math.floor((Math.random() * 1000) + 1),
				chirugerie: Math.floor((Math.random() * 1000) + 1),
				douleur: Math.floor((Math.random() * 1000) + 1),
				cardio: Math.floor((Math.random() * 1000) + 1),
				uro: Math.floor((Math.random() * 1000) + 1),
				gastro: Math.floor((Math.random() * 1000) + 1),
				muco: Math.floor((Math.random() * 1000) + 1),
				arv: Math.floor((Math.random() * 1000) + 1),
				creon: Math.floor((Math.random() * 100) + 51),
				tarka: Math.floor((Math.random() * 100) + 51),
				lamaline: Math.floor((Math.random() * 100) + 51),
			});
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
			var visits = parseFloat((Math.random() * 100 +1).toFixed(2));
			if (_this.get("reservedKeys").indexOf(key) === -1) ugasArray.push({
				lat: selectedData[key].lat,
				lon: selectedData[key].lon,
				name: key,
				level: level,
				visits: visits,
				nonVisits : 100 - visits, 
				vip: Math.floor((Math.random() * 1000) + 1),
				priortitar: Math.floor((Math.random() * 1000) + 1),
				fideliserG: Math.floor((Math.random() * 1000) + 1),
				fideliserM: Math.floor((Math.random() * 1000) + 1),
				conquerir: Math.floor((Math.random() * 1000) + 1),
				rhumato: Math.floor((Math.random() * 1000) + 1),
				pharmHosp: Math.floor((Math.random() * 1000) + 1),
				geriatrie: Math.floor((Math.random() * 1000) + 1),
				chirugerie: Math.floor((Math.random() * 1000) + 1),
				douleur: Math.floor((Math.random() * 1000) + 1),
				cardio: Math.floor((Math.random() * 1000) + 1),
				uro: Math.floor((Math.random() * 1000) + 1),
				gastro: Math.floor((Math.random() * 1000) + 1),
				muco: Math.floor((Math.random() * 1000) + 1),
				arv: Math.floor((Math.random() * 1000) + 1),
				creon: Math.floor((Math.random() * 100) + 51),
				tarka: Math.floor((Math.random() * 100) + 51),
				lamaline: Math.floor((Math.random() * 100) + 51),
			});
		}
		return ugasArray;
	},

	getCities:function(){
		var boundingBox = this.get("currentBoundingBox") ? this.get("currentBoundingBox") : this.get("defaultBoundingBox");
		switch (this.get("level")) {
		    case 0:
		        levelMinPopulation = 250000;
		        break;
		    case 1:
		        levelMinPopulation = 100000;
		        break;
		    case 2:
		        levelMinPopulation = 20000;
		        break;
		}

		var selection = cities.filter(function(obj){
			var pop = parseInt(obj.pop);
			var lon = parseFloat(obj.lon) < Math.max(boundingBox[0][0],boundingBox[1][0]) && parseFloat(obj.lon) > Math.min(boundingBox[0][0],boundingBox[1][0]);
			var lat = parseFloat(obj.lat) < Math.max(boundingBox[0][1],boundingBox[1][1]) && parseFloat(obj.lat) > Math.min(boundingBox[0][1],boundingBox[1][1]);
			//return pop > levelMinPopulation && lat && lon;
			return lat && lon;
		});
		return selection;

	},

	/*******************************************************************************************
	/ FUNCTION TO LOOK FOR ELEMENTS OVERLAPPING THE EDGE OF THE MAP (CURRENTLY USED FOR TOOLTIPS)
	* projection - map projection
	* elementObject - original element to be used. Send the bounding box to use the height and width values
	* element - currently the tooptip that will be placed on the map
	* size of the tooltip to be place (current height and widt are the same)
	********************************************************************************************/

	calculateTooltipPosition:function(projection,elementObject,element,elementSize){
		// Projection of current element
		var proj = projection([element.lon,element.lat]);  
		var elementX = proj[0];
		var elementY = proj[1];

		// Caluclations of the space we have to work with (right and top are not quite working)
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
			//offsetY = (offsetY === -10) ? 100 : offsetY/2;
			if (elementY - (elementSize/scale/2) < top)  offsetY = elementObject.height * scale + -(elementSize) + 10;
			if (elementY + (elementSize/scale/2) > bottom) offsetY = -10;
			else offsetY = 100;
		}
		if (elementX > right) {
			offsetX = -(elementSize/2) - 15;
			//offsetY = (offsetY === -10) ? 100 : offsetY/2;
			if (elementY - (elementSize/scale/2) < top)  offsetY = elementObject.height * scale + -(elementSize) + 10;
			if (elementY + (elementSize/scale/2) > bottom)  offsetY = -10;
			else offsetY = 100;
		}
		return [offsetY,offsetX];
		
	},

	/*****************************************************************************************
	/FUNCTION THAT CAN INVESTIAGE COLLISIONS IN PROJECTION BOXES
	* testArray - an array of elements to test against (must include x and y projection values)
	* comparator - x or y
	* projectionPoint - point x or y of original point to test
	* give - number of pixels to test to make a projection box
	* itemLabelname - name of the item to be tested (for console logging instances)
	*****************************************************************************************/

	lookForCollisions:function(testArray,comparator,projectionPoint,give,itemLabelName){
		$.each(testArray, function(index, obj) {
		  if ((projectionPoint >= (obj[comparator] - give)) && projectionPoint <= ((obj[comparator] + give))) {
		  	console.log(itemLabelName + " has a clash at position " + projectionPoint + " .Going to crash into " + obj.name + " with bounds of  " + (obj[comparator] -give) + " to " + (obj[comparator] + give));
		  }
		});
	},

	/*****************************************************************************************
	/FUNCTION TO CHECK UGAS THAT FALL INSIDE A CITY BOUNDS
	* "citiesWithGroupedUgas" is an array of cities stored in the model which have more than one uga in their bounds
	* parameter cities - the array of city object we are about to place
	* parameter dataArray - the array of data of regions we are about to place
	* projection - the current map projection
	* returns all uga inside specific city bounds
	*****************************************************************************************/

	checkUgasThatFallInCities:function(cities,dataArray,projection){
		var that = this;
		var citiesWithUgaGroups = {};
		var returnArray = {
			cities:{

			},
			flag:[],
		};

		$.each(cities,function(index,obj){
			if (that.get("citiesWithGroupedUgas").indexOf(obj.name) !== -1) {
				citiesWithUgaGroups[obj.name] = {x: [obj.x + 5, obj.x - 5], y: [obj.y + 5, obj.y - 5], name: obj.name};
			}
		})

		$.each(dataArray,function(index,obj){
			$.each(citiesWithUgaGroups,function(i,o) {
				var px = projection([obj.lon, obj.lat])[0];
				var py = projection([obj.lon, obj.lat])[1];
				if ((px < o.x[0] && px > o.x[1]) && (py < o.y[0] && px > o.y[1])) {
					if (returnArray.cities[o.name] === undefined) returnArray.cities[o.name] = [];
					returnArray.cities[o.name].push(obj);
					if (returnArray.flag.indexOf(obj.name) === -1) returnArray.flag.push(obj.name);
				}
			})
		})
		return returnArray;
	},

	/*************************************************************************************************************
	/FUNCTION TO TEST BOUNDING BOXES OF CITIES AND CLASHES
	* Tests the original shown area elements for clashes within the bounding boxes
	* Uses second helper function to recursively move through the array, dropping number of test elements each time
	* params - {test element - class name for d3 to find the element it needs to test}, {projection - map projection}
	**************************************************************************************************************/

	testAreaBoundingBoxesForCollisions:function(testElement,projection){
		var boxes = [];
		var clashes = [];
		//var recommendedMovements = [];
		d3.selectAll(testElement).each(function(d,i){
			var proj = projection([d.lon, d.lat]);
			var box = d3.select(this).node().getBBox();
			boxes.push({
				x: [proj[0] + box.x, proj[0] - box.x],
				y: [proj[1] + box.y, proj[1] - box.y],
				name: d.name,
			})
		})

		for (var a=0; a < boxes.length - 1; a++) {
			var check = this.checkBounds(boxes[a], boxes.slice(a + 1));
			if (check) $.each(check,function(i,e){
				if (typeof(e) == 'string' && clashes.indexOf(e) === -1) clashes.push(e);
			})
		}
		

		return clashes;
	},

	checkBounds:function(testElement,testArray){
		var crash = null;
		$.each(testArray,function(index,obj){
			if (testElement.x[0] <= obj.x[1] && testElement.x[1] >= obj.x[0] && testElement.y[0] <= obj.y[1] && testElement.y[1] >= obj.y[0]) {
				crash = [testElement.name,obj.name];
				return false;
			}
		});
		return crash;
	},



});
