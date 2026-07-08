import express from 'express';
import cors from 'cors';

const app = express();

// ============================================================
// Dynamic CORS Configuration
// ============================================================

/**
 * Check if origin is a valid WebContainer/Bolt preview domain.
 * Matches patterns like: https://abc123--name--username.webcontainer-api.io
 */
function isWebContainerOrigin(origin) {
  try {
    const url = new URL(origin);
    // Match webcontainer-api.io subdomains
    return /\.webcontainer-api\.io$/.test(url.hostname);
  } catch {
    return false;
  }
}

/**
 * Get the list of allowed origins dynamically.
 */
function getAllowedOrigins() {
  const origins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5001',
    'http://localhost:8080',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5001',
    'http://127.0.0.1:8080',
  ];

  // Add production frontend URL from environment
  if (process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL);
  }

  return origins;
}

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, postman, etc.)
    if (!origin) return callback(null, true);

    // Check against static allowed origins
    const allowedOrigins = getAllowedOrigins();
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Check for dynamic WebContainer preview domains
    if (isWebContainerOrigin(origin)) {
      return callback(null, true);
    }

    // Log rejected origins for debugging
    console.warn(`[CORS] Rejected origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-Info', 'Apikey'],
};

app.use(cors(corsOptions));
app.use(express.json());

// ============================================================
// Helper Functions
// ============================================================

function getWhatsAppConfig(providedConfig = {}) {
  return {
    phone_number_id: providedConfig.phone_number_id || process.env.META_PHONE_NUMBER_ID || '',
    access_token: providedConfig.access_token || process.env.META_ACCESS_TOKEN || '',
    api_version: providedConfig.api_version || process.env.META_API_VERSION || 'v22.0',
  };
}

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

app.post('/api/whatsapp/test', async (req, res) => {
  try {
    const config = getWhatsAppConfig(req.body);

    if (!config.phone_number_id || !config.access_token) {
      return res.status(400).json({
        success: false,
        error: 'Phone Number ID and Access Token are required',
      });
    }

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

    const normalizedPhone = phone.replace(/\D/g, '');

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
  console.log(`[CORS] Static origins: ${getAllowedOrigins().join(', ')}`);
  console.log(`[CORS] Dynamic origins: *.webcontainer-api.io (WebContainer previews)`);
});

export default app;