import { useEffect } from "react";
import { useLocation } from "wouter";

/* ─── Section wrapper ────────────────────────────────────────────────────── */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-2xl font-bold text-gray-900 mb-1">{children}</h2>
  );
}

function SectionIntro({ children }: { children: React.ReactNode }) {
  return <p className="text-base text-gray-600 mb-8 leading-relaxed">{children}</p>;
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold text-gray-900 mt-6 mb-2">{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-600 leading-relaxed mb-3">{children}</p>;
}

function Ul({ items }: { items: string[] }) {
  return (
    <ul className="list-disc list-inside space-y-1 mb-3 ml-1">
      {items.map((item, i) => (
        <li key={i} className="text-sm text-gray-600 leading-relaxed">{item}</li>
      ))}
    </ul>
  );
}

function Divider() {
  return <hr className="border-gray-100 my-12" />;
}

/* ─── Terms of Service ───────────────────────────────────────────────────── */

function TermsOfService() {
  return (
    <section id="terms" className="scroll-mt-24">
      <SectionTitle>Terms of Service</SectionTitle>
      <SectionIntro>
        These Terms of Service govern your access to and use of CEER, including our websites, web
        application, mobile/tablet applications, dashboards, APIs, and related services. By creating
        an account, using CEER, signing an order form, or accessing the platform on behalf of a
        workshop, company, or organization, you agree to these Terms. If you do not agree, you must
        not use CEER.
      </SectionIntro>

      <H3>1. About CEER</H3>
      <P>
        CEER is a business-to-business software platform designed to help automotive workshops and
        service businesses manage operations such as bookings, inspections, estimates, quotations, job
        cards, technician workflows, customer communication, invoicing, reporting, and related workshop
        activities. CEER is provided to businesses, not to individual consumers for personal use.
      </P>

      <H3>2. Definitions</H3>
      <P>In these Terms:</P>
      <Ul items={[
        '"CEER," "we," "us," or "our" means the CEER legal entity.',
        '"Customer," "you," or "your" means the business, workshop, company, or person using CEER.',
        '"Tenant" means the business workspace created inside CEER for a Customer.',
        '"User" means an employee, contractor, technician, advisor, manager, administrator, or other person invited to use CEER under a Customer account.',
        '"Customer Data" means data uploaded, entered, created, stored, or processed by you or your Users through CEER.',
        '"End Customer Data" means data relating to your own customers, vehicles, jobs, inspections, estimates, invoices, communications, photos, and service records.',
        '"Services" means the CEER platform, applications, websites, APIs, tools, features, and support services.',
      ]} />

      <H3>3. Eligibility and Authority</H3>
      <P>You may use CEER only if you have the legal authority to enter into these Terms. If you use CEER on behalf of a business, you confirm that:</P>
      <Ul items={[
        "You are authorized to bind that business to these Terms.",
        "The business is responsible for all Users under its account.",
        "The business is responsible for all Customer Data entered into CEER.",
        "The business will comply with all laws applicable to its operations, customers, employees, and data.",
      ]} />

      <H3>4. Account Registration and Security</H3>
      <P>You must provide accurate and complete account information. You are responsible for:</P>
      <Ul items={[
        "Keeping login credentials secure.",
        "Managing access for your Users.",
        "Ensuring Users only access data they are authorized to access.",
        "Promptly removing Users who no longer work for you or should no longer have access.",
        "Notifying us immediately if you suspect unauthorized access.",
      ]} />
      <P>We are not responsible for losses caused by your failure to secure your account, devices, passwords, or User permissions.</P>

      <H3>5. Customer Responsibilities</H3>
      <P>You are responsible for how you use CEER and for all activity under your Tenant. You must:</P>
      <Ul items={[
        "Use CEER lawfully and only for legitimate business purposes.",
        "Obtain all required permissions and notices before entering personal data into CEER.",
        "Ensure that customer, vehicle, employee, and workshop data is accurate and lawfully collected.",
        "Use CEER in compliance with applicable privacy, employment, consumer protection, automotive, tax, invoicing, payment, and communications laws.",
        "Review estimates, invoices, reports, and job details before sending them to your customers.",
        "Keep backups of any data you are legally required to retain outside CEER where appropriate.",
      ]} />
      <P>You remain responsible for your direct relationship with your customers, including the quality of services, prices, warranties, refunds, disputes, and workshop work performed.</P>

      <H3>6. Acceptable Use</H3>
      <P>You must not use CEER to:</P>
      <Ul items={[
        "Break the law or violate third-party rights.",
        "Upload illegal, harmful, fraudulent, misleading, abusive, or infringing content.",
        "Store or transmit malware, ransomware, spyware, or harmful code.",
        "Attempt to gain unauthorized access to CEER, other accounts, systems, or networks.",
        "Interfere with the security, availability, or performance of CEER.",
        "Reverse engineer, copy, resell, sublicense, or misuse CEER except as allowed by these Terms.",
        "Use CEER to send spam, unlawful marketing messages, or unauthorized communications.",
        "Upload sensitive personal data unless necessary, lawful, and properly protected.",
        "Use CEER for high-risk purposes where failure could cause serious harm, injury, or unlawful outcomes.",
        "Circumvent usage limits, billing controls, access controls, or security features.",
      ]} />
      <P>We may suspend or restrict access if we reasonably believe your use creates legal, security, operational, or reputational risk.</P>

      <H3>7. Plans, Fees, Billing, and Taxes</H3>
      <P>CEER may offer free, trial, beta, monthly, annual, or custom plans. You agree to pay all fees shown in your selected plan, order form, invoice, or checkout page. Unless stated otherwise:</P>
      <Ul items={[
        "Fees are non-refundable.",
        "Subscription fees are billed in advance.",
        "Taxes, VAT, bank charges, payment processing fees, and similar charges are your responsibility.",
        "Prices may change with prior notice.",
        "Late or failed payments may result in suspension or termination.",
      ]} />
      <P>You are responsible for maintaining accurate billing and payment information. If you are using a free or beta plan, CEER may limit, modify, suspend, or discontinue that plan at any time.</P>

      <H3>8. Trials and Beta Features</H3>
      <P>We may provide trial, preview, experimental, or beta features. Beta features are provided "as is" and may be incomplete, changed, unavailable, or discontinued at any time. You should not rely on beta features for critical business operations unless we confirm otherwise in writing.</P>

      <H3>9. Service Availability and Support</H3>
      <P>We aim to provide a reliable service, but we do not guarantee that CEER will always be available, uninterrupted, secure, or error-free. The service may be unavailable because of maintenance, updates, internet or hosting issues, third-party service failures, security incidents, force majeure events, or customer-side device, browser, network, or configuration issues. Support availability may depend on your plan.</P>

      <H3>10. Third-Party Services and Integrations</H3>
      <P>CEER may integrate with third-party services such as payment processors, email providers, WhatsApp or messaging providers, identity providers, analytics tools, hosting providers, storage providers, accounting tools, or parts/service data providers. Third-party services are governed by their own terms and privacy policies. We are not responsible for third-party platforms, outages, fees, data handling, errors, or service changes. You are responsible for ensuring that your use of third-party integrations is lawful and suitable for your business.</P>

      <H3>11. Payments and Invoices</H3>
      <P>If CEER enables payment collection, payment links, online invoices, deposits, or payment status tracking, those services may be processed by third-party payment providers. CEER is not a bank, payment institution, escrow provider, tax advisor, or accounting firm. You are responsible for checking invoices, taxes, payment records, refunds, chargebacks, and compliance with local tax and accounting requirements.</P>

      <H3>12. Customer Data Ownership</H3>
      <P>You own your Customer Data. By using CEER, you grant us a limited right to host, store, process, transmit, display, and use Customer Data only as necessary to provide the Services, maintain and secure the platform, support your account, troubleshoot issues, improve service performance, comply with law, and enforce these Terms. We do not sell your Customer Data.</P>

      <H3>13. CEER Intellectual Property</H3>
      <P>CEER, including the software, design, workflows, dashboards, user interface, features, documentation, branding, logos, know-how, and technology, belongs to CEER or its licensors. You may not copy, modify, distribute, sell, lease, reverse engineer, or create derivative works from CEER unless we give written permission. Feedback, suggestions, or ideas you provide may be used by CEER without restriction or compensation.</P>

      <H3>14. Aggregated and Anonymized Data</H3>
      <P>We may create aggregated or anonymized data from platform usage, such as usage trends, performance metrics, workflow statistics, and product improvement insights. We may use this data to improve CEER, develop features, benchmark performance, and understand market needs, provided it does not identify you, your Users, or your customers.</P>

      <H3>15. Confidentiality</H3>
      <P>Each party may receive confidential information from the other. Both parties agree to protect confidential information using reasonable care and to use it only for purposes related to CEER. Confidential information does not include information that is public, independently developed, lawfully received from another source, or required to be disclosed by law.</P>

      <H3>16. Data Protection</H3>
      <P>Our Privacy Policy explains how we process personal data. For End Customer Data and workshop operational data uploaded by you, you are generally the controller or equivalent responsible party, and CEER acts as a processor or service provider, unless we state otherwise. You are responsible for providing required privacy notices to your customers, employees, and Users and for ensuring you have a lawful basis to upload and process their data in CEER. If required, we may provide a Data Processing Addendum for customers subject to GDPR, UAE PDPL, Saudi PDPL, or other applicable privacy laws.</P>

      <H3>17. Security</H3>
      <P>We use reasonable technical and organizational measures designed to protect CEER and Customer Data. However, no system is completely secure. You are responsible for using strong passwords, managing User access, keeping devices secure, training staff, and promptly reporting suspected security issues.</P>

      <H3>18. Data Backup and Export</H3>
      <P>We may provide tools to export certain Customer Data, depending on your plan and platform features. You are responsible for exporting or backing up data before termination, cancellation, or deletion of your account. After termination, we may delete, retain, or anonymize Customer Data in accordance with our Privacy Policy, legal obligations, backup cycles, and internal retention practices.</P>

      <H3>19. Suspension and Termination</H3>
      <P>We may suspend or terminate access if you fail to pay fees, breach these Terms, your use creates legal, security, operational, or reputational risk, we are required to do so by law, you misuse the platform or third-party integrations, your account remains inactive for a long period, or we discontinue the service or a plan. You may stop using CEER at any time. Cancellation terms may depend on your selected plan or order form. Termination does not remove obligations that should reasonably survive, including payment obligations, confidentiality, intellectual property, liability limits, and dispute terms.</P>

      <H3>20. Disclaimers</H3>
      <P>CEER is provided on an "as is" and "as available" basis. To the maximum extent permitted by law, we disclaim warranties of merchantability, fitness for a particular purpose, non-infringement, uninterrupted operation, error-free performance, and accuracy of outputs. CEER does not guarantee business results, revenue growth, customer retention, workshop profitability, legal compliance, tax compliance, or error-free estimates, inspections, invoices, or reports. You must review and approve all business documents, quotes, invoices, service records, customer communications, and decisions before relying on them.</P>

      <H3>21. Limitation of Liability</H3>
      <P>To the maximum extent permitted by law, CEER will not be liable for indirect, incidental, special, consequential, punitive, or exemplary damages, including loss of profits, loss of revenue, loss of goodwill, loss of data, business interruption, or cost of substitute services. To the maximum extent permitted by law, CEER's total liability for all claims related to the Services will not exceed the amount you paid to CEER in the three months before the event giving rise to the claim, or AED 500, whichever is lower. Nothing in these Terms limits liability that cannot legally be limited.</P>

      <H3>22. Indemnity</H3>
      <P>You agree to defend, indemnify, and hold CEER harmless from claims, damages, losses, liabilities, costs, and expenses arising from:</P>
      <Ul items={[
        "Your use of CEER.",
        "Your Customer Data.",
        "Your relationship with your customers or Users.",
        "Your workshop services, estimates, invoices, repairs, warranties, or disputes.",
        "Your breach of these Terms.",
        "Your violation of law or third-party rights.",
        "Your misuse of third-party integrations.",
      ]} />

      <H3>23. Changes to the Services or Terms</H3>
      <P>We may update CEER or these Terms from time to time. If changes are material, we will take reasonable steps to notify you. Continued use of CEER after changes become effective means you accept the updated Terms.</P>

      <H3>24. Governing Law and Disputes</H3>
      <P>These Terms are governed by the laws of the United Arab Emirates, unless another governing law is stated in a signed order form. The courts of Dubai, UAE will have exclusive jurisdiction, unless applicable law requires otherwise. For customers outside the UAE, mandatory local rights may still apply where they cannot legally be excluded.</P>

      <H3>25. Force Majeure</H3>
      <P>CEER will not be responsible for delays or failures caused by events outside our reasonable control, including natural disasters, war, civil unrest, cyberattacks, internet failures, hosting failures, power outages, government actions, labor disruptions, supplier failures, or other force majeure events.</P>
    </section>
  );
}

