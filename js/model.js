MapModel = Backbone.Model.extend({

	defaults: {
		// version
		"server" : false,
		// Data for GP and SP networks
		"gpdata" : "",
		"spdata" : "",
		"network" : "gp",
		// Defined attribute
		"width" : 800, // Width of the svg element
		"height" : 600, // Height of the svg element
		"reservedKeys" : ["lat","lon","segmentation"], // Reserved keys in the current data array
		"defaultCenter" : [4.8, 47.35], // Default centre (France)
		"defaultScale" : 2400, // Default scale (France)
		"deepestLevel" : 2,  // Maximum level that can be drilled to. Is set to 2 for gp and 3 for sp.
		"pieColors" :  ['#CC0000', '#007E33'], // Colours to use in the segments of the pies
		// bar colour experiments
		//"barColors" : ["#7cb5ec","#434348","#90ed7d","#f7a35c","#8085e9","#f15c80"], // Stolen from highcharts
		"barColors" : ['#aa66cc','#4285F4','#00C851','#ffbb33','#ff4444'],  // Lilettes design

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
		"currentDragEventLatLon" : null, // Temporary storage of a drag event for updating the database
		"modificationModeOn" : false, // Are we in modification mode, where an admin can move elements
	},

	data:function(){
		if (this.get("network") === "gp") return this.get("gpdata");
		if (this.get("network") === "sp") return this.get("spdata");
	},

	initialize:function(options){
		this.set("width",options.mapWidth);
		this.set("height",options.mapHeight);
		this.set("gpdata",options.gpdata);
		this.set("spdata",options.spdata);
		this.set("server",options.server);
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
				ajout_vm : _this.get("server") ? data[key].segmentation.ajout_vm : Math.floor((Math.random() * 1000) + 1),
	            geriatrie : _this.get("server") ? data[key].segmentation.geriatrie : Math.floor((Math.random() * 1000) + 1), 
	            chirugerie : _this.get("server") ?  data[key].segmentation.chirugerie : Math.floor((Math.random() * 1000) + 1),
	            cardio : _this.get("server") ?  data[key].segmentation.cardio : Math.floor((Math.random() * 1000) + 1),
	            uro : _this.get("server") ? data[key].segmentation.uro : Math.floor((Math.random() * 1000) + 1),
	            rhumato : _this.get("server") ? data[key].segmentation.rhumato : Math.floor((Math.random() * 1000) + 1),
	            douleur : _this.get("server") ?  data[key].segmentation.douleur : Math.floor((Math.random() * 1000) + 1),
	            urg_anest : _this.get("server") ?  data[key].segmentation.urg_anest : Math.floor((Math.random() * 1000) + 1), 
	            conquerir : _this.get("server") ?  data[key].segmentation.conquerir : Math.floor((Math.random() * 1000) + 1),
	            fideliserG : _this.get("server") ? data[key].segmentation.fideliserG : Math.floor((Math.random() * 1000) + 1),
	            fideliserM : _this.get("server") ?  data[key].segmentation.fideliserM : Math.floor((Math.random() * 1000) + 1),
	            VIP : _this.get("server") ? data[key].segmentation.VIP : Math.floor((Math.random() * 1000) + 1), 
	            pharm_hosp : _this.get("server") ? data[key].segmentation.pharm_hosp : Math.floor((Math.random() * 1000) + 1),
	            arv : _this.get("server") ? data[key].segmentation.arv : Math.floor((Math.random() * 1000) + 1),
	            muco : _this.get("server") ? data[key].segmentation.muco : Math.floor((Math.random() * 1000) + 1),
	            gastro : _this.get("server") ? data[key].segmentation.gastro : Math.floor((Math.random() * 1000) + 1),
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

				ajout_vm : _this.get("server") ? data[region][key].segmentation.ajout_vm : Math.floor((Math.random() * 1000) + 1),
	            geriatrie : _this.get("server") ? data[region][key].segmentation.geriatrie : Math.floor((Math.random() * 1000) + 1), 
	            chirugerie : _this.get("server") ?  data[region][key].segmentation.chirugerie : Math.floor((Math.random() * 1000) + 1),
	            cardio : _this.get("server") ?  data[region][key].segmentation.cardio : Math.floor((Math.random() * 1000) + 1),
	            uro : _this.get("server") ? data[region][key].segmentation.uro : Math.floor((Math.random() * 1000) + 1),
	            rhumato : _this.get("server") ? data[region][key].segmentation.rhumato : Math.floor((Math.random() * 1000) + 1),
	            douleur : _this.get("server") ?  data[region][key].segmentation.douleur : Math.floor((Math.random() * 1000) + 1),
	            urg_anest : _this.get("server") ?  data[region][key].segmentation.urg_anest : Math.floor((Math.random() * 1000) + 1), 
	            conquerir : _this.get("server") ?  data[region][key].segmentation.conquerir : Math.floor((Math.random() * 1000) + 1),
	            fideliserG : _this.get("server") ? data[region][key].segmentation.fideliserG : Math.floor((Math.random() * 1000) + 1),
	            fideliserM : _this.get("server") ?  data[region][key].segmentation.fideliserM : Math.floor((Math.random() * 1000) + 1),
	            VIP : _this.get("server") ? data[region][key].segmentation.VIP : Math.floor((Math.random() * 1000) + 1), 
	            pharm_hosp : _this.get("server") ? data[region][key].segmentation.pharm_hosp : Math.floor((Math.random() * 1000) + 1),
	            arv : _this.get("server") ? data[region][key].segmentation.arv : Math.floor((Math.random() * 1000) + 1),
	            muco : _this.get("server") ? data[region][key].segmentation.muco : Math.floor((Math.random() * 1000) + 1),
	            gastro : _this.get("server") ? data[region][key].segmentation.gastro : Math.floor((Math.random() * 1000) + 1),

				creon: Math.floor((Math.random() * 100) + 51),
				tarka: Math.floor((Math.random() * 100) + 51),
				lamaline: Math.floor((Math.random() * 100) + 51),
				dymista: Math.floor((Math.random() * 100) + 51),
				ceris: Math.floor((Math.random() * 100) + 51),
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

				ajout_vm : Math.floor((Math.random() * 1000) + 1),
	            geriatrie :  Math.floor((Math.random() * 1000) + 1), 
	            chirugerie : Math.floor((Math.random() * 1000) + 1),
	            cardio : Math.floor((Math.random() * 1000) + 1),
	            uro : Math.floor((Math.random() * 1000) + 1),
	            rhumato : Math.floor((Math.random() * 1000) + 1),
	            douleur : Math.floor((Math.random() * 1000) + 1),
	            urg_anest : Math.floor((Math.random() * 1000) + 1), 
	            conquerir : Math.floor((Math.random() * 1000) + 1),
	            fideliserG : Math.floor((Math.random() * 1000) + 1),
	            fideliserM : Math.floor((Math.random() * 1000) + 1),
	            VIP : Math.floor((Math.random() * 1000) + 1), 
	            pharm_hosp : Math.floor((Math.random() * 1000) + 1),
	            arv : Math.floor((Math.random() * 1000) + 1),
	            muco : Math.floor((Math.random() * 1000) + 1),
	            gastro : Math.floor((Math.random() * 1000) + 1),

				creon: Math.floor((Math.random() * 100) + 51),
				tarka: Math.floor((Math.random() * 100) + 51),
				lamaline: Math.floor((Math.random() * 100) + 51),
				dymista: Math.floor((Math.random() * 100) + 51),
				ceris: Math.floor((Math.random() * 100) + 51),
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

				ajout_vm : Math.floor((Math.random() * 1000) + 1),
	            geriatrie :  Math.floor((Math.random() * 1000) + 1), 
	            chirugerie : Math.floor((Math.random() * 1000) + 1),
	            cardio : Math.floor((Math.random() * 1000) + 1),
	            uro : Math.floor((Math.random() * 1000) + 1),
	            rhumato : Math.floor((Math.random() * 1000) + 1),
	            douleur : Math.floor((Math.random() * 1000) + 1),
	            urg_anest : Math.floor((Math.random() * 1000) + 1), 
	            conquerir : Math.floor((Math.random() * 1000) + 1),
	            fideliserG : Math.floor((Math.random() * 1000) + 1),
	            fideliserM : Math.floor((Math.random() * 1000) + 1),
	            VIP : Math.floor((Math.random() * 1000) + 1), 
	            pharm_hosp : Math.floor((Math.random() * 1000) + 1),
	            arv : Math.floor((Math.random() * 1000) + 1),
	            muco : Math.floor((Math.random() * 1000) + 1),
	            gastro : Math.floor((Math.random() * 1000) + 1),

				creon: Math.floor((Math.random() * 100) + 51),
				tarka: Math.floor((Math.random() * 100) + 51),
				lamaline: Math.floor((Math.random() * 100) + 51),
				dymista: Math.floor((Math.random() * 100) + 51),
				ceris: Math.floor((Math.random() * 100) + 51),
			});
		}
		return ugasArray;
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

		// Temporary - used for deltecting collisions
		selection.forEach(function(e,i){
			for (var a=0; a<i; a++) {
				if (Math.abs((e.x - selection[a].x) * currentScale) < 10 &&  Math.abs((e.y - selection[a].y) * currentScale) < 10)
					console.log("overlap between " + selection[a].name + " and " + e.name);
			}
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
