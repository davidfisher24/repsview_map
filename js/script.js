window.onload = function() {

	var options = {
		mapWidth: $('#map').width(),
		mapHeight: $(window).height() - $('#map').offset().top,
		gpdata: gpdata,
		spdata: spdata,
	}

	var mapModel = new MapModel(options);
	var mapView = new MapView({model: mapModel});
}