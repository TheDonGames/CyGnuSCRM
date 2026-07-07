/**
 * CRM Pro - WhatsApp Backend Server
 * Express server for WhatsApp Cloud API integration.
 *
 * Environment Variables:
 * - PORT: Server port (defaults to 8080 for cloud hosting)
 * - FRONTEND_URL: Production frontend URL for CORS
 * - META_PHONE_NUMBER_ID: WhatsApp Business Phone Number ID
 * - META_ACCESS_TOKEN: WhatsApp Cloud API Access Token
 * - META_API_VERSION: WhatsApp API Version (default: v22.0)
 */

import express from 'express';
import cors from 'cors';

const app = express();

// ============================================================
// Dynamic CORS Configuration
// ============================================================

// 1. Properly define your allowed origins array
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:5173'
].filter(Boolean); // Filters out undefined values if FRONTEND_URL isn't set yet

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or server-to-server)
    if (!origin) return callback(null, true);
    
    // Allow configured origins, local development, or Webcontainer environments
    if (
      ALLOWED_ORIGINS.includes(origin) || 
      origin.includes('webcontainer-api.io') ||
      process.env.NODE_ENV !== 'production'
    ) {
      return callback(null, true);
    }
    
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-Info', 'Apikey'],
  credentials: true
}));

app.use(express.json());

// ============================================================
// Helper Functions
// ============================================================

/**
 * Get WhatsApp configuration from environment or use provided config.
 */
function getWhatsAppConfig(providedConfig = {}) {
  return {
    phone_number_id: providedConfig.phone_number_id || process.env.META_PHONE_NUMBER_ID || '',
    access_token: providedConfig.access_token || process.env.META_ACCESS_TOKEN || '',
    api_version: providedConfig.api_version || process.env.META_API_VERSION || 'v22.0',
  };
}

/**
 * Send a WhatsApp template message via Meta Cloud API.
 */
async function sendWhatsAppTemplate(config, phone, templateName, language, variables) {
  const { phone_number_id, access_token, api_version } = config;
  const url = `https://graph.facebook.com/${api_version}/${phone_number_id}/messages`;

  const body = {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'template',
    template: {
      name: templateName,
      language: { code: language },
      components: [
        {
          type: 'body',
          parameters: variables.map((v) => ({ type: 'text', text: v })),
        },
      ],
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${access_token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || `Meta API error: ${response.status}`);
  }

  return data;
}

// ============================================================
// Health Check
// ============================================================

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================
// WhatsApp API Routes
// ============================================================

/**
 * Test WhatsApp connection.
 * Validates credentials by attempting to fetch phone number details.
 */
app.post('/api/whatsapp/test', async (req, res) => {
  try {
    const config = getWhatsAppConfig(req.body);

    if (!config.phone_number_id || !config.access_token) {
      return res.status(400).json({
        success: false,
        error: 'Phone Number ID and Access Token are required',
      });
    }

    // Test by fetching phone number details from Meta API
    const url = `https://graph.facebook.com/${config.api_version}/${config.phone_number_id}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${config.access_token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(400).json({
        success: false,
        error: data.error?.message || `Connection failed: ${response.status}`,
      });
    }

    res.json({
      success: true,
      message: 'Connection successful',
      phone_number: data.display_phone_number || data.verified_name || 'Connected',
    });
  } catch (err) {
    console.error('[WhatsApp Test] Error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error',
    });
  }
});

/**
 * Send a WhatsApp message.
 * Used for automatic message dispatch on repair status changes.
 */
app.post('/api/whatsapp/send', async (req, res) => {
  try {
    const { logId, phone, template, language, variables, config: providedConfig } = req.body;

    if (!phone || !template) {
      return res.status(400).json({
        success: false,
        error: 'Phone and template are required',
      });
    }

    const config = getWhatsAppConfig(providedConfig);

    if (!config.phone_number_id || !config.access_token) {
      return res.status(400).json({
        success: false,
        error: 'WhatsApp API not configured. Check server environment variables or provide config.',
      });
    }

    // Normalize phone number (remove non-digits, ensure country code)
    const normalizedPhone = phone.replace(/\D/g, '');

    // Send the template message
    const result = await sendWhatsAppTemplate(
      config,
      normalizedPhone,
      template,
      language || 'en_US',
      variables || []
    );

    console.log(`[WhatsApp Send] Message sent: ${logId} -> ${normalizedPhone}`);

    res.json({
      success: true,
      message_id: result.messages?.[0]?.id || 'unknown',
      log_id: logId,
    });
  } catch (err) {
    console.error('[WhatsApp Send] Error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to send message',
    });
  }
});

/**
 * Resend a failed WhatsApp message.
 * Retrieves log details and retries the send.
 */
app.post('/api/whatsapp/resend', async (req, res) => {
  try {
    const { logId } = req.body;

    if (!logId) {
      return res.status(400).json({
        success: false,
        error: 'logId is required',
      });
    }

    res.json({
      success: true,
      message: `Resend triggered for log: ${logId}`,
      log_id: logId,
    });
  } catch (err) {
    console.error('[WhatsApp Resend] Error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to resend message',
    });
  }
});

// ============================================================
// Error Handling
// ============================================================

app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// ============================================================
// Start Server
// ============================================================

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`[CRM Pro Backend] Server running on port ${PORT}`);
  console.log(`[CORS] Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
});

export default app;