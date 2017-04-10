MapModel = Backbone.Model.extend({

	defaults: {
		// Defined attribute
		"width" : 800, // Width of the svg element
		"height" : 600, // Height of the svg element
		"reservedKeys" : ["loc","lat","lon"], // Reserved keys in the current data array
		"defaultCenter" : [4.8, 47.35], // Default centre (France)
		"defaultScale" : 2400, // Default scale (France)
		"deepestLevel" : 2,  // Maximum level that can be drilled to
		"pieColors" : ["#5bc0de","#5cb85c","#d9534f","#428bca"], // Colours to use in the segments of the pies
		"mapColors" : ["red","green","blue","yellow","orange","purple","cyan","indigo","black","brown"],

		"defaultBoundingBox" : [[100,100],[-100,-100]], // Default bounding box [[max longitude, max latitiude],[min longitude, in latitiude]]
		// Dynamic attributes
		"level" : 0, // Level of drilling of data
		"currentRegion" : null, // Current region selected for setting data
		"currentSector" : null, // Current secot select for setting data
		"currentBoundingBox" : null, // Current bounding box to draw within lat/lon bounds
		"currentAutoZoomEvent" : null, // Records an auto zoom event temporarily to link into manual zoom
		"currentCities" : null,
		"currentRegions" : null,

		"citiesVisible" : true, // Linked to the checkbox for this element. If the cities are visible or not
		"citiesVisibleLimit" : 250000,

		"citiesWithGroupedUgas" : ["BREST","VANNES","RENNES","CAEN","MANS","NANTES","ANGERS","DUNKERQUE","LILLE",
		"AMIENS","REIMS","TROYES","STRASBOURG","MULHOUSE","COLMAR","NANCY","METZ","BESANCON","BELFORT","TOURS",
		"CLERMONT-FERRAND","NIORT","LYON","VILLEURBANNE","SAINT-ETIENNE","VALENCE","CHAMBERY","GRENOBLE","BORDEAUX","PAU",
		"TOULOUSE","NIMES","MONTPELLIER","PERPIGNAN","MARSEILLE","AIX-EN-PROVENCE","ANTIBES","NICE"],
	},

	
	increaseLevel: function(data){
		if (data.level === 0) this.set("currentRegion",data.name);
		if (data.level === 1) this.set("currentSector",data.name);
		this.set("level", this.get("level") + 1);
	},

	decreaseLevel: function(data){
		this.set("level", this.get("level") - 1);
	},

	//----------------------------------------------------------------------------------------------------
	// FUNCTIONS FOR GETTING DATA
	// getData() returns sector data for the level we are currently on
	// getCities() returns city data depending on the level of zoom and current bounding box
	//-----------------------------------------------------------------------------------------------------

	getData: function(){
		var level = this.get("level");
		if (level === 0) return this.getRegions();
		if (level === 1) return this.getSectors();
		if (level === 2) return this.getUgas();
	},

	getRegions:function(){
		var _this = this;
		var regionsArray = [];
		for (var key in data) {
			if (_this.get("reservedKeys").indexOf(key) === -1) regionsArray.push({
				lat: data[key].lat,
				lon: data[key].lon,
				name: key,
				level: 0,
				contacts: Math.floor(Math.random() * 100),
				visits: Math.floor(Math.random() * 100),
				doctors: Math.floor(Math.random() * 100),
			});
		}
		return regionsArray;
	},


	getSectors:function(){
		var _this = this;
		var region = this.get("currentRegion");
		var sectorsArray = [];
		for (var key in data[region]) {
			if (_this.get("reservedKeys").indexOf(key) === -1) sectorsArray.push({
				lat: data[region][key].lat,
				lon: data[region][key].lon,
				name: key,
				level: 1,
				contacts: Math.floor(Math.random() * 100),
				visits: Math.floor(Math.random() * 100),
				doctors: Math.floor(Math.random() * 100),
			});
		}
		return sectorsArray;
	},


	getUgas:function(region,sector){
		var _this = this;
		var region = this.get("currentRegion");
		var sector = this.get("currentSector");
		var ugasArray = [];
		for (var key in data[region][sector]) {
			if (_this.get("reservedKeys").indexOf(key) === -1) ugasArray.push({
				lat: data[region][sector][key].lat,
				lon: data[region][sector][key].lon,
				name: key,
				level: 2,
				contacts: Math.floor(Math.random() * 100),
				visits: Math.floor(Math.random() * 100),
				doctors: Math.floor(Math.random() * 100),
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
				if (clashes.indexOf(e) === -1) clashes.push(e);
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

	//----------------------------------------------------------------------------------------------------
	// FUNCTIONS TO RETURN TEST DATA
	// One function each for returning test data in bar format, and pie format
	//-----------------------------------------------------------------------------------------------------

	getTestContactsData:function(dataArray){
		// Array of objects {name:"01", value:894, measure:"contacts", lat:47.97, lon:-1.58};
		// One object is needed for each measure. Identified by "name" of the region and "measure" of the value
		var contactsData = [];
		for (var key in dataArray) {
			contactsData.push({
				name: dataArray[key].name,
				lat: dataArray[key].lat,
				lon: dataArray[key].lon,
				measure: "contacts",
				value: Math.floor((Math.random() * 500) + 500),
			});

			contactsData.push({
				name: dataArray[key].name,
				lat: dataArray[key].lat,
				lon: dataArray[key].lon,
				measure: "visits",
				value: Math.floor((Math.random() * 500) + 500),
			});
		}
		return contactsData;
	},

	getTestPieData:function(dataArray){
		// Array of objects {name:"01", param1:10, param2:12, param3:24, param4:12, lat:47.97, lon:-1.58};
		var pieData = [];
		for (var key in dataArray) {
			pieData.push({
				name: dataArray[key].name,
				contacts: Math.floor(Math.random() * 10),
				visits: Math.floor(Math.random() * 10),
				doctors: Math.floor(Math.random() * 10),
				lat: dataArray[key].lat,
				lon: dataArray[key].lon,
			})
		}
		return pieData;
	},

	/*function compare(a,b) {
	  if (a.name < b.name)
	    return -1;
	  if (a.name > b.name)
	    return 1;
	  return 0;
	}
	regions.sort(compare);*/


});
