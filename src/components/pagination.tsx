import Link from "next/link";
import { btn } from "@/components/ui";

export function Pagination({
  basePath,
  page,
  pageCount,
  params,
  scrollTo,
}: {
  basePath: string;
  page: number;
  pageCount: number;
  params: Record<string, string | undefined>;
  scrollTo?: string;
}) {
  if (pageCount <= 1) return null;

  function href(target: number) {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) search.set(key, value);
    }
    if (target > 1) search.set("page", String(target));
    const query = search.toString();
    const hash = scrollTo ? `#${scrollTo}` : "";
    return query ? `${basePath}?${query}${hash}` : `${basePath}${hash}`;
  }

  return (
    <div className="mt-3 flex items-center justify-between gap-3 text-sm">
      <p className="text-stone-500">
        Page {page} of {pageCount}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} className={btn.secondary}>
            Previous
          </Link>
        ) : null}
        {page < pageCount ? (
          <Link href={href(page + 1)} className={btn.secondary}>
            Next
          </Link>
        ) : null}
      </div>
    </div>
  );
}
