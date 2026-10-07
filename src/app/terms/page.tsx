import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Worth Knowing",
  description:
    "The rules for using Worth Knowing: accounts, contributions, moderation, and liability.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="font-heading text-4xl font-semibold tracking-wide">
        Terms of Service
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Last updated: October 6, 2026
      </p>
      <p className="mt-6 leading-relaxed">Welcome to Worth Knowing.</p>
      <p className="mt-2 leading-relaxed">
        Worth Knowing is a community-driven platform operated by{" "}
        <strong>Gideon Adeti</strong> for discovering and sharing resources that
        people believe are worth knowing.
      </p>
      <p className="mt-2 leading-relaxed">
        By using Worth Knowing, you agree to these Terms of Service.
      </p>

      <h2 className="mt-10 font-heading text-2xl font-semibold tracking-wide">
        1. Using Worth Knowing
      </h2>
      <p className="mt-2 leading-relaxed">You may use Worth Knowing to:</p>
      <ul className="mt-2 list-disc space-y-1 pl-6 leading-relaxed">
        <li>Discover resources shared by other people</li>
        <li>Share resources you believe are worth knowing</li>
        <li>Explain why you think a resource is worth knowing</li>
        <li>Save resources</li>
        <li>Create collections</li>
        <li>Participate in discussions</li>
        <li>Explore contributors and their contributions</li>
      </ul>
      <p className="mt-2 leading-relaxed">
        You are responsible for your use of the service and for the content you
        contribute.
      </p>
      <p className="mt-2 leading-relaxed">
        You must not use Worth Knowing in a way that violates applicable law or
        these Terms.
      </p>

      <h2 className="mt-10 font-heading text-2xl font-semibold tracking-wide">
        2. Accounts
      </h2>
      <p className="mt-2 leading-relaxed">Some features require an account.</p>
      <p className="mt-2 leading-relaxed">
        Authentication is provided by Clerk. When you create an account, Worth
        Knowing creates an associated user record for operating the application.
      </p>
      <p className="mt-2 leading-relaxed">
        You are responsible for maintaining the security of your account and for
        activity carried out through it.
      </p>
      <p className="mt-2 leading-relaxed">
        Usernames must follow the application&apos;s username rules. The service
        may reserve certain usernames or prevent usernames that are misleading,
        abusive, or otherwise unsuitable.
      </p>
      <p className="mt-2 leading-relaxed">
        You must not impersonate another person or intentionally misrepresent
        your identity or affiliation.
      </p>

      <h2 className="mt-10 font-heading text-2xl font-semibold tracking-wide">
        3. Contributions
      </h2>
      <p className="mt-2 leading-relaxed">
        Worth Knowing allows users to share specific resources and explain why
        they believe those resources are worth knowing.
      </p>
      <p className="mt-2 leading-relaxed">A contribution may include:</p>
      <ul className="mt-2 list-disc space-y-1 pl-6 leading-relaxed">
        <li>A resource URL</li>
        <li>A title</li>
        <li>A resource type</li>
        <li>Access information</li>
        <li>Tags</li>
        <li>Your explanation of why you think the resource is worth knowing</li>
      </ul>
      <p className="mt-2 leading-relaxed">
        You should only submit information that you have the right to submit.
      </p>

      <h3 className="mt-6 font-medium">Your content</h3>
      <p className="mt-2 leading-relaxed">
        You retain ownership of the original content you contribute to Worth
        Knowing.
      </p>
      <p className="mt-2 leading-relaxed">
        By submitting content, you grant Worth Knowing a non-exclusive,
        worldwide, royalty-free permission to host, store, reproduce, display,
        distribute, and otherwise use that content as reasonably necessary to
        operate, maintain, improve, and promote Worth Knowing.
      </p>
      <p className="mt-2 leading-relaxed">
        This permission does not transfer ownership of your content to Worth
        Knowing.
      </p>
      <p className="mt-2 leading-relaxed">
        It also does not give Worth Knowing ownership of resources that you link
        to.
      </p>
      <p className="mt-2 leading-relaxed">
        For example, if you share a YouTube video and write your own explanation
        of why you think it is worth knowing, the video remains the property of
        its respective owner. Your rights and the permission granted to Worth
        Knowing concern the contribution you make to Worth Knowing, such as your
        own written explanation and associated contribution information.
      </p>

      <h2 className="mt-10 font-heading text-2xl font-semibold tracking-wide">
        4. Public Contributions
      </h2>
      <p className="mt-2 leading-relaxed">
        Worth Knowing is built around public discovery.
      </p>
      <p className="mt-2 leading-relaxed">
        Unless a feature explicitly provides otherwise, contributions may be
        visible to other users and may be indexed by search engines.
      </p>
      <p className="mt-2 leading-relaxed">
        If you choose to contribute anonymously, your public contribution will
        not display your identity as its contributor.
      </p>
      <p className="mt-2 leading-relaxed">
        Anonymous contributions are not private contributions.
      </p>

      <h2 className="mt-10 font-heading text-2xl font-semibold tracking-wide">
        5. Comments and Discussions
      </h2>
      <p className="mt-2 leading-relaxed">
        Users may comment on resources and reply to comments.
      </p>
      <p className="mt-2 leading-relaxed">
        You are responsible for what you post.
      </p>
      <p className="mt-2 leading-relaxed">Do not use comments to:</p>
      <ul className="mt-2 list-disc space-y-1 pl-6 leading-relaxed">
        <li>Harass or threaten other people</li>
        <li>Post unlawful or abusive material</li>
        <li>Spam the community</li>
        <li>Impersonate others</li>
        <li>Deliberately mislead people</li>
        <li>
          Publish private information about another person without permission
        </li>
        <li>Circumvent moderation or abuse the service</li>
      </ul>
      <p className="mt-2 leading-relaxed">
        Comments may be removed by their author or by an administrator where the
        application permits.
      </p>

      <h2 className="mt-10 font-heading text-2xl font-semibold tracking-wide">
        6. Collections
      </h2>
      <p className="mt-2 leading-relaxed">
        Users may create collections of resources.
      </p>
      <p className="mt-2 leading-relaxed">
        A collection may be private or public depending on its settings.
      </p>
      <p className="mt-2 leading-relaxed">
        Creating a collection does not give you ownership of the resources
        included in it. A collection is a way of organizing links and
        contributions made available through Worth Knowing.
      </p>
      <p className="mt-2 leading-relaxed">
        Deleting a collection does not delete the resources contained in it.
      </p>

      <h2 className="mt-10 font-heading text-2xl font-semibold tracking-wide">
        7. External Resources
      </h2>
      <p className="mt-2 leading-relaxed">
        Worth Knowing primarily links to resources hosted by other people and
        organizations.
      </p>
      <p className="mt-2 leading-relaxed">
        We do not control those external resources and do not guarantee that:
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-6 leading-relaxed">
        <li>A linked resource will remain available</li>
        <li>A linked URL will remain accurate</li>
        <li>The linked content will remain unchanged</li>
        <li>The linked content is safe, lawful, accurate, or appropriate</li>
        <li>A linked service will continue operating</li>
        <li>A third party will handle your information appropriately</li>
      </ul>
      <p className="mt-2 leading-relaxed">
        You access external resources at your own discretion and subject to the
        third party&apos;s own terms and policies.
      </p>

      <h2 className="mt-10 font-heading text-2xl font-semibold tracking-wide">
        8. Content Moderation
      </h2>
      <p className="mt-2 leading-relaxed">
        Worth Knowing provides reporting and moderation mechanisms to help
        maintain the quality of the community.
      </p>
      <p className="mt-2 leading-relaxed">
        Users may report content for reasons such as spam, harassment, broken or
        misleading links, inappropriate content, or other violations of the
        service&apos;s rules.
      </p>
      <p className="mt-2 leading-relaxed">
        Reports are reviewed by administrators.
      </p>
      <p className="mt-2 leading-relaxed">
        An administrator may remove content that violates these Terms or that is
        otherwise inappropriate for the service.
      </p>
      <p className="mt-2 leading-relaxed">
        Moderation decisions may include removing resources, comments, tags, or
        other content.
      </p>
      <p className="mt-2 leading-relaxed">
        We do not guarantee that every violation will be detected or that every
        report will result in removal.
      </p>

      <h2 className="mt-10 font-heading text-2xl font-semibold tracking-wide">
        9. Prohibited Use
      </h2>
      <p className="mt-2 leading-relaxed">You must not use Worth Knowing to:</p>
      <ul className="mt-2 list-disc space-y-1 pl-6 leading-relaxed">
        <li>Break the law</li>
        <li>Harass, threaten, or abuse others</li>
        <li>Impersonate another person or organization</li>
        <li>Spam or manipulate the service</li>
        <li>Attempt to gain unauthorized access to accounts or systems</li>
        <li>Interfere with the operation or security of the service</li>
        <li>Upload malicious software or intentionally harmful content</li>
        <li>Deliberately submit misleading or deceptive information</li>
        <li>
          Violate another person&apos;s privacy or intellectual-property rights
        </li>
        <li>Circumvent reasonable technical or moderation controls</li>
      </ul>
      <p className="mt-2 leading-relaxed">
        We may take appropriate action when we become aware of prohibited
        activity.
      </p>

      <h2 className="mt-10 font-heading text-2xl font-semibold tracking-wide">
        10. Intellectual Property
      </h2>
      <p className="mt-2 leading-relaxed">
        Worth Knowing&apos;s software, design, branding, and other original
        service materials are owned by their respective rights holders and are
        protected by applicable intellectual-property laws.
      </p>
      <p className="mt-2 leading-relaxed">
        User contributions remain owned by their contributors, subject to the
        permission granted to Worth Knowing in these Terms.
      </p>
      <p className="mt-2 leading-relaxed">
        Third-party resources remain owned by their respective owners.
      </p>
      <p className="mt-2 leading-relaxed">
        Nothing in these Terms transfers ownership of third-party content to
        Worth Knowing.
      </p>

      <h2 className="mt-10 font-heading text-2xl font-semibold tracking-wide">
        11. Copyright and Other Rights Complaints
      </h2>
      <p className="mt-2 leading-relaxed">
        If you believe content available through Worth Knowing infringes your
        copyright or other rights, please contact:
      </p>
      <p className="mt-2 leading-relaxed">
        <strong>admin@weamp.org</strong>
      </p>
      <p className="mt-2 leading-relaxed">
        Include enough information for us to understand the work or rights
        involved, the relevant Worth Knowing content or URL, and how you believe
        your rights are affected.
      </p>
      <p className="mt-2 leading-relaxed">
        We may remove or restrict access to content when appropriate.
      </p>

      <h2 className="mt-10 font-heading text-2xl font-semibold tracking-wide">
        12. Availability
      </h2>
      <p className="mt-2 leading-relaxed">
        Worth Knowing is provided on a best-effort basis.
      </p>
      <p className="mt-2 leading-relaxed">We do not guarantee that:</p>
      <ul className="mt-2 list-disc space-y-1 pl-6 leading-relaxed">
        <li>The service will always be available</li>
        <li>The service will be uninterrupted or error-free</li>
        <li>Content will never be lost</li>
        <li>A particular feature will always remain available</li>
        <li>The service will meet a particular performance level</li>
      </ul>
      <p className="mt-2 leading-relaxed">
        We may modify, suspend, or discontinue parts of Worth Knowing when
        reasonably necessary.
      </p>

      <h2 className="mt-10 font-heading text-2xl font-semibold tracking-wide">
        13. No Professional Advice
      </h2>
      <p className="mt-2 leading-relaxed">
        Worth Knowing is a discovery and sharing platform.
      </p>
      <p className="mt-2 leading-relaxed">
        The presence of a resource on Worth Knowing does not mean that Worth
        Knowing endorses its claims, guarantees its accuracy, or provides
        professional advice.
      </p>
      <p className="mt-2 leading-relaxed">
        You are responsible for evaluating whether a resource is appropriate for
        your circumstances.
      </p>

      <h2 className="mt-10 font-heading text-2xl font-semibold tracking-wide">
        14. Disclaimer of Warranties
      </h2>
      <p className="mt-2 leading-relaxed">
        To the extent permitted by applicable law, Worth Knowing is provided on
        an “as is” and “as available” basis.
      </p>
      <p className="mt-2 leading-relaxed">
        We make no warranties regarding the accuracy, reliability, availability,
        completeness, or suitability of the service or user-submitted content.
      </p>

      <h2 className="mt-10 font-heading text-2xl font-semibold tracking-wide">
        15. Limitation of Liability
      </h2>
      <p className="mt-2 leading-relaxed">
        To the extent permitted by applicable law, Worth Knowing and its
        operator will not be liable for indirect, incidental, special,
        consequential, or punitive losses arising from your use of, or inability
        to use, the service or third-party resources accessed through it.
      </p>
      <p className="mt-2 leading-relaxed">
        Nothing in these Terms excludes or limits liability that cannot lawfully
        be excluded or limited.
      </p>

      <h2 className="mt-10 font-heading text-2xl font-semibold tracking-wide">
        16. Changes to the Terms
      </h2>
      <p className="mt-2 leading-relaxed">
        We may update these Terms as Worth Knowing evolves.
      </p>
      <p className="mt-2 leading-relaxed">
        When we make changes, we will update the <strong>Last updated</strong>{" "}
        date at the top of this page.
      </p>
      <p className="mt-2 leading-relaxed">
        Your continued use of Worth Knowing after updated Terms become effective
        constitutes acceptance of the updated Terms, to the extent permitted by
        applicable law.
      </p>

      <h2 className="mt-10 font-heading text-2xl font-semibold tracking-wide">
        17. Contact
      </h2>
      <p className="mt-2 leading-relaxed">
        For questions about these Terms, copyright or other rights complaints,
        privacy matters, account deletion, or other legal requests, contact:
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
