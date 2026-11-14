export const measurementId = 'G-0HC7C4GFD5';

/** Authentication tokens and search input never belong in analytics URLs. */
export function analyticsLocation(value: string): string {
  try {
    const url = new URL(value);
    return /^https?:$/.test(url.protocol) ? url.origin + url.pathname : '';
  } catch {
    return '';
  }
}

let previousLocation = '';

export function trackPageView(url: URL, title: string): void {
  if (typeof window === 'undefined' || !window.gtag) return;
  const location = analyticsLocation(url.href);
  if (!location) return;
  const referrer = previousLocation || analyticsLocation(document.referrer);
  window.gtag('set', {
    page_location: location,
    page_referrer: referrer,
    page_title: title
  });
  window.gtag('event', 'page_view', {
    send_to: measurementId,
    page_location: location,
    page_referrer: referrer,
    page_title: title
  });
  previousLocation = location;
}
