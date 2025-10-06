# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Start the server:**
```bash
npm start
# or
node app.js
```

The server runs on port 3000 by default (or PORT environment variable).

## Architecture

This is an Express.js WhatsApp webhook bot that integrates with OpenAI to answer policy questions.

**Request Flow:**
1. WhatsApp Cloud API sends webhook POST to `/` when user sends message
2. Webhook handler extracts message from `req.body.entry[0].changes[0].value.messages[0]`
3. User's text message is sent to OpenAI GPT-3.5-turbo with policy system prompt
4. LLM response is sent back via WhatsApp Graph API

**Main Components:**
- `GET /`: Webhook verification endpoint (validates `hub.verify_token` against `VERIFY_TOKEN`)
- `POST /`: Message handling endpoint
- `getPolicyResponse()`: Calls OpenAI API with user question and policy context
- `sendWhatsAppMessage()`: Sends messages via WhatsApp Graph API v22.0

**Environment Variables Required:**
- `VERIFY_TOKEN`: WhatsApp webhook verification token
- `ACCESS_TOKEN`: WhatsApp Graph API access token
- `PHONE_NUMBER_ID`: WhatsApp phone number ID
- `OPENAI_API_KEY`: OpenAI API key

**Policy Context:**
The system prompt (lines 24-137) contains detailed business travel and expense policies. When modifying policy responses, update the `POLICY_SYSTEM_PROMPT` constant.

**WhatsApp API Integration:**
- Uses WhatsApp Cloud API v22.0
- Supports template and text message types
- Only responds to text messages; other message types receive a fallback response
