import {
  AuthClient,
  CheckTokenReq,
  RpcFunc,
  getProtoPathByRpcFunc,
} from "../common";
import { Singleton } from "../common/common/base";
import { WebSocketServer, WebSocket } from "ws";
import * as grpc from "@grpc/grpc-js";
//@ts-ignore
import root from "../common/idl/auto-gen-ws";

export class GatewayManager extends Singleton {
  static get Instance() {
    return super.GetInstance<GatewayManager>();
  }
  init() {
    const wss = new WebSocketServer({ port: 4000 });

    wss.on("connection", (ws) => {
      ws.on("error", console.error);
      //(1).箭头函数的 this 永远指向其上下文的 this ，任何方法都改变不了其指向，如 call() , bind() , apply()
      //(2).普通函数的this指向调用它的那个对象
      ws.on("message", (buffer: Buffer) => {
        this.handleMessage(ws, buffer);
      });
    });
  }
  async handleMessage(ws: WebSocket, buffer: Buffer) {
    // console.log(buffer.toString());
    const name = buffer.readUint8(0);
    const path = getProtoPathByRpcFunc(name, "req");
    const coder = root.lookup(path);
    const data = coder.decode(buffer.slice(1));
    //const { name, data } = JSON.parse(buffer.toString());
    if (name === RpcFunc.enterGame) {
      //TODO做鉴权
      const res = await this.checkToken(data);
      this.sendMessage(ws, name, res);
    } else {
      //TODO跟game服务通信
    }
  }
  sendMessage(ws: WebSocket, name: RpcFunc, data: any) {
    const headerBuffer = Buffer.alloc(1);
    headerBuffer.writeUint8(name);
    const path = getProtoPathByRpcFunc(name, "res");
    const coder = root.lookup(path);
    const dataBUffer = coder.encode(data).finish();
    const buffer = Buffer.concat([headerBuffer, dataBUffer]);
    ws.send(buffer);
  }
  checkToken({ token }: { token: string }) {
    //创建用户服务，设置向服务器请求的地址为3333端口
    return new Promise((rs) => {
      const client = new AuthClient(
        "localhost:3333",
        grpc.credentials.createInsecure()
      );
      const req = new CheckTokenReq();
      req.setToken(token);
      //向服务器请求checktoken
      client.checkToken(req, (err, message) => {
        rs(message.toObject());
      });
    });
  }
}
