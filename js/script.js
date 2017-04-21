window.onload = function() {

	// VERSION OPTIONS => "local" or "mylan"
	var version = "local"; 
	var server = version === "mylan" ? true : false;

	function getData(){
		var url = "./php/get_geo_data.php";
		return $.ajax(url,{
			method: "POST",
			dataType : "json",
			data: {
				version: version,
			},
			success: function (data){

			},
			error:function(e){
				console.log(e);
			},
		});
	}

	
	$.when(getData()).then(function(data){
		var options = {
			mapWidth: $('#map').width(),
			mapHeight: Math.ceil($('#map').width() * 0.715),
			gpdata: data.gpData,
			spdata: data.spData,
			server: server,
		}

		var mapModel = new MapModel(options);
		var mapView = new MapView({model: mapModel});
	})
			
	
}