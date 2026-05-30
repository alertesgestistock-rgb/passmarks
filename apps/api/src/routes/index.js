import { Router } from 'express';
import healthCheck from './health-check.js';
import quizRouter from './quiz.js';
import chatRouter from './chat.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

export default () => {
    router.get('/health', healthCheck);
    router.use('/quiz', requireAuth, quizRouter);
    router.use('/chat', requireAuth, chatRouter);

    return router;
};
