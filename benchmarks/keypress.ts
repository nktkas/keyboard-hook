import { Key, KeyboardHook, type KeyEvent } from "@nktkas/keyboard-hook";

// Configuration
const CONFIG = {
    // Test parameters
    rates: [5, 10, 20, 50, 100], // Key presses per second
    duration: 10000, // Test duration in milliseconds

    // Key simulation
    keyCode: Key.A,
    keyName: "A",

    // Wait times
    initWait: 1000, // Wait time for hook initialization
    cooldownWait: 500, // Wait time after test to ensure all events processed
};

// Load user32.dll for key press emulation
const user32 = Deno.dlopen(
    "user32.dll",
    {
        keybd_event: {
            parameters: ["u8", "u8", "u32", "pointer"],
            result: "void",
        },
    } as const,
);

// Constants for keybd_event
const KEYEVENTF_KEYDOWN = 0x0000;
const KEYEVENTF_KEYUP = 0x0002;

// Statistics interface
interface Stats {
    min: number;
    max: number;
    avg: number;
    median: number;
    p95: number;
    p99: number;
}

// Test result interface
interface TestResult {
    rate: number;
    keyPressesEmulated: number;
    processedKeydowns: number;
    processedKeyups: number;
    keydown: Stats;
    keyup: Stats;
}

/**
 * Calculates statistics from an array of values
 */
