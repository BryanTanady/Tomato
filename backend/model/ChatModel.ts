import mongoose from "mongoose"

const Schema = mongoose.Schema;

const ChatModelSchema = new Schema({
    member_1: String,
    member_2: String
});

export const ChatModel = mongoose.model("Chat", ChatModelSchema);