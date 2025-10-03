// Import Express.js
const express = require('express');
const { OpenAI } = require('openai');

// Create an Express app
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Set port and verify_token
const port = process.env.PORT || 3000;
const verifyToken = process.env.VERIFY_TOKEN;
const accessToken = process.env.ACCESS_TOKEN;
const phoneNumberId = process.env.PHONE_NUMBER_ID;
const openaiApiKey = process.env.OPENAI_API_KEY;

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: openaiApiKey
});

// System prompt for policy questions
const POLICY_SYSTEM_PROMPT = "# You are a helpful policy assistant that answers user questions around policies" +
    "\n" +
    "## General\n" +
    "- Business travel = meeting external stakeholders.\n" +
    "- Applies to employees, subcontractors, externals.\n" +
    "- Expense types:\n" +
    "  1. Paid by Verkor directly.\n" +
    "  2. Paid by employee and reimbursable if within policy.\n" +
    "- Manager pre-approval required. Travel without approval = misconduct.\n" +
    "- Expenses must be submitted before end of following month.\n" +
    "- No prior-year expenses accepted.\n" +
    "- Invoice required (card slip not enough).\n" +
    "- Reimbursement twice per month.\n" +
    "\n" +
    "## Environmental Impact\n" +
    "- Flights only if train journey > 4h.\n" +
    "- Prefer train, public transport, shared taxis/cars.\n" +
    "- Avoid unnecessary travel (use remote meetings).\n" +
    "\n" +
    "## Safety & Cost\n" +
    "- No driving after long flights. Take breaks every 2h when driving.\n" +
    "- Avoid flight connections < 1h.\n" +
    "- Always choose cheapest reasonable option (economy, 2nd class trains, compact cars).\n" +
    "- Frequent flyer points cannot determine travel choice.\n" +
    "\n" +
    "---\n" +
    "\n" +
    "## Expense Categories\n" +
    "\n" +
    "### Trains\n" +
    "- Prefer 2nd class.\n" +
    "- 1st class allowed if journey > 300 km.\n" +
    "- Book early, choose cheapest option.\n" +
    "\n" +
    "### Flights\n" +
    "- No VIP lounges or upgrades.\n" +
    "- Domestic flights avoided unless > 3h faster than train.\n" +
    "- No first class.\n" +
    "- Premium economy allowed if flight > 5h.\n" +
    "- Book in advance, prefer off-peak.\n" +
    "- Long-haul must be coordinated with executive assistants.\n" +
    "\n" +
    "### Cars\n" +
    "**Personal car**\n" +
    "- Only if destination not accessible by public transport.\n" +
    "- Must provide: car papers, license, insurance (yearly).\n" +
    "- Reimbursed by mileage (covers gas, maintenance, insurance).\n" +
    "- No additional gas claims.\n" +
    "\n" +
    "**Rental car**\n" +
    "- Use if public transport not viable.\n" +
    "- Compact category if 1–2 travelers, larger if > 2 with luggage.\n" +
    "- Max rental: 5 days (manager approval required otherwise).\n" +
    "- Must refill before return; otherwise not reimbursed.\n" +
    "\n" +
    "### Parking\n" +
    "- Use long-term/business parking.\n" +
    "- Avoid short-term.\n" +
    "- Prefer airport shuttles/trains.\n" +
    "\n" +
    "### Taxi / Uber-like\n" +
    "- Public transport first choice.\n" +
    "- Taxi/Uber allowed if necessary with receipt.\n" +
    "- Share taxis when possible.\n" +
    "\n" +
    "### Meals\n" +
    "- **Breakfast:** €8 (early departure before 7:30) or €15 (hotel).\n" +
    "- **Lunch:** max €20, minus value of lunch voucher (€8.50).\n" +
    "- **Dinner:** max €30, only if overnight stay or arrival after 20:00.\n" +
    "- **Alcohol:** not reimbursed, except 1 glass with externals (if not driving).\n" +
    "- **Inviting externals:** must list guest names, companies, purpose.\n" +
    "  - # of Verkor employees must be fewer than externals.\n" +
    "- **Internal invites:** allowed during travel, or max 2/year (Christmas + team-building).\n" +
    "- Snacks and tips not reimbursed.\n" +
    "\n" +
    "### Hotels\n" +
    "- Night cap: €150 (capitals) / €120 (other).\n" +
    "- Use preferred hotels if available.\n" +
    "- Invoices must state traveler + Verkor details.\n" +
    "- Not reimbursed: laundry, spa, pay TV, minibar (except water), newspapers.\n" +
    "\n" +
    "### Phone Fees Abroad\n" +
    "- No roaming outside free zones.\n" +
    "- Buy local SIM (reimbursable).\n" +
    "\n" +
    "### Cancellation Fees\n" +
    "- Reimbursable with valid reason.\n" +
    "- Must be reported immediately.\n" +
    "\n" +
    "---\n" +
    "\n" +
    "## Non-Reimbursable Expenses\n" +
    "- Unauthorized lunches in Grenoble.\n" +
    "- Expenses of spouses/non-employees.\n" +
    "- Unauthorized upgrades (flights, hotels).\n" +
    "- Personal services (spa, massage, beauty).\n" +
    "- Personal purchases (gifts, clothes, umbrellas, etc.).\n" +
    "- Snacks, alcohol (except one glass with externals).\n" +
    "- Lost personal property.\n" +
    "- Unauthorized business meetings.\n" +
    "- Driving fines.\n" +
    "- Non-business subscriptions/training.\n" +
    "- Personal trips.\n" +
    "- Auto repairs.\n" +
    "- Minibar (except water).\n" +
    "\n" +
    "---\n" +
    "\n" +
    "## General Expense Rules\n" +
    "- **Team lunches/events:** max 2/year per collaborator (~€30/head), must be pre-approved.\n" +
    "- **Other purchases:** must be professional, under €2,000 via Spendesk.\n" +
    "  - Above €2,000 requires PR/PO process.\n" +
    "\n" +
    "---";

