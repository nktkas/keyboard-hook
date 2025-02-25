import { Key, KeyboardHook, type KeyEvent } from "@nktkas/keyboard-hook";

// Configuration
const CONFIG = {
    // Test parameters
    durations: [1000, 2000, 5000, 10000], // Test durations in milliseconds
    repetitions: 5, // Run each test multiple times for consistency
    warmupEvents: 5, // Events to discard at beginning for system stabilization

    // Key simulation
    keyCode: Key.A,
    keyName: "A",
    repeatInterval: 10, // Milliseconds between simulated key presses

    // Wait times
    initWait: 1000, // Wait time for hook initialization
    cooldownWait: 500, // Wait time after test to ensure all events processed
    iterationWait: 1000, // Wait time between test iterations
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
    stdev: number;
}

// Test result interface
interface TestResult {
    duration: number;
    events: number;
    eventsPerSecond: number;
    latency: Stats;
}

/**
 * Calculates statistics from an array of values
 */
function calculateStats(values: number[]): Stats {
    if (values.length === 0) {
        return { min: 0, max: 0, avg: 0, median: 0, p95: 0, p99: 0, stdev: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const avg = sorted.reduce((sum, val) => sum + val, 0) / sorted.length;

    // Calculate standard deviation
    const squaredDiffs = values.map((value) => Math.pow(value - avg, 2));
    const variance = squaredDiffs.reduce((sum, value) => sum + value, 0) / values.length;
    const stdev = Math.sqrt(variance);

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
        stdev,
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
 * Print the results of the benchmark
 */
function printResults(results: TestResult[]): void {
    console.log("\nKeyboard Hook Held Key Benchmark Results");
    console.log("=======================================");

    // Basic information table
    const summaryRows = results.map((result) => [
        String(result.duration),
        String(result.events),
        result.eventsPerSecond.toFixed(2),
    ]);

    console.log(createTable(
        ["Duration (ms)", "Events", "Events/Second"],
        summaryRows,
        "Basic Information:",
    ));

    // Latency statistics table
    const latencyRows = results.map((result) => [
        String(result.duration),
        result.latency.min.toFixed(3),
        result.latency.avg.toFixed(3),
        result.latency.median.toFixed(3),
        result.latency.stdev.toFixed(3),
        result.latency.p95.toFixed(3),
        result.latency.p99.toFixed(3),
        result.latency.max.toFixed(3),
    ]);

    console.log(
        "\n" + createTable(
            ["Duration (ms)", "Min", "Avg", "Median", "Stdev", "95th %ile", "99th %ile", "Max"],
            latencyRows,
            "Emit to Receive Latency (ms)",
        ),
    );
}

/**
 * The main test function for a single duration
 */
async function runTest(hook: KeyboardHook, durationMs: number): Promise<TestResult> {
    console.log(`\nRunning test with continuous keydowns for ${durationMs} ms...`);

    const latencies: number[] = [];
    let totalEvents = 0;

    // Run the test multiple times for consistency
    for (let iteration = 0; iteration < CONFIG.repetitions; iteration++) {
        console.log(`  Iteration ${iteration + 1}/${CONFIG.repetitions}`);

        // Track sent and received events
        interface EventTracker {
            emitTime: number;
            received: boolean;
        }

        const events = new Map<number, EventTracker>();
        let eventId = 0;
        let receivedCount = 0;

        // Set up event handler
        const keydownHandler = (event: CustomEvent<KeyEvent>) => {
            if (event.detail.vkCode === CONFIG.keyCode) {
                const now = performance.now();

                // Find the oldest unreceived event
                for (const [_, tracker] of events.entries()) {
                    if (!tracker.received) {
                        tracker.received = true;
                        latencies.push(now - tracker.emitTime);
                        receivedCount++;
                        break;
                    }
                }
            }
        };

        hook.addEventListener("keydown", keydownHandler);

        // Initial press and release to reset state
        user32.symbols.keybd_event(CONFIG.keyCode, 0, KEYEVENTF_KEYDOWN, null);
        await new Promise((resolve) => setTimeout(resolve, 100));
        user32.symbols.keybd_event(CONFIG.keyCode, 0, KEYEVENTF_KEYUP, null);
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Send continuous keydown events over the test duration
        const startTime = performance.now();
        let nextEventTime = startTime;

        while (performance.now() - startTime < durationMs) {
            // Wait until it's time for the next event
            const waitTime = nextEventTime - performance.now();
            if (waitTime > 0) {
                await new Promise((resolve) => setTimeout(resolve, waitTime));
            }

            // Emit the event and track it
            user32.symbols.keybd_event(CONFIG.keyCode, 0, KEYEVENTF_KEYDOWN, null);
            events.set(eventId++, {
                emitTime: performance.now(),
                received: false,
            });

            // Schedule next event
            nextEventTime += CONFIG.repeatInterval;
        }

        // Release the key and wait for all events to process
        user32.symbols.keybd_event(CONFIG.keyCode, 0, KEYEVENTF_KEYUP, null);
        await new Promise((resolve) => setTimeout(resolve, CONFIG.cooldownWait));

        // Clean up
        hook.removeEventListener("keydown", keydownHandler);

        // Calculate effective events (excluding warmup)
        const validEvents = Math.max(0, eventId - CONFIG.warmupEvents);
        const effectiveReceived = Math.max(0, receivedCount - CONFIG.warmupEvents);

        totalEvents += validEvents;

        // Show capture rate for this iteration
        const captureRate = validEvents > 0 ? (effectiveReceived / validEvents * 100) : 0;
        console.log(`    Captured ${effectiveReceived}/${validEvents} events (${captureRate.toFixed(1)}%)`);

        // Wait between iterations
        if (iteration < CONFIG.repetitions - 1) {
            await new Promise((resolve) => setTimeout(resolve, CONFIG.iterationWait));
        }
    }

    // Remove warmup latencies from all repetitions
    const warmupLatencies = CONFIG.warmupEvents * CONFIG.repetitions;
    const effectiveLatencies = latencies.slice(warmupLatencies);

    // Calculate average events per second
    const eventsPerSecond = totalEvents / ((durationMs * CONFIG.repetitions) / 1000);

    return {
        duration: durationMs,
        events: Math.round(totalEvents / CONFIG.repetitions),
        eventsPerSecond,
        latency: calculateStats(effectiveLatencies),
    };
}

/**
 * Main benchmark function
 */
async function runBenchmark() {
    console.log("Keyboard Hook Held Key Benchmark");
    console.log("================================");
    console.log(`Key: ${CONFIG.keyName} (code: ${CONFIG.keyCode})`);
    console.log(`Repeat interval: ${CONFIG.repeatInterval} ms`);
    console.log(`Testing durations: ${CONFIG.durations.join(", ")} ms`);
    console.log(`Repetitions per test: ${CONFIG.repetitions}`);
    console.log(`Warmup events: ${CONFIG.warmupEvents}`);

    try {
        // Initialize the keyboard hook
        const hook = new KeyboardHook();
        hook.start();

        // Wait for initialization
        await new Promise((resolve) => setTimeout(resolve, CONFIG.initWait));

        // Run tests for each duration
        const results: TestResult[] = [];
        for (const duration of CONFIG.durations) {
            results.push(await runTest(hook, duration));
        }

        // Print results
        printResults(results);

        // Clean up
        hook.stop();
    } finally {
        // Always close user32.dll
        user32.close();
    }

    console.log("\nAll benchmarks completed!");
}

// Start the benchmark
runBenchmark();
