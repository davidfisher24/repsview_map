<?php

	
	$servername = "localhost";
	$username = "root";
	$password = "";
	$dbname = "repsview_map";
	$tablename = "sectorisation";


	$conn = new mysqli($servername, $username, $password, $dbname);

	// GP DATA
	$gpData = array();

	$sql = "SELECT * FROM sectorisation WHERE reseau = 'GP' order by region,secteur,uga";
	$result = $conn->query($sql);
	while($row = $result->fetch_assoc()) {
		if ($row['secteur'] === null && $row['uga'] === null) {

			if (!array_key_exists($row['region'],$gpData)) $gpData[$row['region']] = array();
			$gpData[$row['region']]['lat'] = floatval($row['lat']);
			$gpData[$row['region']]['lon'] = floatval($row['lon']);

		} else if ($row['uga'] === null) {

			if(!array_key_exists($row['secteur'],$gpData[$row['region']])) $gpData[$row['region']][$row['secteur']] = array();
			$gpData[$row['region']][$row['secteur']]['lat'] = floatval($row['lat']);
			$gpData[$row['region']][$row['secteur']]['lon'] = floatval($row['lon']);

		} else {
			$gpData[$row['region']][$row['secteur']][$row['uga']] = array(
				"lat" => floatval($row['lat']),
				"lon" => floatval($row['lon'])
			);
		}
	}

	// SPDATA
	$spData = array();

	$sql = "SELECT * FROM sectorisation WHERE reseau = 'SP' order by region,secteur,ugagroup,uga";
	$result = $conn->query($sql);
	while($row = $result->fetch_assoc()) {
		if ($row['secteur'] === null && $row['ugagroup'] === null && $row['uga'] === null) {

			if (!array_key_exists($row['region'],$spData)) $spData[$row['region']] = array();
			$spData[$row['region']]['lat'] = floatval($row['lat']);
			$spData[$row['region']]['lon'] = floatval($row['lon']);

		} else if ($row['ugagroup'] === null && $row['uga'] === null) {

			if(!array_key_exists($row['secteur'],$spData[$row['region']])) $spData[$row['region']][$row['secteur']] = array();
			$spData[$row['region']][$row['secteur']]['lat'] = floatval($row['lat']);
			$spData[$row['region']][$row['secteur']]['lon'] = floatval($row['lon']);

		} else if ($row['uga'] === null) {

			if(!array_key_exists($row['ugagroup'],$spData[$row['region']][$row['secteur']])) $spData[$row['region']][$row['secteur']][$row['ugagroup']] = array();
			$spData[$row['region']][$row['secteur']][$row['ugagroup']]['lat'] = floatval($row['lat']);
			$spData[$row['region']][$row['secteur']][$row['ugagroup']]['lon'] = floatval($row['lon']);

		} else {
			$spData[$row['region']][$row['secteur']][$row['ugagroup']][$row['uga']] = array(
				"lat" => floatval($row['lat']),
				"lon" => floatval($row['lon'])
			);
		}
	}

	$return_array = array(
		"gpData" => $gpData,
		"spData" => $spData
	);

	echo json_encode($return_array);
	die;

?>