/* ─── Privacy Policy ─────────────────────────────────────────────────────── */

function PrivacyPolicy() {
  return (
    <section id="privacy" className="scroll-mt-24">
      <SectionTitle>Privacy Policy</SectionTitle>
      <SectionIntro>
        This Privacy Policy explains how CEER collects, uses, stores, shares, and protects personal
        data when you use our websites, web application, mobile/tablet applications, dashboards,
        APIs, and related services. CEER is designed for business customers such as auto workshops,
        garages, service centers, and automotive service companies.
      </SectionIntro>

      <H3>1. Who We Are</H3>
      <P>CEER is a software platform that helps automotive workshops manage bookings, inspections, estimates, quotations, job cards, technician workflows, customer communication, invoicing, reporting, and related operations. For privacy questions, contact us at <a href="mailto:info@ceer.me" className="text-primary hover:underline">info@ceer.me</a>.</P>

      <H3>2. Our Role: Controller and Processor</H3>
      <P>Depending on the situation, CEER may act as either a controller or a processor.</P>
      <P><strong>When CEER is a controller:</strong> CEER is generally the controller for personal data we collect for our own business purposes, such as website visitors, account registration, billing and subscription management, sales and support communications, product analytics, security monitoring, marketing communications, and legal and compliance purposes.</P>
      <P><strong>When CEER is a processor:</strong> For personal data that our business customers upload, enter, or manage inside CEER about their own customers, employees, technicians, vehicles, jobs, inspections, estimates, invoices, and communications, the Customer is generally the controller or equivalent responsible party, and CEER acts as a processor or service provider. This means the Customer decides why and how that data is processed, and CEER processes it on the Customer's instructions. If you are an end customer of a workshop using CEER, please contact that workshop directly for privacy requests related to your service record, vehicle, invoice, estimate, or communication history.</P>

      <H3>3. Personal Data We Collect</H3>
      <P>We may collect the following categories of personal data:</P>
      <P><strong>Account and business information:</strong></P>
      <Ul items={["Name", "Business name", "Job title", "Email address", "Phone number", "Business address", "Login details", "User role and permissions", "Subscription and billing details"]} />
      <P><strong>Workshop operational data:</strong> Customers may upload or create data such as customer names and contact details, vehicle details (make, model, plate number, VIN, mileage, service history), booking details, inspection notes, photos or attachments, estimates and quotations, job cards and technician notes, invoice and payment status, customer communications, and internal comments and workflow status.</P>
      <P><strong>Payment and billing data:</strong> We may process billing information, invoices, subscription status, payment references, and transaction metadata. Where payment card processing is used, card details are usually processed by third-party payment providers. CEER does not intend to store full payment card numbers unless explicitly stated.</P>
      <P><strong>Technical and usage data:</strong></P>
      <Ul items={["IP address", "Device information", "Browser type", "Operating system", "Login history", "Pages and features used", "Error logs", "Performance data", "Security logs", "Cookies and similar technologies"]} />
      <P><strong>Communications data:</strong> We may collect information when you contact us by email, forms, chat, phone, WhatsApp, or other channels, including message content and contact details.</P>

      <H3>4. How We Use Personal Data</H3>
      <P>We use personal data to:</P>
      <Ul items={[
        "Provide, operate, and maintain CEER.",
        "Create and manage accounts.",
        "Authenticate Users and manage access.",
        "Process subscriptions, invoices, and payments.",
        "Provide customer support.",
        "Send service notifications.",
        "Enable workshop workflows, reports, quotations, invoices, and communications.",
        "Improve platform features and performance.",
        "Monitor security and prevent misuse.",
        "Troubleshoot bugs and technical issues.",
        "Comply with legal, tax, accounting, and regulatory obligations.",
        "Send marketing communications where permitted.",
        "Enforce our Terms of Service.",
        "Protect CEER, our Customers, Users, and third parties.",
      ]} />

      <H3>5. Legal Bases for Processing</H3>
      <P>Where GDPR or similar laws apply, we rely on one or more of the following legal bases:</P>
      <Ul items={[
        "Contract: to provide CEER and manage your account.",
        "Legitimate interests: to secure, improve, and operate our business and platform.",
        "Consent: for certain marketing, cookies, or optional features where required.",
        "Legal obligation: to comply with tax, accounting, legal, or regulatory requirements.",
        "Vital or public interests: only where legally applicable and necessary.",
      ]} />
      <P>For Customer Data processed inside a Tenant, the Customer is responsible for identifying the correct legal basis for processing data about its own customers, employees, and Users.</P>

      <H3>6. Cookies and Similar Technologies</H3>
      <P>We may use cookies and similar technologies for essential platform functionality, authentication and login sessions, security, preferences, analytics, performance monitoring, and marketing where enabled. Where required by law, we will ask for consent before using non-essential cookies. You may manage cookies through your browser settings or cookie banner, where available. Essential cookies may be required for CEER to function properly.</P>

      <H3>7. How We Share Personal Data</H3>
      <P>We may share personal data with:</P>
      <Ul items={[
        "Hosting and cloud infrastructure providers.",
        "Database and storage providers.",
        "Authentication providers.",
        "Email and communication providers.",
        "Payment processors.",
        "Analytics and monitoring providers.",
        "Customer support tools.",
        "Professional advisors, such as lawyers, auditors, and accountants.",
        "Regulators, courts, law enforcement, or authorities where required.",
        "Buyers, investors, or successors in connection with a merger, acquisition, financing, restructuring, or sale of business assets.",
      ]} />
      <P>We do not sell personal data.</P>

      <H3>8. Third-Party Integrations</H3>
      <P>Customers may choose to connect CEER with third-party services such as messaging tools, payment providers, accounting tools, parts suppliers, identity providers, or analytics services. If you enable an integration, data may be shared with that third party according to your settings and the third party's terms and privacy policy. Customers are responsible for ensuring they have the right to connect third-party tools and share data with them.</P>

      <H3>9. International Data Transfers</H3>
      <P>CEER may process and store personal data in the United Arab Emirates, the European Economic Area, the United Kingdom, the United States, Saudi Arabia, or other countries where we or our service providers operate. Where required, we use appropriate safeguards for international transfers, such as contractual protections, data processing agreements, Standard Contractual Clauses, transfer assessments, or other lawful mechanisms. Customers are responsible for ensuring that their use of CEER complies with any local data transfer restrictions that apply to their business.</P>

      <H3>10. Data Retention</H3>
      <P>We retain personal data for as long as reasonably necessary to provide CEER, maintain business records, comply with legal, tax, and accounting obligations, resolve disputes, enforce agreements, maintain security, and support backups and disaster recovery. Customer Data may be retained while the Customer account is active. After account termination, data may be deleted, anonymized, or retained for a limited period according to backup cycles, legal obligations, and our internal retention practices. You may request deletion or export of certain data, subject to legal, technical, and contractual limits.</P>

      <H3>11. Security</H3>
      <P>We use reasonable technical and organizational measures designed to protect personal data, such as access controls, authentication, encryption where appropriate, monitoring, backups, and internal security procedures. However, no online service is completely secure. Customers and Users are responsible for using strong passwords, protecting devices, managing User roles and permissions, removing inactive Users, avoiding unauthorized sharing of login credentials, and reporting suspected security incidents promptly.</P>

      <H3>12. Your Privacy Rights</H3>
      <P>Depending on where you are located, you may have rights to:</P>
      <Ul items={[
        "Access your personal data.",
        "Correct inaccurate data.",
        "Delete personal data.",
        "Restrict processing.",
        "Object to processing.",
        "Withdraw consent.",
        "Request data portability.",
        "Request information about processing.",
        "Lodge a complaint with a data protection authority.",
        "Request that we stop certain processing activities.",
      ]} />
      <P>If your data is controlled by one of our Customers, we may redirect your request to that Customer. To exercise your rights, contact us at <a href="mailto:info@ceer.me" className="text-primary hover:underline">info@ceer.me</a>. We may need to verify your identity before responding.</P>

      <H3>13. UAE, Middle East, and International Privacy Rights</H3>
      <P>CEER aims to handle personal data in line with applicable privacy principles, including transparency, purpose limitation, data minimization, security, lawful processing, retention limitation, and respect for individual rights. If you are located in the UAE, Saudi Arabia, the EEA, the UK, or another jurisdiction with privacy laws, you may have additional rights under local law. Where local law gives you stronger rights than this Privacy Policy, we will respect those rights where legally required.</P>

      <H3>14. Children's Data</H3>
      <P>CEER is a business software platform and is not intended for children. Customers should not knowingly upload children's personal data unless it is lawful, necessary, and properly protected. If we learn that children's data has been uploaded unlawfully, we may delete it or request that the Customer removes it.</P>

      <H3>15. Marketing Communications</H3>
      <P>We may send marketing emails to business contacts where permitted by law. You can unsubscribe from marketing emails using the unsubscribe link or by contacting us. We may still send non-marketing service messages, such as account, billing, security, and operational notices.</P>

      <H3>16. Automated Decision-Making</H3>
      <P>CEER does not intend to make legally significant decisions about individuals using solely automated processing. If we introduce AI, automation, scoring, or recommendations, we will aim to provide appropriate transparency and controls where required by law. Customers remain responsible for reviewing and approving workshop decisions, estimates, invoices, customer communications, and service actions.</P>

      <H3>17. Data Breach and Incident Handling</H3>
      <P>If we become aware of a security incident affecting personal data, we will take reasonable steps to investigate, contain, and remediate the incident. Where legally required, we will notify affected Customers, authorities, or individuals. Customers are responsible for notifying their own customers, employees, regulators, or other parties where the Customer is legally responsible for doing so.</P>

      <H3>18. Data Processing Addendum</H3>
      <P>Customers subject to GDPR, UAE PDPL, Saudi PDPL, or other privacy laws may request a Data Processing Addendum where required. A Data Processing Addendum may include terms covering processing instructions, confidentiality, sub-processors, security, audits, international transfers, breach notification, data return or deletion, and assistance with data subject rights.</P>

      <H3>19. Changes to This Privacy Policy</H3>
      <P>We may update this Privacy Policy from time to time. If we make material changes, we will take reasonable steps to notify you. The updated version will be posted with a new "Last updated" date. Continued use of CEER after changes become effective means you acknowledge the updated Privacy Policy.</P>

      <P>For any inquiries or more details, contact us at <a href="mailto:info@ceer.me" className="text-primary hover:underline">info@ceer.me</a>.</P>
    </section>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function LegalPage() {
  const [location] = useLocation();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const el = document.querySelector(hash);
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
      }
    } else {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [location]);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="border-b border-gray-100 bg-gray-50/60">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Legal</p>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms &amp; Privacy</h1>
          <p className="text-gray-500 text-base leading-relaxed">
            Everything you need to know about how CEER works and how we handle your data.
          </p>

          {/* Quick jump */}
          <div className="flex items-center gap-3 mt-6">
            <a
              href="#terms"
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 hover:border-primary/40 hover:text-primary transition-colors"
            >
              Terms of Service
            </a>
            <a
              href="#privacy"
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 hover:border-primary/40 hover:text-primary transition-colors"
            >
              Privacy Policy
            </a>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-14 space-y-0">
        <TermsOfService />
        <Divider />
        <PrivacyPolicy />

        {/* Footer note */}
        <div className="mt-16 pt-8 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-400">
            Last updated: May 2026 &nbsp;·&nbsp;{" "}
            <a href="mailto:info@ceer.me" className="hover:text-primary transition-colors">
              info@ceer.me
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
