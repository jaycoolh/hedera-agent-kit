import HederaAgentKit from "../src/agent";
import { createHederaTools } from "../src/langchain";
import { ChatOpenAI } from "@langchain/openai";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { HumanMessage } from "@langchain/core/messages";
import * as dotenv from "dotenv";
import * as readline from "readline";
import { Client } from "@hashgraph/sdk";
import { HederaConsensusService } from "../src/hederaConsensusService";

dotenv.config();

function validateEnvironment(): void {
  const missingVars: string[] = [];
  // You can tweak these as needed
  const requiredVars = ["OPENAI_API_KEY", "HEDERA_ACCOUNT_ID", "HEDERA_PRIVATE_KEY"];

  requiredVars.forEach((varName) => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });

  if (missingVars.length > 0) {
    console.error("Error: Required environment variables are not set");
    missingVars.forEach((varName) => {
      console.error(`${varName}=your_${varName.toLowerCase()}_here`);
    });
    process.exit(1);
  }
}

validateEnvironment();

async function initializeAgent() {
  try {
    const llm = new ChatOpenAI({
      modelName: "gpt-4",
      temperature: 0.7,
    });

    // Initialize HederaAgentKit
    const hederaKit = new HederaAgentKit(
      process.env.HEDERA_ACCOUNT_ID!,
      process.env.HEDERA_PRIVATE_KEY!,
      // Pass your network of choice. Default is "mainnet".
      // You can specify 'testnet', 'previewnet', or 'mainnet'.
      process.env.HEDERA_NETWORK as "mainnet" | "testnet" | "previewnet" || "testnet"
    );

    // Create the HederaConsensusService instance
    const client = process.env.HEDERA_NETWORK === "mainnet" ? Client.forMainnet() : Client.forTestnet();
    client.setOperator(process.env.HEDERA_ACCOUNT_ID!, process.env.HEDERA_PRIVATE_KEY!);
    const consensusService = new HederaConsensusService(client);

    // Create the LangChain-compatible tools
    const tools = createHederaTools(hederaKit, consensusService);

    // Prepare an in-memory checkpoint saver
    const memory = new MemorySaver();

    // Additional configuration for the agent
    const config = { configurable: { thread_id: "Hedera Agent Kit!" } };

    // Create the React agent
    const agent = createReactAgent({
      llm,
      tools,
      checkpointSaver: memory,
      // You can adjust this message for your scenario:
      messageModifier: `
        You are a helpful agent that can interact on-chain using the Hedera Agent Kit. 
        You are empowered to interact on-chain using your tools. If you ever need funds,
        you can request them from a faucet or from the user. 
        If there is a 5XX (internal) HTTP error code, ask the user to try again later. 
        If someone asks you to do something you can't do with your available tools, you 
        must say so, and encourage them to implement it themselves with the Hedera Agent Kit. 
        Keep your responses concise and helpful.
      `,
    });

    return { agent, config };
  } catch (error) {
    console.error("Failed to initialize agent:", error);
    throw error;
  }
}

async function runAutonomousMode(agent: any, config: any, interval = 10) {
  console.log("Starting autonomous mode...");

  while (true) {
    try {
      // The agent's "thought" is just a prompt you provide
      const thought =
        "Perform an interesting on-chain action on Hedera that showcases your capabilities.";

      // You can stream or await the entire call
      const stream = await agent.stream({ messages: [new HumanMessage(thought)] }, config);

      for await (const chunk of stream) {
        if ("agent" in chunk) {
          console.log(chunk.agent.messages[0].content);
        } else if ("tools" in chunk) {
          console.log(chunk.tools.messages[0].content);
        }
        console.log("-------------------");
      }

      // Sleep for `interval` seconds between each iteration
      await new Promise((resolve) => setTimeout(resolve, interval * 1000));
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error:", error.message);
      }
      process.exit(1);
    }
  }
}

async function runChatMode(agent: any, config: any) {
  console.log("Starting chat mode... Type 'exit' to end.");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> =>
    new Promise((resolve) => rl.question(prompt, resolve));

  try {
    while (true) {
      const userInput = await question("\nPrompt: ");

      if (userInput.toLowerCase() === "exit") {
        break;
      }

      const stream = await agent.stream({ messages: [new HumanMessage(userInput)] }, config);

      for await (const chunk of stream) {
        if ("agent" in chunk) {
          console.log(chunk.agent.messages[0].content);
        } else if ("tools" in chunk) {
          console.log(chunk.tools.messages[0].content);
        }
        console.log("-------------------");
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error:", error.message);
    }
    process.exit(1);
  } finally {
    rl.close();
  }
}

async function chooseMode(): Promise<"chat" | "auto"> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> =>
    new Promise((resolve) => rl.question(prompt, resolve));

  while (true) {
    console.log("\nAvailable modes:");
    console.log("1. chat    - Interactive chat mode");
    console.log("2. auto    - Autonomous action mode");

    const choice = (await question("\nChoose a mode (enter number or name): "))
      .toLowerCase()
      .trim();

    rl.close();

    if (choice === "1" || choice === "chat") {
      return "chat";
    } else if (choice === "2" || choice === "auto") {
      return "auto";
    }
    console.log("Invalid choice. Please try again.");
  }
}

async function testConsensusService() {
  console.log("----- Simulating Conversation with Hedera Consensus Service -----\n");

  // Use testnet or mainnet based on environment variable.
  const client = process.env.HEDERA_NETWORK === "mainnet" ? Client.forMainnet() : Client.forTestnet();
  client.setOperator(process.env.HEDERA_ACCOUNT_ID!, process.env.HEDERA_PRIVATE_KEY!);

  const hcs = new HederaConsensusService(client);
  let topicId;

  try {
    console.log("User: Can you create a consensus topic for our discussion?");
    topicId = await hcs.createTopic("Conversation Topic");
    console.log("Agent: Topic created successfully. ID:", topicId.toString(), "\n");

    console.log("User: Please post my greeting 'Hello Hedera' to the topic.");
    await hcs.submitMessage(topicId.toString(), "Hello Hedera!");
    console.log("Agent: Your message has been submitted.\n");

    console.log("User: Could you fetch the latest messages from this topic?");
    // Pause briefly to allow for message propagation.
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const messages = await hcs.queryTopic(topicId.toString(), 5000, 10);
    console.log("Agent: Here are the recent messages:", messages, "\n");

    console.log("User: Can you update the topic's description to 'Discussing Hedera Consensus Service'?");
    await hcs.updateTopic(topicId.toString(), "Discussing Hedera Consensus Service");
    console.log("Agent: Topic memo updated.\n");

  } catch (error) {
    console.error("Agent: Error during conversation simulation:", error);
  }

  // Optionally, delete the topic.
  if (topicId) {
    try {
      console.log("User: Let's conclude by deleting the topic.");
      await hcs.deleteTopic(topicId.toString());
      console.log("Agent: Topic was deleted successfully.\n");
    } catch (error) {
      console.error("Agent: Error deleting topic:", error);
    }
  } else {
    console.error("Agent: Topic creation failed, skipping deletion.");
  }
}

async function main() {
  try {
    console.log("Starting Agent...");
    const { agent, config } = await initializeAgent();
    const mode = await chooseMode();

    if (mode === "chat") {
      await runChatMode(agent, config);
    } else {
      await runAutonomousMode(agent, config);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error:", error.message);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

// If the script is run with "test-consensus" argument, run the HCS tests.
if (process.argv.includes("test-consensus")) {
  (async () => {
    await testConsensusService();
    process.exit(0);
  })();
}
