import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import morgan from 'morgan';
import request from 'supertest';
import { UserController } from '../../controllers/UserController';
import { UserModel } from '../../model/UserModel';

jest.mock('jsonwebtoken', (): {
  verify: jest.Mock<(token: string, secret: string, callback?: (err: unknown, decoded?: string | { id: string }) => void) => string | { id: string }>;
  sign: jest.Mock<(payload: object | string, secret: string) => string>;
} => {
  const actualJWT = jest.requireActual('jsonwebtoken');
  return {
    ...actualJWT, 
    verify: jest.fn().mockImplementation((token: string, secret: string, callback?: Function) => {
      if (callback) return callback(null, { id: "user123" });
      return { id: "user123" }; // Simulate a valid decoded token
    }),
    sign: jest.fn().mockReturnValue("token")
  };
});

jest.mock("google-auth-library", (): {
  OAuth2Client: jest.Mock
} => {
  return {
    OAuth2Client: jest.fn().mockImplementation((): {
      verifyIdToken: () => Promise<{ getPayload: () => { email: string } }>
    } => ({
      verifyIdToken: jest.fn().mockResolvedValue({
        getPayload: (): { email: string } => ({
          email: "email"
        })
      })
    }))
  };
});

let mongoServer = new MongoMemoryServer();

const app = express();
app.use(express.json());  
app.use(morgan('tiny')); 

const userController = new UserController();
app.post('/user-faulty/auth', (req: Request, res: Response, next: NextFunction): void => {
    try {
        userController.handleGoogleSignIn(req, res)
        .then(() => { next(); })
        .catch((err: unknown) => { next(err); });
    } catch (error) {
        next(error);
    }});  

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri as string);
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