import WebSocket from 'ws';
import { ChatService } from './service/ChatService';
import { UserService } from './service/UserService';
import * as admin from "firebase-admin";
import { Message } from 'firebase-admin/messaging';
import serviceAccount from "./serviceAccountKey.json";

const firebaseCreds = {
    projectId: serviceAccount.project_id,
    clientEmail: serviceAccount.client_email,
    privateKey: serviceAccount.private_key,
    // Add other required fields if necessary
  };

// Firebase Admin initialization with type-safe credentials
admin.initializeApp({
    credential: admin.credential.cert(firebaseCreds as admin.ServiceAccount)
});

interface ChatInfo {
  member_1: string;
  member_2: string;
}

interface UserInfo {
  firebaseToken: string[];
}

const startWSS = () => {
    const chatService = new ChatService();
    const userService = new UserService();
    const wssPort = Number(process.env.WSS_PORT) || 3001;
    const wss = new WebSocket.Server({ host: '0.0.0.0', port: wssPort });
    const wsRoomMapping = new Map<WebSocket, string>();

    wss.on('listening', () => {
        console.log(`WebSocket server running on ws://localhost:${wssPort}`);
    });

    wss.on('connection', (ws, req) => {
        console.log("New connection established");

        // Safely extract query parameters
        const queryString = req.url?.split('?')[1] ?? '';
        const urlParams = new URLSearchParams(queryString);
        const chatId = urlParams.get('chatId');

        if (!chatId) {
            console.error('Connection rejected: Missing chat ID');
            ws.close(4001, 'Chat ID required');
            return;
        }

        wsRoomMapping.set(ws, chatId);

        ws.on('message', (data: WebSocket.Data): void => {
            try {
                // Validate and parse message
                const rawData = data.toString();
                const message = JSON.parse(rawData) as { sender?: string; message?: string };
                
                if (!message.sender || !message.message) {
                    throw new Error('Invalid message structure');
                }

                // Persist message
                chatService.addMessage(chatId, message.sender, message.message)
                .then(() => { console.log('Message saved'); })
                .catch((error: unknown )=> { console.error('Error saving message:', error); });
                
                // Determine recipient
                (chatService.getChat(chatId))
                .then((chatInfo: ChatInfo | null) => {
                    if (!chatInfo) {
                        throw new Error('Chat room not found');
                    }
    
                    const receiverId = message.sender === chatInfo.member_1 
                        ? chatInfo.member_2 
                        : chatInfo.member_1;
    
                    if (!receiverId) {
                        throw new Error('Invalid chat configuration');
                    }
    
                    // Get recipient information

                    userService.getUser(receiverId)
                    .then((receiverInfo: UserInfo | null) => {
                        if (!receiverInfo) {
                            throw new Error('Recipient not found');
                        }
                        const receiverTokens = receiverInfo?.firebaseToken ?? [];
    
                        // Broadcast message and handle notifications
                        let recipientFound = false;
                        wss.clients.forEach(client => {
                            if (wsRoomMapping.get(client) === chatId && client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify(message));
                                if (client !== ws) {
                                    recipientFound = true;
                                }
                            }
                        });
        
                        // Send push notification if recipient offline
                        if (!recipientFound && receiverTokens.length > 0) {
                            receiverTokens.forEach(token => {
                                if(!message.message) return;
        
                                else if (token) {
                                    sendPushNotification(token, message.message, chatId);
                                }
                            });
                        }

                    })
                    
                   
                })
                .catch(error => {
                    console.error('Error fetching chat:', error);
                    return null;
                });

                
            } catch (error: unknown) {
                console.error('Message processing error:', error instanceof Error ? error.message : error);
            }
        });
    });
};

// Type-safe notification sender
function sendPushNotification(token: string, messageBody: string, chatId: string): void {
    const payload: Message = {
        notification: {
            title: "New Message",
            body: messageBody,
        },
        token,
        data: { chatId },
        android: { priority: "high" },
        apns: { headers: { "apns-priority": "10" } },
        webpush: { headers: { urgency: "high" } }
    };

    admin.messaging().send(payload)
        .then(() => {console.log("Notification delivered:")})
        .catch(error => {console.error("Notification failed:", error)});
}

export default startWSS;