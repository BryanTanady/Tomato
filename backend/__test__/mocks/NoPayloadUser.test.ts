import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import morgan from 'morgan';
import request from 'supertest';
import { UserController } from '../../controllers/UserController';
import { UserModel } from '../../model/UserModel';

import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';

// Mock the 'jsonwebtoken' module
jest.mock('jsonwebtoken', () => ({
  ...jest.requireActual('jsonwebtoken'), // Preserve the actual implementation of other functions
  verify: jest.fn().mockReturnValue({ id: "user123" }), // Mock implementation of verify
  sign: jest.fn().mockReturnValue("token"), // Mock implementation of sign
}));

// TypeScript-friendly mock setup for 'jsonwebtoken'
const mockedJwt = jwt as jest.Mocked<typeof jwt>;

// Mock the 'google-auth-library' module
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: jest.fn().mockResolvedValue({
      getPayload: jest.fn().mockReturnValue({
        email: "email",
      }),
    }),
  })),
}));

// TypeScript-friendly mock setup for 'google-auth-library'
const mockedOAuth2Client = OAuth2Client as jest.MockedClass<typeof OAuth2Client>;

// Example tests
describe('Mocked Modules', () => {
  it('should mock jwt.verify correctly', () => {
    const token = "mockToken";
    const secret = "mockSecret";

    const decoded = mockedJwt.verify(token, secret);
    expect(decoded).toEqual({ id: "user123" });
    expect(mockedJwt.verify).toHaveBeenCalledWith(token, secret);
  });

  it('should mock jwt.sign correctly', () => {
    const payload = { id: "user123" };
    const secret = "mockSecret";

    const token = mockedJwt.sign(payload, secret);
    expect(token).toBe("token");
    expect(mockedJwt.sign).toHaveBeenCalledWith(payload, secret);
  });

  it('should mock google-auth-library OAuth2Client correctly', async () => {
    const client = new mockedOAuth2Client();
    const payload = await client.verifyIdToken({ idToken: "mockToken" }).then(res => res.getPayload());

    expect(payload).toEqual({ email: "email" });
    expect(client.verifyIdToken).toHaveBeenCalledWith({ idToken: "mockToken" });
  });
});

let mongoServer = new MongoMemoryServer();

const app = express();
app.use(express.json());  
app.use(morgan('tiny')); 

const userController = new UserController();
app.post('/user-faulty/auth',  (req: Request, res: Response, next: NextFunction): void => {
    try {
        userController.handleGoogleSignIn(req, res)
        .then(() => { next(); })
        .catch((error: unknown) => { next(error); });
    } catch (error) {
        next(error);
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
  await UserModel.deleteMany({});
});

describe('Testing handleGoogleSignIn', () => {
  it('should fail to sign in to google with faulty payload', async () => {
    await request(app)
        .post(`/user-faulty/auth`)
        .send({
          googleToken: "google",
          firebaseToken: "firebase"
        })
        .expect(400)
  });
})