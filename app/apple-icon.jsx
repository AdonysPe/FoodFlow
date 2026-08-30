import { ImageResponse } from "next/og";

/**
 * The icon iOS uses when someone saves the site to their home screen. The
 * tab favicon is the static `icon.svg`; Apple's convention only accepts a
 * raster file, so the same mark is rendered to PNG here instead of being
 * kept as a second drawing that could drift from the first.
 *
 * Satori draws the fork from a data URI rather than as inline SVG elements,
 * which it does not lay out.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const FORK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="180" height="180"><g fill="none" stroke="#0c0908" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 8v5c0 3 6 2 6 5"/><path d="M16 8v16"/><path d="M22 8v5c0 3-6 2-6 5"/></g></svg>`;

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#ff5a33",
        }}
      >
        <img
          width="180"
          height="180"
          src={`data:image/svg+xml;utf8,${encodeURIComponent(FORK)}`}
          alt=""
        />
      </div>
    ),
    size
  );
}
