import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import morgan from 'morgan';
import request from 'supertest';
import { UserController } from '../../controllers/UserController';
import { UserModel } from '../../model/UserModel';

jest.mock('jsonwebtoken', () => ({
...jest.requireActual('jsonwebtoken'), 
verify: jest.fn().mockReturnValue({id: "user123"}), 
sign: jest.fn().mockReturnValue("token")
}));
jest.mock("google-auth-library", () => {
  return {
      OAuth2Client: jest.fn().mockImplementation(() => ({
          verifyIdToken: jest.fn().mockResolvedValue({
              getPayload: () => ({
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