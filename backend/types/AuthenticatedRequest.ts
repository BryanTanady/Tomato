import { Request } from "express";
export interface AuthenticatedRequest extends Request {
    user: { id: string }; 
    params: { 
        id: string 
        message_id: string
    }; 
}

export function isAuthenticatedRequest(req: Request): req is AuthenticatedRequest {
    return "user" in req;
}
