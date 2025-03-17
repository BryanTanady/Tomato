import express, {Request, Response} from 'express';
import { validationResult } from 'express-validator';
import { PostRoutes } from './routes/PostRoutes';
import connectDB  from "./db";
import morgan from 'morgan'
import { UserRoutes } from './routes/UserRoutes';
import { ChatRoutes } from './routes/ChatRoutes';
import { config } from 'dotenv';
import startWSS from './wss';
import { RecommendationRoutes } from './routes/RecommendationRoutes';
import { AuthenticatedRequest } from './types/AuthenticatedRequest';
import {verifyToken} from "./middleware/verifyToken";

config();
const app = express();

app.use(express.json({limit: '100mb'}));
app.use(morgan('tiny'))

app.get('/', (req: Request, res: Response) => {
    res.send('Hello World');
});


const allRoutes = [...PostRoutes, ...UserRoutes, ...ChatRoutes, ...RecommendationRoutes]
allRoutes.forEach((route) => {
    const middlewares = route.protected ? [verifyToken] : []; // Add verifyToken only if protected
    const allowedMethods = ['get', 'post', 'put', 'delete', 'patch'];
    // Ensure that route.method is one of the allowed methods
    const method = route.method.toLowerCase();
    if (!allowedMethods.includes(method)) {
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
    app[method as keyof express.Application](
        route.route,
        ...middlewares,
        route.validation,
        async (req: AuthenticatedRequest, res: Response) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                /* If there are validation errors, send a response with the error messages */
                return res.status(400).send({ errors: errors.array() });
            }
            try {
                await route.action(req, res);
            } catch (err) {
                console.error(err)
                return res.sendStatus(500); // Don't expose internal server workings
            }
        },
    );
});

const PORT = Number(process.env.PORT) || 3000

connectDB().then(() => {
    app.listen(PORT, '0.0.0.0' as string, () => {
        startWSS()
        console.warn(`Server is running on port ${PORT}`);
      });

}).catch((err: unknown) => {
    console.error(err);
})

module.exports = {app}
