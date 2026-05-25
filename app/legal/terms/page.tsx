import type { Metadata } from 'next'
import Link from 'next/link'
import { LEGAL_META } from '@/lib/legal/constants'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: `Terms of Service for ${LEGAL_META.productName} — ${LEGAL_META.companyName}.`,
}

export default function TermsOfServicePage() {
  const {
    productName,
    companyName,
    companyAddress,
    supportEmail,
    effectiveDateIso,
    effectiveDateDisplay,
    governingState,
    governingCounty,
  } = LEGAL_META

  return (
    <article className="mx-auto max-w-3xl px-4 sm:px-6 text-sm leading-relaxed text-foreground/90">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Terms of Service</h1>
      <p className="mt-2 text-foreground/55">
        Last updated: <time dateTime={effectiveDateIso}>{effectiveDateDisplay}</time>
      </p>

      <section className="mt-10 space-y-4">
        <h2 className="text-base font-semibold text-foreground">1. Agreement to these terms</h2>
        <p>
          These Terms of Service (“Terms”) govern access to and use of {productName}, including our websites,
          applications, APIs, and related services (collectively, the “Service”), provided by {companyName} (“{companyName},”
          “we,” “us,” or “our”). By creating an account, clicking to accept these Terms, or using the Service, you agree
          to be bound by these Terms and our Privacy Policy (located at{' '}
          <Link href="/legal/privacy" className="text-primary underline-offset-4 hover:underline">
            /legal/privacy
          </Link>
          ), which is incorporated by reference.
        </p>
        <p>
          If you use the Service on behalf of a company, partnership, public agency, or other legal entity (“Organization”),
          you represent and warrant that you have authority to bind that Organization, and “you” means both you and the
          Organization. If you do not agree to these Terms, do not use the Service.
        </p>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-base font-semibold text-foreground">2. The Service</h2>
        <p>
          {productName} is a software platform that assists users with California-oriented housing entitlement and permit
          workflows, including feasibility-style analysis, plan-related review assistance, and related document generation,
          using automated and AI-assisted methods. Features, availability, and outputs may change over time. We may modify,
          suspend, or discontinue any part of the Service with reasonable notice where practicable; we may also make
          urgent changes for security, legal, or operational reasons.
        </p>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-base font-semibold text-foreground">3. Eligibility and accounts</h2>
        <p>
          You must be at least eighteen (18) years of age and capable of forming a binding contract to use the Service. You
          are responsible for maintaining the confidentiality of your login credentials and for all activity under
          your account. You will provide accurate registration information and promptly update it when it changes. You will
          notify us immediately at{' '}
          <a href={`mailto:${supportEmail}`} className="text-primary underline-offset-4 hover:underline">
            {supportEmail}
          </a>{' '}
          if you suspect unauthorized access to your account.
        </p>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-base font-semibold text-foreground">4. Workspaces, roles, and collaborators</h2>
        <p>
          The Service may organize data in workspaces, projects, or similar structures. Administrators and members may
          invite collaborators or assign roles that control visibility or actions. You are responsible for invitations
          you send and for ensuring that collaborators are authorized to view or process Project Data (as defined below).
          We are not responsible for disputes between users of the same Organization or workspace.
        </p>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-base font-semibold text-foreground">5. License to use the Service</h2>
        <p>
          Subject to these Terms and your payment of applicable fees, we grant you a limited, non-exclusive,
          non-transferable, non-sublicensable, revocable license to access and use the Service during the subscription or
          order term solely for your internal business purposes (or, if you are an individual, for your personal
          non-commercial use if we offer that tier). You will not, and will not permit others to:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Copy, modify, create derivative works of, reverse engineer, decompile, or attempt to extract source code or
            models from the Service except to the limited extent expressly permitted by applicable law;</li>
          <li>Probe, scan, or test the vulnerability of the Service, or breach or circumvent security or authentication;</li>
          <li>Use the Service to develop a competing product or service, or to train generalized machine-learning models
            using our outputs or proprietary materials, except where we expressly permit it in writing;</li>
          <li>Use automated means to access the Service in a manner that sends more requests than a human could reasonably
            produce in the same period, or that violates technical documentation or rate limits;</li>
          <li>Use the Service in violation of law, third-party rights, or any acceptable use policy we publish; or</li>
          <li>Remove, obscure, or alter proprietary notices on the Service.</li>
        </ul>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-base font-semibold text-foreground">6. Your content and license to us</h2>
        <p>
          You retain all right, title, and interest in and to materials you or your collaborators submit to the Service,
          including property information, documents, and comments (“Project Data”), subject to the licenses below. You
          represent and warrant that you have all rights necessary to submit Project Data and to grant the licenses in
          this Section, and that Project Data does not violate law or third-party rights (including copyright, trade
          secret, or privacy rights).
        </p>
        <p>
          You grant {companyName} a worldwide, royalty-free license to host, reproduce, process, transmit, display, and
          create derivative works from Project Data solely as necessary to provide, secure, improve, and support the
          Service, including using subprocessors and third-party AI systems as described in our Privacy Policy. You also
          grant us a perpetual, irrevocable license to use feedback you voluntarily provide in any manner without
          obligation to you, provided we do not identify you publicly without consent.
        </p>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-base font-semibold text-foreground">7. AI outputs, third-party data, and professional disclaimer</h2>
        <p>
          The Service may generate or assist in generating estimates, summaries, tables, narratives, or recommendations
          using artificial intelligence, rules engines, and third-party data sources (including public records, mapping
          tools, or municipal datasets). Outputs may be incomplete, outdated, or incorrect. Official codes, ordinances,
          maps, and agency interpretations control over any Service output. You are solely responsible for verifying
          information with qualified licensed professionals (such as architects, engineers, land use attorneys, or
          expeditors) and with the relevant governmental agencies before relying on the Service for filings, investments,
          construction, financing, or legal positions.
        </p>
        <p>
          THE SERVICE DOES NOT CONSTITUTE LEGAL, ENGINEERING, ARCHITECTURAL, OR FINANCIAL ADVICE. USE OF THE SERVICE IS
          AT YOUR OWN RISK. {companyName.toUpperCase()} IS NOT LIABLE FOR ERRORS OR OMISSIONS IN AI-GENERATED CONTENT OR
          THIRD-PARTY DATA.
        </p>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-base font-semibold text-foreground">8. Fees, taxes, and payment</h2>
        <p>
          Paid features (including subscriptions, credits, or one-time purchases) are priced as displayed at checkout or
          in an order form. You authorize us and our payment processor to charge your selected payment method. Fees are
          stated in U.S. dollars unless otherwise specified. You are responsible for applicable sales, use, and similar
          taxes, other than taxes based on our net income. If payment fails, we may suspend access until payment succeeds.
          Except where required by law or expressly stated at purchase, fees are non-refundable once services or credits
          are delivered or consumed.
        </p>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-base font-semibold text-foreground">9. Our intellectual property</h2>
        <p>
          The Service, including software, user interface, templates, documentation, and our branding, is owned by{' '}
          {companyName} or our licensors and is protected by intellectual property laws. Except for the limited license
          in Section 5, no rights are granted to you. You may not use our name, logo, or marks without prior written
          consent except as necessary to attribute the Service in accordance with our brand guidelines if we provide them.
        </p>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-base font-semibold text-foreground">10. Confidentiality</h2>
        <p>
          Each party may receive non-public information from the other that is identified as confidential or that should
          reasonably be understood to be confidential (“Confidential Information”). The receiving party will use
          Confidential Information only to perform under these Terms and will protect it using at least reasonable care.
          Confidential Information does not include information that is public through no fault of the receiving party,
          independently developed, or rightfully received from a third party without duty of confidentiality. Project Data
          you submit is your Confidential Information; our non-public Service metrics and pricing are ours.
        </p>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-base font-semibold text-foreground">11. Term, suspension, and termination</h2>
        <p>
          These Terms begin when you first use the Service and continue until terminated. Paid subscriptions continue for
          the term you select and renew as stated at purchase unless cancelled. We may suspend or terminate access if you
          materially breach these Terms, create risk or possible legal exposure for us, or for extended periods of
          inactivity where permitted by law. Upon termination, your right to access the Service ceases. Sections intended to
          survive (including intellectual property, disclaimers, limitation of liability, indemnity, and dispute
          resolution) survive termination.
        </p>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-base font-semibold text-foreground">12. Warranty disclaimer</h2>
        <p className="uppercase">
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE,” WITHOUT
          WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY,
          FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE
          UNINTERRUPTED, ERROR-FREE, OR FREE OF HARMFUL COMPONENTS.
        </p>
        <p>
          Some jurisdictions do not allow certain disclaimers; in that case, disclaimers apply to the fullest extent
          permitted.
        </p>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-base font-semibold text-foreground">13. Limitation of liability</h2>
        <p className="uppercase">
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT WILL {companyName.toUpperCase()}, ITS AFFILIATES,
          OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, SUPPLIERS, OR LICENSORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
          CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, GOODWILL, DATA, OR BUSINESS
          OPPORTUNITIES, ARISING OUT OF OR RELATED TO THESE TERMS OR THE SERVICE, WHETHER BASED ON WARRANTY, CONTRACT, TORT
          (INCLUDING NEGLIGENCE), STATUTE, OR ANY OTHER LEGAL THEORY, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF
          SUCH DAMAGES.
        </p>
        <p className="uppercase">
          OUR AGGREGATE LIABILITY FOR ALL CLAIMS ARISING OUT OF OR RELATED TO THESE TERMS OR THE SERVICE WILL NOT EXCEED
          THE GREATER OF (A) THE TOTAL AMOUNT YOU PAID US FOR THE SERVICE IN THE TWELVE (12) MONTHS BEFORE THE EVENT GIVING
          RISE TO LIABILITY, OR (B) ONE HUNDRED U.S. DOLLARS (USD $100), IF YOU HAD NO FEES DURING THAT PERIOD.
        </p>
        <p>
          The limitations in this Section apply to the fullest extent permitted by law. Some jurisdictions do not allow
          certain limitations; in those jurisdictions, our liability is limited to the maximum extent permitted.
        </p>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-base font-semibold text-foreground">14. Indemnification</h2>
        <p>
          You will defend, indemnify, and hold harmless {companyName} and its affiliates, officers, directors, employees,
          and agents from and against any claims, damages, losses, liabilities, costs, and expenses (including reasonable
          attorneys’ fees) arising out of or related to (a) Project Data or your use of the Service, (b) your violation of
          these Terms or applicable law, or (c) a dispute between you and a third party (including collaborators or
          government agencies). We may assume exclusive defense and control of any matter subject to indemnification at
          your expense; you will cooperate with our reasonable requests.
        </p>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-base font-semibold text-foreground">15. Governing law and venue</h2>
        <p>
          These Terms are governed by the laws of the State of {governingState}, without regard to conflict-of-law
          principles that would require application of another jurisdiction’s laws. Subject to Section 16, you and{' '}
          {companyName} consent to the exclusive jurisdiction and venue of the state and federal courts located in{' '}
          {governingCounty}, {governingState}, for all disputes arising out of or relating to these Terms or the Service.
        </p>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-base font-semibold text-foreground">16. Informal resolution and arbitration (U.S. users)</h2>
        <p>
          <strong>Informal resolution.</strong> Before filing a claim in court or arbitration, you agree to contact us
          at{' '}
          <a href={`mailto:${supportEmail}`} className="text-primary underline-offset-4 hover:underline">
            {supportEmail}
          </a>{' '}
          and attempt to resolve the dispute informally for at least thirty (30) days.
        </p>
        <p>
          <strong>Binding arbitration.</strong> If informal resolution fails, either party may initiate binding arbitration
          administered by the American Arbitration Association (“AAA”) under its Commercial Arbitration Rules. The
          arbitration will be conducted in English in {governingCounty}, {governingState}. The arbitrator’s award may be
          entered in any court of competent jurisdiction.
        </p>
        <p>
          <strong>Class action waiver.</strong> YOU AND {companyName.toUpperCase()} AGREE THAT EACH MAY BRING CLAIMS
          AGAINST THE OTHER ONLY IN YOUR OR ITS INDIVIDUAL CAPACITY AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED
          CLASS, COLLECTIVE, OR REPRESENTATIVE PROCEEDING. Unless both parties agree, the arbitrator may not consolidate
          more than one person’s claims and may not preside over any form of class proceeding.
        </p>
        <p>
          <strong>Exceptions.</strong> Either party may seek injunctive or equitable relief in a court of competent
          jurisdiction to protect intellectual property or confidential information. Either party may bring an individual
          action in small claims court if the claim qualifies.
        </p>
        <p>
          <strong>Opt-out.</strong> You may opt out of this arbitration agreement within thirty (30) days of first
          accepting these Terms by sending a written notice to {supportEmail} with your name, address, and a clear
          statement that you opt out of arbitration. If you opt out, Section 15 governs disputes.
        </p>
        <p>
          If any portion of this Section is found unenforceable, the remainder remains in effect to the maximum extent
          permitted. If the class action waiver is held unenforceable with respect to a claim, then the arbitration
          provisions do not apply to that claim, which must proceed in court under Section 15.
        </p>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-base font-semibold text-foreground">17. Export and sanctions</h2>
        <p>
          You represent that you are not located in, under the control of, or a national or resident of any country or
          entity subject to U.S. embargo or sanctions, and that you are not on any U.S. government list of prohibited or
          restricted parties. You will comply with all applicable export control laws.
        </p>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-base font-semibold text-foreground">18. General</h2>
        <p>
          <strong>Assignment.</strong> You may not assign or transfer these Terms without our prior written consent. We
          may assign these Terms in connection with a merger, acquisition, or sale of assets.
        </p>
        <p>
          <strong>Entire agreement.</strong> These Terms and the Privacy Policy constitute the entire agreement between you
          and {companyName} regarding the Service and supersede prior agreements on the same subject.
        </p>
        <p>
          <strong>Severability.</strong> If any provision is held invalid or unenforceable, the remaining provisions remain
          in full force and effect.
        </p>
        <p>
          <strong>Waiver.</strong> Failure to enforce any provision is not a waiver of future enforcement.
        </p>
        <p>
          <strong>Force majeure.</strong> We are not liable for delays or failures due to events beyond our reasonable
          control, including natural disasters, war, terrorism, riots, embargoes, acts of civil or military authorities,
          fire, floods, accidents, strikes, or shortages of transportation, facilities, fuel, energy, labor, or materials,
          or failures of the internet or third-party hosting or AI providers.
        </p>
        <p>
          <strong>Notices to you.</strong> We may send notices to the email address associated with your account or
          through in-product messages. Notices to us must be sent to {supportEmail} with a copy by postal mail to the
          address below; contractual notices by postal mail are deemed received three (3) business days after mailing.
        </p>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-base font-semibold text-foreground">19. Contact</h2>
        <p>
          {companyName}
          <br />
          {companyAddress}
          <br />
          Email:{' '}
          <a href={`mailto:${supportEmail}`} className="text-primary underline-offset-4 hover:underline">
            {supportEmail}
          </a>
        </p>
      </section>

      <p className="mt-12 text-xs text-foreground/45">
        <Link href="/legal" className="text-primary hover:underline">
          ← Legal
        </Link>
        {' · '}
        <Link href="/legal/privacy" className="text-primary hover:underline">
          Privacy Policy
        </Link>
      </p>
    </article>
  )
}
