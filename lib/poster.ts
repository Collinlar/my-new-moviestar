/**
 * YouTube's smaller thumbnails (hq, sd, mq) are 4:3 with black bars above and below the 16:9 picture, and most of our
 * film images are exactly these. A card that shows one zooms in just enough to lose the bars.
 */
export const thumbnailHasBars = (url: string): boolean =>
  /img\.youtube\.com\/vi\/[^/]+\/(hq|sd|mq)default\.jpg$/.test(url)

/** The biggest YouTube thumbnail is far more picture than a card behind the top one needs. */
export const lighterThumb = (url: string, depth: number): string =>
  depth > 0 ? url.replace(/\/maxresdefault\.jpg$/, '/sddefault.jpg') : url

/** The zoom that hides the bars: 360 over 270 pixels of the 4:3 image. */
export const BARS_ZOOM = 1.34
