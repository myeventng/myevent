import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Img,
  Link,
  Hr,
  Row,
  Column,
} from '@react-email/components';

interface TicketEmailTemplateProps {
  order: any;
  event: any;
  venue: any;
  tickets: any[];
  supportEmail: string;
  platformName: string;
  appUrl: string;
}

export const TicketEmailTemplate = ({
  order,
  event,
  venue,
  tickets,
  supportEmail,
  platformName,
  appUrl,
}: TicketEmailTemplateProps) => {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={headerText}>Your Event Tickets</Text>
            <Text style={subHeaderText}>Thank you for your purchase!</Text>
          </Section>

          {/* Event Details */}
          <Section style={eventDetails}>
            <Text style={eventTitle}>{event.title}</Text>
            <Row>
              <Column>
                <Text style={detailLabel}>📅 Date & Time</Text>
                <Text style={detailValue}>
                  {new Date(event.startDateTime).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
                <Text style={detailValue}>
                  {new Date(event.startDateTime).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  -{' '}
                  {new Date(event.endDateTime).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </Column>
              <Column>
                <Text style={detailLabel}>📍 Venue</Text>
                <Text style={detailValue}>{venue.name}</Text>
                <Text style={detailValue}>{venue.address}</Text>
                <Text style={detailValue}>{venue.city?.name}</Text>
              </Column>
            </Row>
            {event.description && (
              <>
                <Text style={detailLabel}>ℹ️ About</Text>
                <Text style={detailValue}>{event.description}</Text>
              </>
            )}
          </Section>

          {/* Tickets */}
          {tickets.map((ticket, index) => (
            <Section key={ticket.id} style={ticketContainer}>
              <Row>
                <Column style={ticketInfo}>
                  <Text style={ticketTitle}>🎫 Ticket #{ticket.ticketId}</Text>
                  <Text style={ticketDetail}>
                    <strong>Type:</strong> {ticket.ticketType.name}
                  </Text>
                  <Text style={ticketDetail}>
                    <strong>Price:</strong> ₦
                    {ticket.ticketType.price.toLocaleString()}
                  </Text>
                  <Text style={ticketDetail}>
                    <strong>Status:</strong>{' '}
                    <span style={validStatus}>Valid</span>
                  </Text>
                </Column>
                <Column style={qrCodeContainer}>
                  <Img
                    src={ticket.qrCodeDataURL}
                    alt={`QR Code for ticket ${ticket.ticketId}`}
                    style={qrCodeImage}
                  />
                  <Text style={qrCodeText}>
                    Present this QR code at the venue
                  </Text>
                </Column>
              </Row>
            </Section>
          ))}

          <Hr style={divider} />

          {/* Important Information */}
          <Section style={infoSection}>
            <Text style={infoTitle}>📋 Important Information</Text>
            <ul style={infoList}>
              <li>Present the QR code(s) above at the venue for entry</li>
              <li>Valid ID may be required at the event</li>
              <li>Tickets are non-transferable unless explicitly allowed</li>
              <li>Arrive early to avoid queues</li>
              <li>
                Contact support at{' '}
                <Link href={`mailto:${supportEmail}`} style={link}>
                  {supportEmail}
                </Link>{' '}
                for assistance
              </li>
            </ul>
          </Section>

          {/* Order Details */}
          <Section style={orderDetails}>
            <Text style={orderTitle}>Order Summary</Text>
            <Row>
              <Column>
                <Text style={orderDetail}>
                  <strong>Order ID:</strong> {order.id}
                </Text>
                <Text style={orderDetail}>
                  <strong>Purchase Date:</strong>{' '}
                  {new Date(order.createdAt).toLocaleDateString()}
                </Text>
              </Column>
              <Column>
                <Text style={orderDetail}>
                  <strong>Total Amount:</strong> ₦
                  {order.totalAmount.toLocaleString()}
                </Text>
                <Text style={orderDetail}>
                  <strong>Tickets:</strong> {tickets.length}
                </Text>
              </Column>
            </Row>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Best regards,
              <br />
              The {platformName} Team
            </Text>
            <Text style={footerLink}>
              <Link href={`${appUrl}/dashboard/tickets`} style={link}>
                View your tickets online
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const header = {
  backgroundColor: '#2563eb',
  padding: '30px',
  textAlign: 'center' as const,
};

const headerText = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0 0 10px 0',
};

const subHeaderText = {
  color: '#e2e8f0',
  fontSize: '16px',
  margin: '0',
};

const eventDetails = {
  padding: '30px',
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
};

const eventTitle = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#1e293b',
  margin: '0 0 20px 0',
};

const detailLabel = {
  fontSize: '14px',
  fontWeight: 'bold',
  color: '#64748b',
  margin: '0 0 5px 0',
};

const detailValue = {
  fontSize: '16px',
  color: '#334155',
  margin: '0 0 15px 0',
};

const ticketContainer = {
  border: '2px solid #e2e8f0',
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 30px',
  backgroundColor: '#ffffff',
};

const ticketInfo = {
  verticalAlign: 'top' as const,
};

const ticketTitle = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#1e293b',
  margin: '0 0 10px 0',
};

const ticketDetail = {
  fontSize: '14px',
  color: '#475569',
  margin: '0 0 5px 0',
};

const validStatus = {
  color: '#16a34a',
  fontWeight: 'bold',
};

const qrCodeContainer = {
  textAlign: 'center' as const,
  verticalAlign: 'top' as const,
  width: '200px',
};

const qrCodeImage = {
  width: '160px',
  height: '160px',
  border: '2px solid #e2e8f0',
  borderRadius: '8px',
};

const qrCodeText = {
  fontSize: '12px',
  color: '#64748b',
  margin: '10px 0 0 0',
  textAlign: 'center' as const,
};

const divider = {
  border: 'none',
  borderTop: '1px solid #e2e8f0',
  margin: '30px 0',
};

const infoSection = {
  padding: '0 30px',
};

const infoTitle = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#1e293b',
  margin: '0 0 15px 0',
};

const infoList = {
  fontSize: '14px',
  color: '#475569',
  lineHeight: '1.6',
  paddingLeft: '20px',
};

const orderDetails = {
  padding: '20px 30px',
  backgroundColor: '#f1f5f9',
  border: '1px solid #e2e8f0',
};

const orderTitle = {
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#1e293b',
  margin: '0 0 15px 0',
};

const orderDetail = {
  fontSize: '14px',
  color: '#475569',
  margin: '0 0 5px 0',
};

const footer = {
  padding: '30px',
  textAlign: 'center' as const,
  borderTop: '1px solid #e2e8f0',
};

const footerText = {
  fontSize: '14px',
  color: '#64748b',
  margin: '0 0 15px 0',
};

const footerLink = {
  fontSize: '14px',
  margin: '0',
};

const link = {
  color: '#2563eb',
  textDecoration: 'none',
};
