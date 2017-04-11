window.onload = function() {
  var options = {
  	mapSize: $('#map').width(),
  }

  var mapModel = new MapModel(options);
  var mapView = new MapView({model: mapModel});
}