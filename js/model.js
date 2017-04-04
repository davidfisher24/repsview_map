MapModel = Backbone.Model.extend({

	defaults: {
		"width" : 800, // Width of the svg element
		"height" : 600, // Height of the svg element
		"reservedKeys" : ["loc","lat","lon"], // Reserved keys in the current data array
		"defaultCenter" : [2.5, 47.4], // Default centre (France)
		"defaultScale" : 2400, // Default scale (France)
		"level" : 0, // Level of drilling of data
		"deepestLevel" : 2,  // Maximum level that can be drilled to
		"currentRegion" : null, // Current region selected for setting data
		"currentSector" : null, // Current secot select for setting data
		"pieColors" : ["#5bc0de","#5cb85c","#d9534f","#428bca"], // Colours to use in the segments of the pies
		"currentBoundingBox" : null, // Current bounding box to draw within lat/lon bounds
		"defaultBoundingBox" : [[100,100],[-100,-100]], // Default bounding box [[max longitude, max latitiude],[min longitude, in latitiude]]
	},

	getData: function(){
		var level = this.get("level");
		if (level === 0) return this.getRegions();
		if (level === 1) return this.getSectors();
		if (level === 2) return this.getUgas();
	},

	increaseLevel: function(data){
		if (data.level === 0) this.set("currentRegion",data.name);
		if (data.level === 1) this.set("currentSector",data.name);
		this.set("level", this.get("level") + 1);
	},

	decreaseLevel: function(data){
		this.set("level", this.get("level") - 1);
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
			});
		}
		return ugasArray;
	},

	getCities:function(){
		var boundingBox = this.get("currentBoundingBox") ? this.get("currentBoundingBox") : this.get("defaultBoundingBox");
		var levelMinPopulation;
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
			return pop > levelMinPopulation && lat && lon;
		});
		return selection;

	},

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
	}


});
