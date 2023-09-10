import { _decorator, Component, EditBox, Node } from "cc";
import Crypt from "jsencrypt";
import { PublicKey, RpcFunc } from "../scripts/common";
import NetworkManager from "../scripts/global/NetworkManager";

const { ccclass, property } = _decorator;

const crypt = new Crypt();
crypt.setKey(PublicKey);

@ccclass("loginManager")
export class loginManager extends Component {
  account: EditBox;
  password: EditBox;
  onLoad() {
    this.account = this.node.getChildByName("Account").getComponent(EditBox);
    this.password = this.node.getChildByName("Password").getComponent(EditBox);
  }

  async register() {
    const account = crypt.encrypt(this.account.string);
    const password = crypt.encrypt(this.password.string);
    console.log(this.account);
    console.log("account", account);
    console.log("password", password);
    const res = await fetch("http://localhost:3000/register", {
      method: "POST",
      //   mode: "cors",
      //   cache: "no-cache",
      //   credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      //   redirect: "follow",
      //   referrerPolicy: "no-referrer",
      body: JSON.stringify({
        account,
        password,
      }),
    }).then((response) => response.json());
  }
  async login() {
    const account = crypt.encrypt(this.account.string);
    const password = crypt.encrypt(this.password.string);
    // console.log(this.account);
    // console.log("account", account);
    // console.log("password", password);
    const res = await fetch("http://localhost:3000/login", {
      method: "POST",
      //   mode: "cors",
      //   cache: "no-cache",
      //   credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      //   redirect: "follow",
      //   referrerPolicy: "no-referrer",
      body: JSON.stringify({
        account,
        password,
      }),
    }).then((response) => response.json());
    console.log("res", res);

    this.connect(res.token);
  }

  async connect(token: string) {
    await NetworkManager.Instance.connect();
    const res = await NetworkManager.Instance.call(RpcFunc.enterGame, {
      token,
    });
    console.log("connect", res);
  }
}
