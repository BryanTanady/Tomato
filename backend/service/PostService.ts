import mongoose from "mongoose";
import { PostModel, Post } from "../model/PostModel";
import MissingCoordinateException from "../errors/customError";

export interface ImageData{
    fileData: Buffer,
    fileType: string,
}

interface CoordinateQuery {
    latitude?: {
      $gte?: number;
      $lte?: number;
    };
    longitude?: {
      $gte?: number;
      $lte?: number;
    };
  }

export class PostService {

    /**
     * Retrieve a post by its ID.
     * @param postId 
     * @returns A promise that resolves to the post.
     */
    async getPostById(postId: string): Promise<Post | null> {
        try {
            return await PostModel.findById(postId).exec();
        } catch(error) {
            console.error("Error getting post with ID ");
            return null;
        }
    }

    /**
     * Create a new post.
     * @param post
     * @returns A promise that resolves to the created post.
     */
    async createPost(post: Post){
        try {
            const newPost: mongoose.Document = new PostModel(post);
            return await newPost.save();
        } catch (error) {
            console.error("Error creating post");
            return null;
        }
    }
    
    /**
     * Update a post by its ID to the new post information.
     * @param existingPostId 
     * @param newPost 
     * @returns A promise that resolves to the updated post.
     */
    async updatePost(existingPostId: string, newPost: Post): Promise<Post | null> {
        try {
            await PostModel.findByIdAndUpdate(new mongoose.Types.ObjectId(existingPostId), newPost).exec();
            return PostModel.findById(existingPostId).exec();
        } catch (error) {
            console.error("Error updating post:", error);
            return null
        }
    }

    /**
     * Delete a post by its ID.
     * @param postId
     * @returns A promise that resolves to the deleted post.
     */
    async deletePost(postId: string): Promise<Post | null> {
        try {  
            return await PostModel.findOneAndDelete({ _id: new mongoose.Types.ObjectId(postId) }).exec();
        } catch (error) {
            console.error("Error deleting post:", error);
            return null;
        }
    }

    
   /**
    * Retrieve all posts within a certain region.
    * @param start_lat: Latitude of the starting point (top left) of the region
    * @param end_lat: Latitude of the ending point (bottom right) of the region
    * @param start_long: Longitude of the starting point (top left) of the region
    * @param end_long: Longitude of the ending point (bottom right) of the region
    * @returns A promise that resolves to an array of posts.
    */
    async getPosts(
        start_lat?: number, 
        end_lat?: number, 
        start_long?: number, 
        end_long?: number, 
    ): Promise<Post[]> {
        
        const coordinates = [start_lat, end_lat, start_long, end_long];
        if(isMissingCoordinate(coordinates)){
            throw new MissingCoordinateException("Incomplete Coordinate Information");
        }
            
        const query: CoordinateQuery = {};

        // Check for start_long and end_long separately
        if (start_long !== undefined) {
            query.longitude = { $gte: start_long };  // Longitude greater than or equal to start_long
        }
        if (end_long !== undefined) {
            query.longitude = { ...query.longitude, $lte: end_long };  // Longitude less than or equal to end_long
        }

        // Return the posts based on the constructed 
        return await PostModel.find(query).exec();
    
    }    

   /**
    * Get all public posts within certain region.
    * @param start_lat: Latitude of the starting point (top left) of the region
    * @param end_lat: Latitude of the ending point (bottom right) of the region
    * @param start_long: Longitude of the starting point (top left) of the region
    * @param end_long: Longitude of the ending point (bottom right) of the region
    * @returns A promise that resolves to an array of posts.
    */
    async getPublicPost(
        start_lat?: number, 
        end_lat?: number, 
        start_long?: number, 
        end_long?: number, 
    ): Promise<Post[] | null> {
        
        try{
            const posts = await this.getPosts(start_lat, end_lat, start_long, end_long)

            //filter to remove all private posts
            const publicPosts = posts.filter(post => !post.isPrivate)
            return publicPosts
        } catch(err){
            if (err instanceof MissingCoordinateException) {
                throw new MissingCoordinateException("Incomplete Coordinate Information");
            } else {
                console.error("Error getting posts", err);
                return null;
            }
        }
    }


    /**
     * Retrieve posts accessible to a user within a certain region.
     * @param userId 
     * @param userPostOnly: If true, only return posts belonging to the user. If false, return all posts viewable to the user.
     * @param start_lat: Latitude of the starting point (top left) of the region
     * @param end_lat: Latitude of the ending point (bottom right) of the region
     * @param start_long: Longitude of the starting point (top left) of the region
     * @param end_long : Longitude of the ending point (bottom right) of the region
     * @returns A promise that resolves to an array of posts.
     * @throws MissingCoordinateException if coordiante information is incomplete (some are non-null)
     */
    async getUserPost(
        userId: string,
        userPostOnly: boolean,
        start_lat?: number, 
        end_lat?: number, 
        start_long?: number, 
        end_long?: number, 
    ): Promise<Post[] | null> {
        

        try{
            const userPost = await PostModel.find({userId})
            if(userPostOnly){
                return userPost
            }
            else{
                const publicPost = await this.getPublicPost(start_lat, end_lat, start_long, end_long) ?? [];

                const combinedPosts = [...userPost, ...publicPost]

                // Use a Set to remove duplicates based on a unique identifier (e.g., post ID)
                const uniquePosts = Array.from(new Set(combinedPosts.map(post => post._id.toString()))) // Use post._id to uniquely identify posts
                .map(id => combinedPosts.find(post => post._id.toString() === id )) as Post[];
                return uniquePosts
            }
        }
        catch (error) {
            if (error instanceof MissingCoordinateException) {
                throw new MissingCoordinateException("Incomplete Coordinate Information");
            } else {
                console.error("Error getting posts", error);
                return null;
            }
        }
   
    }
    
    /**
     * Retrieve all posts.
     * @returns A promise that resolves to an array of posts.
     */
    async getEveryPost(): Promise<Post[] | null> {
        try {
            return await PostModel.find({}).exec();
        } catch(error) {
            console.error("Error getting all posts", error);
            return null;
        }
    }

    /**
     * Retrieve all posts at a location.
     * @param latitude 
     * @param long 
     * @param private_post: If true, return all private posts at the location.
     * If false, return all public posts at the location.
     * @returns A promise that resolves to an array of posts.
     */
    async getPostsAtLocation(latitude: number, long: number, private_post: boolean) {
        try {
            if (!private_post)
                return await PostModel.find({$and:[{latitude}, {longitude: long}, {isPrivate: false}]})
            else
                return await PostModel.find({$and:[{latitude}, {longitude: long}]})
        } catch(error) {
            console.log("Error getting all posts at the location")
            return null
        }
    }
}


/**
 * Check if coordinate information is missing
 * @param coordinates: An array of 4 coordinates (latitude and longitude of the starting and ending points)
 * @returns true if some coordinates are missing, false otherwise
 */
function isMissingCoordinate(coordinates: (number|undefined)[]){
    const nonNullCoordCount = coordinates.filter(c => c !== undefined).length;
    if(nonNullCoordCount > 0 && nonNullCoordCount < 4){
        return true;
    }
    else{
        return false;
    }
}


