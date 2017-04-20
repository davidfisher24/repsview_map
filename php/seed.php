<?php

$servername = "localhost";
$username = "root";
$password = "";
$dbname = "repsview_map";
$tablename = "sectorisation";


$connection_create_db = new mysqli($servername, $username, $password);

if ($connection_create_db->connect_error) {
    die("Connection failed: " . $conn->connect_error);
} 


$sqldb = "CREATE DATABASE $dbname";
if ($connection_create_db->query($sqldb) === TRUE) {
    
	$conn = new mysqli($servername, $username, $password, $dbname);

	$sqltable = "CREATE TABLE sectorisation (
		id INT(6) UNSIGNED AUTO_INCREMENT PRIMARY KEY, 
		reseau VARCHAR(30) NOT NULL,
		region VARCHAR(30),
		secteur VARCHAR(30),
		ugagroup VARCHAR(30),
		uga VARCHAR(30),
		lon FLOAT(53) NOT NULL,
		lat FLOAT(53) NOT NULL
		)";

		if ($conn->query($sqltable) === TRUE) {
			create_gp_data();
			create_sp_data();
		} else {
		    die ("Error with table creation");
		}

} else {
    die(print_r("Database creation error"));
}

function create_gp_data(){
	$servername = "localhost";
	$username = "root";
	$password = "";
	$dbname = "repsview_map";
	$tablename = "sectorisation";


	$gpdata = file_get_contents('../npm_scripts/gpdata.json');
	$gpjson = json_decode($gpdata, true);

	$sqlgp_region = "INSERT INTO $tablename (reseau, region, lon, lat) VALUES ";
	$sqlgp_secteur = "INSERT INTO $tablename (reseau, region, secteur, lon, lat) VALUES ";
	$sqlgp_uga = "INSERT INTO $tablename (reseau, region, secteur, uga, lon, lat) VALUES ";


	$reseau = "GP";
	foreach($gpjson as $key_region => $region) {
		$lat1 = $region["lat"];
		$lon1 = $region["lon"];
		$sqlgp_region .= "('$reseau','$key_region',$lon1,$lat1),";


		foreach($region as $key_secteur => $secteur) {

			if($key_secteur !== "lat" && $key_secteur !== "lon" && $key_secteur !== "loc"){
		        $lat2 = $secteur["lat"];
				$lon2 = $secteur["lon"];
				$sqlgp_secteur .= "('$reseau','$key_region','$key_secteur',$lon2,$lat2),";

				foreach($secteur as $key_uga => $uga) {
					if($key_uga !== "lat" && $key_uga !== "lon" && $key_uga !== "loc"){
				        $lat3 = $uga["lat"];
						$lon3 = $uga["lon"];
						$sqlgp_uga .= "('$reseau','$key_region','$key_secteur','$key_uga',$lon3,$lat3),";

				    }
					
				}

		    }
			
		}

	}

	$sqlgp_region = substr($sqlgp_region,0,-1);
	$sqlgp_secteur = substr($sqlgp_secteur,0,-1);
	$sqlgp_uga = substr($sqlgp_uga,0,-1);
	$gp_query = $sqlgp_region . "; " . $sqlgp_secteur . "; " . $sqlgp_uga . ";";
	$conn = new mysqli($servername, $username, $password, $dbname);
		if ($conn->query($gp_query) === TRUE) {
			echo "GP Data successful";
		} else {
		    die (print_r($gp_query));
		}


};

function create_sp_data(){
	$servername = "localhost";
	$username = "root";
	$password = "";
	$dbname = "repsview_map";
	$tablename = "sectorisation";



	$spdata = file_get_contents('../npm_scripts/spdata.json');
	$spjson = json_decode($spdata, true);

	$sqlsp_region = "INSERT INTO $tablename (reseau, region, lon, lat) VALUES ";
	$sqlsp_secteur = "INSERT INTO $tablename (reseau, region, secteur, lon, lat) VALUES ";
	$sqlsp_ugagroup = "INSERT INTO $tablename (reseau, region, secteur, ugagroup, lon, lat) VALUES ";
	$sqlsp_uga = "INSERT INTO $tablename (reseau, region, secteur, ugagroup, uga, lon, lat) VALUES ";


	$reseau = "SP";
	foreach($spjson as $key_region => $region) {
		$lat1 = $region["lat"];
		$lon1 = $region["lon"];
		$sqlsp_region .= "('$reseau','$key_region',$lon1,$lat1),";

		foreach($region as $key_secteur => $secteur) {

			if($key_secteur !== "lat" && $key_secteur !== "lon" && $key_secteur !== "loc"){

		        $lat2 = $secteur["lat"];
				$lon2 = $secteur["lon"];
				$sqlsp_secteur .= "('$reseau','$key_region','$key_secteur',$lon2,$lat2),";

				if ($key_secteur !== "20AJA" && $key_secteur !== "20BAS" && $key_secteur !== "20CAL" && $key_secteur !== "20SAR") {
					foreach($secteur as $key_ugagroup => $ugagroup) {
						if($key_ugagroup !== "lat" && $key_ugagroup !== "lon" && $key_ugagroup !== "loc"){
					        $lat3 = $ugagroup["lat"];
							$lon3 = $ugagroup["lon"];
							$sqlsp_ugagroup .= "('$reseau','$key_region','$key_secteur','$key_ugagroup',$lon3,$lat3),";

							foreach($ugagroup as $key_uga => $uga) {
								if($key_uga !== "lat" && $key_uga !== "lon" && $key_uga !== "loc"){
							        $lat4 = $uga["lat"];
									$lon4 = $uga["lon"];
									$sqlsp_uga .= "('$reseau','$key_region','$key_secteur','$key_ugagroup','$key_uga',$lon4,$lat4),";

							    }
								
							}

					    }
					}	
				}

		    }
			
		}

	}

	$sqlsp_region = substr($sqlsp_region,0,-1);
	$sqlsp_secteur = substr($sqlsp_secteur,0,-1);
	$sqlsp_ugagroup = substr($sqlsp_ugagroup,0,-1);
	$sqlsp_uga = substr($sqlsp_uga,0,-1);
	$sp_query = $sqlsp_region . "; " . $sqlsp_secteur . "; " . $sqlsp_ugagroup . "; " . $sqlsp_uga . ";";
	$conn = new mysqli($servername, $username, $password, $dbname);
	if ($conn->query($sp_query) === TRUE) {
			echo "SP Data successful";
		} else {
		    die (print_r($sp_query));
		}

};

?>