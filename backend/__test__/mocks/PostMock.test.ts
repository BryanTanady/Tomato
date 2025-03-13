import express, { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import morgan from 'morgan';
import { PostController } from '../../controllers/PostController';
import request from 'supertest';
import { PostModel } from '../../model/PostModel';
import { config } from 'dotenv';
import { PostService } from '../../service/PostService';

const {verifyToken} = require('../../middleware/verifyToken')
config();
jest.mock('jsonwebtoken', () => ({
  ...jest.requireActual('jsonwebtoken'), // import and retain the original functionalities
  verify: jest.fn().mockImplementation((token, secret, algorithm) =>
    {
      if (token == "90909090") {
        return {id: "user123"}
      }
      else {
        return {id: "other"}
      }
    }), // overwrite verify
  sign: jest.fn().mockReturnValue("token")
  }));
// Setup MongoDB in-memory server
let mongoServer = new MongoMemoryServer();
// Create the Express app
const app = express();
app.use(express.json());  // Middleware to parse JSON bodies
app.use(morgan('tiny')); // Logger

// Define your routes
const postController = new PostController();
const postService = new PostService();
app.get('/posts-authenticated', verifyToken, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
      await postController.getAuthenticatedUserPost(req, res, next);
  } catch (error) {
      next(error);
  }
}); 

// createPost routes for testing 
app.post('/posts', verifyToken, postController.createPost); 


app.get('/posts/:id', postController.getPostById);  // Route for getting a post by ID
app.put('/posts/:id', verifyToken, postController.updatePost);  // Route for updating a post
app.delete('/posts/:id', verifyToken, postController.deletePost);  // Route for deleting a post
app.get('/posts',  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
      await postController.getPublicPost(req, res, next);
  } catch (error) {
      next(error);
  }
});  // Route for deleting a post
 // Route for deleting a post

// Setup for in-memory MongoDB testing
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clean up any existing posts in the database before each test
  await PostModel.deleteMany({});
});

// Unit Tests using Supertest
/**
 * @jest-environment jsdom
 */
