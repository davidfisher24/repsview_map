window.onload = function() {

	function getData(){
		var url = "./php/get_geo_data.php";
		return $.ajax(url,{
			method: "GET",
			dataType : "json",
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
			mapHeight: $('#map').width(),
			gpdata: data.gpData,
			spdata: data.spData,
		}

		var mapModel = new MapModel(options);
		var mapView = new MapView({model: mapModel});
	})
			
	
}