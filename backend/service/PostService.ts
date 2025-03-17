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
    async getPostById(id: string): Promise<Post | null> {
        try {
            return await PostModel.findById(id).exec();
        } catch(error) {
            console.error("Error to get post from ID:", error);
            return null;
        }
    }

    async createPost(post: Post): Promise<Post | null> {
        try {
            const newPost = new PostModel(post);
            await newPost.save();
            return newPost;
        } catch (error) {
            console.error("Error creating post:", error);
            return null;
        }
    }
    

    async updatePost(id: string, post: Post): Promise<Post | null> {
        try {
            await PostModel.findByIdAndUpdate(new mongoose.Types.ObjectId(id), post).exec();
            return PostModel.findById(id).exec();
        } catch (error) {
            console.error("Error updating post:", error);
            return null
        }
    }

    async deletePost(id: string): Promise<Post | null> {
        try {  
            return await PostModel.findOneAndDelete({ _id: new mongoose.Types.ObjectId(id) }).exec();
        } catch (error) {
            console.error("Error deleting post:", error);
            return null;
        }
    }

    
    /**
     * Get all posts within a region.
     * @throws Error if there are coordinates information but is incomplete.
     */
    async getPosts(
        start_lat?: number, 
        end_lat?: number, 
        start_long?: number, 
        end_long?: number, 
    ): Promise<Post[] | null> {
        
        const coordinates = [start_lat, end_lat, start_long, end_long];
        if(isMissingCoordinate(coordinates)){
            throw new MissingCoordinateException("Incomplete Coordinate Information");
        }
            

        try {
            const query: CoordinateQuery = {};
    
            // Check for start_lat and end_lat separately
            if (start_lat !== undefined) {
                query.latitude = { $gte: start_lat };  // Latitude greater than or equal to start_lat
            }
            if (end_lat !== undefined) {
                query.latitude = { ...query.latitude, $lte: end_lat };  // Latitude less than or equal to end_lat
            }
    
            // Check for start_long and end_long separately
            if (start_long !== undefined) {
                query.longitude = { $gte: start_long };  // Longitude greater than or equal to start_long
            }
            if (end_long !== undefined) {
                query.longitude = { ...query.longitude, $lte: end_long };  // Longitude less than or equal to end_long
            }
    
            // Return the posts based on the constructed 
            return await PostModel.find(query).exec();
        } catch (error) {
            console.error("Error getting posts", error);
            return null;
        }
    }    

    /**
     * Get all public posts within certain region.
     */
    async getPublicPost(
        start_lat?: number, 
        end_lat?: number, 
        start_long?: number, 
        end_long?: number, 
    ): Promise<Post[] | null> {
        try{
            const posts = await this.getPosts(start_lat, end_lat, start_long, end_long);

            //filter to remove all private posts
            const publicPosts = posts?.filter(post => !post.isPrivate);
            if (publicPosts === undefined) {
                return null;
            }
            return publicPosts;
        } catch(err){
            console.error("Error getting posts", err);
            return null;
        }
    }


    /**
     * If userPostOnly is true, get all posts belonging to the user within the given region.
     * If it's false, get all posts that are viewable to the user in that region.
     *
     * Note: If all coordinate informations are null, return all posts.
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
        
        const userPost = await PostModel.find({userId}).exec();

        try{
            if(userPostOnly){
                return userPost;
            }
            else{
                const publicPost = await this.getPublicPost(start_lat, end_lat, start_long, end_long) ?? [];

                const combinedPosts = [...userPost, ...publicPost];

                // Use a Set to remove duplicates based on a unique identifier (e.g., post ID)
                const uniquePosts = Array.from(new Set(combinedPosts.map(post => post?._id.toString()))) // Use post._id to uniquely identify posts
                .map(id => combinedPosts.find(post => post?._id.toString() === id ));

                return uniquePosts.filter(post => post != null);
            }
        }
        catch (error) {
            console.error("Error getting posts", error);
            return null;
        }
    }

    async getEveryPost(): Promise<Post[] | null> {
        try {
            return await PostModel.find({}).exec();
        } catch(error) {
            console.error("Error getting all posts", error);
            return null;
        }
    }

    async getPostsAtLocation(lat: number, long: number): Promise<Post[] | null> {
        try {
            return await PostModel.find({$and:[{latitude: lat}, {longitude: long}]}).exec();
        } catch(error) {
            console.error("Error getting all posts at the location", error);
            return null;
        }
    }
}


/**
 * Check if coordinate information is missing
 */
function isMissingCoordinate(coordinates: (number|undefined)[]){
    const nonNullCoordCount = coordinates.filter(c => c !== null && c !== undefined).length;
    if(nonNullCoordCount > 0 && nonNullCoordCount < 4){
        return true;
    }
    else{
        return false;
    }
}


