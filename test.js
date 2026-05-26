import dotenv from 'dotenv';
dotenv.config();

console.log('Testing database connection...');
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
