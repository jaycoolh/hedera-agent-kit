import { Tool } from "@langchain/core/tools";
import HederaAgentKit from "../agent";
import { HederaConsensusService } from "../hederaConsensusService";


export class HederaCreateFungibleTokenTool extends Tool {
  name = 'hedera_create_fungible_token'

  description = `Create a fungible token on Hedera
Inputs ( input is a JSON string ):
name: string, the name of the token e.g. My Token,
symbol: string, the symbol of the token e.g. MT,
decimals: number, the amount of decimals of the token
initialSupply: number, the initial supply of the token e.g. 100000
`

  constructor(private hederaKit: HederaAgentKit) {
    super()
  }

  protected async _call(input: string): Promise<string> {
    try {
      const parsedInput = JSON.parse(input);

      const tokenId = await this.hederaKit.createFT(
        parsedInput.name,
        parsedInput.symbol,
        parsedInput.decimals,
        parsedInput.initialSupply
      );

      return JSON.stringify({
        status: "success",
        message: "Token creation successful",
        initialSupply: parsedInput.initialSupply,
        tokenId: tokenId.toString(),
        solidityAddress: tokenId.toSolidityAddress(),
      });
    } catch (error: any) {
      return JSON.stringify({
        status: "error",
        message: error.message,
        code: error.code || "UNKNOWN_ERROR",
      });
    }
  }
}

export class HederaTransferTokenTool extends Tool {
  name = 'hedera_transfer_token'

  description = `Transfer fungible tokens on Hedera
Inputs ( input is a JSON string ):
tokenId: string, the ID of the token to transfer e.g. 0.0.123456,
toAccountId: string, the account ID to transfer to e.g. 0.0.789012,
amount: number, the amount of tokens to transfer e.g. 100
`

  constructor(private hederaKit: HederaAgentKit) {
    super()
  }

  protected async _call(input: string): Promise<string> {
    try {
      const parsedInput = JSON.parse(input);

      await this.hederaKit.transferToken(
        parsedInput.tokenId,
        parsedInput.toAccountId,
        parsedInput.amount
      );

      return JSON.stringify({
        status: "success",
        message: "Token transfer successful",
        tokenId: parsedInput.tokenId,
        toAccountId: parsedInput.toAccountId,
        amount: parsedInput.amount
      });
    } catch (error: any) {
      return JSON.stringify({
        status: "error",
        message: error.message,
        code: error.code || "UNKNOWN_ERROR",
      });
    }
  }
}

export class HederaGetBalanceTool extends Tool {
  name = 'hedera_get_hbar_balance'

  description = `Get the HBAR balance of the connected account
This tool takes no inputs, just pass an empty string or '{}'
`

  constructor(private hederaKit: HederaAgentKit) {
    super()
  }

  protected async _call(input: string): Promise<string> {
    try {
      const balance = await this.hederaKit.getHbarBalance();

      return JSON.stringify({
        status: "success",
        balance: balance,
        unit: "HBAR"
      });
    } catch (error: any) {
      return JSON.stringify({
        status: "error",
        message: error.message,
        code: error.code || "UNKNOWN_ERROR",
      });
    }
  }
}

export class HederaAirdropTokenTool extends Tool {
  name = 'hedera_airdrop_token'

  description = `Airdrop fungible tokens to multiple accounts on Hedera
Inputs ( input is a JSON string ):
tokenId: string, the ID of the token to airdrop e.g. 0.0.123456,
recipients: array of objects containing:
  - accountId: string, the account ID to send tokens to e.g. 0.0.789012
  - amount: number, the amount of tokens to send e.g. 100
Example input: {
  "tokenId": "0.0.123456",
  "recipients": [
    {"accountId": "0.0.789012", "amount": 100},
    {"accountId": "0.0.789013", "amount": 200}
  ]
}
`

  constructor(private hederaKit: HederaAgentKit) {
    super()
  }

  protected async _call(input: string): Promise<string> {
    try {
      const parsedInput = JSON.parse(input);

      await this.hederaKit.airdropToken(
        parsedInput.tokenId,
        parsedInput.recipients
      );

      return JSON.stringify({
        status: "success",
        message: "Token airdrop successful",
        tokenId: parsedInput.tokenId,
        recipientCount: parsedInput.recipients.length,
        totalAmount: parsedInput.recipients.reduce((sum: number, r: any) => sum + r.amount, 0)
      });
    } catch (error: any) {
      return JSON.stringify({
        status: "error",
        message: error.message,
        code: error.code || "UNKNOWN_ERROR",
      });
    }
  }
}

