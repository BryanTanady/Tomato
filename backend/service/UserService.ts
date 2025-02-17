import jwt from "jsonwebtoken";
import { UserModel } from "../model/UserModel"
import { OAuth2Client } from "google-auth-library";

const clientId = process.env.WEB_CLIENT_ID
const client = new OAuth2Client(clientId);
const JWT_SECRET = process.env.JWT_SECRET!;


export class UserService {

    async createUser(id: string, name: string) {
        try {
            const newUser = new UserModel({ _id: id, name })
            return newUser.save()
        } catch(error) {
            console.error("Error creating user:", error);
            return null
        }
    }

    async getUser(id: string) {
        try {
            return UserModel.findById(id)
        } catch(error) {
            console.error("Error getting user:", error);
            return null
        }
    }

    async signInWithGoogle(googleToken: String){
        // Verify Google token
        const ticket = await client.verifyIdToken({
            idToken: googleToken.replace('Bearer ', ''),
            audience: process.env.GOOGLE_CLIENT_ID,
        });


        const payload = ticket.getPayload();
        if (!payload || !payload.sub || !payload.name) {
            throw new Error("Invalid Google Token");
        }

        // Check if user exists, otherwise create a new one
        let user = await this.getUser(payload.sub);
        if (!user) {
            user = await this.createUser(payload.sub, payload.name);
        }

        // Generate JWT
        const jwtToken = jwt.sign({ id: payload.sub, name: payload.name }, JWT_SECRET, {
            expiresIn: "7d",
        });

        return { token: jwtToken, user };
    }

}