<?php

require_once($_SERVER["DOCUMENT_ROOT"]."/"."inside/abbott/utils/salesdata.php");
require_once($_SERVER["DOCUMENT_ROOT"]."/"."inside/abbott/utils/activitedata.php");
require($_SERVER["DOCUMENT_ROOT"]."/"."inside/abbott/utils/dbconnect.php");

// PRODUCTS
// CREON // LAMALINE GELULE + IZALGI  // TARKA //TADENAN + EQ THERAPEUTIQUES

/* Instructions
Change $prodget to the name of the product we want to input, and $database_field to it's appropriate column 
$geo get is taken by the select query, with all the regions we need
Don't forget to update the time we need before doing this */
$prodget = "LAMALINE GELULE + IZALGI"; 
$database_field = "qt_lamaline";

$source = "Xponent";
$timeget = "cm";
$msget = "QT.UN";
$monthfrom = "2017-02";
$lastanneemois = "2017-02";
$database = "testmylanrepsview";

$sqlselect = "SELECT geocode FROM $database.ciblage_external_data";
$reqselect = mysql_query($sqlselect) or die("Couldn't execute query.".mysql_error()." - query : $sqlselect"); 	
while($row = mysql_fetch_assoc($reqselect)) {
	$geoget = $row["geocode"];
	add_quota_value ($source,$prodget,$geoget,$timeget,$msget,$monthfrom,$lastanneemois,$database,$database_field);
}


function add_quota_value ($source,$prodget,$geoget,$timeget,$msget,$monthfrom,$lastanneemois,$database,$database_field){
	
	$data = getsalesdata($prodget, $geoget, $timeget, $msget, $monthfrom, $lastanneemois, $source, "  ");
	$quota_value = $data[$geoget][$prodget][$timeget][$monthfrom][$msget];
	$sqlinsert = "UPDATE $database.ciblage_external_data set $database_field = '$quota_value' where geocode = '$geoget'";
	$reqinsert = mysql_query($sqlinsert) or die("Couldn't execute query.".mysql_error()." - query : $sqlinsert"); 	
}



?>