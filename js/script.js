window.onload = function() {

	// VERSION OPTIONS => "local" or "mylan"
	var version = "mylan"; 
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

	function testIsMobile() {
		var test = {
			Android: function() {
				return navigator.userAgent.match(/Android/i);
			},
			BlackBerry: function() {
				return navigator.userAgent.match(/BlackBerry/i);
			},
			iOS: function() {
				return navigator.userAgent.match(/iPhone|iPad|iPod/i);
			},
			Opera: function() {
				return navigator.userAgent.match(/Opera Mini/i);
			},
			Windows: function() {
				return navigator.userAgent.match(/IEMobile/i);
			},
			any: function() {
				return (test.Android() || test.BlackBerry() || test.iOS() || test.Opera() || test.Windows());
			}
		};

		if (test.any() === null) {
			return "desktop";
		} else {
			return "mobile";
		}
	};


	$.when(getData()).then(function(data){
		var options = {
			mapWidth: $('#map').width(),
			gpdata: data.gpData,
			spdata: data.spData,
			server: server,
			device: testIsMobile(),
		}

		var mapModel = new MapModel(options);
		var mapView = new MapView({model: mapModel});
	})
			
	
}