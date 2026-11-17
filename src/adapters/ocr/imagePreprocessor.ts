/**
 * FoodCue On-Device Packaging Image Preprocessor
 * Controlling Specification: Master Specification v13.5 §6.3
 *
 * Implements high-performance canvas/pixel-level preprocessing tailored for
 * challenging Indian FMCG packaging: glossy foil pouches, curved cylindrical cans,
 * specular reflections, and tiny 4-6pt ingredient typography.
 */

export interface PreprocessingOptions {
  enableGrayscale?: boolean;
  enableContrastStretch?: boolean;
  enableAdaptiveThreshold?: boolean;
  enableNoiseFilter?: boolean;
  scaleFactor?: number; // Scaling for small ingredient text enhancement (e.g. 1.5x - 2.0x)
}

export interface PreprocessingResult {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  appliedSteps: string[];
}

/**
 * 1. Grayscale Conversion using standard ITU-R BT.601 luminance weights:
 *    Y = 0.299*R + 0.587*G + 0.114*B
 */
export function applyGrayscale(
  data: Uint8ClampedArray,
  width: number,
  height: number
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(data.length);
  const totalPixels = width * height;

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const r = data[idx]!;
    const g = data[idx + 1]!;
    const b = data[idx + 2]!;
    const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    output[idx] = lum;
    output[idx + 1] = lum;
    output[idx + 2] = lum;
    output[idx + 3] = data[idx + 3]!; // Preserve alpha
  }

  return output;
}

/**
 * 2. Contrast Stretching (Histogram Normalization):
 *    Expands narrow dynamic range to full [0, 255] spectrum.
 */
export function applyContrastStretch(
  data: Uint8ClampedArray,
  width: number,
  height: number
): Uint8ClampedArray {
  let minLum = 255;
  let maxLum = 0;
  const totalPixels = width * height;

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const lum = data[idx]!;
    if (lum < minLum) minLum = lum;
    if (lum > maxLum) maxLum = lum;
  }

  // If already full range or completely flat, return as-is
  const range = maxLum - minLum;
  if (range <= 10 || range >= 240) {
    return new Uint8ClampedArray(data);
  }

  const output = new Uint8ClampedArray(data.length);
  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const stretched = Math.round(((data[idx]! - minLum) / range) * 255);
    output[idx] = stretched;
    output[idx + 1] = stretched;
    output[idx + 2] = stretched;
    output[idx + 3] = data[idx + 3]!;
  }

  return output;
}

/**
 * 3. Otsu's Global Binarization:
 *    Calculates optimal threshold to separate text foreground from background.
 */
export function computeOtsuThreshold(data: Uint8ClampedArray, width: number, height: number): number {
  const histogram = new Array(256).fill(0);
  const totalPixels = width * height;

  for (let i = 0; i < totalPixels; i++) {
    const lum = data[i * 4]!;
    histogram[lum]++;
  }

  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * histogram[t];

  let sumB = 0;
  let wB = 0;
  let wF = 0;
  let maxVariance = 0;
  let threshold = 128;

  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (wB === 0) continue;
    wF = totalPixels - wB;
    if (wF === 0) break;

    sumB += t * histogram[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const varianceBetween = wB * wF * (mB - mF) * (mB - mF);

    if (varianceBetween > maxVariance) {
      maxVariance = varianceBetween;
      threshold = t;
    }
  }

  return threshold;
}

/**
 * 4. Adaptive Binarization:
 *    Converts image to high-contrast black-and-white using Otsu's threshold.
 */
export function applyThreshold(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  threshold?: number
): Uint8ClampedArray {
  const actualThreshold = threshold ?? computeOtsuThreshold(data, width, height);
  const output = new Uint8ClampedArray(data.length);
  const totalPixels = width * height;

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const val = data[idx]! >= actualThreshold ? 255 : 0;
    output[idx] = val;
    output[idx + 1] = val;
    output[idx + 2] = val;
    output[idx + 3] = data[idx + 3]!;
  }

  return output;
}

/**
 * 5. 3x3 Median Noise Filter:
 *    Eliminates high-frequency salt-and-pepper noise caused by metallic packaging glare.
 */
export function applyMedianFilter(
  data: Uint8ClampedArray,
  width: number,
  height: number
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(data);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const window: number[] = [];
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const idx = ((y + dy) * width + (x + dx)) * 4;
          window.push(data[idx]!);
        }
      }
      window.sort((a, b) => a - b);
      const median = window[4]!; // Center of 9 sorted values
      const currentIdx = (y * width + x) * 4;
      output[currentIdx] = median;
      output[currentIdx + 1] = median;
      output[currentIdx + 2] = median;
    }
  }

  return output;
}

/**
 * High-Level Preprocessing Pipeline combining grayscale, contrast stretching,
 * median filtering, and thresholding.
 */
export function preprocessPackagingImage(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options: PreprocessingOptions = {}
): PreprocessingResult {
  const opts: PreprocessingOptions = {
    enableGrayscale: true,
    enableContrastStretch: true,
    enableAdaptiveThreshold: false, // Default false to avoid harsh binarization on gradient text
    enableNoiseFilter: false,
    ...options,
  };

  const appliedSteps: string[] = [];
  let current = data;

  if (opts.enableGrayscale) {
    current = applyGrayscale(current, width, height);
    appliedSteps.push("grayscale_bt601");
  }

  if (opts.enableContrastStretch) {
    current = applyContrastStretch(current, width, height);
    appliedSteps.push("contrast_stretch");
  }

  if (opts.enableNoiseFilter) {
    current = applyMedianFilter(current, width, height);
    appliedSteps.push("median_noise_filter");
  }

  if (opts.enableAdaptiveThreshold) {
    const threshold = computeOtsuThreshold(current, width, height);
    current = applyThreshold(current, width, height, threshold);
    appliedSteps.push(`otsu_threshold_${threshold}`);
  }

  return {
    data: current,
    width,
    height,
    appliedSteps,
  };
}
