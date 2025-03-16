import express, { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import morgan from 'morgan';
import { PostController } from '../../controllers/PostController';
import request from 'supertest';
import { PostModel } from '../../model/PostModel';
import { AuthenticatedRequest } from '../../types/AuthenticatedRequest';
let mongoServer = new MongoMemoryServer();

const app = express();
app.use(express.json());  
app.use(morgan('tiny')); 

const postController = new PostController();
app.get('/posts-authenticated', (req : Request, res : Response, next : NextFunction) => {
  (req as any).user = { id: 'user123' }; 
  next();
}, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
      await postController.getAuthenticatedUserPost(req as AuthenticatedRequest, res);
  } catch (error) {
      next(error);
  }
}); 
app.get('/posts-authenticated-not', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
      await postController.getAuthenticatedUserPost(req as AuthenticatedRequest, res);
  } catch (error) {
      next(error);
  }
}); 

app.post('/posts', (req, res, next) => {
  (req as any).user = { id: 'user123' };
  next();
}, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try{
    await postController.createPost(req as AuthenticatedRequest, res);
  } catch(err) {
    next(err);
  }});
app.post('/posts-not-authenticated', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try{
    await postController.createPost(req as AuthenticatedRequest, res);
  } catch(err) {
    next(err);
  }});
app.post('/posts-from-other', (req, res, next) => {
  (req as AuthenticatedRequest).user = { id: 'other' };
  next();
}, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try{
    await postController.createPost(req as AuthenticatedRequest, res);
  } catch(err) {
    next(err);
  }}); 

app.get('/posts/:id', postController.getPostById);  
app.put('/posts/:id', (req, res, next) => {
  (req as any).user = { id: 'user123' }; 
  next();
}, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try{
    await postController.updatePost(req as AuthenticatedRequest, res);
  } catch(err) {
    next(err);
  }});  
app.put('/posts-not-auth/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try{
    await postController.updatePost(req as AuthenticatedRequest, res);
  } catch(err) {
    next(err);
  }});    
app.delete('/posts/:id', (req, res, next) => {
  (req as any).user = { id: 'user123' }; 
  next();
}, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try{
    await postController.deletePost(req as AuthenticatedRequest, res);
  } catch(err) {
    next(err);
  }});
app.delete('/posts-not-auth/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try{
    await postController.deletePost(req as AuthenticatedRequest, res);
  } catch(err) {
    next(err);
  }});  
app.get('/posts',  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
      await postController.getPublicPost(req, res);
  } catch (error) {
      next(error);
  }
});  
 


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

describe('Testing createPost', () => {
  it('should create a post', async () => {
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
      .expect(200);

    expect(response.body).toHaveProperty('_id');
    expect(response.body.userId).toBe(newPost.userId); 
    expect(response.body.note).toBe(newPost.note); 
  });

  it('should fail to create a post if unauthorized', async () => {
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
      .post('/posts-not-authenticated') 
      .send(newPost) 
      .expect(401);

    expect(response.body.message).toBe("Unauthorized")
  });
})

describe('Testing getPostById', () => {
  it('should get a post by ID', async () => {
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
      .expect(200);

    const response = await request(app)
      .get(`/posts/${createdPost.body._id}`)
      .expect(200);

    expect(response.body.postData).toHaveProperty('_id');
    expect(response.body.postData.userId).toBe(newPost.userId);
  });
})

