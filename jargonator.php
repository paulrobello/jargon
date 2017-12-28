<?php
$sen=explode("\n",file_get_contents(dirname(__FILE__)."/sen.txt"));
$prep=explode("\n",file_get_contents(dirname(__FILE__)."/prep.txt"));
$adj=explode("\n",file_get_contents(dirname(__FILE__)."/adj.txt"));
$lines=explode("\n",file_get_contents(dirname(__FILE__)."/adv.txt")."\n".file_get_contents(dirname(__FILE__)."/rep.txt"));
$adv=array();
foreach ($lines as $line){
  $line=trim($line);
  if (empty($line)) continue;
  $line=explode(",",$line);
  $adv[array_shift($line)]=$line;
}
