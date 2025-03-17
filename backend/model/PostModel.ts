import mongoose, { Model } from "mongoose";

// Define the Post interface
export interface Post extends mongoose.Document {
    _id: string;
    latitude: number;
    longitude: number;
    userId: string;
    images: { fileData: Buffer; fileType: string }[];
    date: Date;
    note: string;
    isPrivate: boolean;
}

// Define the schema with the Post type
const PostModelSchema = new mongoose.Schema<Post>({
    latitude: Number,
    longitude: Number,
    userId: String,
    images: [{ fileData: Buffer, fileType: String }],
    date: Date,
    note: String,
    isPrivate: Boolean
});

// Export the typed model
export const PostModel: Model<Post> = mongoose.model<Post>("Post", PostModelSchema);