<?php

function jargonatorReadWordFile($path){
  if (!is_readable($path)){
    error_log("jargonator: word list file missing or unreadable: {$path}");
    return '';
  }
  $data=file_get_contents($path);
  if ($data === false){
    error_log("jargonator: failed to read word list file: {$path}");
    return '';
  }
  return $data;
}

$sen=explode("\n",jargonatorReadWordFile(dirname(__FILE__)."/sen.txt"));
$adj=explode("\n",jargonatorReadWordFile(dirname(__FILE__)."/adj.txt"));
$lines=explode("\n",jargonatorReadWordFile(dirname(__FILE__)."/adv.txt")."\n".jargonatorReadWordFile(dirname(__FILE__)."/rep.txt"));
$adv=array();
foreach ($lines as $line){
  $line=trim($line);
  if (empty($line)) continue;
  $fields=explode(",",$line);
  if (count($fields) < 2 || in_array('', $fields, true)){
    error_log("jargonator: malformed word-list line, expected 'word,replacement,...': {$line}");
  }
  $adv[array_shift($fields)]=$fields;
}

return ['adj' => $adj, 'adv' => $adv, 'sen' => $sen];
