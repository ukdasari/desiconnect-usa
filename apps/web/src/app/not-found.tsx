import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="container-page max-w-2xl py-24 text-center">
      <h1 className="text-4xl font-bold">We couldn&rsquo;t find that page</h1>
      <p className="mt-3 text-ink-2">The listing may have been removed or is waiting for review, or the link may be mistyped.</p>
      <div className="mt-8 flex justify-center gap-3">
        <ButtonLink href="/search">Search listings</ButtonLink>
        <ButtonLink href="/" variant="secondary">Go home</ButtonLink>
      </div>
    </div>
  );
}
