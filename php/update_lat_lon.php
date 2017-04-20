<?php


	$location = $_POST["location"];
	$level = intval($_POST["level"]);
	$network = $_POST["network"];
	$lon = $_POST["lon"];
	$lat = $_POST["lat"];

	$servername = "localhost";
	$username = "root";
	$password = "";
	$dbname = "repsview_map";
	$tablename = "sectorisation";

	$sql;

	if ($network === "GP") {
		if ($level === 0) $sql = "UPDATE sectorisation SET lon = $lon, lat = $lat  WHERE reseau = '$network' and region = '$location' and secteur IS NULL and uga IS NULL";
		else if ($level === 1) $sql = "UPDATE sectorisation SET lon = $lon, lat = $lat  WHERE reseau = '$network' and secteur = '$location' and uga IS NULL";
		else if ($level === 2) $sql = "UPDATE sectorisation SET lon = $lon, lat = $lat  WHERE reseau = '$network' and uga = '$location'";
	} else if ($network === "SP") {
		if ($level === 0) $sql = "UPDATE sectorisation SET lon = $lon, lat = $lat  WHERE reseau = '$network' and region = '$location' and secteur IS NULL and ugagroup IS NULL and uga IS NULL";
		else if ($level === 1) $sql = "UPDATE sectorisation SET lon = $lon, lat = $lat  WHERE reseau = '$network' and secteur = '$location' and ugagroup IS NULL and uga IS NULL";
		else if ($level === 2) $sql = "UPDATE sectorisation SET lon = $lon, lat = $lat  WHERE reseau = '$network' and ugagroup = '$location' and uga IS NULL";
		else if ($level === 3) $sql = "UPDATE sectorisation SET lon = $lon, lat = $lat  WHERE reseau = '$network' and uga = '$location'";
	}
	


	$conn = new mysqli($servername, $username, $password, $dbname);
	if ($conn->query($sql) === TRUE) {
	    echo "Record updated successfully";
	} else {
	    die(print_r($sql));
	}

?>