describe('Mocked Posts API: Erroneus Behaviour', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('should fail to create a post if an error occurs', async () => {
    let spy = await jest.spyOn(PostModel.prototype, "save").mockImplementation(() => {
      throw new Error("Database Error 1")
    })
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
      .post('/posts') // Testing the protected /posts route
      .send(newPost) // Send the post body directly
      .set('Authorization', 'Bearer 90909090')
      .expect(200);
  
    expect(response.body).toBeNull()
    await spy.mockClear()
  });

  it('should fail to get a post by ID if error occurs', async () => {
    let spy = await jest.spyOn(PostModel, "findById").mockImplementation(() => {
      throw new Error("Database Error 2")
    })
    const newPost = {
      userId: 'user123',
      latitude: 40.7128,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const createdPost = await request(app)
      .post('/posts')
      .send(newPost)
      .set('Authorization', 'Bearer 90909090')
      .expect(200);

    const response = await request(app)
      .get(`/posts/${createdPost.body._id}`) // Test fetching a post by ID
      .expect(200);

    expect(response.body.postData).toBeNull()
    spy.mockClear()
  });

  it('should fail to get authenticated posts if error occurs', async () => {
    let spy = await jest.spyOn(PostModel, "find").mockImplementation(() => {
      throw new Error("Database Error 3")
    })
    const newPost = {
      userId: 'user123',
      latitude: 40.7128,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };
  
    const newPost2 = {
      userId: 'user123',
      latitude: 40.7180,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };
  
    const createdPost = await request(app)
      .post('/posts')
      .send(newPost)
      .set('Authorization', 'Bearer 90909090')
      .expect(200);
      
    const anotherPost = await request(app)
      .post('/posts')
      .send(newPost2)
      .set('Authorization', 'Bearer 90909090')
      .expect(200);

    const response = await request(app)
      .get(`/posts-authenticated`) // Test fetching a post by ID
      .set('Authorization', 'Bearer 90909090')
      .query({
        userPostOnly: true,
        start_lat: 40.0,
        end_lat: 41.0,
        start_long: -75.0,
        end_long: -74.0
      })
      .expect(200);
  
    expect(response.body).toBeNull()
    await spy.mockClear()
  });

  it('should fail to get every post if error occurs', async () => {
    let spy = await jest.spyOn(PostModel, "find").mockImplementation(() => {
      throw new Error("Database Error 7")
    })
    const newPost = {
      userId: 'user123',
      latitude: 40.7128,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };
  
    const newPost2 = {
      userId: 'user123',
      latitude: 40.7180,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };
  
    const createdPost = await request(app)
      .post('/posts')
      .send(newPost)
      .set('Authorization', 'Bearer 90909090')
      .expect(200);
      
    const anotherPost = await request(app)
      .post('/posts')
      .send(newPost2)
      .set('Authorization', 'Bearer 90909090')
      .expect(200);

    const response = await postService.getEveryPost();
  
    expect(response).toBeNull()
    await spy.mockClear()
  });

  it('should fail to get post at location if error occurs', async () => {
    let spy = await jest.spyOn(PostModel, "find").mockImplementation(() => {
      throw new Error("Database Error 8")
    })
    const newPost = {
      userId: 'user123',
      latitude: 40.7128,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };
  
    const newPost2 = {
      userId: 'user123',
      latitude: 40.7180,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };
  
    const createdPost = await request(app)
      .post('/posts')
      .send(newPost)
      .set('Authorization', 'Bearer 90909090')
      .expect(200);
      
    const anotherPost = await request(app)
      .post('/posts')
      .send(newPost2)
      .set('Authorization', 'Bearer 90909090')
      .expect(200);

    const response = await postService.getPostsAtLocation(40.7128, -74.0060, true);
  
    expect(response).toBeNull()
    await spy.mockClear()
  });

  it('should fail to get all posts if error occurs', async () => {
    let spy = await jest.spyOn(PostService.prototype, "getPosts").mockImplementation(() => {
      throw new Error("Database Error 9");
    })
    const newPost = {
      userId: 'user123',
      latitude: 40.7128,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };
      
    const newPost2 = {
      userId: 'user123',
      latitude: 40.7180,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost3 = {
      userId: 'other',
      latitude: 40.7128,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };
      
    const createdPost = await request(app)
      .post('/posts')
      .send(newPost)
      .set('Authorization', 'Bearer 90909090')
      .expect(200);
          
    const anotherPost = await request(app)
      .post('/posts')
      .send(newPost2)
      .set('Authorization', 'Bearer 90909090')
      .expect(200);

    const otherPost = await request(app)
      .post('/posts')
      .send(newPost3)
      .set('Authorization', 'Bearer 90909080')
      .expect(200);
      
    const response = await request(app)
      .get(`/posts-authenticated`) // Test fetching a post by ID
      .set('Authorization', 'Bearer 90909090')
      .query({
        userPostOnly: false
      })
      .expect(200);
      
    expect(response.body[0]).toHaveProperty('_id');
    expect(response.body[0].latitude).toBe(newPost.latitude);
    expect(response.body[1].latitude).toBe(newPost2.latitude);
    expect(response.body.length).toEqual(2);
    await spy.mockClear()
  });

  it('should fail to get public posts in range if error occurs', async () => {
    let spy = await jest.spyOn(PostModel, "find").mockImplementation(() => {
      throw new Error("Database Error 4")
    })
    const newPost = {
      userId: 'user123',
      latitude: 40.7128,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };
  
    const newPost2 = {
      userId: 'user123',
      latitude: 40.7180,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };
  
    const createdPost = await request(app)
      .post('/posts')
      .send(newPost)
      .set('Authorization', 'Bearer 90909090')
      .expect(200);
      
    const anotherPost = await request(app)
      .post('/posts')
      .send(newPost2)
      .set('Authorization', 'Bearer 90909090')
      .expect(200);
  
    const response = await request(app)
      .get(`/posts`) // Test fetching a post by ID
      .query({
        start_lat: 40.0,
        end_lat: 41.0,
        start_long: -75.0,
        end_long: -74.0
      })
      .expect(200);
  
    expect(response.body).toBeNull()
    await spy.mockClear()
  });

  it('should fail to update a post if error occurs', async () => {
    let spy = await jest.spyOn(PostModel, "findByIdAndUpdate").mockImplementation(() => {
      throw new Error("Database Error 5")
    })
    const newPost = {
      userId: 'user123',
      latitude: 40.7128,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const createdPost = await request(app)
      .post('/posts')
      .send(newPost)
      .set('Authorization', 'Bearer 90909090')
      .expect(200);

    const updatedPost = { ...createdPost.body, note: 'Updated note' };

    const response = await request(app)
      .put(`/posts/${createdPost.body._id}`)
      .send(updatedPost)
      .set('Authorization', 'Bearer 90909090')
      .expect(200);

    expect(response.body).toBeNull();
    await spy.mockClear()
  });
  it('should fail to delete a post if error occurs', async () => {
    let spy = await jest.spyOn(PostModel, "findOneAndDelete").mockImplementation(() => {
      throw new Error("Database Error 6")
    })
    const newPost = {
      userId: 'user123',
      latitude: 40.7128,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };
  
    const createdPost = await request(app)
      .post('/posts')
      .send(newPost)
      .set('Authorization', 'Bearer 90909090')
      .expect(200);
  
    const response = await request(app)
      .delete(`/posts/${createdPost.body._id}`)
      .set('Authorization', 'Bearer 90909090')
      .expect(200);
        
    expect(response.body).toBeNull()
    await spy.mockClear()
  });
});
