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

/**
 * Official WhatsApp Template Definitions for CyGnuS CRM Pro.
 *
 * Template Names (must match Meta Business Suite exactly):
 * - crm_received: New repair order received
 * - crm_ready_for_pickup: Repair completed, ready for pickup
 * - crm_cancelled: Repair order cancelled
 *
 * Parameter order is critical and must match the template body in Meta:
 * - crm_received: [name, brand, model, serial, repair_id, status]
 * - crm_ready_for_pickup: [name, brand, model, serial, repair_id, status, price_formatted]
 * - crm_cancelled: [name, repair_id]
 */
const WHATSAPP_TEMPLATES = {
  crm_received: {
    name: 'crm_received',
    paramCount: 6,
    description: 'New repair order received',
  },
  crm_ready_for_pickup: {
    name: 'crm_ready_for_pickup',
    paramCount: 7,
    description: 'Repair completed, ready for pickup',
  },
  crm_cancelled: {
    name: 'crm_cancelled',
    paramCount: 2,
    description: 'Repair order cancelled',
  },
  crm_restock_order: {
    name: 'crm_restock_order',
    paramCount: 4,
    description: 'Manual restock order to supplier',
  },
  // Legacy templates (kept for backward compatibility)
  order_received: { name: 'crm_received', paramCount: 6, legacy: true },
  order_finished: { name: 'crm_ready_for_pickup', paramCount: 7, legacy: true },
  order_cancelled: { name: 'crm_cancelled', paramCount: 2, legacy: true },
};

/**
 * Resolve template name to official Meta template name.
 * Handles legacy template names by mapping to current names.
 */
function resolveTemplateName(template) {
  const mapping = {
    order_received: 'crm_received',
    order_finished: 'crm_ready_for_pickup',
    order_cancelled: 'crm_cancelled',
  };
  return mapping[template] || template;
}

/**
 * Build template parameters in the correct order for each template type.
 */
function buildTemplateParams(template, data) {
  const resolvedTemplate = resolveTemplateName(template);

  switch (resolvedTemplate) {
    case 'crm_received':
      // 6 params: [customer_name, brand, model, serial, repair_id, status]
      return [
        data.name || data.customer_name || '',
        data.brand || '',
        data.model || '',
        data.serial || '',
        data.repair_id || '',
        data.status || '',
      ];

    case 'crm_ready_for_pickup': {
      // 7 params: [customer_name, brand, model, serial, repair_id, status, price]
      const price = data.price || 0;
      const priceFormatted = typeof price === 'number' ? `${price.toFixed(2)} USD` : String(price);
      return [
        data.name || data.customer_name || '',
        data.brand || '',
        data.model || '',
        data.serial || '',
        data.repair_id || '',
        data.status || '',
        priceFormatted,
      ];
    }

    case 'crm_cancelled':
      // 2 params: [customer_name, repair_id]
      return [
        data.name || data.customer_name || '',
        data.repair_id || '',
      ];

    case 'crm_restock_order':
      // 4 params: [supplier_name, quantity, item_name, sku]
      return data.variables || [];

    default:
      return data.variables || [];
  }
}

function getWhatsAppConfig(providedConfig = {}) {
  return {
    phone_number_id: providedConfig.phone_number_id || process.env.META_PHONE_NUMBER_ID || '',
    access_token: providedConfig.access_token || process.env.META_ACCESS_TOKEN || '',
    api_version: providedConfig.api_version || process.env.META_API_VERSION || 'v22.0',
  };
}

/**
 * Normalize phone number for WhatsApp/Meta API:
 * - Strips all spaces, dashes, parentheses, and special characters
 * - For Lebanon local 8-digit numbers: prepend '961' country code
 * - For international numbers: preserve full format
 */
function normalizePhoneForWhatsApp(phone) {
  if (!phone) return '';

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // If empty after cleaning, return empty
  if (!digits) return '';

  // Handle Lebanon local 8-digit numbers: prepend 961
  if (digits.length === 8) {
    return '961' + digits;
  }

  // Already has country code or is international - return as-is
  return digits;
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
    const { logId, phone, template, language, variables, repairData, config: providedConfig } = req.body;

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

    // Normalize phone number with intelligent Lebanon handling
    const normalizedPhone = normalizePhoneForWhatsApp(phone);

    // Resolve template name and build parameters in correct order
    const resolvedTemplate = resolveTemplateName(template);
    const templateParams = repairData
      ? buildTemplateParams(template, repairData)
      : variables || [];

    console.log(`[WhatsApp Send] Template: ${template} -> ${resolvedTemplate}, Params: ${templateParams.length}`);

    const result = await sendWhatsAppTemplate(
      config,
      normalizedPhone,
      resolvedTemplate,
      language || 'en_US',
      templateParams
    );

    console.log(`[WhatsApp Send] Message sent: ${logId} -> ${normalizedPhone} (${resolvedTemplate})`);

    res.json({
      success: true,
      message_id: result.messages?.[0]?.id || 'unknown',
      log_id: logId,
      template_used: resolvedTemplate,
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