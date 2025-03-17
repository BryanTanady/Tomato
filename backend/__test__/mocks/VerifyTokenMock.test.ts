import express, { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import morgan from 'morgan';
import { PostController } from '../../controllers/PostController';
import request from 'supertest';
import { PostModel } from '../../model/PostModel';
import { config } from 'dotenv';
import { AuthenticatedRequest } from '../../types/AuthenticatedRequest';
import { timingSafeEqual } from 'crypto';
import jwt from 'jsonwebtoken';
import { verifyToken } from '../../middleware/verifyToken';

// const {verifyToken} = require('../../middleware/verifyToken')
config();

// Mock the 'jsonwebtoken' module
jest.mock('jsonwebtoken', () => ({
  ...jest.requireActual('jsonwebtoken'), // Preserve the actual implementation of other functions
  verify: jest.fn().mockImplementation((token: string): { id: string } => {
    const expectedToken = Buffer.from("90909090");
    const receivedToken = Buffer.from(token);

    // Use timingSafeEqual for secure comparison
    if (receivedToken.length === expectedToken.length && timingSafeEqual(receivedToken, expectedToken)) {
      return { id: "user123" }; // Return mock payload for valid token
    } else {
      throw new Error("Verify token error"); // Throw error for invalid token
    }
  }),
  sign: jest.fn().mockReturnValue("token"), // Mock implementation of sign
}));

// TypeScript-friendly mock setup
const mockedJwt = jwt as jest.Mocked<typeof jwt>;

// Example tests
describe('Mocked jsonwebtoken', () => {
  it('should mock jwt.verify correctly for valid token', () => {
    const validToken = "90909090";
    const decoded = mockedJwt.verify(validToken, "mockSecret");

    expect(decoded).toEqual({ id: "user123" });
    expect(mockedJwt.verify).toHaveBeenCalledWith(validToken, "mockSecret");
  });

  it('should mock jwt.verify correctly for invalid token', () => {
    const invalidToken = "invalid";

    // Verify that an error is thrown for invalid tokens
    expect(() => mockedJwt.verify(invalidToken, "mockSecret")).toThrow("Verify token error");
    expect(mockedJwt.verify).toHaveBeenCalledWith(invalidToken, "mockSecret");
  });

  it('should mock jwt.sign correctly', () => {
    const payload = { id: "user123" };
    const secret = "mockSecret";

    const token = mockedJwt.sign(payload, secret);
    expect(token).toBe("token");
    expect(mockedJwt.sign).toHaveBeenCalledWith(payload, secret);
  });
});

let mongoServer = new MongoMemoryServer();

const app = express();
app.use(express.json());  
app.use(morgan('tiny')); 

const postController = new PostController();

app.post('/posts', verifyToken, (req: Request, res: Response, next: NextFunction): void => {
  try{
    postController.createPost(req as AuthenticatedRequest, res)
    .then(() => { next(); })
   .catch((err: unknown) => { next(err); });
  } catch(err) {
    next(err);
  }}); 

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri: string = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await PostModel.deleteMany({});
});

describe('Testing verifyToken', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('should fail to verify token if there is no token provided', async () => {
    const newPost = {
      userId: 'user123',
      latitude: 40.7128,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };
  
    const response = await request(app)
      .post('/posts') 
      .send(newPost)
      .expect(401);

    expect(response.body.message).toBe('No token provided')
  });

  it('should fail to verify token if jwt secret is not provided', async () => {
    const newPost = {
      userId: 'user123',
      latitude: 40.7128,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const old_process_env = process.env
    process.env = {}
    const response = await request(app)
      .post('/posts') 
      .send(newPost)
      .set('Authorization', 'Bearer 90909090')
      .expect(500);
  
    expect(response.body.message).toBe("Internal Server Error")
    process.env = old_process_env
  });

  it('should fail to verify token if an error occurs', async () => {
    const newPost = {
      userId: 'user123',
      latitude: 40.7128,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const response = await request(app)
      .post('/posts') 
      .send(newPost)
      .set('Authorization', 'Bearer 90909790')
      .expect(400);
  
    expect(response.body.message).toBe('Invalid token.')
  });
});
