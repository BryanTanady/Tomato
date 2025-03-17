import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import morgan from 'morgan';
import request from 'supertest';
import { UserController } from '../../controllers/UserController';
import { UserModel } from '../../model/UserModel';
import { UserService } from '../../service/UserService';

let mongoServer = new MongoMemoryServer();

const app = express();
app.use(express.json());  
app.use(morgan('tiny')); 

const userController = new UserController();
const userService = new UserService();

app.post('/user/auth',  (req: Request, res: Response, next: NextFunction): void => {
    try {
        userController.handleGoogleSignIn(req, res)
        .then(() => { next(); })
       .catch((err: unknown) => { next(err); });
    } catch (error) {
        next(error);
    }}); 

app.get('/user/:id',  (req: Request, res: Response, next: NextFunction): void => {
  try {
      userController.getUser(req, res)
      .then(() => { next(); })
     .catch((err: unknown) => { next(err); });
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

describe('Testing getUser', () => {
  it('should get a user from id', async () => {
    const newUser = {
      _id: "1234",
      username: "user123",
      firebaseToken: "user12345"
    };

    await userService.createUser(newUser._id, newUser.username, newUser.firebaseToken)

    const response = await request(app)
        .get(`/user/${newUser._id}`)
        .expect(200)

    expect(response.body).toHaveProperty('_id');
    expect(response.body._id).toBe(newUser._id);
    expect(response.body.username).toBe(newUser.username);
    expect(response.body.firebaseToken).toStrictEqual([newUser.firebaseToken]);
  });

  it('tries to get a non-existant user', async () => {
    const newUser = {
      _id: "1234",
      username: "user123",
      firebaseToken: "user12345"
    };

    await userService.createUser(newUser._id, newUser.username, newUser.firebaseToken)
    const response = await request(app)
        .get(`/user/4321`)
        .expect(200)

    expect(response.body).toBeNull()
  });
})

describe('Testing handleGoogleSignIn', () => {
  it('should fail to sign in a user with improper credentials', async () => {
    const response = await request(app)
        .post(`/user/auth`)
        .send({
          irrelevant: "something useless"
        })
        .expect(400)

    expect(response.body.message).toBe("No Token provided")
  });
})