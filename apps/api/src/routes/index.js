import { Router } from 'express';
import healthCheck from './health-check.js';
import quizRouter from './quiz.js';
import chatRouter from './chat.js';

const router = Router();

export default () => {
    router.get('/health', healthCheck);
    router.use('/quiz', quizRouter);
    router.use('/chat', chatRouter);

    return router;
};
