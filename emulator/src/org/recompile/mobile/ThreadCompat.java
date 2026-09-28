package org.recompile.mobile;

/**
 * Scheduling helpers patched into game classes by MIDletLoader.
 *
 * Under CheerpJ every Java thread runs cooperatively on the browser's main
 * thread: nothing else (input, painting, audio, other Java threads) happens
 * until the running thread blocks. Phones scheduled threads preemptively, so
 * J2ME games freely spin in loops that assume someone else will get CPU time:
 *
 *  - busy-waits on Thread.yield() / Thread.sleep(0) (Gameloft sound threads,
 *    frame limiters) -> the game crawls at ~1 fps;
 *  - `while (true) { frame(); }` main loops that never block -> the page freezes.
 *
 * yield()/sleep() replace the Thread methods; loop() is called on every loop
 * back edge and briefly sleeps when the page hasn't had a turn for a while.
 */
public final class ThreadCompat {
	/** longest a thread may run before letting the browser in, in ms */
	private static final long SLICE_MS = 25;

	private static long lastPause = System.currentTimeMillis();
	private static int counter = 0;

	private ThreadCompat() { }

	private static void pause() {
		try {
			Thread.sleep(1);
		} catch (InterruptedException e) {
			Thread.currentThread().interrupt();
		}
		lastPause = System.currentTimeMillis();
	}

	public static void yield() {
		pause();
	}

	public static void sleep(long ms) throws InterruptedException {
		Thread.sleep(Math.max(ms, 1));
		lastPause = System.currentTimeMillis();
	}

	public static void loop() {
		// cheap in the hot path: only look at the clock every 256 iterations
		if ((++counter & 0xFF) != 0) {
			return;
		}
		if (System.currentTimeMillis() - lastPause >= SLICE_MS) {
			pause();
		}
	}
}
