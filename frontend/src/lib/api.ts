import axios from 'axios';

// Get API base URL from environment variable or default to localhost
// Get API base URL from environment variable or default to localhost with /api prefix
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000') + '/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export default api;
