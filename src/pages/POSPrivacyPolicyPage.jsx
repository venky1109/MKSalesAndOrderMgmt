import React from 'react';

const sectionStyle = {
  marginTop: 22,
};

const headingStyle = {
  margin: '0 0 8px',
  fontSize: 18,
  fontWeight: 700,
  color: '#172033',
};

const textStyle = {
  margin: '0 0 10px',
  fontSize: 15,
  lineHeight: 1.65,
  color: '#475569',
};

function POSPrivacyPolicyPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#f8fafc',
        padding: '32px 16px',
        fontFamily:
          'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <article
        style={{
          maxWidth: 860,
          margin: '0 auto',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: '28px 30px',
          boxShadow: '0 10px 28px rgba(15, 23, 42, 0.06)',
        }}
      >
        <p
          style={{
            margin: '0 0 6px',
            color: '#0f766e',
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 0.4,
            textTransform: 'uppercase',
          }}
        >
          ManaKirana POS
        </p>
        <h1
          style={{
            margin: 0,
            fontSize: 30,
            lineHeight: 1.2,
            color: '#0f172a',
          }}
        >
          Privacy Policy
        </h1>
        <p style={{ ...textStyle, marginTop: 10 }}>
          Last updated: 27 June 2026
        </p>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>Internal Use</h2>
          <p style={textStyle}>
            ManaKirana POS is an internal business application used only by
            authorized ManaKirana cashiers, supervisors, administrators, and
            business operations staff. It is used for store billing, product
            scanning, order creation, inventory movement, dispatch workflows,
            payments, and settlement tracking.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>Information We Collect</h2>
          <p style={textStyle}>
            The app may process cashier login details, user role, outlet or
            location, product barcode scan data, cart and order details, payment
            method, payment status, settlement information, dispatch request
            details, and customer phone number when it is entered for order
            creation.
          </p>
          <p style={textStyle}>
            The app uses camera access only to scan product barcodes. Camera
            images or videos are not stored by the app.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>How Information Is Used</h2>
          <p style={textStyle}>
            Information is used only for ManaKirana business operations,
            including billing, order processing, product search, stock updates,
            payment verification, dispatch request handling, receive dispatch
            confirmation, audit records, and cashier settlement.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>Data Sharing</h2>
          <p style={textStyle}>
            ManaKirana does not sell personal information and does not use POS
            data for advertising. POS data is shared only with authorized
            ManaKirana systems and service providers needed to operate order,
            payment, inventory, and dispatch workflows.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>Data Security And Retention</h2>
          <p style={textStyle}>
            POS data is transmitted to ManaKirana backend systems and is
            available only to authorized business users. Data is retained as
            needed for billing, accounting, inventory, support, compliance, and
            operational audit purposes.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>Contact</h2>
          <p style={textStyle}>
            For privacy or access questions related to ManaKirana POS, contact
            ManaKirana business administration.
          </p>
        </section>
      </article>
    </main>
  );
}

export default POSPrivacyPolicyPage;
