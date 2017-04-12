window.onload = function() {

	var options = {
		mapSize: $('#map').width(),
		gpdata: gpdata,
		spdata: spdata,
	}

	var mapModel = new MapModel(options);
	var mapView = new MapView({model: mapModel});
}