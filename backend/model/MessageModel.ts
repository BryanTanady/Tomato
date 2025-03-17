import mongoose, { Document, Schema } from "mongoose";

export interface IMessage extends Document {
  chatroom_id: string;
  sender: string;
  message: string;
}

const MessageModelSchema: Schema = new Schema({
  chatroom_id: { type: String, required: true },
  sender: { type: String, required: true },
  message: { type: String, required: true }
});

export const MessageModel = mongoose.model<IMessage>("Message", MessageModelSchema);
