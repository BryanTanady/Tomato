import { ChatModel, IChat } from "../model/ChatModel";
import { MessageModel, IMessage } from "../model/MessageModel";

export class ChatService {
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

  async getChatMessages(id: string): Promise<IMessage[] | null> {
    try {
      return await MessageModel.find({ chatroom_id: id }).exec();
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error("Error getting chat messages: " + err.message);
      }
      return null;
    }
  }

  async getChat(id: string): Promise<IChat | null> {
    try {
      return await ChatModel.findById(id).exec();
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error("Error getting chat: " + err.message);
      }
      return null;
    }
  }

  async getChats(id: string): Promise<IChat[] | null> {
    try {
      return await ChatModel.find().or([{ member_1: id }, { member_2: id }]).exec();
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error("Error getting chats: " + err.message);
      }
      return null;
    }
  }

  async deleteChat(id: string): Promise<IChat | null> {
    try {
      await MessageModel.deleteMany({ chatroom_id: id }).exec();
      const chat = await ChatModel.findById(id).exec();
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

  async deleteMessage(id: string): Promise<IMessage | null> {
    try {
      const message = await MessageModel.findById(id).exec();
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
