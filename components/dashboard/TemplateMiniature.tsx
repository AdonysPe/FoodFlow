import { menuTemplates, resolveMenuTemplate } from "@/lib/menuTemplates";

/**
 * A postage-stamp rendering of what a carta template looks like — header,
 * category chips and one dish row, in the template's own palette.
 *
 * Extracted from the old owner-facing category selector when that screen
 * became platform-admin only. It paints from `menuTemplates` and takes no
 * data, so it is a server component and the admin table can drop dozens of
 * them on a page without shipping any JavaScript for them.
 */

function MiniatureMotif({ decoration }: { decoration: string }) {
  if (decoration === "pacifico")
    return (
      <>
        <path d="M1 12c7-5 13-5 20 0s13 5 25-1M1 19c7-5 13-5 20 0s13 5 25-1" />
        <path d="M13 5c4-4 10-4 14 0-4 4-10 4-14 0ZM13 5 9 2v6l4-3Z" />
      </>
    );
  if (decoration === "celosia")
    return (
      <>
        <path d="M4 2h16v16H4zM8 6h8v8H8zM27 2h16v16H27zM31 6h8v8h-8z" />
        <path d="M20 10h7" />
      </>
    );
  if (decoration === "trigo")
    return (
      <>
        <path d="M24 21V2M24 7c-5-1-7-3-8-6 5 0 7 2 8 6Zm0 5c5-1 7-3 8-6-5 0-7 2-8 6Zm0 5c-5-1-7-3-8-6 5 0 7 2 8 6Z" />
        <path d="M3 20c8-4 13-4 20 0M28 20c7-4 12-4 17 0" />
      </>
    );
  return (
    <>
      <path d="M7 4c9-3 14 1 11 8-2 5-7 8-15 9 4-5 3-12 4-17Z" />
      <path d="M12 4c2-3 5-4 8-3M24 8c7-3 13-2 20 2" />
    </>
  );
}

export default function TemplateMiniature({ template }: { template: string }) {
  const theme = menuTemplates[resolveMenuTemplate(null, template)];
  const { background, surface, primary, secondary, cta } = theme.colors;

  return (
    <div
      className="overflow-hidden rounded-xl border border-fg/10"
      style={{ background }}
      aria-hidden="true"
    >
      <div
        className="px-4 py-3"
        style={{ background: `linear-gradient(115deg, ${background}, ${surface})` }}
      >
        <div className="flex items-start justify-between">
          <div>
            <span
              className="block h-1 w-12 rounded-full opacity-50"
              style={{ background: secondary }}
            />
            <span
              className="mt-2 block font-display text-[18px] font-bold leading-none"
              style={{ color: primary }}
            >
              La carta
            </span>
          </div>
          <svg
            width="47"
            height="22"
            viewBox="0 0 47 22"
            fill="none"
            stroke={secondary}
            strokeWidth="1.5"
            opacity="0.6"
          >
            <MiniatureMotif decoration={theme.decoration} />
          </svg>
        </div>
      </div>

      <div className="flex gap-1.5 px-3 py-2">
        <span className="h-3 w-10 rounded-full" style={{ background: secondary }} />
        <span
          className="h-3 w-12 rounded-full opacity-30"
          style={{ background: secondary }}
        />
        <span
          className="h-3 w-9 rounded-full opacity-30"
          style={{ background: secondary }}
        />
      </div>

      <div
        className="mx-3 mb-3 flex items-center gap-2 rounded-lg p-2 shadow-sm"
        style={{ background: surface }}
      >
        <span
          className="h-9 w-10 rounded-md"
          style={{ background: `linear-gradient(135deg, ${secondary}55, ${background})` }}
        />
        <span className="flex-1">
          <span className="block h-1.5 w-16 rounded-full" style={{ background: primary }} />
          <span
            className="mt-1.5 block h-1 w-12 rounded-full opacity-30"
            style={{ background: primary }}
          />
        </span>
        <span className="h-5 w-9 rounded" style={{ background: cta }} />
      </div>
    </div>
  );
}
