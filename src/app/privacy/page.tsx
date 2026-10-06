import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Worth Knowing",
  description:
    "What information Worth Knowing collects, how it is used, what is public, and the choices available to you.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="font-heading text-4xl font-semibold tracking-wide">
        Privacy Policy
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Last updated: October 6, 2026
      </p>
      <p className="mt-6 leading-relaxed">
        Worth Knowing is a community-driven platform operated by{" "}
        <strong>Gideon Adeti</strong> that helps people discover and share
        resources they believe are worth knowing.
      </p>
      <p className="mt-2 leading-relaxed">
        This Privacy Policy explains what information Worth Knowing collects,
        how it is used, what information is public, and the choices available to
        you.
      </p>

      <h2 className="mt-10 font-heading text-2xl font-semibold tracking-wide">
        1. Information We Collect
      </h2>

      <h3 className="mt-6 font-medium">Account information</h3>
      <p className="mt-2 leading-relaxed">
        When you create an account, authentication is handled by{" "}
        <strong>Clerk</strong>. Depending on your account and the authentication
        method you use, Clerk may process information such as your name, email
        address, profile image, and authentication and session information.
      </p>
      <p className="mt-2 leading-relaxed">
        Worth Knowing also maintains a local user record associated with your
        Clerk account. This record may contain:
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-6 leading-relaxed">
        <li>Your username</li>
        <li>Your name</li>
        <li>Your email address</li>
        <li>Your profile image</li>
        <li>Your bio</li>
        <li>Your profile privacy setting</li>
        <li>Your preference for anonymous contributions</li>
        <li>Your account role</li>
        <li>Your account creation date</li>
      </ul>
      <p className="mt-2 leading-relaxed">
        Your email address and internal account identifiers are not exposed
        through Worth Knowing&apos;s public APIs.
      </p>

      <h3 className="mt-6 font-medium">Content you contribute</h3>
      <p className="mt-2 leading-relaxed">
        When you use Worth Knowing, you may contribute:
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-6 leading-relaxed">
        <li>Resources and their URLs</li>
        <li>Resource titles</li>
        <li>Resource types and access information</li>
        <li>Your explanation of why you think a resource is worth knowing</li>
        <li>Tags</li>
        <li>Comments and replies</li>
        <li>Collections</li>
        <li>
          Other information you choose to include in public or private content
        </li>
      </ul>
      <p className="mt-2 leading-relaxed">
        Your contributions may be associated with your profile unless you choose
        to contribute anonymously where that option is available.
      </p>

      <h3 className="mt-6 font-medium">
        Technical and operational information
      </h3>
      <p className="mt-2 leading-relaxed">
        Worth Knowing maintains application request logs for operational and
        security purposes. These logs may contain information such as:
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-6 leading-relaxed">
        <li>Request method</li>
        <li>Requested URL, including query parameters</li>
        <li>HTTP response status</li>
        <li>Server-side error information where applicable</li>
      </ul>
      <p className="mt-2 leading-relaxed">
        Authorization and cookie headers are redacted from these logs. Worth
        Knowing does not intentionally log request bodies or IP addresses
        through its application request logging.
      </p>
      <p className="mt-2 leading-relaxed">
        Search and filter terms included in URLs may therefore appear in
        application logs.
      </p>

      <h3 className="mt-6 font-medium">Browser storage</h3>
      <p className="mt-2 leading-relaxed">
        Worth Knowing stores your theme preference in your browser&apos;s local
        storage. This allows the application to remember whether you prefer a
        particular appearance.
      </p>
      <p className="mt-2 leading-relaxed">
        Authentication also uses cookies and other session mechanisms provided
        by Clerk.
      </p>

      <h2 className="mt-10 font-heading text-2xl font-semibold tracking-wide">
        2. Public Information
      </h2>
      <p className="mt-2 leading-relaxed">
        Worth Knowing is designed around sharing resources publicly.
      </p>
      <p className="mt-2 leading-relaxed">
        Unless a feature explicitly provides otherwise, the following may be
        publicly accessible:
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-6 leading-relaxed">
        <li>Resource titles and URLs</li>
        <li>Your explanation of why you think a resource is worth knowing</li>
        <li>Tags</li>
        <li>Comments and replies</li>
        <li>Public collections</li>
        <li>Public profile information</li>
        <li>Public contribution history</li>
      </ul>
      <p className="mt-2 leading-relaxed">
        Public resources and related content may also be indexed by search
        engines.
      </p>

      <h3 className="mt-6 font-medium">Anonymous contributions</h3>
      <p className="mt-2 leading-relaxed">
        You may be able to contribute a resource anonymously. Anonymous
        attribution means that your identity is not displayed publicly as the
        contributor.
      </p>
      <p className="mt-2 leading-relaxed">
        Anonymous does <strong>not</strong> mean that the contribution is
        private or that Worth Knowing has no record of who submitted it.
      </p>
      <p className="mt-2 leading-relaxed">
        An anonymous contribution may still be associated internally with the
        account that submitted it.
      </p>
      <p className="mt-2 leading-relaxed">
        You can change the anonymity of a contribution you own from its edit
        page. Changing your default anonymity preference never alters
        contributions you have already shared.
      </p>

      <h3 className="mt-6 font-medium">Private profiles</h3>
      <p className="mt-2 leading-relaxed">
        If you make your profile private, other users may no longer be able to
        access your profile through the public application.
      </p>
      <p className="mt-2 leading-relaxed">
        Making your profile private does not automatically change the
        attribution of previous contributions that were made publicly under your
        identity. If you need a particular contribution removed or otherwise
        changed, you can delete it where the application provides that
        capability.
      </p>

      <h2 className="mt-10 font-heading text-2xl font-semibold tracking-wide">
        3. How We Use Information
      </h2>
      <p className="mt-2 leading-relaxed">We use information to:</p>
      <ul className="mt-2 list-disc space-y-1 pl-6 leading-relaxed">
        <li>Provide and operate Worth Knowing</li>
        <li>Authenticate users and maintain sessions</li>
        <li>Display contributor attribution</li>
        <li>Store and display resources and discussions</li>
        <li>Provide search, browsing, saving, and collection features</li>
        <li>Maintain user preferences</li>
        <li>Moderate content and respond to reports</li>
        <li>Prevent abuse and excessive automated requests</li>
        <li>
          Diagnose errors and maintain the reliability and security of the
          service
        </li>
        <li>
          Communicate with you when necessary in connection with the service or
          a request you make
        </li>
      </ul>
      <p className="mt-2 leading-relaxed">
        We do not sell your personal information.
      </p>

      <h2 className="mt-10 font-heading text-2xl font-semibold tracking-wide">
        4. Third-Party Service Providers
      </h2>
      <p className="mt-2 leading-relaxed">
        Worth Knowing relies on third-party service providers to operate parts
        of the service.
      </p>
      <p className="mt-2 leading-relaxed">
        These currently include services used for:
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-6 leading-relaxed">
        <li>
          <strong>Authentication:</strong> Clerk
        </li>
        <li>
          <strong>Hosting and application infrastructure:</strong> Vercel
        </li>
        <li>
          <strong>Database infrastructure:</strong> Neon
        </li>
        <li>
          <strong>Analytics and performance measurement:</strong> Vercel
          Analytics and Vercel Speed Insights
        </li>
      </ul>
      <p className="mt-2 leading-relaxed">
        These providers may process information on our behalf as necessary to
        provide their services.
      </p>
      <p className="mt-2 leading-relaxed">
        Because these providers operate independently of Worth Knowing, their
        own privacy policies and terms may also apply to their processing of
        information.
      </p>
      <p className="mt-2 leading-relaxed">
        Worth Knowing does not claim that every service provider processes
        information in the same country or region as you. Information may be
        processed in countries other than the country in which you live.
      </p>

      <h2 className="mt-10 font-heading text-2xl font-semibold tracking-wide">
        5. Analytics
      </h2>
      <p className="mt-2 leading-relaxed">
        Worth Knowing currently uses Vercel Analytics and Vercel Speed Insights
        to understand general site usage and application performance.
      </p>
      <p className="mt-2 leading-relaxed">
        Worth Knowing does not currently use behavioral session replay or a
        separate product analytics system such as PostHog.
      </p>

      <h2 className="mt-10 font-heading text-2xl font-semibold tracking-wide">
        6. Links to Other Websites
      </h2>
      <p className="mt-2 leading-relaxed">
        Worth Knowing contains links to resources hosted by third parties.
      </p>
      <p className="mt-2 leading-relaxed">
        When you follow a resource link, you leave Worth Knowing and interact
        directly with the third-party service. Worth Knowing does not control
        the privacy practices, security, availability, or content of those
        external services.
      </p>
      <p className="mt-2 leading-relaxed">
        You should review the applicable privacy policy and terms of any
        third-party service you visit.
      </p>

      <h2 className="mt-10 font-heading text-2xl font-semibold tracking-wide">
        7. Data Retention
      </h2>
      <p className="mt-2 leading-relaxed">
        Your Worth Knowing content generally remains available until you or an
        administrator deletes it, subject to the operation of the service and
        technical backups.
      </p>
      <p className="mt-2 leading-relaxed">
        Different information may remain in infrastructure, logs, or backups for
        periods determined by the relevant service provider or operational
        systems.
      </p>
      <p className="mt-2 leading-relaxed">
        We do not currently publish a fixed retention period for application
        logs or infrastructure backups.
      </p>

      <h2 className="mt-10 font-heading text-2xl font-semibold tracking-wide">
        8. Your Choices
      </h2>
      <p className="mt-2 leading-relaxed">
        Depending on the feature, you may be able to:
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-6 leading-relaxed">
        <li>Change your username and bio</li>
        <li>Change your profile privacy setting</li>
        <li>Change your default anonymity preference</li>
        <li>Delete resources you contributed</li>
        <li>Delete comments you authored</li>
        <li>Delete collections you own</li>
        <li>Remove saved resources</li>
        <li>Choose whether individual contributions are anonymous</li>
        <li>Report content that violates the rules or appears inappropriate</li>
      </ul>
      <p className="mt-2 leading-relaxed">
        Account authentication and account-level information such as your email
        address are managed through Clerk.
      </p>
      <p className="mt-2 leading-relaxed">
        Worth Knowing does not currently provide an in-app account-export
        feature.
      </p>

      <h2 className="mt-10 font-heading text-2xl font-semibold tracking-wide">
        9. Account Deletion
      </h2>
      <p className="mt-2 leading-relaxed">
        Worth Knowing does not currently provide an in-app account deletion
        button.
      </p>
      <p className="mt-2 leading-relaxed">
        If your Clerk account is deleted, Worth Knowing receives an
        account-deletion notification and removes the associated local account
        record.
      </p>
      <p className="mt-2 leading-relaxed">
        Where appropriate, content associated with a deleted account is either
        removed or de-attributed. For example, resources may remain available
        with their contributor shown as removed rather than continuing to
        identify the deleted account.
      </p>
      <p className="mt-2 leading-relaxed">
        Some information may remain in backups or operational logs for a period
        determined by the applicable infrastructure.
      </p>
      <p className="mt-2 leading-relaxed">
        If you need assistance with account deletion or the handling of your
        information, contact us at <strong>admin@weamp.org</strong>.
      </p>

      <h2 className="mt-10 font-heading text-2xl font-semibold tracking-wide">
        10. Security
      </h2>
      <p className="mt-2 leading-relaxed">
        We take reasonable measures to protect the information processed through
        Worth Knowing.
      </p>
      <p className="mt-2 leading-relaxed">
        Authentication is provided by Clerk, and application data is stored
        using managed infrastructure.
      </p>
      <p className="mt-2 leading-relaxed">
        However, no internet service or method of electronic storage can be
        guaranteed to be completely secure.
      </p>

      <h2 className="mt-10 font-heading text-2xl font-semibold tracking-wide">
        11. Children&apos;s Privacy
      </h2>
      <p className="mt-2 leading-relaxed">
        Worth Knowing is not specifically directed at children.
      </p>
      <p className="mt-2 leading-relaxed">
        We do not knowingly design the service to target children or collect
        information from children for advertising purposes.
      </p>
      <p className="mt-2 leading-relaxed">
        If you believe that a child has provided personal information through
        Worth Knowing in circumstances where that information should not have
        been collected, please contact us at <strong>admin@weamp.org</strong>.
      </p>

      <h2 className="mt-10 font-heading text-2xl font-semibold tracking-wide">
        12. International Processing
      </h2>
      <p className="mt-2 leading-relaxed">
        Worth Knowing uses third-party infrastructure providers to operate the
        service. As a result, information may be processed or stored outside
        your country of residence.
      </p>
      <p className="mt-2 leading-relaxed">
        The specific processing locations may depend on the configuration and
        infrastructure of the services we use.
      </p>

      <h2 className="mt-10 font-heading text-2xl font-semibold tracking-wide">
        13. Changes to This Policy
      </h2>
      <p className="mt-2 leading-relaxed">
        We may update this Privacy Policy as Worth Knowing changes.
      </p>
      <p className="mt-2 leading-relaxed">
        When we make changes, we will update the <strong>Last updated</strong>{" "}
        date at the top of this page.
      </p>
      <p className="mt-2 leading-relaxed">
        If a change materially affects how we handle information, we may provide
        additional notice where appropriate.
      </p>

      <h2 className="mt-10 font-heading text-2xl font-semibold tracking-wide">
        14. Contact
      </h2>
      <p className="mt-2 leading-relaxed">
        For privacy questions, requests concerning your information, account
        deletion requests, or other privacy-related matters, contact:
      </p>
      <p className="mt-2 leading-relaxed">
        <strong>admin@weamp.org</strong>
      </p>
      <p className="mt-2 leading-relaxed">
        Worth Knowing is operated by <strong>Gideon Adeti</strong>.
      </p>
    </div>
  );
}
