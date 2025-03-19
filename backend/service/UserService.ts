import {sign} from "jsonwebtoken";
import { UserModel, IUser } from "../model/UserModel"
import { OAuth2Client, TokenPayload } from "google-auth-library";

export class UserService {

    /**
     * Create a new user with the given id, name and firebase token
     * @param userId
     * @param username
     * @param firebaseToken 
     * @returns A promise that resolves to the created user
     */
    async createUser(userId: string, username: string, firebaseToken: string): Promise<IUser|null> {
        try {
            const newUser: IUser = new UserModel({ 
                _id: userId, 
                username, 
                firebaseToken: [firebaseToken]
              });
            console.log("Created new user")
            return await newUser.save()
        } catch (error: unknown) {
            if (error instanceof Error) {
              console.error("Error creating user:", error.message);
            }
            return null;
          }
    }

    /**
     * Retrieve a user by its ID.
     * @param userId 
     * @returns A promise that resolves to the user.
     */
    async getUser(userId: string): Promise<IUser|null> {
        try {
            const user: IUser|null = await UserModel.findById(userId)
            if(!user){
                console.warn("USER NOT FOUND: ", userId)
                return null;
            }
            return user
        } catch(error) {
            console.error("Error getting user:", error);
            return null
        }
    }

    /**
     * Generate a JWT token for the user with the given Google token and Firebase token.
     * If the user does not exist, create a new user.
     * @param googleToken
     * @param firebaseToken 
     * @returns A promise that resolves to the JWT token and user ID
     */
    async signInWithGoogle(googleToken: string, firebaseToken: string){
        // Verify Google token
        if (!process.env.WEB_CLIENT_ID) {
            throw new Error("WEB_CLIENT_ID is not defined in environment variables");
          }
        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not defined in environment variables");
        }
        const webClientId: string = process.env.WEB_CLIENT_ID
        const jwtSecret: string = process.env.JWT_SECRET
        
        const client: OAuth2Client = new OAuth2Client(webClientId);
        
        const ticket = await client.verifyIdToken({
            idToken: googleToken.replace('Bearer ', ''),
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload() as TokenPayload;
        if (payload === undefined || !payload.sub || !payload.name) {
            throw new Error("Invalid Google Token");
        }

        // Check if user exists, otherwise create a new one
        let user: IUser|null = await this.getUser(payload.sub as string);
    
        if (!user) {
            user = await this.createUser(payload.sub as string, payload.name as string, firebaseToken);
        } else {
            if (!user.firebaseToken.includes(firebaseToken)) {
                user.firebaseToken.push(firebaseToken);
                await user.updateOne(); //TODO: Need to invalidate the token when user sign out
            }            
        } 
        
        // Generate JWT
        const jwtToken = sign({ id: payload.sub, name: payload.name }, jwtSecret, {
            expiresIn: "999d",
            algorithm: "HS256"
        });

        let userID = null
        if (user) {
            userID = user._id
        }

        return { token: jwtToken, userID };
    }

}