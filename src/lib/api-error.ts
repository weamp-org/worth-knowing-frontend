import axios from "axios";

/**
 * Turn a failed request into something worth showing a person.
 *
 * The backend's `GlobalExceptionFilter` answers with
 * `{ statusCode, message, error, timestamp, path }`. `message` is a plain string
 * for a thrown exception, and an array of strings when the `ValidationPipe`
 * rejects a body — both shapes are handled here.
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    // No response at all: the request never reached the backend. Almost always
    // a dev-server problem, and the Axios default message ("Network Error")
    // does not say so.
    if (!error.response) {
      return "Could not reach the backend. Is it running?";
    }

    const data = error.response.data as { message?: unknown } | undefined;
    const { message } = data ?? {};

    if (typeof message === "string" && message.length > 0) {
      return message;
    }

    if (Array.isArray(message)) {
      const joined = message
        .filter((entry): entry is string => typeof entry === "string")
        .join(", ");

      if (joined.length > 0) {
        return joined;
      }
    }

    return `${fallback} (HTTP ${error.response.status})`;
  }

  return fallback;
}

/**
 * Whether a request was refused for being who the caller is.
 *
 * Separate from {@link getApiErrorMessage} because "you may not do this" and "that
 * failed" are different situations: one is a state to render, the other is a fault to
 * report. Only the former should be swallowed.
 */
export function isForbidden(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 403;
}

/**
 * Whether a request 404'd because the thing asked for does not exist.
 *
 * The third member of the same family as {@link isForbidden}, and for the same
 * reason: "there is nothing here" is a state a page renders, not a fault worth
 * throwing to the error boundary.
 *
 * Worth being careful about *which* 404, because they are not interchangeable.
 * `GET /resources/random` returning 404 means the site has no resources at all —
 * an empty state the home page draws nothing for. The same status from
 * `GET /resources/:id` means that id is bad, and `getResourceOrNotFound` turns it
 * into a 404 page instead. Swallowing both in one helper would render an empty
 * home page for a mistyped id.
 */
export function isNotFound(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 404;
}
