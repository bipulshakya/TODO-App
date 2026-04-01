const isLocalHost = typeof window !== 'undefined'
	? ['localhost', '127.0.0.1'].includes(window.location.hostname)
	: false;

const localApi = process.env.REACT_APP_LOCAL_API_URL || 'http://localhost:5001';
const cloudApi = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const API_URL = isLocalHost ? localApi : cloudApi;
export default API_URL;