describe('Testing getUserPosts', () => {
  it('should get all authenticated posts, userpostonly = true', async () => {
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
      latitude: 40.90,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost4 = {
      userId: 'other',
      latitude: 40.7180,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };

    await request(app)
      .post('/posts')
      .send(newPost)
      .expect(200);
    
    await request(app)
      .post('/posts')
      .send(newPost2)
      .expect(200);

    await request(app)
      .post('/posts-from-other')
      .send(newPost3)
      .expect(200);

    await request(app)
      .post('/posts-from-other')
      .send(newPost4)
      .expect(200);

    const response = await request(app)
      .get(`/posts-authenticated`) 
      .query({
        userPostOnly: true
      })
      .expect(200);

    expect(response.body[0]).toHaveProperty('_id');
    expect(response.body[0].latitude).toBe(newPost.latitude);
    expect(response.body[1].latitude).toBe(newPost2.latitude);
    expect(response.body.length).toEqual(2);
  });

  it('should get authenticated posts in range, userpostonly = true', async () => {
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
      latitude: 40.90,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost4 = {
      userId: 'other',
      latitude: 40.7180,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };

    await request(app)
      .post('/posts')
      .send(newPost)
      .expect(200);
    
    await request(app)
      .post('/posts')
      .send(newPost2)
      .expect(200);

    await request(app)
      .post('/posts-from-other')
      .send(newPost3)
      .expect(200);

    await request(app)
      .post('/posts-from-other')
      .send(newPost4)
      .expect(200);

    const response = await request(app)
      .get(`/posts-authenticated`) 
      .query({
        userPostOnly: true,
        start_lat: 40.0,
        end_lat: 41.0,
        start_long: -75.0,
        end_long: -74.0
      })
      .expect(200);

    expect(response.body[0]).toHaveProperty('_id');
    expect(response.body[0].latitude).toBe(newPost.latitude);
    expect(response.body[1].latitude).toBe(newPost2.latitude);
    expect(response.body.length).toEqual(2);
  });

  it('should get authenticated posts in range, userpostonly = false', async () => {
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
      latitude: 40.90,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost4 = {
      userId: 'other',
      latitude: 40.7180,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };

    const createdPost = await request(app)
      .post('/posts')
      .send(newPost)
      .expect(200);
    
    const anotherPost = await request(app)
      .post('/posts')
      .send(newPost2)
      .expect(200);

    const thirdpost = await request(app)
      .post('/posts-from-other')
      .send(newPost3)
      .expect(200);

    const fourth = await request(app)
      .post('/posts-from-other')
      .send(newPost4)
      .expect(200);

    const response = await request(app)
      .get(`/posts-authenticated`) 
      .query({
        userPostOnly: false,
        start_lat: 40.0,
        end_lat: 41.0,
        start_long: -75.0,
        end_long: -74.0
      })
      .expect(200);

    expect(response.body[0]).toHaveProperty('_id');
    expect(response.body[0].latitude).toBe(newPost.latitude);
    expect(response.body[1].latitude).toBe(newPost2.latitude);
    expect(response.body[2].latitude).toBe(newPost3.latitude);
    expect(response.body.length).toEqual(3);
  });
})

describe('Testing getPublicPosts', () => {
  it('should get public posts in range', async () => {
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
      .expect(200);
    
    const anotherPost = await request(app)
      .post('/posts')
      .send(newPost2)
      .expect(200);

    const response = await request(app)
      .get(`/posts`) 
      .query({
        start_lat: 40.0,
        end_lat: 41.0,
        start_long: -75.0,
        end_long: -74.0
      })
      .expect(200);

    expect(response.body[0]).toHaveProperty('_id');
    expect(response.body[0].latitude).toBe(newPost2.latitude);
    expect(response.body.length).toStrictEqual(1)
  });

  it('should get all public posts', async () => {
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
      .expect(200);
    
    const anotherPost = await request(app)
      .post('/posts')
      .send(newPost2)
      .expect(200);

    const response = await request(app)
      .get(`/posts`) 
      .expect(200);

    expect(response.body[0]).toHaveProperty('_id');
    expect(response.body[0].latitude).toBe(newPost2.latitude);
    expect(response.body.length).toStrictEqual(1)
  });

  it('should fail to get posts with no coordinates', async () => {
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
      .expect(200);
    
    const anotherPost = await request(app)
      .post('/posts')
      .send(newPost2)
      .expect(200);

    const response = await request(app)
      .get(`/posts`) 
      .query({
        start_lat: 8
      })
      .expect(400);
  });
})

