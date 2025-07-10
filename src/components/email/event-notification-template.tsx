import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
  Button,
  Hr,
} from '@react-email/components';

interface EventNotificationTemplateProps {
  event: any;
  type: 'approved' | 'rejected' | 'cancelled' | 'tickets_available';
  appUrl: string;
  platformName: string;
}

export const EventNotificationTemplate = ({
  event,
  type,
  appUrl,
  platformName,
}: EventNotificationTemplateProps) => {
  const getTypeConfig = () => {
    switch (type) {
      case 'approved':
        return {
          title: 'Event Approved! 🎉',
          message:
            'Great news! Your event has been approved and is now live on our platform.',
          buttonText: 'View Event',
          buttonUrl: `${appUrl}/events/${event.slug}`,
          color: '#16a34a',
          backgroundColor: '#f0fdf4',
        };
      case 'rejected':
        return {
          title: 'Event Needs Revision ⚠️',
          message:
            'Your event submission requires some changes before it can be published.',
          buttonText: 'Edit Event',
          buttonUrl: `${appUrl}/dashboard/events/${event.id}/edit`,
          color: '#dc2626',
          backgroundColor: '#fef2f2',
        };
      case 'cancelled':
        return {
          title: 'Event Cancelled 📅',
          message:
            'This event has been cancelled. All attendees will be automatically refunded.',
          buttonText: 'View Dashboard',
          buttonUrl: `${appUrl}/dashboard/events`,
          color: '#ea580c',
          backgroundColor: '#fff7ed',
        };
      case 'tickets_available':
        return {
          title: 'Tickets Now Available! 🎫',
          message:
            'Good news! Tickets are now available for the event you were waiting for.',
          buttonText: 'Buy Tickets',
          buttonUrl: `${appUrl}/events/${event.slug}`,
          color: '#2563eb',
          backgroundColor: '#eff6ff',
        };
      default:
        return {
          title: 'Event Update',
          message: 'There has been an update to your event.',
          buttonText: 'View Event',
          buttonUrl: `${appUrl}/events/${event.slug}`,
          color: '#6b7280',
          backgroundColor: '#f9fafb',
        };
    }
  };

  const config = getTypeConfig();

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section
            style={{ ...header, backgroundColor: config.backgroundColor }}
          >
            <Text style={{ ...headerText, color: config.color }}>
              {config.title}
            </Text>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Text style={message}>{config.message}</Text>

            <Section style={eventDetails}>
              <Text style={eventTitle}>{event.title}</Text>
              <Text style={eventDate}>
                📅{' '}
                {new Date(event.startDateTime).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
              {event.venue && (
                <Text style={eventVenue}>
                  📍 {event.venue.name}, {event.venue.city?.name}
                </Text>
              )}
            </Section>

            <Section style={buttonContainer}>
              <Button
                href={config.buttonUrl}
                style={{ ...button, backgroundColor: config.color }}
              >
                {config.buttonText}
              </Button>
            </Section>

            {type === 'rejected' && (
              <Section style={helpSection}>
                <Text style={helpTitle}>Need Help?</Text>
                <Text style={helpText}>
                  Common reasons for rejection include incomplete information,
                  inappropriate content, or missing required details. Please
                  review our event guidelines and make the necessary changes.
                </Text>
              </Section>
            )}

            {type === 'tickets_available' && (
              <Section style={urgencySection}>
                <Text style={urgencyText}>
                  ⏰ <strong>Limited Time:</strong> This offer expires in 24
                  hours. Don&apos;t miss out on your chance to attend!
                </Text>
              </Section>
            )}
          </Section>

          <Hr style={divider} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Best regards,
              <br />
              The {platformName} Team
            </Text>
            <Text style={footerLinks}>
              <Link href={`${appUrl}/dashboard`} style={link}>
                Dashboard
              </Link>
              {' • '}
              <Link href={`${appUrl}/support`} style={link}>
                Support
              </Link>
              {' • '}
              <Link href={`${appUrl}/events`} style={link}>
                Browse Events
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Styles for event notification template
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
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
};

const header = {
  padding: '30px',
  textAlign: 'center' as const,
  borderRadius: '8px 8px 0 0',
};

const headerText = {
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
};

const content = {
  padding: '30px',
};

const message = {
  fontSize: '16px',
  color: '#374151',
  lineHeight: '1.6',
  margin: '0 0 25px 0',
};

const eventDetails = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '6px',
  padding: '20px',
  margin: '25px 0',
};

const eventTitle = {
  fontSize: '20px',
  fontWeight: 'bold',
  color: '#1f2937',
  margin: '0 0 10px 0',
};

const eventDate = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '0 0 5px 0',
};

const eventVenue = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '30px 0',
};

const button = {
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
  borderRadius: '6px',
  border: 'none',
};

const helpSection = {
  backgroundColor: '#fef3c7',
  border: '1px solid #f59e0b',
  borderRadius: '6px',
  padding: '15px',
  margin: '20px 0',
};

const helpTitle = {
  fontSize: '14px',
  fontWeight: 'bold',
  color: '#92400e',
  margin: '0 0 8px 0',
};

const helpText = {
  fontSize: '13px',
  color: '#a16207',
  lineHeight: '1.5',
  margin: '0',
};

const urgencySection = {
  backgroundColor: '#dbeafe',
  border: '1px solid #3b82f6',
  borderRadius: '6px',
  padding: '15px',
  margin: '20px 0',
};

const urgencyText = {
  fontSize: '14px',
  color: '#1e40af',
  margin: '0',
  textAlign: 'center' as const,
};

const divider = {
  border: 'none',
  borderTop: '1px solid #e2e8f0',
  margin: '30px 0',
};

const footer = {
  padding: '20px 30px',
  textAlign: 'center' as const,
};

const footerText = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '0 0 15px 0',
};

const footerLinks = {
  fontSize: '12px',
  color: '#9ca3af',
  margin: '0',
};

const link = {
  color: '#2563eb',
  textDecoration: 'none',
};
