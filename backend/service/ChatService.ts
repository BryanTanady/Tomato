import { ChatModel, IChat } from "../model/ChatModel";
import { MessageModel, IMessage } from "../model/MessageModel";

export class ChatService {

  /**
   * Create a chat between two members
   * @param member_1: member 1 id
   * @param member_2: member 2 id
   * @returns A promise that resolves to the created chat
   */
  async createChat(member_1: string, member_2: string): Promise<IChat | null> {
    try {
      const existChat = await ChatModel.findOne()
        .or([{ member_1, member_2 }, { member_1: member_2, member_2: member_1 }])
        .exec();
      if (existChat) {
        console.log("CHAT EXIST");
        return existChat;
      }
      const newChat = new ChatModel({ member_1, member_2 });
      return await newChat.save();
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error("Error creating chat: " + err.message);
      }
      return null;
    }
  }

  /**
   * Retrieve chat messages given a chat id
   * @param chatroom_id
   * @returns A promise that resolves to an array of messages.
   */
  async getChatMessages(chatroom_id: string): Promise<IMessage[] | null> {
    try {
      return await MessageModel.find({ chatroom_id }).exec();
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error("Error getting chat messages: " + err.message);
      }
      return null;
    }
  }

  /**
   * Retrieve chatroom given its id.
   * @param chatroom_id 
   * @returns A promise that resolves to the chatroom.
   */
  async getChat(chatroom_id: string): Promise<IChat | null> {
    try {
      return await ChatModel.findById(chatroom_id).exec();
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error("Error getting chat: " + err.message);
      }
      return null;
    }
  }

  /**
   * Get all chats that a member is in.
   * @param memberId 
   * @returns Promise that resolves to an array of chats.
   */
  async getChats(memberId: string): Promise<IChat[] | null> {
    try {
      return await ChatModel.find().or([{ member_1: memberId }, { member_2: memberId }]).exec();
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error("Error getting chats: " + err.message);
      }
      return null;
    }
  }

  /**
   * Delete a chat given its id.
   * @param chatroom_id
   * @returns A promise that resolves to the deleted chat.
   */
  async deleteChat(chatroom_id: string): Promise<IChat | null> {
    try {
      await MessageModel.deleteMany({ chatroom_id }).exec();
      const chat = await ChatModel.findById(chatroom_id).exec();
      if (chat) {
        await chat.deleteOne();
      }
      return chat;
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error("Error deleting chat: " + err.message);
      } 
      return null;
    }
  }

  /**
   * Add a message to a chatroom.
   * @param chatroom_id 
   * @param sender 
   * @param message 
   * @returns A promise that resolves to the created message.
   */
  async addMessage(
    chatroom_id: string,
    sender: string,
    message: string
  ): Promise<IMessage | null> {
    try {
      const newMessage = new MessageModel({ chatroom_id, sender, message });
      return await newMessage.save();
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error("Error adding message: " + err.message);
      } 
      return null;
    }
  }

  /**
   * Delete a message given its id.
   * @param messageId 
   * @returns A promise that resolves to the deleted message.
   */
  async deleteMessage(messageId: string): Promise<IMessage | null> {
    try {
      const message = await MessageModel.findById(messageId).exec();
      if (message) {
        await message.deleteOne();
      }
      return message;
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error("Error deleting message: " + err.message);
      } 
      return null;
    }
  }
}
