const fs = require("node:fs");
exports.prepareAdmin = async context => {
  const credentials = fs.readFileSync(".local-admin/login.txt", "utf8");
  const response = await context.request.post("http://127.0.0.1:5173/api/admin/login", {
    data: { username: credentials.match(/Tài khoản: (.+)/)[1].trim(), password: credentials.match(/Mật khẩu: (.+)/)[1].trim() },
  });
  if (!response.ok()) throw new Error("Unable to authenticate local QA session");
  // Keep editing QA isolated from the admin's real draft. Real server persistence
  // and access control are exercised separately in qa-revision.cjs.
  let draft = null;
  await context.route("**/api/admin/draft", async route => {
    if (route.request().method() === "PUT") draft = route.request().postDataJSON();
    await route.fulfill({ json: route.request().method() === "GET" ? draft : { ok: true } });
  });
};
