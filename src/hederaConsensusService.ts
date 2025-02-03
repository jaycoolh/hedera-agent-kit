import {
    Client,
    TopicCreateTransaction,
    TopicUpdateTransaction,
    TopicDeleteTransaction,
    TopicMessageSubmitTransaction,
    TopicMessageQuery,
    TopicId,
    TransactionReceipt
} from "@hashgraph/sdk";
import axios from "axios";

export class HederaConsensusService {
    client: Client;

    constructor(client: Client) {
        this.client = client;
    }

    // Create a new consensus topic with an optional memo.
    async createTopic(topicMemo?: string): Promise<TopicId> {
        const txResponse = await new TopicCreateTransaction()
            .setTopicMemo(topicMemo || "Default Topic")
            .execute(this.client);

        const receipt: TransactionReceipt = await txResponse.getReceipt(this.client);
        if (!receipt.topicId) {
            throw new Error("Failed to create topic.");
        }
        return receipt.topicId;
    }

    // Update an existing topic's memo.
    async updateTopic(topicId: string, topicMemo: string): Promise<void> {
        await new TopicUpdateTransaction()
            .setTopicId(topicId)
            .setTopicMemo(topicMemo)
            .execute(this.client);
        // Optionally, you could retrieve the receipt to confirm the update.
    }

    // Delete an existing topic.
    async deleteTopic(topicId: string): Promise<void> {
        await new TopicDeleteTransaction()
            .setTopicId(topicId)
            .execute(this.client);
    }

    // Submit a message to a consensus topic.
    async submitMessage(topicId: string, message: string): Promise<void> {
        await new TopicMessageSubmitTransaction()
            .setTopicId(topicId)
            .setMessage(message)
            .execute(this.client);
    }

    // Query recent messages for a consensus topic.
    // This implementation uses axios to poll the public mirror node REST API with pagination
    // until all available messages are retrieved.
    async queryTopic(topicId: string, duration: number = 5000, limit: number = 10): Promise<any[]> {
        // Determine the base URL for the mirror node REST API.
        const baseUrl = process.env.HEDERA_NETWORK === "mainnet"
            ? "https://mainnet.mirrornode.hedera.com"
            : "https://testnet.mirrornode.hedera.com";

        let messages: any[] = [];
        // Construct the initial query URL.
        let url: string | null = `${baseUrl}/api/v1/topics/${topicId}/messages?limit=${limit}`;

        // Wait a short duration to ensure messages are indexed.
        await new Promise((resolve) => setTimeout(resolve, duration));

        // Loop to fetch messages until no "next" page is available.
        while (url) {
            try {
                const response = await axios.get(url);
                const data = response.data;

                if (data.messages && data.messages.length > 0) {
                    messages.push(...data.messages);
                }

                // The REST response may include a "links" object with a "next" property for pagination.
                url = data.links && data.links.next ? baseUrl + data.links.next : null;
            } catch (error) {
                console.error("Error querying topic messages via REST:", error);
                break;
            }
        }

        return messages;
    }
} 