<?php

	/* Updates for server side segmentation 
	Functions to parse data from sql and arrive at records_seg
	Function to send data back (at the end)
	An extra row in regions and secteurs to add this data to the array. Exception noted for corsica
	*/

	$version = $_POST["version"];
	$server = false;
	if ($version === "mylan") $server = true;
	
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

	// Get sq data if we are on the server
	if ($server) {
		$records_contacts = sql_contacts_data($dbname, $conn);
		$records_seg = sql_segmentation_data($dbname, $conn);
		$records_quota = sql_quota_data($dbname, $conn);
	}
	
	// GP DATA
	$gpData = array();

	$sql = "SELECT * FROM $tablename WHERE reseau = 'GP' order by region,secteur,uga";
	$result = $conn->query($sql);
	while($row = $result->fetch_assoc()) {
		if ($row['secteur'] === null && $row['uga'] === null) {

			if (!array_key_exists($row['region'],$gpData)) $gpData[$row['region']] = array();
			// LAT
			$gpData[$row['region']]['lat'] = floatval($row['lat']);
			// LON
			$gpData[$row['region']]['lon'] = floatval($row['lon']);
			if ($server) {
				// SEGMENTATION
				$gpData[$row['region']]['segmentation'] = prepare_segmentation_data($records_seg["GP"]["regions"][$row["region"]]);
				// CONTACTS
				$gpData[$row['region']]['contacts'] = $records_contacts["GP"]["regions"][$row["region"]];
				// QUOTAS
				$gpData[$row['region']]['quotas'] = $records_quota["region"][$row["region"]];
			}

		} else if ($row['uga'] === null) {

			if(!array_key_exists($row['secteur'],$gpData[$row['region']])) $gpData[$row['region']][$row['secteur']] = array();
			// LAT
			$gpData[$row['region']][$row['secteur']]['lat'] = floatval($row['lat']);
			// LON
			$gpData[$row['region']][$row['secteur']]['lon'] = floatval($row['lon']);
			if ($server) {
				// SEGMENTATION
				$gpData[$row['region']][$row['secteur']]['segmentation'] = prepare_segmentation_data($records_seg["GP"]["secteurs"][$row["secteur"]]);
				// CONTACTS
				$gpData[$row['region']][$row['secteur']]['contacts'] = $records_contacts["GP"]["secteurs"][$row["secteur"]];
				// QUOTAS
				$gpData[$row['region']][$row['secteur']]['quotas'] = $records_quota["secteur"][$row["secteur"]];
			}
		} else {
			// LAT AND LON
			$gpData[$row['region']][$row['secteur']][$row['uga']] = array(
				"lat" => floatval($row['lat']),
				"lon" => floatval($row['lon'])
			);
			if ($server) {
				// SEGMENTATION
				$gpData[$row['region']][$row['secteur']][$row['uga']]['segmentation'] = prepare_segmentation_data($records_seg["GP"]["ugas"][$row["uga"]]);
				// CONTACTS
				$gpData[$row['region']][$row['secteur']][$row['uga']]['contacts'] = $records_contacts["GP"]["ugas"][$row["uga"]];
				// QUOTAS
				$gpData[$row['region']][$row['secteur']][$row['uga']]["quotas"] = $records_quota["uga"][$row["uga"]];
			}
		}
	}

	// SPDATA
	$spData = array();

	$sql = "SELECT * FROM $tablename WHERE reseau = 'SP' order by region,secteur,ugagroup,uga";
	$result = $conn->query($sql);
	while($row = $result->fetch_assoc()) {
		if ($row['secteur'] === null && $row['ugagroup'] === null && $row['uga'] === null) {

			if (!array_key_exists($row['region'],$spData)) $spData[$row['region']] = array();
			// LAT
			$spData[$row['region']]['lat'] = floatval($row['lat']);
			// LON
			$spData[$row['region']]['lon'] = floatval($row['lon']);
			if ($server && $row["region"] !== "SPCorse") {
				// SEGMENTAION
				$spData[$row['region']]['segmentation'] = prepare_segmentation_data($records_seg["SP"]["regions"][$row["region"]]);
				// CONTACTS
				$spData[$row['region']]['contacts'] = $records_contacts["SP"]["regions"][$row["region"]];
				// QUOTAS
				$spData[$row['region']]['quotas'] = $records_quota["region"][$row["region"]];
			}
			else if ($server && $row["region"] === "SPCorse") {
				// SP CORSE EXCEPTIONS. 
				// Contacts stored in region. Quotas stored in secteur. No segmentation data
				$spData[$row['region']]['contacts'] = $records_contacts["SP"]["regions"][$row["region"]]; 
				$spData[$row['region']]['segmentation'] = null; // No segmentation
				$spData[$row['region']]['quotas'] = $records_quota["secteur"][$row["region"]]; 
			}

		} else if ($row['ugagroup'] === null && $row['uga'] === null) {

			if(!array_key_exists($row['secteur'],$spData[$row['region']])) $spData[$row['region']][$row['secteur']] = array();
			// LAT
			$spData[$row['region']][$row['secteur']]['lat'] = floatval($row['lat']);
			// LON
			$spData[$row['region']][$row['secteur']]['lon'] = floatval($row['lon']);
			if ($server && $row["region"] !== "SPCorse")  {
				// SEGMENTAION - POSSIBILITY OF NULL
				if (array_key_exists($row["secteur"],$records_seg["SP"]["secteurs"]))
					$spData[$row['region']][$row['secteur']]['segmentation'] = prepare_segmentation_data($records_seg["SP"]["secteurs"][$row["secteur"]]);
				else 
					$spData[$row['region']][$row['secteur']]['segmentation'] = null;
				// CONTACTS
				$spData[$row['region']][$row['secteur']]['contacts'] = $records_contacts["SP"]["secteurs"][$row["secteur"]];
				// QUOTAS
				$spData[$row['region']][$row['secteur']]['quotas'] = $records_quota["secteur"][$row["secteur"]];
			}
			else if ($server && $row["region"] === "SPCorse") {
				// SP CORSE EXCEPTIONS
				// Quotas and contacts stored in ugas. No segmentation data
				$spData[$row['region']][$row['secteur']]['segmentation'] = null; 
				$spData[$row['region']][$row['secteur']]['quotas'] = $records_quota["uga"][$row["secteur"]]; 
				$spData[$row['region']][$row['secteur']]['contacts'] = $records_contacts["SP"]["ugas"][$row["secteur"]];
			}

		} else if ($row['uga'] === null) {

			if(!array_key_exists($row['ugagroup'],$spData[$row['region']][$row['secteur']])) $spData[$row['region']][$row['secteur']][$row['ugagroup']] = array();
			// LAT
			$spData[$row['region']][$row['secteur']][$row['ugagroup']]['lat'] = floatval($row['lat']);
			// LON
			$spData[$row['region']][$row['secteur']][$row['ugagroup']]['lon'] = floatval($row['lon']);
			if ($server) {
				// SEGMENTAION - POSSIBILITY OF NULL
				if (array_key_exists($row["ugagroup"],$records_seg["SP"]["ugagroups"]))
					$spData[$row['region']][$row['secteur']][$row['ugagroup']]['segmentation'] = prepare_segmentation_data($records_seg["SP"]["ugagroups"][$row["ugagroup"]]);
				else
					$spData[$row['region']][$row['secteur']][$row['ugagroup']]['segmentation'] = null;
				// CONTACTS
				$spData[$row['region']][$row['secteur']][$row['ugagroup']]['contacts'] = $records_contacts["SP"]["ugagroups"][$row["ugagroup"]];
				// QUOTAS
				$spData[$row['region']][$row['secteur']][$row['ugagroup']]["quotas"] = $records_quota["ugagroupe"][$row["ugagroup"]];
			}
		} else {
			// LAT AND LON
			$spData[$row['region']][$row['secteur']][$row['ugagroup']][$row['uga']] = array(
				"lat" => floatval($row['lat']),
				"lon" => floatval($row['lon'])
			);
			// SEGMENTAION - POSSIBILITY OF NULL
			if ($server) {
				if (array_key_exists($row["uga"],$records_seg["SP"]["ugas"]))
					$spData[$row['region']][$row['secteur']][$row['ugagroup']][$row['uga']]['segmentation'] = prepare_segmentation_data($records_seg["SP"]["ugas"][$row["uga"]]);
				else
					$spData[$row['region']][$row['secteur']][$row['ugagroup']][$row['uga']]['segmentation'] = null;
				// CONTACTS
					$spData[$row['region']][$row['secteur']][$row['ugagroup']][$row['uga']]['contacts'] = $records_contacts["SP"]["ugas"][$row["uga"]];
				// QUOTAS
				$spData[$row['region']][$row['secteur']][$row['ugagroup']][$row['uga']]["quotas"] = $records_quota["uga"][$row["uga"]];
			}
		}
	}

	$return_array = array(
		"gpData" => $gpData,
		"spData" => $spData
	);

	echo json_encode($return_array);
	die;


	function sql_contacts_data($dbname, $conn){
		$gp_contacts = array(
			"regions" => array(),
			"secteurs" => array(),
			"ugas" => array()
		);
		$sp_contacts = array(
			"regions" => array(),
			"secteurs" => array(),
			"ugagroups" => array(),
			"ugas" => array()
		);


		$query1 = "SELECT cible, region, secteur, ugagroupe, uga, count(distinct onekey) as count FROM $dbname.ciblage WHERE freq_terrain > 0 group by cible,region,secteur,ugagroupe,uga";
		$result1 = $conn->query($query1);
		// Put the visited amounts into each array from the query 1 result
		while($row = $result1->fetch_assoc()) {
			if ($row['cible'] === "MG") {
				if ($row['cible'] && $row['region'] && $row['secteur'] && $row['uga']) {
					if (!array_key_exists($row["secteur"], $gp_contacts["secteurs"])) $gp_contacts["secteurs"][$row["secteur"]] = array(
						"visited" => $row["count"],
						"total" => 0,
					);

					if (!array_key_exists($row["region"], $gp_contacts["regions"])) $gp_contacts["regions"][$row["region"]] = array(
						"visited" => $row["count"],
						"total" => 0,
					);

					$gp_contacts["regions"][$row["region"]]["visited"] += intval($row["count"]);
					$gp_contacts["secteurs"][$row["secteur"]]["visited"] += intval($row["count"]);
					$gp_contacts["ugas"][$row['uga']] = array (
						"visited" => intval($row['count']),
						"total" => 0,
					);
				}
			} else if ($row['cible'] === "SP") {
				if ($row['cible'] && $row['region'] && $row['secteur'] && $row['ugagroupe'] && $row['uga']) {
					if (!array_key_exists($row["ugagroupe"], $sp_contacts["ugagroups"])) $sp_contacts["ugagroups"][$row["ugagroupe"]] = array(
						"visited" => $row["count"],
						"total" => 0,
					);

					if (!array_key_exists($row["secteur"], $sp_contacts["secteurs"])) $sp_contacts["secteurs"][$row["secteur"]] = array(
						"visited" => $row["count"],
						"total" => 0,
					);

					if (!array_key_exists($row["region"], $sp_contacts["regions"])) $sp_contacts["regions"][$row["region"]] = array(
						"visited" => $row["count"],
						"total" => 0,
					);

					$sp_contacts["regions"][$row["region"]]["visited"] += intval($row["count"]);
					$sp_contacts["secteurs"][$row["secteur"]]["visited"] += intval($row["count"]);
					$sp_contacts["ugagroups"][$row["ugagroupe"]]["visited"] += intval($row["count"]);
					$sp_contacts["ugas"][$row['uga']] = array (
						"visited" => intval($row['count']),
						"total" => 0,
					);
					
				}
			}
		}

		$query2 = "SELECT reseau, region, secteur, ugagroupe, main.uga, count(*) AS count FROM $dbname.onekey AS main INNER JOIN $dbname.sectorisation AS sectors ON main.uga = sectors.uga WHERE main.active = 'Active' and main.accountrecordtype = 'Professional' GROUP BY sectors.reseau, sectors.uga";

		$result2 = $conn->query($query2);

		while($row = $result2->fetch_assoc()) {
			if ($row['reseau'] === "GP") {
				if ($row['reseau'] && $row['region'] && $row['secteur'] && $row['uga']) {
					
					if (array_key_exists($row['region'],$gp_contacts["regions"]))
						$gp_contacts["regions"][$row['region']]["total"] += intval($row["count"]);
					else 
						$gp_contacts["regions"][$row['region']] = array(
							"visited" => 0,
							"total" => 0
						);

					if (array_key_exists($row['secteur'],$gp_contacts["secteurs"]))
						$gp_contacts["secteurs"][$row['secteur']]["total"] += intval($row["count"]);
					else 
						$gp_contacts["secteurs"][$row['secteur']] = array(
							"visited" => 0,
							"total" => 0
						);

					if (array_key_exists($row['uga'],$gp_contacts["ugas"]))
						$gp_contacts["ugas"][$row['uga']]["total"] += intval($row["count"]);
					else 
						$gp_contacts["ugas"][$row['uga']] = array(
							"visited" => 0,
							"total" => 0
						);
				}
			} else if ($row['reseau'] === "SP") {
				if ($row['reseau'] && $row['region'] && $row['secteur'] && $row['ugagroupe'] && $row['uga']) {

					if (array_key_exists($row['region'],$sp_contacts["regions"]))
						$sp_contacts["regions"][$row['region']]["total"] += intval($row["count"]);
					else 
						$sp_contacts["regions"][$row['region']] = array(
							"visited" => 0,
							"total" => 0
						);
					
					if (array_key_exists($row['secteur'],$sp_contacts["secteurs"]))
						$sp_contacts["secteurs"][$row['secteur']]["total"] += intval($row["count"]);
					else 
						$sp_contacts["secteurs"][$row['secteur']] = array(
							"visited" => 0,
							"total" => 0
						);

					if (array_key_exists($row['ugagroupe'],$sp_contacts["ugagroups"]))
						$sp_contacts["ugagroups"][$row['ugagroupe']]["total"] += intval($row["count"]);
					else 
						$sp_contacts["ugagroups"][$row['ugagroupe']] = array(
							"visited" => 0,
							"total" => 0
						);

					if (array_key_exists($row['uga'],$sp_contacts["ugas"]))
						$sp_contacts["ugas"][$row['uga']]["total"] += intval($row["count"]);
					else 
						$sp_contacts["ugas"][$row['uga']] = array(
							"visited" => 0,
							"total" => 0
						);
				}
			}
		}
		return array(
			"GP" => $gp_contacts,
			"SP" => $sp_contacts,
		);
	}



	function sql_segmentation_data($dbname, $conn){
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

		$sql_seg_1 = "SELECT cible, region, " . $sql_seg_counts . " FROM $dbname.ciblage WHERE freq_terrain > 0 GROUP BY cible, region";
		$sql_seg_2 = "SELECT cible, region, secteur, " . $sql_seg_counts . " FROM $dbname.ciblage WHERE freq_terrain > 0 GROUP BY cible, region, secteur";
		$sql_seg_3 = "SELECT cible, region, secteur, ugagroupe, " . $sql_seg_counts . " FROM $dbname.ciblage WHERE freq_terrain > 0 GROUP BY cible, region, secteur, ugagroupe";
		$sql_seg_4 = "SELECT cible, region, secteur, ugagroupe, uga, " . $sql_seg_counts . " FROM $dbname.ciblage WHERE freq_terrain > 0 GROUP BY cible, region, secteur, ugagroupe, uga";
		
		$records_seg = array(
			"GP" => array(
				"regions" => array(),
				"secteurs" => array(),
				"ugas" => array(),
			),
			"SP" => array(
				"regions" => array(),
				"secteurs" => array(),
				"ugagroups" => array(),
				"ugas" => array(),
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

		$result_seg_3 = $conn->query($sql_seg_3);
		while($row_seg_3 = $result_seg_3->fetch_assoc()) {
			if ($row_seg_3["cible"] && $row_seg_3["region"] && $row_seg_3["secteur"] && $row_seg_3["ugagroupe"]) {
				if ($row_seg_3["cible"] === "SP") $records_seg["SP"]["ugagroups"][$row_seg_3["ugagroupe"]] = $row_seg_3;
			}
		}

		$result_seg_4 = $conn->query($sql_seg_4);
		while($row_seg_4 = $result_seg_4->fetch_assoc()) {
			if ($row_seg_4["cible"] && $row_seg_4["region"] && $row_seg_4["secteur"] && $row_seg_4["uga"]) {
				if ($row_seg_4["cible"] === "MG") $records_seg["GP"]["ugas"][$row_seg_4["uga"]] = $row_seg_4;
				if ($row_seg_4["cible"] === "SP") $records_seg["SP"]["ugas"][$row_seg_4["uga"]] = $row_seg_4;
			}
		}

		return $records_seg;
	}


	function sql_quota_data($dbname, $conn){
		$quota_averages = array();
		$sql_quota_avg = "SELECT geolevel, COUNT(*) as count FROM $dbname.ciblage_external_data group by geolevel";
		$result_quota_avg = $conn->query($sql_quota_avg);
		while($row_quota_avg = $result_quota_avg->fetch_assoc()) {
			$quota_averages[$row_quota_avg["geolevel"]] = 100/$row_quota_avg["count"];
		}

		$quota_data = array(
			"region" => array(),
			"secteur" => array(),
		);

		$sql_quota = "SELECT * FROM $dbname.ciblage_external_data";
		$result_quota = $conn->query($sql_quota);

		while($row_quota = $result_quota->fetch_assoc()) {
			$quota_data[$row_quota['geolevel']][$row_quota["geocode"]] = array(
				"creon" => (floatVal($row_quota["qt_creon"]) / $quota_averages[$row_quota["geolevel"]]) * 100,
			    "lamaline" => (floatVal($row_quota["qt_lamaline"]) / $quota_averages[$row_quota["geolevel"]]) * 100,
			    "tarka" => (floatVal($row_quota["qt_tarka"]) / $quota_averages[$row_quota["geolevel"]]) * 100,
			    "tadenan" => (floatVal($row_quota["qt_tadenan"]) / $quota_averages[$row_quota["geolevel"]]) * 100,
			    "ceris" => (floatVal($row_quota["qt_ceris"]) / $quota_averages[$row_quota["geolevel"]]) * 100,
			    "dymista" => (floatVal($row_quota["qt_dymista"]) / $quota_averages[$row_quota["geolevel"]]) * 100
			);
		}

		return $quota_data;
	}


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