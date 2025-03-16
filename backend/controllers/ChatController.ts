import { ChatModel } from "../model/ChatModel";
import { MessageModel } from "../model/MessageModel";
import { ChatService } from "../service/ChatService";
import { Request, Response } from "express"
import { isAuthenticatedRequest } from "../types/AuthenticatedRequest";

export class ChatController {
    private chatService: ChatService;

    constructor() {
        this.chatService = new ChatService();
    }

    createChat = async (req: Request, res: Response) => {
        if (!isAuthenticatedRequest(req)) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        } 
        let chat = req.body
        let user = req.user.id
        if (!chat.member_1 || !chat.member_2) {
            res.status(400).send({message: "Bad request"});
            return;
        }
        if (chat.member_1 != user && chat.member_2 != user) {
            res.status(401).send({message: "Unauthorized"});
            return;
        }
        res.json(await this.chatService.createChat(chat.member_1, chat.member_2))
    }

    getChats = async (req: Request, res: Response): Promise<void> => {
        if (!isAuthenticatedRequest(req)) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const userId = req.user.id; 
        res.json(await this.chatService.getChats(userId));
    }

    getChatMessages = async (req: Request, res: Response): Promise<void> => {
        if (!isAuthenticatedRequest(req)) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        const chatId = req.params.id
        let user = req.user.id
        const chat = await ChatModel.findById(chatId);
        if (!chat) {
            res.status(404).send({ message: "Chat not found" });
            return;
        }
        if (chat.member_1 != user && chat.member_2 != user) {
            res.status(401).send({message: "Unauthorized"});
            return;
        }
        res.json(await this.chatService.getChatMessages(chatId));
    }

    addMessage = async (req: Request, res: Response) => {
        if (!isAuthenticatedRequest(req)) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        let message = req.body
        let user = req.user.id
        if (!message.sender || !message.message) {
            res.status(400).send({message: "Bad Request"})
            return;
        }
        if (!user || message.sender !== user) {
            res.status(401).send({message: "Unauthorized"})
            return;
        }
        let chatroom_id = req.params.id
        res.json(await this.chatService.addMessage(chatroom_id, message.sender as string, message.message as string))
    }

  
    deleteMessage = async (req: Request, res: Response) => {
        if (!isAuthenticatedRequest(req)) {
            res.status(401).json({ message: "Unauthorized" });
            return
        }
        const messageId = req.params.message_id
        let user = req.user.id
        const message = await MessageModel.findById(messageId)
        if (!message) {
            res.status(404).send({message: "Message not found"});
            return;
        }
        if (message.sender != user) {
            res.status(401).send({message: "Unauthorized"})
            return;
        }
        res.json(await this.chatService.deleteMessage(messageId))
    }

    deleteChat = async (req: Request, res: Response) => {
        if (!isAuthenticatedRequest(req)) {
            res.status(401).json({ message: "Unauthorized" });
            return
        }
        const chatId = req.params.id
        let user = req.user.id
        const chat = await ChatModel.findById(chatId)
        if (!chat) {
            res.status(404).send({message: "Chat not found"});
            return;
        }
        if (chat.member_1 != user && chat.member_2 != user) {
            res.status(401).send({message: "Unauthorized"})
            return;
        }
        res.json(await this.chatService.deleteChat(chatId))
    }
}