export class HederaCreateTopicTool extends Tool {
  name = "hedera_create_topic";
  description = `Create a consensus topic on Hedera.
  Inputs (a JSON string):
    { "topicMemo": string (optional) }
  This tool creates a new consensus topic that allows the agent to publish messages 
  for on-chain communications. The 'topicMemo' describes the purpose of the topic.
  Example: { "topicMemo": "Discussion on Hedera Consensus Service" }
  `;

  constructor(private hederaConsensus: HederaConsensusService) {
    super();
  }

  protected async _call(input: string): Promise<string> {
    try {
      const parsed = JSON.parse(input);
      const topicId = await this.hederaConsensus.createTopic(parsed.topicMemo);
      return JSON.stringify({
        status: "success",
        topicId: topicId.toString(),
        memo: parsed.topicMemo || "Default Topic"
      });
    } catch (error: any) {
      return JSON.stringify({
        status: "error",
        message: error.message
      });
    }
  }
}

export class HederaUpdateTopicTool extends Tool {
  name = "hedera_update_topic";
  description = `Update the memo (description) of an existing Hedera consensus topic.
  Inputs (a JSON string):
    { "topicId": string, "topicMemo": string }
  The new memo helps describe the purpose or context of the topic.
  `;

  constructor(private hederaConsensus: HederaConsensusService) {
    super();
  }

  protected async _call(input: string): Promise<string> {
    try {
      const { topicId, topicMemo } = JSON.parse(input);
      await this.hederaConsensus.updateTopic(topicId, topicMemo);
      return JSON.stringify({
        status: "success",
        message: "Topic memo updated",
        topicId: topicId,
        newMemo: topicMemo
      });
    } catch (error: any) {
      return JSON.stringify({
        status: "error",
        message: error.message
      });
    }
  }
}

export class HederaDeleteTopicTool extends Tool {
  name = "hedera_delete_topic";
  description = `Delete an existing Hedera consensus topic.
  Inputs (a JSON string):
    { "topicId": string }
  Use this tool cautiously as deleting a topic is irreversible.
  `;

  constructor(private hederaConsensus: HederaConsensusService) {
    super();
  }

  protected async _call(input: string): Promise<string> {
    try {
      const { topicId } = JSON.parse(input);
      await this.hederaConsensus.deleteTopic(topicId);
      return JSON.stringify({
        status: "success",
        message: "Topic deleted",
        topicId: topicId
      });
    } catch (error: any) {
      return JSON.stringify({
        status: "error",
        message: error.message
      });
    }
  }
}

export class HederaSubmitMessageTool extends Tool {
  name = "hedera_submit_message";
  description = `Submit a message to a Hedera consensus topic.
  Inputs (a JSON string):
    { "topicId": string, "message": string }
  This tool posts textual updates or instructions to the specified topic.
  `;

  constructor(private hederaConsensus: HederaConsensusService) {
    super();
  }

  protected async _call(input: string): Promise<string> {
    try {
      const { topicId, message } = JSON.parse(input);
      await this.hederaConsensus.submitMessage(topicId, message);
      return JSON.stringify({
        status: "success",
        message: "Message submitted to topic",
        topicId: topicId
      });
    } catch (error: any) {
      return JSON.stringify({
        status: "error",
        message: error.message
      });
    }
  }
}

export class HederaQueryTopicTool extends Tool {
  name = "hedera_query_topic";
  description = `Query messages from a Hedera consensus topic.
  Inputs (a JSON string):
    { "topicId": string, "duration": number (optional), "limit": number (optional) }
  This tool collects and returns messages from a topic for the specified duration and limit.
  `;

  constructor(private hederaConsensus: HederaConsensusService) {
    super();
  }

  protected async _call(input: string): Promise<string> {
    try {
      const parsed = JSON.parse(input);
      const topicId = parsed.topicId;
      const duration = parsed.duration || 5000;
      const limit = parsed.limit || 10;
      const messages = await this.hederaConsensus.queryTopic(topicId, duration, limit);
      return JSON.stringify({
        status: "success",
        topicId,
        messages
      });
    } catch (error: any) {
      return JSON.stringify({
        status: "error",
        message: error.message
      });
    }
  }
}

export function createHederaTools(hederaKit: HederaAgentKit, hederaConsensus: HederaConsensusService): Tool[] {
  return [
    new HederaCreateFungibleTokenTool(hederaKit),
    new HederaTransferTokenTool(hederaKit),
    new HederaGetBalanceTool(hederaKit),
    new HederaAirdropTokenTool(hederaKit),
    new HederaCreateTopicTool(hederaConsensus),
    new HederaUpdateTopicTool(hederaConsensus),
    new HederaDeleteTopicTool(hederaConsensus),
    new HederaSubmitMessageTool(hederaConsensus),
    new HederaQueryTopicTool(hederaConsensus)
  ]
}
