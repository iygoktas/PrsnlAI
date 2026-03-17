import dotenv from 'dotenv';
import path from 'path';
import '@testing-library/jest-dom';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '.env') });
