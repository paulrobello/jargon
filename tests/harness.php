<?php
/**
 * CLI harness that drives index.php through its public $_GET/$_POST
 * contract in an isolated subprocess, so tests never share PHP state
 * (function/constant redeclaration) across invocations and never risk
 * an in-process exit() from index.php terminating the test runner.
 *
 * Usage:
 *   php harness.php jargonate <input> <level>   -> prints the jargonate() response body
 *   php harness.php pickrand <level> <trials>   -> prints how many of <trials> calls
 *                                                   to pickRand() substituted at <level>
 */

$mode = $argv[1] ?? 'jargonate';
$indexFile = dirname(__DIR__) . '/index.php';

if ($mode === 'jargonate') {
    $_GET['action'] = 'jargonate';
    $_GET['level'] = $argv[3] ?? '';
    $_POST['in'] = $argv[2] ?? '';
    require $indexFile;
    exit;
}

if ($mode === 'pickrand') {
    // Load index.php once (with a throwaway request) purely to get the
    // pickRand() function definition in scope; its own output is discarded.
    $_GET['action'] = 'jargonate';
    $_GET['level'] = '85';
    $_POST['in'] = '';
    ob_start();
    require $indexFile;
    ob_end_clean();

    $level = (int) ($argv[2] ?? 85);
    $trials = (int) ($argv[3] ?? 200);
    $list = ['x1', 'x2', 'x3'];
    $substituted = 0;
    for ($i = 0; $i < $trials; $i++) {
        if (pickRand($list, ' ', ' ', '', $level, false) !== '') {
            $substituted++;
        }
    }
    echo $substituted;
    exit;
}

fwrite(STDERR, "unknown harness mode: {$mode}\n");
exit(1);
