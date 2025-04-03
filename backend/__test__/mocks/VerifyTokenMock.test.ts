import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { PostModel } from '../../model/PostModel';
import { config } from 'dotenv';
import { timingSafeEqual } from 'crypto';

config();
jest.mock('jsonwebtoken', (): {
  verify: jest.Mock<(token: string) => {id: string}>;
  sign: jest.Mock<() => string>;
} => ({
  ...jest.requireActual('jsonwebtoken'),
  verify: jest.fn().mockImplementation((token: string): {id: string} =>
    {
      const expectedToken = Buffer.from("90909090");
      const receivedToken = Buffer.from(token);
      if (receivedToken.length === expectedToken.length && 
          timingSafeEqual(receivedToken, expectedToken)) {
          return { id: "user123" };
      }
      else {
        throw new Error("Verify token error")
      }
    }), 
  sign: jest.fn().mockReturnValue("token")

  }));
 

let mongoServer = new MongoMemoryServer();
const {app} = require('../app');

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
      .post('/posts-verify') 
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
      .post('/posts-verify') 
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
      .post('/posts-verify') 
      .send(newPost)
      .set('Authorization', 'Bearer 90909790')
      .expect(400);
  
    expect(response.body.message).toBe('Invalid token.')
  });
});
