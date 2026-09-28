import Link from "next/link";

import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";

export const metadata = {
  title: "Contributors — Worth Knowing",
  description: "The people who have contributed to Worth Knowing.",
};

export default function ContributorsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="font-heading text-4xl font-semibold tracking-wide">
        Contributors
      </h1>

      <Empty className="mt-8 border">
        <EmptyHeader>
          <EmptyTitle>Nothing listed yet</EmptyTitle>
        </EmptyHeader>
      </Empty>

      <p className="mt-8 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Back to the feed
        </Link>
      </p>
    </div>
  );
}
