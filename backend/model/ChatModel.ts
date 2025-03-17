import mongoose, { Document, Schema } from "mongoose";

export interface IChat extends Document {
  member_1: string;
  member_2: string;
}

const ChatModelSchema: Schema = new Schema({
  member_1: { type: String, required: true },
  member_2: { type: String, required: true }
});

export const ChatModel = mongoose.model<IChat>("Chat", ChatModelSchema);
