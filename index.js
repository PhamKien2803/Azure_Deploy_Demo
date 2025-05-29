import express from 'express';
require('dotenv').config();
import { OpenAIClient } from "@azure/openai";
import { AzureKeyCredential } from "@azure/core-auth";
import configureHttpServer from './services/httpserver.js';
const app = express();
const port = process.env.PORT || 8080;
app.use(express.json());
app.post('/api/chat', async (req, res) => {
  try {
    const userInput = req.body.message;

    if (!userInput) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const azureApiKey = process.env.AZURE_OPENAI_KEY;
    const deploymentId = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;

    if (!endpoint || !azureApiKey || !deploymentId) {
      console.error("Server configuration error: Missing Azure OpenAI environment variables.");
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const client = new OpenAIClient(endpoint, new AzureKeyCredential(azureApiKey));
    const messages = [
      { role: "system", content: "You are a helpful AI assistant. Answer in Vietnamese." },
      { role: "user", content: userInput },
    ];

    console.log(`Sending request to Azure OpenAI for user message: "${userInput}"`);
    const result = await client.getChatCompletions(deploymentId, messages);
    console.log("Raw Azure OpenAI Result:", JSON.stringify(result, null, 2));
    if (result && result.choices && result.choices.length > 0 && result.choices[0].message && result.choices[0].message.content) {
      const aiResponse = result.choices[0].message.content;
      console.log(`Received valid response from Azure OpenAI.`);
      res.json({ reply: aiResponse });
    } else {
      console.error("Unexpected response structure from Azure OpenAI:", JSON.stringify(result, null, 2));
      res.status(500).json({ error: 'Failed to parse AI response' });
    }

  } catch (error) {
    console.error("Error calling Azure OpenAI:", error.message);
    if (error.response && error.response.data) {
      console.error("Azure OpenAI Error Data:", error.response.data);
    } else if (error.details) {
      console.error("Azure OpenAI Error Details:", error.details);
    }
    res.status(500).json({ error: 'Failed to get response from AI' });
  }
});
const onGlobalErrors = (error) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
};
configureHttpServer(app).then((webserver) => {
  webserver.on('error', onGlobalErrors);
  webserver.listen(port, '0.0.0.0', () => console.log(`Server listening on port: ${port}`));
});
