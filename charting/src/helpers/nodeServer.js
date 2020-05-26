import axios from 'axios';

const nodeServerPort = 3059;

const nodeServer = axios.create({
  baseURL: `http://localhost:${nodeServerPort}`,
  timeout: 60000,
});

export default nodeServer;