describe('Testing updatePost', () => {
  it('should update a post', async () => {
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
      .expect(200);

    const updatedPost = { ...createdPost.body, note: 'Updated note' };

    const response = await request(app)
      .put(`/posts/${createdPost.body._id}`)
      .send(updatedPost)
      .expect(200);

    expect(response.body.note).toBe('Updated note');
  });

  it('should fail to get authenticated posts because of incorrect coordinates', async () => {
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
      latitude: 40.90,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost4 = {
      userId: 'other',
      latitude: 40.7180,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };

    const createdPost = await request(app)
      .post('/posts')
      .send(newPost)
      .expect(200);
    
    const anotherPost = await request(app)
      .post('/posts')
      .send(newPost2)
      .expect(200);

    const thirdpost = await request(app)
      .post('/posts-from-other')
      .send(newPost3)
      .expect(200);

    const fourth = await request(app)
      .post('/posts-from-other')
      .send(newPost4)
      .expect(200);

    const response = await request(app)
      .get(`/posts-authenticated`) 
      .query({
        userPostOnly: false,
        start_lat: 9,
      })
      .expect(400);
  });

  it('should fail to get authenticated posts if unauthorized', async () => {
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
      latitude: 40.90,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const newPost4 = {
      userId: 'other',
      latitude: 40.7180,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: true,
    };

    const createdPost = await request(app)
      .post('/posts')
      .send(newPost)
      .expect(200);
    
    const anotherPost = await request(app)
      .post('/posts')
      .send(newPost2)
      .expect(200);

    const thirdpost = await request(app)
      .post('/posts-from-other')
      .send(newPost3)
      .expect(200);

    const fourth = await request(app)
      .post('/posts-from-other')
      .send(newPost4)
      .expect(200);

    const response = await request(app)
      .get(`/posts-authenticated-not`) 
      .query({
        userPostOnly: false,
        start_lat: 9,
      })
      .expect(401);

      expect(response.body.message).toBe("Unauthorized")
  });

  it('should fail to update a post if unauthorized', async () => {
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
      .expect(200);

    const updatedPost = { ...createdPost.body, note: 'Updated note' };

    const response = await request(app)
      .put(`/posts-not-auth/${createdPost.body._id}`)
      .send(updatedPost)
      .expect(401);

    expect(response.body.message).toBe('Unauthorized');
  });
})

describe('Testing deletePost', () => {
  it('should delete a post', async () => {
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
      .expect(200);

    const response = await request(app)
      .delete(`/posts/${createdPost.body._id}`)
      .expect(200);
    
    const deleted = await PostModel.findById(response.body._id);

    expect(response.body).toHaveProperty('_id');
    expect(response.body._id).toBe(createdPost.body._id);
    expect(deleted).toBeNull();
  });

  it('should fail to delete a non-existant post', async () => {
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
      .expect(200);
     
    const newid = new mongoose.Types.ObjectId(0)
    const response = await request(app)
      .delete(`/posts/${newid}`)
      .expect(404);
  })

  it('should fail to allow an unauthorized user to delete a post', async () => {
    const newPost = {
      userId: 'other',
      latitude: 40.7128,
      longitude: -74.0060,
      images: ["string", "image/jpeg"],
      date: new Date(),
      note: 'Test post',
      isPrivate: false,
    };

    const createdPost = await request(app)
      .post('/posts-from-other')
      .send(newPost)
      .expect(200);
     
    const response = await request(app)
      .delete(`/posts/${createdPost.body._id}`)
      .expect(401);
  })

  it('should fail to allow an unauthorized user to delete a post, no middleare', async () => {
    const newPost = {
      userId: 'userId',
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
      .expect(200);
     
    const response = await request(app)
      .delete(`/posts-not-auth/${createdPost.body._id}`)
      .expect(401);

    expect(response.body.message).toBe("Unauthorized");
  })
})