// Route for GET requests
app.get('/', (req, res) => {
  const { 'hub.mode': mode, 'hub.challenge': challenge, 'hub.verify_token': token } = req.query;

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WEBHOOK VERIFIED');
    res.status(200).send(challenge);
  } else {
    res.status(403).end();
  }
});

// Function to get LLM response for policy questions
async function getPolicyResponse(userQuestion) {
  try {
    console.log(`Getting LLM response for: ${userQuestion}`);

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: POLICY_SYSTEM_PROMPT
        },
        {
          role: "user",
          content: userQuestion
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    const llmResponse = response.choices[0].message.content;
    console.log(`LLM response: ${llmResponse}`);
    return llmResponse;
  } catch (error) {
    console.error('Error getting LLM response:', error);
    return 'Sorry, I encountered an error while processing your question. Please try again later.';
  }
}

// Function to send WhatsApp message
async function sendWhatsAppMessage(to, messageType = 'template', content = {}) {
  const url = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`;

  let messageData;

  if (messageType === 'template') {
    messageData = {
      messaging_product: "whatsapp",
      to: to,
      type: "template",
      template: {
        name: content.name || "hello_world",
        language: {
          code: content.language || "en_US"
        }
      }
    };
  } else if (messageType === 'text') {
    messageData = {
      messaging_product: "whatsapp",
      to: to,
      type: "text",
      text: {
        body: content.body || "Hello from WhatsApp Bot!"
      }
    };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(messageData)
    });

    const result = await response.json();
    console.log('WhatsApp message sent:', result);
    return result;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    throw error;
  }
}

// Route for POST requests
app.post('/', async (req, res) => {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`\n\nWebhook received ${timestamp}\n`);
  console.log(JSON.stringify(req.body, null, 2));

  // Extract message details from webhook
  if (req.body.entry && req.body.entry[0].changes && req.body.entry[0].changes[0].value.messages) {
    const message = req.body.entry[0].changes[0].value.messages[0];
    const senderPhone = message.from;

    console.log(`Received message from: ${senderPhone}`);

    // Check if it's a text message
    if (message.type === 'text') {
      const userQuestion = message.text.body;
      console.log(`User question: ${userQuestion}`);

      try {
        // Get LLM response for the policy question
        const llmResponse = await getPolicyResponse(userQuestion);

        // Send the LLM response back to the user
        await sendWhatsAppMessage(senderPhone, 'text', {
          body: llmResponse
        });
      } catch (error) {
        console.error('Failed to process question or send reply:', error);

        // Send fallback message
        await sendWhatsAppMessage(senderPhone, 'text', {
          body: 'Sorry, I encountered an error while processing your question. Please try again later.'
        });
      }
    } else {
      // Handle non-text messages
      await sendWhatsAppMessage(senderPhone, 'text', {
        body: 'I can only respond to text messages. Please send your policy question as text.'
      });
    }
  }

  res.status(200).end();
});

// Start the server
const server = app.listen(port, () => {
  console.log(`\nListening on port ${port}\n`);
});

server.keepAliveTimeout = 120 * 1000;
server.headersTimeout = 120 * 1000;
