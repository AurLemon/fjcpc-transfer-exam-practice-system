# fjcpc-transfer-exam-practice-system

![Demo](https://s2.loli.net/2024/10/26/AH7LoKVgkNWPJzq.jpg)

![Version](https://img.shields.io/badge/Beta-3.0-yellow) ![License](https://img.shields.io/badge/license-MIT-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white) ![Vue.js](https://img.shields.io/badge/Vue.js%203-4FC08D?logo=vue.js&logoColor=white) ![NestJS](https://img.shields.io/badge/NestJS-E0234E?logo=nestjs&logoColor=white)

一个非官方的、简约的、基于 Vue、Nest 的船政转轨考刷题系统。

## 声明

我声明下，本项目仅用于全栈学习交流哈。没有别的目的，也没有商业用途，纯粹是练习，项目所使用的题目数据均来源于船政学院转轨考试中心，就算是爬取也很温柔，不暴力获取。

## 技术

基于 Vue、Nest 框架进行开发。包含一个简易的登录模块、用户模块、爬取题库模块等。

题库数据来源于船政学院转轨考试中心，题目是多次爬取后去重、存入数据库。（勉强算中间层👍）

## 部署

- 在项目中，前后端的文件结构是一体的；前端的项目文件位于根目录下的 frontend 目录，而后端的逻辑代码直接位于根目录下的 src 文件夹。若直接观察结构，可注意到整个项目的结构其实就是后端工程项目里面套了一层前端工程项目。

1. 使用 `git clone https://github.com/AurLemon/fjcpc-transfer-exam-practice-system.git` 将仓库克隆到本地。
   当然，也可以直接在 GitHub 页面上面，选择 Download 以下载整个仓库。对于仓库克隆目录的具体用法，可查阅 Git 使用教程。

2. 配置好 Node 环境、Node 变量、npm 包管理器后，进入项目目录，执行`npm run install`以安装依赖包。

3. 执行 `npm run service` 以启动项目。

4. 对于 npm 脚本的一些看法：其实直接执行 `npm run start` 也是可以的，但 `npm run start` 是只启动后端项目，前端需要自行打包。而 `npm run service` 是打包完前端后，再启动后端，为了方便就这么做了🤝👍。

```json
{
    ...,
    "scripts": {
        ...,
        "service": "npm-run-all --serial frontend:build start",
        "service:dev": "npm-run-all --serial frontend:dev start",
        "frontend:build": "rm -rf ./public/* && cd frontend && npm run build",
        "frontend:dev": "cd frontend && npm run dev",
        "frontend:install": "cd frontend && npm install"
    }
}
```

## 这是干嘛的？

这个网站是给 “3+2” 的学生 **转轨考试**（其他省份可能称“转段考试”）刷题用的。

“3+2” 是 **五年专** 的一种类型，即“中专三年、大专两年”，故称三二分段制，期间不用参加高职分类考试之类的统一招生考试。

五年专（五年制高职）是通过中考报考的，与普通高中、三年制中专并列。五年专毕业后可取得就读大专学校的全日制大专学历（两年制大专）。

虽然不用参加规模大的统一性考试，但中专转轨至大专时同样需要考核，五年专的转段一般被称为“转段考试”。转轨考试题目由各大专院校自行组织。

本项目就是服务于 **福建船政交通职业学院** 的五年专学生，即需要参加转轨考试的同学。项目是一个 **刷题系统**。

船政学院的转轨考考核时间一般在 4 月或 5 月；转轨考由文化课（300 分）+ 专业课（200 分）+ 实操（250 分）三个部分组成，前两者是客观题，后者由发放题目后中职学校自行组织、批改。

## 开发目的

船政学院有自己的转轨考练习中心，但功能不太符合我的需要，特别是卷子不能单独刷某科的题很讨厌。船政练习中心的进入流程是：

- 打开练习中心网站 → 输入身份证号、选择专业课或者文化课 → 根据传入的信息自动生成一套试卷。

生成的试卷的题目都是随机的，如果我刷新页面，每道大题里面的题目会变。没法反复刷题是最致命的，功能太单一，于是自己动手写了一个。

不过，一开始只是写个获取题目的站点，后面花了几天时间发现可以做成刷题系统给周围的同学用嘻嘻。

## 演示

别急

## 项目迭代

| 版本   | 日期                       | 功能                                    | 技术栈          | 部署                                |
| :----- | :------------------------- | :-------------------------------------- | :-------------- | :---------------------------------- |
| V1     | 2024年4月27日              | 爬取题目数据、去重                      | `JavaScript`    | 无                                  |
| V2     | 2024年5月3日—2024年5月13日 | 相对完善的能用的做题工具                | `jQuery`、`PHP` | https://v2.fjcpc-teps.aurlemon.top/ |
| **V3** | 当前，在写了               | 在V2的功能上继续添加功能，使用`Vue`重构 | `Vue`、`Nest`   | https://fjcpc-teps.aurlemon.top/    |

## TODO List

#### 2024-10

- [x] 自动同步数据
- [x] 管理面板
- [x] 重置密码、支持空密码
- [x] V2 数据导入

#### 2024-11

- [x] 优化登录检查用户是否本人的逻辑，减少性能损失
- [x] 新增移动端的专注（聚焦）模式，支持固定页面不乱晃

#### 2025-1

- [ ] 每题都带评论区
- [ ] 支持刷错题
- [ ] 收藏夹文件夹支持筛选
- [ ] 收藏夹文件夹支持查看题目概览
- [ ] 引入 Redis 以优化性能（数据库信息解密加密有点吃性能）
- [ ] API 防护
- [ ] 前端数据的加载逻辑

#### 2025-2

- [ ] 让项目更通用

## 联系我

- [GitHub](https://github.com/AurLemon)
- [bilibili](https://space.bilibili.com/204271518)
