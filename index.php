<?php

error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

$action=trim($_GET["action"] ?? '');
if (empty($action)){
?>
<!doctype html>
<html class="no-js" lang="en">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="description" content="PAR Jargonator – turns your text into corporate jargon.">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    
    <title>PAR Jargonator</title>
    
    <link rel="stylesheet" href="css/normalize.css">
    <link rel="stylesheet" href="css/main.css">

    <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js" integrity="sha512-v2CJ7UaYy4JwqLDIrZUI/4hqeoQieOmAZNXBeQyjo21dadnwR+8ZaIJVT8EE2iyI61OV8e6M8PP2/4hpQINQ/g==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
</head>
<body>
<h1>PAR JARGONATOR</h1>
<form method="post">
<label for="in">Type Message here</label><Br>
<textarea id="in" name="in" cols="120" rows="15">
</textarea>
<br>
<input type="submit" id="submit" value="Jargonate">
</form>
<label for="out">Output</label><br>
<textarea id="out" name="out" cols="120" rows="15">
</textarea>
<script>
$(function(){
  $("#submit").click(function(){
    $.post('?action=jargonate',{in:$("#in").val()},function(data){
      $("#out").val(data);
    });
    return false;
  });
});
</script>
</body>
</html>
<?php
  exit;
}

if ($action !== 'jargonate') {
    http_response_code(400);
    exit;
}

if (!empty($_SERVER['HTTP_ORIGIN'])) {
    $originHost = parse_url($_SERVER['HTTP_ORIGIN'], PHP_URL_HOST);
    if ($originHost !== ($_SERVER['HTTP_HOST'] ?? null)) {
        http_response_code(403);
        exit;
    }
}

define('DEFAULT_JARGON_LEVEL', 85);

function pickRand($list,$prepend=' ',$append=' ', $default = '', $level = DEFAULT_JARGON_LEVEL, $forceSubstitute = false){
  return ($forceSubstitute || mt_rand(0,100)>$level) ? $prepend . $list[mt_rand(0,count($list)-1)] . $append : $default;
}

function jargonate($content,$level = DEFAULT_JARGON_LEVEL){
  if (!$level) $level=DEFAULT_JARGON_LEVEL;
  if (strlen($content) > 8192) $content = substr($content, 0, 8192);
  $data = include dirname( __FILE__ ) . '/jargonator.php';
  $adj = $data['adj'];
  $adv = $data['adv'];
  $sen = $data['sen'];
    $content=preg_replace_callback('@\b(a|the|is)\b@i',function($match) use ($adj, $level){
      return $match[0]. pickRand($adj,'',' ','',$level);
    },$content);
    foreach ($adv as $word=>$list){
      $content=preg_replace_callback('@\b'.preg_quote($word, '@').'\b@i',function($match) use ($list, $level){
        return pickRand($list,' ',' ',$match[0],$level);
      },$content);
    }
    $content.="\n\n".pickRand($sen,'','','',DEFAULT_JARGON_LEVEL,true);
    return $content;
}

header('Content-Type: text/plain; charset=UTF-8');
echo htmlspecialchars(jargonate($_POST['in'] ?? '',(int)($_GET['level'] ?? 0)), ENT_QUOTES, 'UTF-8');
?>