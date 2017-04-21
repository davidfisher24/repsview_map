<?php

	/* Updates for server side segmentation 
	Functions to parse data from sql and arrive at records_seg
	Function to send data back (at the end)
	An extra row in regions and secteurs to add this data to the array. Exception noted for corsica
	*/

	$version = "mylan";
	
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


	$conn = new mysqli($servername, $username, $password, $dbname);


	// Segmentation data
	$sql_seg_counts = "count(case when segmentation_terrain = 'Ajout VM' then 1 else null end) as ajout_vm,
	count(case when segmentation_terrain = 'Gériatrie' then 1 else null end) as geriatrie,
	count(case when segmentation_terrain = 'Chirurgie' then 1 else null end) as chirugerie,
	count(case when segmentation_terrain = 'Cardio' then 1 else null end) as cardio,
	count(case when segmentation_terrain = 'Uro' then 1 else null end) as uro,
	count(case when segmentation_terrain = 'Rhumato' then 1 else null end) as rhumato,
	count(case when segmentation_terrain = 'Douleur' then 1 else null end) as douleur,
	count(case when segmentation_terrain = 'Urg Anest' then 1 else null end) as urg_anest,
	count(case when segmentation_terrain = 'Conquérir' then 1 else null end) as conquerir,
	count(case when segmentation_terrain = 'FidéliserG' then 1 else null end) as fideliserG,
	count(case when segmentation_terrain = 'FidéliserM' then 1 else null end) as fideliserM,
	count(case when segmentation_terrain = 'VIP' then 1 else null end) as VIP,
	count(case when segmentation_terrain = 'Pharm Hosp' then 1 else null end) as pharm_hosp,
	count(case when segmentation_terrain = 'ARV' then 1 else null end) as arv,
	count(case when segmentation_terrain = 'Muco' then 1 else null end) as muco,
	count(case when segmentation_terrain = 'Gastro' then 1 else null end) as gastro";

	$sql_seg_1 = "SELECT cible, region, " . $sql_seg_counts . " FROM $dbname.ciblage GROUP BY cible, region";
	$sql_seg_2 = "SELECT cible, region, secteur, " . $sql_seg_counts . " FROM $dbname.ciblage GROUP BY cible, region, secteur";

	
	$records_seg = array(
		"GP" => array(
			"regions" => array(),
			"secteurs" => array(),
		),
		"SP" => array(
			"regions" => array(),
			"secteurs" => array(),
		)
		
	);

	$result_seg_1 = $conn->query($sql_seg_1);
	while($row_seg_1 = $result_seg_1->fetch_assoc()) {
		if ($row_seg_1["cible"] && $row_seg_1["region"]) {
			if ($row_seg_1["cible"] === "MG") $records_seg["GP"]["regions"][$row_seg_1["region"]] = $row_seg_1;
			if ($row_seg_1["cible"] === "SP") $records_seg["SP"]["regions"][$row_seg_1["region"]] = $row_seg_1;
		}
	}

	$result_seg_2 = $conn->query($sql_seg_2);
	while($row_seg_2 = $result_seg_2->fetch_assoc()) {
		if ($row_seg_2["cible"] && $row_seg_2["region"] && $row_seg_2["secteur"]) {
			if ($row_seg_2["cible"] === "MG") $records_seg["GP"]["secteurs"][$row_seg_2["secteur"]] = $row_seg_2;
			if ($row_seg_2["cible"] === "SP") $records_seg["SP"]["secteurs"][$row_seg_2["secteur"]] = $row_seg_2;
		}
	}

	// GP DATA
	$gpData = array();

	$sql = "SELECT * FROM $tablename WHERE reseau = 'GP' order by region,secteur,uga";
	$result = $conn->query($sql);
	while($row = $result->fetch_assoc()) {
		if ($row['secteur'] === null && $row['uga'] === null) {

			if (!array_key_exists($row['region'],$gpData)) $gpData[$row['region']] = array();
			$gpData[$row['region']]['lat'] = floatval($row['lat']);
			$gpData[$row['region']]['lon'] = floatval($row['lon']);
			$gpData[$row['region']]['segmentation'] = prepare_segmentation_data($records_seg["GP"]["regions"][$row["region"]]);

		} else if ($row['uga'] === null) {

			if(!array_key_exists($row['secteur'],$gpData[$row['region']])) $gpData[$row['region']][$row['secteur']] = array();
			$gpData[$row['region']][$row['secteur']]['lat'] = floatval($row['lat']);
			$gpData[$row['region']][$row['secteur']]['lon'] = floatval($row['lon']);
			$gpData[$row['region']][$row['secteur']]['segmentation'] = prepare_segmentation_data($records_seg["GP"]["secteurs"][$row["secteur"]]);

		} else {
			$gpData[$row['region']][$row['secteur']][$row['uga']] = array(
				"lat" => floatval($row['lat']),
				"lon" => floatval($row['lon'])
			);
		}
	}

	// SPDATA
	$spData = array();

	$sql = "SELECT * FROM $tablename WHERE reseau = 'SP' order by region,secteur,ugagroup,uga";
	$result = $conn->query($sql);
	while($row = $result->fetch_assoc()) {
		if ($row['secteur'] === null && $row['ugagroup'] === null && $row['uga'] === null) {

			if (!array_key_exists($row['region'],$spData)) $spData[$row['region']] = array();
			$spData[$row['region']]['lat'] = floatval($row['lat']);
			$spData[$row['region']]['lon'] = floatval($row['lon']);
			if ($row["region"] !== "SPCorse") $spData[$row['region']]['segmentation'] = prepare_segmentation_data($records_seg["SP"]["regions"][$row["region"]]);

		} else if ($row['ugagroup'] === null && $row['uga'] === null) {

			if(!array_key_exists($row['secteur'],$spData[$row['region']])) $spData[$row['region']][$row['secteur']] = array();
			$spData[$row['region']][$row['secteur']]['lat'] = floatval($row['lat']);
			$spData[$row['region']][$row['secteur']]['lon'] = floatval($row['lon']);
			if ($row["region"] !== "SPCorse")  $spData[$row['region']][$row['secteur']]['segmentation'] = prepare_segmentation_data($records_seg["SP"]["secteurs"][$row["secteur"]]);

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


	function prepare_segmentation_data($row){
		return array(
            "ajout_vm" => intval($row["ajout_vm"]),
            "geriatrie" => intval($row["geriatrie"]),
            "chirugerie" => intval($row["chirugerie"]),
            "cardio" => intval($row["cardio"]),
            "uro" => intval($row["uro"]),
            "rhumato" => intval($row["rhumato"]),
            "douleur" => intval($row["douleur"]),
            "urg_anest" => intval($row["urg_anest"]),
            "conquerir" => intval($row["conquerir"]),
            "fideliserG" => intval($row["fideliserG"]),
            "fideliserM" => intval($row["fideliserM"]),
            "VIP" => intval($row["VIP"]),
            "pharm_hosp" => intval($row["pharm_hosp"]),
            "arv" => intval($row["arv"]),
            "muco" => intval($row["muco"]),
            "gastro" => intval($row["gastro"])
		);
	}

?>