import { io } from "socket.io-client";
import { SOCKET_URL } from "../utils/constants";

// One shared connection for the whole app — autoConnect off so it only
// opens once a room is actually being joined (see useSocket.js).
const socket = io(SOCKET_URL, { autoConnect: false });

export default socket;