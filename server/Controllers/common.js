const User = require("../Models/Common/user");
const Article = require("../Models/Common/article");
const multer = require("koa-multer");
const jwt = require("jsonwebtoken");
//文件上传
const storage = multer.diskStorage({
  //文件保存路径
  destination: function (req, file, cb) {
    cb(null, "public/uploads/");
  },
  //修改文件名称
  filename: function (req, file, cb) {
    var fileFormat = file.originalname.split(".");
    cb(null, Date.now() + "." + fileFormat[fileFormat.length - 1]);
  },
});
//加载配置，单个文件
const upload = multer({ storage: storage }).single("file");

module.exports = {
  //注册
  sign_up: async (ctx) => {
    let user = ctx.request.body;
    let url = ctx.request.headers.referer;
    let reg = /([^?]+)$/;
    url = url.replace(reg, "");
    let dbUser = await User.findByName(User, user.name);
    if (dbUser != null) {
      return (ctx.body = { msg: "用户名已存在", status: "2", url: url });
    }
    let _user = new User({
      name: user.name,
      password: user.password,
    });
    user = await _user.save();
    return (ctx.body = { msg: "注册成功", status: "1", url: url });
  },
  //登录
  sign_in: async (ctx) => {
    let user = ctx.request.body;
    let url = ctx.request.headers.referer;
    let reg = /([^?]+)$/;
    url = url.match(reg)[1];
    let dbUser = await User.findByName(User, user.name);
    if (dbUser === null) {
      return (ctx.body = { msg: "用户不存在", status: "2" });
    }
    let promise = new Promise((res, rej) => {
      dbUser.comparePassword(user.password, (err, isMatch) => {
        if (err) {
          rej(err);
        }
        res(isMatch);
      });
    });
    promise.then((isMatch) => {
      if (isMatch) {
        let token = jwt.sign(user, "secret", {
          expiresIn: 60 * 60 * 1,
        });
        ctx.body = { code: 200, data: { msg: "登录成功", token: token } };
      } else {
        ctx.body = { code: 50008, data: { msg: "密码错误" } };
      }
    });
    return promise;
  },
  userInfo: async (ctx) => {
    let token = ctx.request.header.authorization;
    jwt.verify(token, "secret", function (err) {
      if (err) {
        return (ctx.body = {
          code: 50008,
          message: "Login failed, unable to get user details.",
        });
      } else {
        return (ctx.body = {
          code: 200,
          data: {
            roles: ["admin"],
            introduction: "I am a super administrator",
            avatar:
              "https://wpimg.wallstcn.com/f778738c-e4f8-4870-b634-56703b4acafe.gif",
            name: "Super Admin",
          },
        });
      }
    });
  },
  signRequired: async (ctx, next) => {
    let token = ctx.request.header.authorization;
    jwt.verify(token, "secret", (err) => {
      if (err) {
        return (ctx.body = {
          code: 50008,
          message: "Login failed, unable to get user details.",
        });
      } else {
        next();
        return (ctx.body = {
          code: 200,
        });
      }
    });
  },
  //登出
  logout: async (ctx) => {
    delete ctx.session.user;
    ctx.redirect("/");
  },
  //编辑文章
  addArticle: async (ctx) => {
    await ctx.render("move/addArticle", {
      article: "",
    });
  },
  addArticleContent: async (ctx) => {
    await ctx.render("move/addArticleContent", {
      article: "",
    });
  },
  //上传文章
  saveArticle: async (ctx) => {
    let article = ctx.request.body;
    let _article = {
      author: ctx.session.user.name,
      title: article.title,
      coverPic: article.coverPic,
      type: article.type,
      content: article.content,
      public: article.public,
    };
    if (article.id) {
      _article = { $set: _article };
      article = await Article.updateById(Article, article.id, _article);
      return (ctx.body = { id: article._id, author: article.author });
    } else {
      _article = new Article(_article);
      article = await _article.save();
      return (ctx.body = { id: article._id, author: article.author });
    }
  },
  //删除文章
  delArticle: async (ctx) => {
    let id = ctx.request.body.id;
    let name = ctx.session.name;
    await Article.deletById(Article, id);
    ctx.redirect("/m/myArticle/" + name);
  },
  //上传
  upload: async (ctx) => {
    await upload(ctx, function (err) {
      let imgPath = ctx.req.file.filename;
      imgPath = "../../uploads/" + imgPath;
      return (ctx.body = {
        code: 200,
        imgPath: imgPath,
      });
    });
  },
};
