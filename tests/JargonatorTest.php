<?php

use PHPUnit\Framework\TestCase;

/**
 * Exercises pickRand()/jargonate() boundary behavior through index.php's
 * public $_GET/$_POST contract. Each case shells out to a fresh PHP CLI
 * process (see harness.php) so that index.php's top-level routing code
 * (including its exit() branches) never runs inside the test process.
 */
final class JargonatorTest extends TestCase
{
    private function runHarness(array $args): string
    {
        $php = escapeshellarg(PHP_BINARY);
        $script = escapeshellarg(__DIR__ . '/harness.php');
        $escapedArgs = implode(' ', array_map('escapeshellarg', $args));
        return (string) shell_exec("{$php} {$script} {$escapedArgs} 2>&1");
    }

    public function testJargonateProducesNonEmptyString(): void
    {
        $output = $this->runHarness(['jargonate', 'hello world', '85']);
        $this->assertNotSame('', trim($output));
    }

    public function testJargonateAtLevelHundredLeavesWordsUnchanged(): void
    {
        // mt_rand(0,100) can never exceed 100, so the "a|the|is" and
        // adv/rep substitution passes deterministically never fire at
        // level=100; only the always-forced trailing sentence is added.
        $input = 'the cat sat on the mat';
        $output = $this->runHarness(['jargonate', $input, '100']);

        $this->assertStringStartsWith($input, $output);
        $this->assertGreaterThan(strlen($input), strlen($output));
    }

    public function testPickRandAtLevelZeroAlmostAlwaysSubstitutes(): void
    {
        // mt_rand(0,100) > 0 fails only when mt_rand() returns exactly 0
        // (~1/101 chance per call); across 300 trials, requiring at least
        // 250 substitutions gives a statistically safe, non-flaky floor.
        $count = (int) $this->runHarness(['pickrand', '0', '300']);
        $this->assertGreaterThan(250, $count);
    }

    public function testPickRandAtLevelHundredNeverSubstitutes(): void
    {
        // mt_rand(0,100) > 100 is never true, so the non-forced branch
        // of pickRand() deterministically never substitutes at level=100.
        $count = (int) $this->runHarness(['pickrand', '100', '300']);
        $this->assertSame(0, $count);
    }
}
