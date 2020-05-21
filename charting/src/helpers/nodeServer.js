import axios from 'axios';
import { nodeServerPort } from '../helpers/constants';

const nodeServer = axios.create({
  baseURL: `http://localhost:${nodeServerPort}`,
  timeout: 1000,
});

export default nodeServer;