function calculateStats(values: number[]): Stats {
    if (values.length === 0) {
        return { min: 0, max: 0, avg: 0, median: 0, p95: 0, p99: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const avg = sorted.reduce((sum, val) => sum + val, 0) / sorted.length;

    // Calculate percentiles
    const getPercentile = (p: number) => {
        const index = Math.floor((p / 100) * sorted.length);
        return sorted[Math.min(index, sorted.length - 1)];
    };

    return {
        min,
        max,
        avg,
        median: getPercentile(50),
        p95: getPercentile(95),
        p99: getPercentile(99),
    };
}

/**
 * Creates a simple table with dynamic column widths
 */
function createTable(headers: string[], rows: string[][], title?: string): string {
    // Calculate column widths
    const colWidths = headers.map((header, index) => {
        const dataWidths = rows.map((row) => row[index].length);
        return Math.max(header.length, ...dataWidths);
    });

    // Create border lines
    const topBorder = "┌" + colWidths.map((w) => "─".repeat(w + 2)).join("┬") + "┐";
    const middleBorder = "├" + colWidths.map((w) => "─".repeat(w + 2)).join("┼") + "┤";
    const bottomBorder = "└" + colWidths.map((w) => "─".repeat(w + 2)).join("┴") + "┘";

    // Build the table
    let table = title ? title + ":\n" : "";
    table += topBorder + "\n";
    table += "│ " + headers.map((header, i) => header.padEnd(colWidths[i])).join(" │ ") + " │\n";
    table += middleBorder + "\n";

    for (const row of rows) {
        table += "│ " + row.map((cell, i) => cell.padEnd(colWidths[i])).join(" │ ") + " │\n";
    }

    table += bottomBorder;
    return table;
}

/**
 * Emulates a single key press and returns the timing
 */
function emulateKeyPress() {
    // Emulate key down
    user32.symbols.keybd_event(CONFIG.keyCode, 0, KEYEVENTF_KEYDOWN, null);
    const downTime = performance.now();

    // Emulate key up
    user32.symbols.keybd_event(CONFIG.keyCode, 0, KEYEVENTF_KEYUP, null);
    const upTime = performance.now();

    return { downTime, upTime };
}

/**
 * Print the results of the benchmark
 */
function printResults(results: TestResult[]): void {
    console.log("\nKeyboard Hook Keypress Benchmark Results");
    console.log("=======================================");

    // Basic information table
    const basicRows = results.map((result) => {
        const captureRate = ((result.processedKeydowns + result.processedKeyups) /
            (result.keyPressesEmulated * 2) * 100).toFixed(2);

        return [
            String(result.rate),
            String(result.keyPressesEmulated),
            `${result.processedKeydowns} (${(result.processedKeydowns / result.keyPressesEmulated * 100).toFixed(2)}%)`,
            `${result.processedKeyups} (${(result.processedKeyups / result.keyPressesEmulated * 100).toFixed(2)}%)`,
            `${captureRate}%`,
        ];
    });

    console.log(createTable(
        ["Rate (/s)", "Key Presses", "Keydowns (%)", "Keyups (%)", "Success (%)"],
        basicRows,
        "Basic Information",
    ));

    // Keydown latency table
    const keydownRows = results.map((result) => [
        String(result.rate),
        result.keydown.min.toFixed(3),
        result.keydown.avg.toFixed(3),
        result.keydown.median.toFixed(3),
        result.keydown.p95.toFixed(3),
        result.keydown.p99.toFixed(3),
        result.keydown.max.toFixed(3),
    ]);

    console.log(
        "\n" + createTable(
            ["Rate (/s)", "Min", "Avg", "Median", "95th %ile", "99th %ile", "Max"],
            keydownRows,
            "Keydown Latency (ms)",
        ),
    );

    // Keyup latency table
    const keyupRows = results.map((result) => [
        String(result.rate),
        result.keyup.min.toFixed(3),
        result.keyup.avg.toFixed(3),
        result.keyup.median.toFixed(3),
        result.keyup.p95.toFixed(3),
        result.keyup.p99.toFixed(3),
        result.keyup.max.toFixed(3),
    ]);

    console.log(
        "\n" + createTable(
            ["Rate (/s)", "Min", "Avg", "Median", "95th %ile", "99th %ile", "Max"],
            keyupRows,
            "Keyup Latency (ms)",
        ),
    );
}

/**
 * The main test function for a single key press rate
 */
async function runRateTest(hook: KeyboardHook, rate: number): Promise<TestResult> {
    console.log(`\nRunning test with ${rate} key presses per second...`);

    // Arrays to store latency measurements
    const keydownLatencies: number[] = [];
    const keyupLatencies: number[] = [];

    // Track key presses
    const keyPressTimes: Array<{
        downTime: number;
        upTime: number;
        downProcessed: boolean;
        upProcessed: boolean;
    }> = [];

    // Set up event handlers
    const keydownHandler = (event: CustomEvent<KeyEvent>) => {
        const now = performance.now();
        if (event.detail.vkCode === CONFIG.keyCode) {
            for (let i = 0; i < keyPressTimes.length; i++) {
                if (!keyPressTimes[i].downProcessed) {
                    keyPressTimes[i].downProcessed = true;
                    keydownLatencies.push(now - keyPressTimes[i].downTime);
                    break;
                }
            }
        }
    };

    const keyupHandler = (event: CustomEvent<KeyEvent>) => {
        const now = performance.now();
        if (event.detail.vkCode === CONFIG.keyCode) {
            for (let i = 0; i < keyPressTimes.length; i++) {
                if (!keyPressTimes[i].upProcessed) {
                    keyPressTimes[i].upProcessed = true;
                    keyupLatencies.push(now - keyPressTimes[i].upTime);
                    break;
                }
            }
        }
    };

    hook.addEventListener("keydown", keydownHandler);
    hook.addEventListener("keyup", keyupHandler);

    // Emulate key presses
    const interval = 1000 / rate;
    let keyPressesEmulated = 0;

    const intervalId = setInterval(() => {
        const { downTime, upTime } = emulateKeyPress();
        keyPressTimes.push({ downTime, upTime, downProcessed: false, upProcessed: false });
        keyPressesEmulated++;

        // Show progress
        const progress = Math.min(100, (keyPressesEmulated * interval / CONFIG.duration) * 100);
        Deno.stdout.writeSync(new TextEncoder().encode(`\rProgress: ${progress.toFixed(0)}%`));
    }, interval);

    // Wait for the test to complete
    await new Promise((resolve) => setTimeout(resolve, CONFIG.duration));

    // Clean up
    clearInterval(intervalId);
    hook.removeEventListener("keydown", keydownHandler);
    hook.removeEventListener("keyup", keyupHandler);

    // Wait for last events to be processed
    await new Promise((resolve) => setTimeout(resolve, CONFIG.cooldownWait));

    // Calculate stats
    const processedKeydowns = keyPressTimes.filter((kp) => kp.downProcessed).length;
    const processedKeyups = keyPressTimes.filter((kp) => kp.upProcessed).length;

    console.log(
        `\n  Captured ${processedKeydowns}/${keyPressesEmulated} keydowns (${
            (processedKeydowns / keyPressesEmulated * 100).toFixed(1)
        }%)`,
    );
    console.log(
        `  Captured ${processedKeyups}/${keyPressesEmulated} keyups (${
            (processedKeyups / keyPressesEmulated * 100).toFixed(1)
        }%)`,
    );

    return {
        rate,
        keyPressesEmulated,
        processedKeydowns,
        processedKeyups,
        keydown: calculateStats(keydownLatencies),
        keyup: calculateStats(keyupLatencies),
    };
}

/**
 * Main benchmark function
 */
async function runBenchmark() {
    console.log("Keyboard Hook Keypress Benchmark");
    console.log("================================");
    console.log(`Key: ${CONFIG.keyName} (code: ${CONFIG.keyCode})`);
    console.log(`Test duration: ${CONFIG.duration / 1000} seconds per test`);
    console.log(`Testing rates: ${CONFIG.rates.join(", ")} key presses per second`);

    try {
        // Initialize the keyboard hook
        const hook = new KeyboardHook();

        // Wait for initialization
        await new Promise((resolve) => setTimeout(resolve, CONFIG.initWait));

        // Run tests for each rate
        const results: TestResult[] = [];
        for (const rate of CONFIG.rates) {
            results.push(await runRateTest(hook, rate));
        }

        // Print results
        printResults(results);

        // Clean up
        hook.close();
    } finally {
        // Always close user32.dll
        user32.close();
    }

    console.log("\nAll benchmarks completed!");
}

// Start the benchmark
runBenchmark();
