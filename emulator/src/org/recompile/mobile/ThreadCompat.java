package org.recompile.mobile;

/**
 * Replacements for Thread.yield() / Thread.sleep(long), patched into game classes
 * by MIDletLoader.
 *
 * Many J2ME games (Gameloft especially) busy-wait: a sound thread spinning on
 * yield() forever, or a frame limiter looping on sleep(0). On a phone that is
 * cheap. Under CheerpJ every Java thread shares the browser's main thread, so
 * those loops eat nearly all CPU and the game crawls at ~1 fps. Sleeping for at
 * least 1 ms lets the browser (and the other threads) breathe.
 */
public final class ThreadCompat {
	private ThreadCompat() { }

	public static void yield() {
		try {
			Thread.sleep(1);
		} catch (InterruptedException e) {
			Thread.currentThread().interrupt();
		}
	}

	public static void sleep(long ms) throws InterruptedException {
		Thread.sleep(Math.max(ms, 1));
	}
}
