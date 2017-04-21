<?php

	$version = $_POST["version"];
	$location = $_POST["location"];
	$level = intval($_POST["level"]);
	$network = $_POST["network"];
	$lon = $_POST["lon"];
	$lat = $_POST["lat"];

	
	
	if ($version === "local") {
		$servername = "localhost";
		$username = "root";
		$password = "";
		$dbname = "repsview_map";
		$tablename = "sectorisation";
	} else if ($version === "mylan") {
		$servername = "online4.h2mc.fr";
		$username = "h2mc";
		$password = "h2mc2012";
		$dbname = "testmylanrepsview";
		$tablename = "map_sectorisation";	
	}

	$sql;

	if ($network === "GP") {
		if ($level === 0) $sql = "UPDATE $tablename SET lon = $lon, lat = $lat  WHERE reseau = '$network' and region = '$location' and secteur IS NULL and uga IS NULL";
		else if ($level === 1) $sql = "UPDATE $tablename SET lon = $lon, lat = $lat  WHERE reseau = '$network' and secteur = '$location' and uga IS NULL";
		else if ($level === 2) $sql = "UPDATE $tablename SET lon = $lon, lat = $lat  WHERE reseau = '$network' and uga = '$location'";
	} else if ($network === "SP") {
		if ($level === 0) $sql = "UPDATE $tablename SET lon = $lon, lat = $lat  WHERE reseau = '$network' and region = '$location' and secteur IS NULL and ugagroup IS NULL and uga IS NULL";
		else if ($level === 1) $sql = "UPDATE $tablename SET lon = $lon, lat = $lat  WHERE reseau = '$network' and secteur = '$location' and ugagroup IS NULL and uga IS NULL";
		else if ($level === 2) $sql = "UPDATE $tablename SET lon = $lon, lat = $lat  WHERE reseau = '$network' and ugagroup = '$location' and uga IS NULL";
		else if ($level === 3) $sql = "UPDATE $tablename SET lon = $lon, lat = $lat  WHERE reseau = '$network' and uga = '$location'";
	}
	


	$conn = new mysqli($servername, $username, $password, $dbname);
	if ($conn->query($sql) === TRUE) {
	    echo "Record updated successfully";
	} else {
	    die(print_r($sql));
	}

?>