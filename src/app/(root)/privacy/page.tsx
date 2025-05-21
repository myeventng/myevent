import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | myevent.com.ng',
  description:
    'Learn how myevent.com.ng collects, uses, and protects your personal information',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="container max-w-4xl py-12 px-4 md:py-16 md:px-0 mx-auto">
      <div className="space-y-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Last updated: May 21, 2025
          </p>
        </div>

        <div className="prose prose-gray max-w-none dark:prose-invert">
          <p className="lead">
            At myevent.com.ng, we take your privacy seriously. This Privacy
            Policy explains how we collect, use, disclose, and safeguard your
            information when you use our website and services. Please read this
            privacy policy carefully. If you do not agree with the terms of this
            privacy policy, please do not access the site.
          </p>

          <h2 className="text-2xl font-bold mt-12 mb-4">
            Collection of Your Information
          </h2>

          <p className="mb-4">
            We may collect information about you in a variety of ways. The
            information we may collect via the website includes:
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-3">Personal Data</h3>
          <p className="mb-4">
            Personally identifiable information, such as your name, email
            address, telephone number, and demographic information, such as your
            age, gender, hometown, etc., that you voluntarily give to us when
            you register with the website or when you choose to participate in
            various activities related to the website, such as purchasing
            tickets for events. You are under no obligation to provide us with
            personal information of any kind, however, your refusal to do so may
            prevent you from using certain features of the website.
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-3">Derivative Data</h3>
          <p className="mb-4">
            Information our servers automatically collect when you access the
            website, such as your IP address, browser type, operating system,
            access times, and the pages you have viewed.
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-3">Financial Data</h3>
          <p className="mb-4">
            Financial information, such as data related to your payment method
            (e.g., credit card number, card brand, expiration date) that we may
            collect when you purchase tickets or make other purchases through
            the website. We store only very limited, if any, financial
            information that we collect. Otherwise, all financial information is
            stored by our payment processor, and you are encouraged to review
            their privacy policy and contact them directly for responses to your
            questions.
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-3">
            Mobile Device Data
          </h3>
          <p className="mb-8">
            Device information, such as your mobile device ID, model, and
            manufacturer, and information about the location of your device, if
            you access the website from a mobile device.
          </p>

          <h2 className="text-2xl font-bold mt-12 mb-4">
            Use of Your Information
          </h2>

          <p className="mb-4">
            Having accurate information about you permits us to provide you with
            a smooth, efficient, and customized experience. Specifically, we may
            use information collected about you via the website to:
          </p>

          <ul className="list-disc pl-8 space-y-2 mb-8">
            <li>Create and manage your account.</li>
            <li>Process ticket purchases and transactions.</li>
            <li>Send you a order confirmation.</li>
            <li>
              Email you regarding events or promotions that may be of interest
              to you.
            </li>
            <li>
              Send you administrative communications, such as administrative
              emails, confirmation emails, technical notices, updates on
              policies, or security alerts.
            </li>
            <li>Respond to your comments or inquiries.</li>
            <li>Track and measure advertisement effectiveness.</li>
            <li>
              Protect, investigate, and deter against unauthorized or illegal
              activity.
            </li>
            <li>
              Provide targeted advertising, coupons, newsletters, and other
              information regarding promotions and the website to you.
            </li>
            <li>
              Compile anonymous statistical data and analysis for use internally
              or with third parties.
            </li>
          </ul>

          <h2 className="text-2xl font-bold mt-12 mb-4">
            Disclosure of Your Information
          </h2>

          <p className="mb-4">
            We may share information we have collected about you in certain
            situations. Your information may be disclosed as follows:
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-3">
            By Law or to Protect Rights
          </h3>
          <p className="mb-4">
            If we believe the release of information about you is necessary to
            respond to legal process, to investigate or remedy potential
            violations of our policies, or to protect the rights, property, and
            safety of others, we may share your information as permitted or
            required by any applicable law, rule, or regulation.
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-3">
            Third-Party Service Providers
          </h3>
          <p className="mb-4">
            We may share your information with third parties that perform
            services for us or on our behalf, including payment processing,
            ticket delivery, email delivery, hosting services, customer service,
            and marketing assistance.
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-3">Event Organizers</h3>
          <p className="mb-4">
            We share your information with event organizers and venues to allow
            them to provide you with the event and for their marketing purposes.
            When you purchase tickets or register for an event, your information
            will be shared with the organizing entity to process your order and
            for their marketing activities.
          </p>

          <h3 className="text-xl font-semibold mt-6 mb-3">
            Marketing Communications
          </h3>
          <p className="mb-8">
            With your consent, or with an opportunity for you to withdraw
            consent, we may share your information with third parties for
            marketing purposes, as permitted by law.
          </p>

          <h2 className="text-2xl font-bold mt-12 mb-4">
            Security of Your Information
          </h2>

          <p className="mb-4">
            We use administrative, technical, and physical security measures to
            help protect your personal information. While we have taken
            reasonable steps to secure the personal information you provide to
            us, please be aware that despite our efforts, no security measures
            are perfect or impenetrable, and no method of data transmission can
            be guaranteed against any interception or other type of misuse.
          </p>

          <p className="mb-8">
            Any information disclosed online is vulnerable to interception and
            misuse by unauthorized parties. Therefore, we cannot guarantee
            complete security if you provide personal information.
          </p>

          <h2 className="text-2xl font-bold mt-12 mb-4">Policy for Children</h2>

          <p className="mb-8">
            We do not knowingly solicit information from or market to children
            under the age of 13. If you become aware of any data we have
            collected from children under age 13, please contact us using the
            contact information provided below.
          </p>

          <h2 className="text-2xl font-bold mt-12 mb-4">
            Your Data Protection Rights
          </h2>

          <p className="mb-4">
            You have certain data protection rights. myevent.com.ng aims to take
            reasonable steps to allow you to correct, amend, delete, or limit
            the use of your Personal Information. If you wish to be informed
            what Personal Information we hold about you and if you want it to be
            removed from our systems, please contact us.
          </p>

          <p className="mb-4">
            In certain circumstances, you have the following data protection
            rights:
          </p>

          <ul className="list-disc pl-8 space-y-2 mb-8">
            <li>
              The right to access, update or to delete the information we have
              on you.
            </li>
            <li>
              The right of rectification – You have the right to have your
              information rectified if that information is inaccurate or
              incomplete.
            </li>
            <li>
              The right to object – You have the right to object to our
              processing of your Personal Information.
            </li>
            <li>
              The right of restriction – You have the right to request that we
              restrict the processing of your personal information.
            </li>
            <li>
              The right to data portability – You have the right to be provided
              with a copy of your Personal Information in a structured,
              machine-readable and commonly used format.
            </li>
            <li>
              The right to withdraw consent – You also have the right to
              withdraw your consent at any time where myevent.com.ng relied on
              your consent to process your personal information.
            </li>
          </ul>

          <h2 className="text-2xl font-bold mt-12 mb-4">Contact Us</h2>

          <p className="mb-4">
            If you have questions or comments about this Privacy Policy, please
            contact us at:
          </p>

          <ul className="list-none pl-0">
            <li>Email: privacy@myevent.com.ng.com</li>
            <li>Phone: +234 800 123 4567</li>
            <li>Address: 123 Victoria Island, Lagos, Nigeria</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
