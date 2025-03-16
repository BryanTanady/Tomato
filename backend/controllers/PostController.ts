import { PostService } from "../service/PostService";
import { Request, Response } from "express";
import MissingCoordinateException from "../errors/customError";
import { PostModel, Post } from "../model/PostModel";
import { isAuthenticatedRequest } from "../types/AuthenticatedRequest";

interface ImageData {
    fileData: Buffer;
    fileType: string;
}

/*Raw representation of post, where images are array of base64 strings */
interface RawPost extends Omit<Post, 'images'> {
    images: string[];
}

export class PostController {
    private postService: PostService;

    constructor() {
        this.postService = new PostService();
    }

    createPost = async (req: Request, res: Response) => {
        if (!isAuthenticatedRequest(req)) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        const rawPost = req.body as RawPost;
        rawPost.userId = req.user.id;
        const images = (rawPost.images).map((str: string): ImageData => ({
            fileData: Buffer.from(str, 'base64'),
            fileType: 'image/jpeg'
        }));

        const post: Post = {
            ...rawPost,
            images
        }

        res.json(await this.postService.createPost(post))
    }

    getPublicPost = async (req: Request, res: Response): Promise<void> => {
        try {
            const { parsedStartLat, parsedEndLat, parsedStartLong, parsedEndLong } = parseLocationParam(req)

            // Call service with the query params
            res.json(await this.postService.getPublicPost(
                parsedStartLat,
                parsedEndLat,
                parsedStartLong,
                parsedEndLong,
            ));
        }
        catch (error) {
            if (error instanceof MissingCoordinateException) {
                console.error("User Provided Invalid coordinate: ", error)
                res.status(400).json({ message: "Incomplete coordinate" });
            }
        }
    };


    getAuthenticatedUserPost = async (req: Request, res: Response) => {
        if (!isAuthenticatedRequest(req)) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        try {
            const { userPostOnly, start_lat, end_lat, start_long, end_long } = req.query;

            // Parse the coordinates if present
            const parsedStartLat = start_lat ? parseFloat(start_lat as string) : undefined;
            const parsedEndLat = end_lat ? parseFloat(end_lat as string) : undefined;
            const parsedStartLong = start_long ? parseFloat(start_long as string) : undefined;
            const parsedEndLong = end_long ? parseFloat(end_long as string) : undefined;

            const parsedUserPostOnly = userPostOnly == "true"

            const userId = req.user.id
            res.json(await this.postService.getUserPost(userId, parsedUserPostOnly, parsedStartLat,
                parsedEndLat, parsedStartLong,
                parsedEndLong))
            return
        }

        catch(err){
            if(err instanceof MissingCoordinateException){
                console.log("User Provided Invalid coordinate: ", err)
                res.status(400).json({ message: "Incomplete coordinate" });
                return
            }
        }


    }

    getPostById = async (req: Request, res: Response) => {
        const postId = req.params.id
        const [postData] = await Promise.all([
            this.postService.getPostById(postId)
        ]);

        res.json({ postData });
    }

    updatePost = async (req: Request, res: Response): Promise<void> => {
        if (!isAuthenticatedRequest(req)) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        const postId = req.params.id
        const updatedPost = req.body as Post
        updatedPost.userId = req.user.id
        res.json(await this.postService.updatePost(postId, updatedPost))
    }

    deletePost = async (req: Request, res: Response): Promise<void> => {
        if (!isAuthenticatedRequest(req)) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        const postId = req.params.id

        // Ensure that the post really belongs to the user
        const userId = req.user.id
        const post = await PostModel.findById(postId)
        if (!post) {
            res.status(404).send({message: "Post not found"})
        } else {
            if(post.userId !== userId){
                res.status(401).send({message: "Unauthorized"})
            }
            else{
                res.json(await this.postService.deletePost(postId))
           }
        }
    }
}

/**
 * Parse the longitude and latitude information of a request param
 */
function parseLocationParam(req: Request) {
    const { start_lat, end_lat, start_long, end_long } = req.query;

    // Parse the coordinates if present
    const parsedStartLat = start_lat ? parseFloat(start_lat as string) : undefined;
    const parsedEndLat = end_lat ? parseFloat(end_lat as string) : undefined;
    const parsedStartLong = start_long ? parseFloat(start_long as string) : undefined;
    const parsedEndLong = end_long ? parseFloat(end_long as string) : undefined;

    return {
        parsedStartLat,
        parsedEndLat,
        parsedStartLong,
        parsedEndLong,
    }

}