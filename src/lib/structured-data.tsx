/**
 * JSON-LD, emitted safely.
 *
 * ## Why there is a helper rather than inline `dangerouslySetInnerHTML`
 *
 * Two reasons, and the second is the one that matters.
 *
 * **The obvious one is that the markup is escaped correctly.** A JSON-LD block
 * lives in a `<script type="application/ld+json">`, which is raw text — so a
 * literal `</script>` inside any string value terminates the element and turns the
 * rest of the string into markup. That is not hypothetical here: `title`,
 * `description` and a person's `name` are all **user-supplied text**, so a
 * contributor could write `</script><script>` in any of them.
 *
 * **`JSON.stringify` does not protect against this.** It escapes quotes, newlines
 * and control characters; it leaves `<` and `/` alone, because inside a JSON
 * *value* they are ordinary characters.
 *
 * **The fix is to escape `<` as `<`.** That is a valid JSON string escape
 * (`<` is a legal escape for `<`), so `JSON.parse` returns the original character
 * and the payload is byte-identical — while the raw text of the script element can
 * no longer contain `<`, and therefore cannot contain `</script>`. Nothing is lost
 * and the escaping is invisible to any consumer.
 *
 * ## Why the other escape is *not* done
 *
 * `<`, `>` and `&` would all be escaped to make the string safe in *HTML text*.
 * Only `<` is needed here, and escaping the other two would replace characters the
 * schema.org consumer receives literally. Over-escaping is a real bug class in its
 * own right, so this escapes exactly what has to be escaped and nothing more.
 */

/**
 * Serialises a JSON-LD object for embedding in a `<script>` element.
 *
 * `<` becomes `<`, which is a no-op for any JSON parser and makes the raw
 * script text incapable of closing its own element.
 */
export function jsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/**
 * A `<script type="application/ld+json">` carrying `data`.
 *
 * Wrapped rather than inlined at each call site so the escaping cannot be skipped
 * by the next person adding a type, and so the reasoning lives in one file.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // Suppressed rather than reconfigured: the rule is right in general and
      // should keep firing everywhere else. Here it is safe by construction —
      // `jsonLd` escapes every `<` in the payload, so the serialised text cannot
      // contain `</script>` even when a value is user-supplied, and
      // `application/ld+json` is not executed as script by any browser. See this
      // file's note above for the escaping that makes it hold.
      // biome-ignore lint/security/noDangerouslySetInnerHtml: payload is `<`-escaped above and ld+json is inert
      dangerouslySetInnerHTML={{ __html: jsonLd(data) }}
    />
  );
}
