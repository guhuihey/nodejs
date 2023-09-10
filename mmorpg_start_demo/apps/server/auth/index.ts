import express from "express";
//同源限制
import cors from "cors";
//日期格式化
import dayjs from "dayjs";
//hash加密模块
import crypto from "node:crypto";
//JSON字段解析
import bodyParser from "body-parser";
//mysql
import mysql from "mysql";
//忽视ts语法错误，
//@ts-ignore
import Crypt from "node-jsencrypt";
import {
  AuthService,
  CheckTokenRes,
  CheckTokenResData,
  PrivateKey,
  PublicKey,
} from "../common";
//生成token
import { v4 as uuidv4 } from "uuid";
import * as grpc from "@grpc/grpc-js";
//jwt
// const jwt = require("jsonwebtoken");

const cache = new Map();
//这里使jwttoken的生成函数，目前使用uuid随机生成的token
// //@ts-ignore
// function createToken(info, secret) {
//   let token = jwt.sign(info, secret);
//   return token;
// }

//为了方便使用hash算法将其封装为了一个函数
//@ts-ignore
function hash(content, algorithm) {
  const encrypt = crypto.createHash(algorithm.toString());
  encrypt.update(content);
  return encrypt.digest("hex");
}

var connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "123456",
  database: "mmodb",
});
connection.connect();

const app = express();
const crypt = new Crypt();
// const hash = crypto.createHash("md5");
//因为一个createHash实例智能调用一次digest所以创建两个
// const idCreate = crypto.createHash("sha256");
crypt.setKey(PrivateKey);

app.use(cors());
app.use(bodyParser.json());

app.post("/register", function (req, res) {
  console.log("req", req.body);
  let { account, password } = req.body;
  account = crypt.decrypt(account);
  password = crypt.decrypt(password);
  // hash.update(password);
  const passwordHash = hash(password, "md5");
  const createTime = dayjs().format("YYYY-MM-DD HH:mm:ss");
  // idCreate.update(createTime);
  // let id = hash(createTime, "sha256");
  connection.query(
    "insert into `user-information` (account,password,create_time) Values (?,?,?)",
    [account, passwordHash, createTime],
    function (error, result, fields) {
      if (error) {
        console.log(error);
        return;
      }
      console.log(result);
    }
  );

  res.json({ PublicKey: PublicKey });
});

app.post("/login", function (req, res) {
  console.log("req", req.body);
  let { account, password } = req.body;
  account = crypt.decrypt(account);
  password = crypt.decrypt(password);
  // hash.update(password);
  const passwordHash = hash(password, "md5");
  //有一天这里的数据库语句突然报错了，原因是我定义的函数返回值变成了promise，于是只好加上await（好吧，原因竟是不知何时我的自定义函数变成了异步函数）
  // console.log(passwordHash);
  connection.query(
    "select * from `user-information` where account=? and password=? ",
    [account, passwordHash],
    function (error, result, fields) {
      if (error) {
        console.log(error);
        return;
      }
      if (result.length > 0) {
        // let token = createToken(account, password);
        let token = uuidv4();
        console.log(token);
        cache.set(token, account);
        res.json({ token });
      }
      console.log(result);
    }
  );
});
app.listen(3000);
console.log("auth 服务");

//创建grpc服务
const server = new grpc.Server();
//添加AuthServer，并在参数中实现checktoken这个方法
server.addService(AuthService, {
  checkToken(call: any, callback: any) {
    const token = call.request.getToken();
    const res = new CheckTokenRes();
    if (cache.has(token)) {
      const data = new CheckTokenResData();
      data.setAccount(cache.get(token));
      res.setData(data);
    } else {
      res.setError("token not exist");
    }
    callback(null, res);
  },
});
//绑定服务器地址，并选择连接方式
server.bindAsync(
  "localhost:3333",
  grpc.ServerCredentials.createInsecure(),
  () => {
    server.start();
    console.log("RPC服务启动");
  }
);
