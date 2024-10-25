# fjcpc-transfer-exam-practice-system

一个非官方的、简约的、基于 Vue、Nest 的船政转轨考刷题系统。

## 这是干嘛的？

- 这个网站是给 “3+2” 的学生 **转轨考试**（其他省份可能称“转段考试”）刷题用的。

- “3+2” 是 **五年专** 的一种类型，即“中专三年、大专两年”，故称三二分段制，期间不用参加高职分类考试之类的统一招生考试。

- 五年专（五年制高职）是通过中考报考的，与普通高中、三年至中专并列。五年专毕业后可取得就读大专学校的全日制大专学历（两年制大专）。

- 虽然不用参加规模大的统一性考试，但中专转轨至大专时同样需要考核，五年专的转段一般被称为“转段考试”。转轨考试题目由各大专院校自行组织。

- 本项目就是服务于 **福建船政交通职业学院** 的五年专学生，即需要参加转轨考试的同学。项目是一个 **刷题系统**。

- 船政学院的转轨考考核时间一般在 4 月或 5 月；转轨考由文化课（300 分）+ 专业课（200 分）+ 实操（250 分）三个部分组成，前两者是客观题，后者由发放题目后中职学校自行组织、批改。

## 开发目的

船政学院有自己的转轨考练习中心，但功能不太符合我的需要，特别是卷子不能单独刷某科的题很讨厌。船政练习中心的进入流程是：

- 打开练习中心网站 → 输入身份证号、选择专业课或者文化课 → 根据传入的信息自动生成一套试卷。

生成的试卷的题目都是随机的，如果我刷新页面，每道大题里面的题目会变。没法反复刷题是最致命的，功能太单一，于是自己动手写了一个。

不过，一开始只是写个获取题目的站点，后面花了几天时间发现可以做成刷题系统给周围的同学用嘻嘻。

## 技术

基于 Vue、Nest 框架进行开发。包含一个简易的登录模块、用户模块、爬取题库模块等。

题库数据来源于船政学院转轨考试中心，题目是多次爬取后去重、存入数据库。（勉强算中间层👍）

## 演示

![4f07794cd472a9bd48f0e6d822f6e1ea.png](https://s2.loli.net/2024/05/25/PO4datDZjXKiNUH.png)
V2版本的界面，V3（当前）也和这个一个风格。

## 部署

没写好，别急。24年12月30日前肯定好。

## 项目迭代

| 版本   | 日期                       | 功能                                    | 技术栈          |
| :----- | :------------------------- | :-------------------------------------- | :-------------- |
| V1     | 2024年4月27日              | 爬取题目数据、去重                      | `JavaScript`    |
| V2     | 2024年5月3日—2024年5月13日 | 相对完善的能用的做题工具                | `jQuery`、`PHP` |
| **V3** | 当前，在写了               | 在V2的功能上继续添加功能，使用`Vue`重构 | `Vue`、`Nest`   |

## 联系我

- [GitHub](https://github.com/AurLemon)
- [bilibili](https://space.bilibili.com/204271518)
