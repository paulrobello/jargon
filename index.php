<?php

$action=@trim($_GET["action"]);
if (empty($action)){
?>
<!doctype html>
<html class="no-js" lang="en">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="description" content="PAR Realtime Chat">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    
    <title>PAR Jargonator</title>
    
    <link rel="stylesheet" href="//code.jquery.com/ui/1.11.1/themes/smoothness/jquery-ui.css">
    <link rel="stylesheet" href="css/normalize.css">
    <link rel="stylesheet" href="css/main.css">

    <script src="//cdnjs.cloudflare.com/ajax/libs/modernizr/2.8.2/modernizr.min.js"></script>
    <script src="//cdnjs.cloudflare.com/ajax/libs/jquery/1.11.1/jquery.min.js"></script>
    <script src="//code.jquery.com/ui/1.11.1/jquery-ui.js"></script>
    <script src="//cdnjs.cloudflare.com/ajax/libs/jquery-cookie/1.4.1/jquery.cookie.min.js"></script>
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

function pickRand($list,$prepend=' ',$append=' ', $default = '', $level = 85){
#die("<pre>\n".print_r($list,true)."</pre>");
  return ($default === 'X' || rand(0,100)>$level) ? $prepend . $list[rand(0,count($list)-1)] . $append : $default;
}
  
function jargonate($content,$level = 85){
  if (!$level) $level=85;
  include dirname( __FILE__ ) . '/jargonator.php';
#die("<pre>\n".print_r($adj,true)."</pre>");  
#    $content=preg_replace_callback('@( (?<!of )the )@',function($match){
#      return ' @'.$this->prep[rand(0,count($this->prep)-1)].'@'.$match[0];
#    },$content);
    $content=preg_replace_callback('@( a | the | is )@i',function($match) use ($adj){
      return $match[0]. pickRand($adj,'',' ','',$level);
    },$content);
#    return $content;
    foreach ($adv as $w=>$list){
      $content=preg_replace_callback('@( '.$w.' )@i',function($match) use ($list){
        return pickRand($list,' ',' ',$match[0],$level);
      },$content);
    }
#    return $content;    
    $content.="\n\n".pickRand($sen,'','','X');
    return $content;
}

header('Content-Type: text/plain; charset=UTF-8');
echo htmlspecialchars(jargonate($_POST["in"],(int)@$_GET['level']), ENT_QUOTES, 'UTF-8');
?>