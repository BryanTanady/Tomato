import { UserService } from "../service/UserService";
import { Request, Response } from "express";


export class UserController {
    private userService: UserService;

    constructor() {
        this.userService = new UserService();
        this.handleGoogleSignIn = this.handleGoogleSignIn.bind(this);
        this.getUser = this.getUser.bind(this)
    }

    async getUser(req: Request, res: Response): Promise<void> { 
        const userId = req.params.id
        res.status(200).json(await this.userService.getUser(userId));
    }

    async handleGoogleSignIn(req: Request, res: Response): Promise<void> { 
        try{
            const { googleToken, firebaseToken } = req.body;
            
            if(!googleToken || !firebaseToken) {
                res.status(400).json({message: "No Token provided"});
                return
            }

            const result = await this.userService.signInWithGoogle(googleToken as string, firebaseToken as string); //TODO: Not just google now, need better naming
            res.status(200).json(result)
            return

        }
        catch(err){
            console.error("ERROR: ", err)
            res.status(400).json({message: err})
            return
        }
    }

}